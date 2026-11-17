import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  setSystemTime,
  test,
} from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import {
  defaultPlaybook,
  lintMessages,
  prospectSchema,
  renderMessages,
} from "@/lib/outbound";
import {
  type ShoppingResearch,
  shoppingResearchSchema,
  validateShoppingResearch,
} from "@/lib/outbound-shopping-research";
import { preservesDraftControls } from "@/lib/outbound-writing";

const endpoint = process.env.OUTBOUND_TEST_DATABASE_URL;
const now = new Date("2026-11-16T18:00:00Z");
const receipt = (): ShoppingResearch =>
  shoppingResearchSchema.parse({
    product: {
      name: "Trail Tote",
      url: "https://samplegoods.com/products/tote?variant=large",
    },
    sources: [
      {
        id: "raw",
        kind: "product",
        url: "https://samplegoods.com/products/tote?variant=large",
        checkedAt: now.toISOString(),
        capture: "http",
        content: "Trail Tote Product SKU LARGE Offer price 30.00 USD",
        artifact: "fixture/raw.json",
      },
      {
        id: "visible",
        kind: "product",
        url: "https://samplegoods.com/products/tote?variant=large",
        checkedAt: now.toISOString(),
        capture: "browser",
        content: "Trail Tote Large $40.00. Small $30.00 is a separate option.",
        artifact: "fixture/product.png",
      },
      {
        id: "query",
        kind: "search",
        url: "https://www.google.com/search?q=large+reusable+tote",
        checkedAt: now.toISOString(),
        capture: "browser",
        content:
          "large reusable tote: Sample Goods Trail Tote, Other Goods Carry Tote. Market not established.",
        artifact: "fixture/query.png",
      },
      {
        id: "ucp",
        kind: "ucp",
        url: "https://samplegoods.com/.well-known/ucp",
        checkedAt: now.toISOString(),
        capture: "http",
        content: '{"ucp":{"capabilities":{"dev.ucp.shopping.checkout":[{}]}}}',
        artifact: "fixture/ucp.json",
      },
    ],
    queries: [
      {
        query: "large reusable tote",
        surface: "Google AI Mode",
        market: "unknown",
        interfaceLocale: "de-DE",
        signedOut: true,
        executedAt: now.toISOString(),
        status: "observed",
        sourceIds: ["query"],
        coverage: "One signed-out answer. Not a controlled US-market test.",
      },
    ],
    ucp: {
      url: "https://samplegoods.com/.well-known/ucp",
      status: "present",
      httpStatus: 200,
      capabilities: ["dev.ucp.shopping.checkout"],
      sourceIds: ["ucp"],
    },
    checkout: {
      status: "notTested",
      sourceIds: [],
      notes: "No checkout interaction.",
    },
    competitors: [],
    selected: {
      kind: "product-data-gap",
      observation:
        "Your large Trail Tote shows $40 on the page, while its product data lists $30.",
      consequence: "Should those two prices match for the large size?",
      askAbout: "the large Trail Tote",
      scope:
        "One exact large variant. No checkout test or measured sales impact.",
      queryIndex: 0,
      sourceIds: ["visible", "raw"],
      quotes: [
        { sourceId: "visible", quote: "Trail Tote Large $40.00" },
        { sourceId: "raw", quote: "SKU LARGE Offer price 30.00 USD" },
      ],
    },
  });
const modules: {
  database?: typeof import("@/server/database");
  store?: typeof import("@/server/app/outbound/store");
  research?: typeof import("@/server/app/outbound/lead-research");
  draft?: typeof import("@/server/utils/outbound/draft");
} = {};
const active = () => {
  if (
    !modules.database ||
    !modules.store ||
    !modules.research ||
    !modules.draft
  )
    throw new Error("Fixture modules missing");
  return {
    ...modules.database,
    store: modules.store,
    research: modules.research,
    draft: modules.draft,
  };
};
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const settings = {
  ...defaultPlaybook,
  requireShoppingEvidence: true,
  subjectTemplate: "Trail Tote pricing",
  bodyTemplate:
    "Hi {first}!\n\n{finding}\n\n{consequence}\n\n{founderLine} {callToAction}\n\n({optout})\n\n{signature}",
  senderConfirmed: true,
  historyConfirmed: true,
  competingSendersPaused: true,
  senderTested: true,
};
const fixture = { prospectId: "", inboxId: "" };
const input = async (captured = receipt()) => {
  const { store } = active();
  const row = value(await store.readProspect(fixture.prospectId));
  if (!row) throw new Error("Missing prospect");
  return {
    requestId: randomUUID(),
    prospectId: row.id,
    expectedRevision: row.revision,
    expectedPlaybookRevision: (await store.policy()).revision,
    receipt: captured,
  };
};

describe("source-bound shopping research validation", () => {
  test("accepts mixed browser/HTTP variant evidence in either source order", () => {
    expect(validateShoppingResearch(receipt(), 1, now.getTime())).toBeNull();
    const other = receipt();
    other.sources.reverse();
    expect(validateShoppingResearch(other, 1, now.getTime())).toBeNull();
  });
  test("rejects unsupported quotes, nonexistent checkout and absent-UCP claims", () => {
    const changed = receipt();
    changed.selected.quotes[0] = {
      sourceId: "visible",
      quote: "Unobserved checkout failure",
    };
    expect(validateShoppingResearch(changed, 1, now.getTime())).toContain(
      "quote",
    );
    const checkout = receipt();
    checkout.selected.kind = "checkout-handoff";
    checkout.checkout.status = "observed";
    expect(validateShoppingResearch(checkout, 1, now.getTime())).toContain(
      "checkout capture",
    );
    const ucp = receipt();
    ucp.selected.kind = "ucp-gap";
    expect(validateShoppingResearch(ucp, 1, now.getTime())).toContain(
      "UCP gap",
    );
  });
  test("merchant UCP and actual query context cannot be borrowed or fabricated", () => {
    const other = receipt();
    other.ucp.url = "https://differentbrand.com/.well-known/ucp";
    expect(validateShoppingResearch(other, 1, now.getTime())).toContain(
      "merchant",
    );
    const privateHost = receipt();
    privateHost.product.url = "https://one.myshopify.com/products/tote";
    privateHost.ucp.url = "https://two.myshopify.com/.well-known/ucp";
    expect(validateShoppingResearch(privateHost, 1, now.getTime())).toContain(
      "merchant",
    );
    const market = receipt();
    market.selected.observation = "US shoppers cannot see your product.";
    expect(validateShoppingResearch(market, 1, now.getTime())).toContain(
      "US market",
    );
    const hypothetical = receipt();
    hypothetical.selected.consequence =
      "I'd check whether AI recommends this ingredient.";
    expect(validateShoppingResearch(hypothetical, 1, now.getTime())).toContain(
      "hypothetical",
    );
  });
  test("search-mentioned competitor is scoped to a recorded answer", () => {
    const comparison = receipt();
    comparison.selected.kind = "query-comparison";
    comparison.competitors = [
      {
        name: "Other Goods",
        product: "Carry Tote",
        url: "https://othergoods.com/products/carry",
        sourceIds: ["query"],
        comparison:
          "Also appeared in this answer. Product specifications were not compared.",
      },
    ];
    expect(validateShoppingResearch(comparison, 1, now.getTime())).toBeNull();
    comparison.competitors[0]!.product = "Not actually mentioned";
    expect(validateShoppingResearch(comparison, 1, now.getTime())).toContain(
      "competitor",
    );
  });
});

describe.skipIf(!endpoint)(
  "isolated shopping evidence persistence and delivery gates",
  () => {
    beforeAll(async () => {
      if (!endpoint) throw new Error("Disposable database required");
      const url = new URL(endpoint);
      if (
        !["localhost", "127.0.0.1"].includes(url.hostname) ||
        url.pathname !== "/outbound_test"
      )
        throw new Error("Local outbound_test only");
      Object.assign(process.env, {
        DATABASE_URL: endpoint,
        CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 19).toString("base64"),
      });
      mock.module("server-only", () => ({}));
      modules.database = await import("@/server/database");
      modules.store = await import("@/server/app/outbound/store");
      modules.research = await import("@/server/app/outbound/lead-research");
      modules.draft = await import("@/server/utils/outbound/draft");
    });
    beforeEach(async () => {
      setSystemTime(now);
      const { db, schema, store } = active();
      await db.execute(sql`set client_min_messages to warning`);
      await db.execute(
        sql`truncate outbound_conversation_send, outbound_conversation_message, outbound_conversation, outbound_campaign, outbound_integration_job, outbound_send_attempt, outbound_event, outbound_revision, outbound_prospect, outbound_person, outbound_company, outbound_suppression, outbound_inbox, outbound_playbook, outbound_provider_credential cascade`,
      );
      value(await store.savePlaybook("fixture", settings));
      const saved = value(
        await store.saveProspect(
          "fixture",
          prospectSchema.parse({
            company: "Sample Goods",
            domain: "samplegoods.com",
            website: "https://samplegoods.com",
            country: "US",
            platform: "shopify",
            name: "Jane Smith",
            first: "Jane",
            title: "Head of Growth",
            email: "jane@samplegoods.com",
            emailStatus: "verified",
            emailVerifiedAt: now.toISOString(),
            emailSource: "Fixture actual verification",
            roleSource: "https://samplegoods.com/team",
            roleCheckedAt: now.toISOString(),
            timezone: "America/New_York",
            mxProvider: "google",
            mxCheckedAt: now.toISOString(),
            product: "Trail Tote",
            productUrl: receipt().product.url,
            gap: "barcode-not-observed",
            finding: "Legacy ingredient wording",
            findingReviewed: true,
            evidence: "Old product observation",
            evidenceCheckedAt: now.toISOString(),
            legitEvidence:
              "Active physical catalogue and current company identity inspected.",
          }),
        ),
      );
      fixture.prospectId = saved.prospect;
      const [inbox] = await db
        .insert(schema.outboundInbox)
        .values({
          email: settings.fromEmail,
          fromName: settings.fromName,
          signer: settings.signature,
          enabled: true,
          refreshToken: "fixture",
          lastSyncedAt: now,
        })
        .returning();
      if (!inbox) throw new Error("Missing inbox");
      fixture.inboxId = inbox.id;
    });
    afterAll(() => setSystemTime());
    test("ingredient-only fallback is held before template and Azure drafting", async () => {
      const { store, draft } = active();
      const row = value(await store.readProspect(fixture.prospectId));
      if (!row) throw new Error("Missing prospect");
      expect(
        (await store.generateDrafts("fixture", { prospect: row.id })).success,
      ).toBe(false);
      const generated = await draft.generateDraft(row.details, settings);
      expect(generated.success).toBe(false);
      if (!generated.success)
        expect(generated.error.message).toContain("Shopping research");
    });
    test("atomically applies real receipts and UUID retries do not alter the prospect twice", async () => {
      const { store, research, db, schema } = active();
      const request = await input();
      const saved = value(await research.saveAndApply("operator", request));
      expect(saved.repeated).toBe(false);
      expect(
        value(await research.saveAndApply("operator", request)).repeated,
      ).toBe(true);
      const row = value(await store.readProspect(fixture.prospectId));
      expect(row?.revision).toBe(request.expectedRevision + 1);
      expect(row?.details.shoppingResearchId).toBe(saved.researchId);
      expect(row?.approvedAt).toBeNull();
      expect(row?.nextSendAt).toBeNull();
      expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(
        0,
      );
      expect(
        (
          await research.saveAndApply("operator", {
            ...request,
            receipt: {
              ...request.receipt,
              selected: { ...request.receipt.selected, scope: "Changed scope" },
            },
          })
        ).success,
      ).toBe(false);
    });
    test("selected source paragraphs survive normal drafting and manual approval", async () => {
      const { store, research } = active();
      value(await research.saveAndApply("operator", await input()));
      const row = value(await store.readProspect(fixture.prospectId));
      if (!row) throw new Error("Missing prospect");
      const first = renderMessages(row.details, settings)[0]!;
      expect(first.body).toContain(receipt().selected.observation);
      expect(first.body).not.toContain("I'd check");
      expect(
        preservesDraftControls(
          first.body.replace("$40", "$50"),
          first.body,
          settings,
          row.details,
        ),
      ).toBe(false);
      expect(
        lintMessages(
          [{ ...first, body: first.body.replace("$40", "$50") }],
          settings,
          row.details,
        ).some((issue) => issue.code === "findingCopyChanged"),
      ).toBe(true);
      const draft = value(
        await store.generateDrafts("operator", { prospect: row.id }),
      );
      value(
        await store.reviewProspect("operator", {
          prospect: row.id,
          revision: draft.revision,
          decision: "approve",
        }),
      );
      expect(value(await store.readProspect(row.id))?.status).toBe("approved");
    });
    test("changing recipient after research blocks approval; expiry blocks delivery even after approval", async () => {
      const { store, research } = active();
      value(await research.saveAndApply("operator", await input()));
      const draft = value(
        await store.generateDrafts("operator", {
          prospect: fixture.prospectId,
        }),
      );
      value(
        await store.reviewProspect("operator", {
          prospect: fixture.prospectId,
          revision: draft.revision,
          decision: "approve",
        }),
      );
      setSystemTime(new Date(now.getTime() + 8 * 86400_000));
      const claim = await store.claimDelivery("operator", {
        prospect: fixture.prospectId,
        inbox: fixture.inboxId,
      });
      expect(claim.success).toBe(false);
      if (!claim.success) expect(claim.error.message).toContain("expired");
      setSystemTime(now);
      const row = value(await store.readProspect(fixture.prospectId));
      if (!row) throw new Error("Missing prospect");
      value(
        await store.patchProspect(
          "operator",
          row.id,
          { email: "other@samplegoods.com" },
          row.revision,
        ),
      );
      expect(
        (await store.generateDrafts("operator", { prospect: row.id })).success,
      ).toBe(false);
    });
    test("stale Playbook and tampered source receipts cannot be approved", async () => {
      const { store, research, db, schema } = active();
      const saved = value(
        await research.saveAndApply("operator", await input()),
      );
      const [job] = await db
        .select()
        .from(schema.outboundIntegrationJob)
        .where(eq(schema.outboundIntegrationJob.id, saved.researchId));
      if (!job) throw new Error("Missing job");
      await db
        .update(schema.outboundIntegrationJob)
        .set({
          output: {
            ...job.output,
            receipt: {
              ...receipt(),
              selected: {
                ...receipt().selected,
                observation: "Invented observation",
              },
            },
          },
        })
        .where(eq(schema.outboundIntegrationJob.id, job.id));
      expect(
        (
          await store.generateDrafts("operator", {
            prospect: fixture.prospectId,
          })
        ).success,
      ).toBe(false);
      await db
        .update(schema.outboundIntegrationJob)
        .set({ output: job.output })
        .where(eq(schema.outboundIntegrationJob.id, job.id));
      value(
        await store.savePlaybook("operator", {
          ...settings,
          researchInstructions: "Changed research scope",
        }),
      );
      expect(
        (
          await store.generateDrafts("operator", {
            prospect: fixture.prospectId,
          })
        ).success,
      ).toBe(false);
    });
    test("applying new product research cannot bypass independently selected contact identity", async () => {
      const { store, research, db, schema } = active();
      const row = value(await store.readProspect(fixture.prospectId));
      if (!row) throw new Error("Missing prospect");
      const identifier = randomUUID();
      await db
        .insert(schema.outboundIntegrationJob)
        .values({
          id: identifier,
          provider: "automation",
          prospectId: row.id,
          status: "complete",
          input: {
            operation: "campaignAutomation",
            campaignId: row.campaignId,
          },
          output: {
            prospectId: row.id,
            selection: {
              status: "selected",
              provisional: false,
              person: {
                name: row.details.name,
                first: row.details.first,
                title: row.details.title,
                email: "original@samplegoods.com",
                domain: row.details.domain,
                linkedinUrl: row.details.linkedinUrl,
              },
              details: {
                roleSource: row.details.roleSource,
                roleCheckedAt: row.details.roleCheckedAt,
                timezone: row.details.timezone,
              },
            },
          },
        });
      value(
        await store.patchProspect(
          "operator",
          row.id,
          { automationEvidenceId: identifier },
          row.revision,
        ),
      );
      const saved = await research.saveAndApply("operator", await input());
      expect(saved.success).toBe(false);
      if (!saved.success)
        expect(saved.error.message).toContain("independently selected contact");
      const current = value(await store.readProspect(row.id));
      if (!current) throw new Error("Missing prospect");
      value(
        await store.patchProspect(
          "operator",
          row.id,
          { automationEvidenceId: "" },
          current.revision,
        ),
      );
      expect(
        (await research.saveAndApply("operator", await input())).success,
      ).toBe(false);
    });
  },
);
