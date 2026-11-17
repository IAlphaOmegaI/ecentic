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
import { defaultCampaignCriteria } from "@/lib/outbound-campaigns";
import { draftReviewReadinessKey } from "@/lib/outbound-draft-review";
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
  review?: typeof import("@/server/app/outbound/automatic-draft-review");
} = {};
const active = () => {
  if (
    !modules.database ||
    !modules.store ||
    !modules.research ||
    !modules.draft ||
    !modules.review
  )
    throw new Error("Fixture modules missing");
  return {
    ...modules.database,
    store: modules.store,
    research: modules.research,
    draft: modules.draft,
    review: modules.review,
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

const automaticFixture = async () => {
  const { db, schema, store, research } = active();
  const [campaign] = await db
    .insert(schema.outboundCampaign)
    .values({
      name: "Fixture campaign",
      status: "active",
      createdBy: "fixture",
      updatedBy: "fixture",
      criteria: {
        ...defaultCampaignCriteria(settings),
        teamSizeMin: null,
        teamSizeMax: null,
        annualRevenueMin: null,
        annualRevenueMax: null,
      },
    })
    .returning();
  if (!campaign) throw new Error("Missing campaign");
  await db
    .update(schema.outboundProspect)
    .set({ campaignId: campaign.id })
    .where(eq(schema.outboundProspect.id, fixture.prospectId));
  await db.insert(schema.outboundCampaignCompany).values({
    campaignId: campaign.id,
    domain: "samplegoods.com",
    name: "Sample Goods",
    website: "https://samplegoods.com",
    country: "US",
    platform: "shopify",
    source: "apollo",
    status: "added",
    prospectId: fixture.prospectId,
    criteriaRevision: campaign.revision,
  });
  const row = value(await store.readProspect(fixture.prospectId))!;
  const request = `fixture-verification-${randomUUID()}`;
  await db.insert(schema.outboundIntegrationJob).values({
    provider: "apollo",
    prospectId: row.id,
    requestId: request,
    status: "complete",
    input: {
      operation: "verify",
      revision: row.revision,
      email: row.details.email,
    },
    output: {
      records: [
        { record_id: "recipient", input: { email: row.details.email } },
      ],
      results: [
        {
          recordId: "recipient",
          email: row.details.email,
          status: "verified",
          verifiedAt: row.details.emailVerifiedAt,
        },
      ],
    },
  });
  value(
    await store.patchProspect(
      "operator",
      row.id,
      { emailSource: `Apollo verification ${request}; record recipient` },
      row.revision,
    ),
  );
  const saved = value(await research.saveAndApply("operator", await input()));
  value(
    await store.generateDrafts("operator", { prospect: fixture.prospectId }),
  );
  value(
    await store.savePlaybook("operator", {
      ...settings,
      automationEnabled: true,
    }),
  );
  return { campaign, research: saved.researchId };
};
const generated: typeof import("@/server/utils/outbound/draft").generateDraft =
  async (prospect, playbook) => ({
    success: true as const,
    data: { messages: renderMessages(prospect, playbook), issues: [] },
  });

const runReview = (
  options: Parameters<
    typeof import("@/server/app/outbound/automatic-draft-review").run
  >[0] = {},
  generate: typeof generated = generated,
  checkMx: typeof import("@/server/utils/outbound/mx").check = async () => ({
    success: false,
    error: new Error("DNS disabled for this fixture"),
  }),
) => active().review.run(options, generate, checkMx);

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
      modules.review = await import(
        "@/server/app/outbound/automatic-draft-review"
      );
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
    test("automatic review approves current operator-researched drafts without redrafting or sending", async () => {
      const { store, review, db, schema } = active();
      await automaticFixture();
      const before = value(await store.readProspect(fixture.prospectId))!;
      const generate = mock(generated);
      const result = value(await runReview({ maxDrafts: 2 }, generate));
      expect(result.approved).toBe(1);
      expect(generate).not.toHaveBeenCalled();
      const after = value(await store.readProspect(fixture.prospectId))!;
      expect(after.revision).toBe(before.revision);
      expect(after.messages).toEqual(before.messages);
      expect(after.approvedBy).toBe("automatic:outbound-draft-review");
      expect(after.status).toBe("approved");
      expect((await store.policy()).settings.sendingEnabled).toBe(false);
      expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(
        0,
      );
      expect(value(await runReview()).processed).toBe(0);
    });
    test("writing-only edits regenerate once, preserve immutable captures and automatically reapprove", async () => {
      const { store, review, db, schema } = active();
      const context = await automaticFixture();
      const [original] = await db
        .select()
        .from(schema.outboundIntegrationJob)
        .where(eq(schema.outboundIntegrationJob.id, context.research));
      const before = value(await store.readProspect(fixture.prospectId))!;
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: true,
          productCheckIntro: "I'm Juri, the founder of ecentic.",
          voiceNotes: "Make the opening friendlier.",
        }),
      );
      const generate = mock(generated);
      const results = await Promise.all([
        runReview({ maxDrafts: 1 }, generate),
        runReview({ maxDrafts: 1 }, generate),
      ]);
      expect(
        results
          .map(value)
          .reduce((total, result) => total + result.approved, 0),
      ).toBe(1);
      expect(generate).toHaveBeenCalledTimes(1);
      const after = value(await store.readProspect(fixture.prospectId))!;
      expect(after.status).toBe("approved");
      expect(after.revision).toBe(before.revision + 1);
      expect(after.messages[0]?.body).toContain(
        "I'm Juri, the founder of ecentic.",
      );
      expect(after.messages[0]?.body).toContain(receipt().selected.observation);
      expect(after.details.shoppingResearchId).toBe(context.research);
      const [unchanged] = await db
        .select()
        .from(schema.outboundIntegrationJob)
        .where(eq(schema.outboundIntegrationJob.id, context.research));
      expect(unchanged).toEqual(original);
      expect(after.details.evidenceCheckedAt).toBe(
        before.details.evidenceCheckedAt,
      );
      const [oldRevision] = await db
        .select()
        .from(schema.outboundRevision)
        .where(eq(schema.outboundRevision.revision, before.revision));
      expect(oldRevision?.messages).toEqual(before.messages);
      expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(
        0,
      );
    });
    test("a hold during generation wins atomically, and explicit holds are not retried", async () => {
      const { store, review } = active();
      await automaticFixture();
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: true,
          voiceNotes: "New voice",
        }),
      );
      const before = value(await store.readProspect(fixture.prospectId))!;
      const generate = mock(
        async (...arguments_: Parameters<typeof generated>) => {
          value(
            await store.reviewProspect("operator", {
              prospect: before.id,
              revision: before.revision,
              decision: "hold",
              reason: "Discuss this account first",
            }),
          );
          return generated(...arguments_);
        },
      );
      expect(value(await runReview({ maxDrafts: 1 }, generate)).approved).toBe(
        0,
      );
      const after = value(await store.readProspect(before.id))!;
      expect(after.status).toBe("held");
      expect(after.messages).toEqual(before.messages);
      expect(after.revision).toBe(before.revision);
      expect(value(await runReview({ maxDrafts: 1 }, generate)).processed).toBe(
        0,
      );
      expect(generate).toHaveBeenCalledTimes(1);
    });
    test("an invented finding rolls back both refresh and approval", async () => {
      const { store, review } = active();
      await automaticFixture();
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: true,
          voiceNotes: "New voice",
        }),
      );
      const before = value(await store.readProspect(fixture.prospectId))!;
      const generate = mock(
        async (...arguments_: Parameters<typeof generated>) => {
          const draft = await generated(...arguments_);
          if (!draft.success) return draft;
          draft.data.messages[0]!.body = draft.data.messages[0]!.body.replace(
            "$40",
            "$50",
          );
          return draft;
        },
      );
      expect(value(await runReview({ maxDrafts: 1 }, generate)).approved).toBe(
        0,
      );
      const after = value(await store.readProspect(before.id))!;
      expect(after.messages).toEqual(before.messages);
      expect(after.revision).toBe(before.revision);
      expect(after.approvedAt).toBeNull();
    });
    test("suppression and changed research requirements hold before paid drafting", async () => {
      const { store, review, db, schema } = active();
      await automaticFixture();
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: true,
          voiceNotes: "New voice",
        }),
      );
      await db.insert(schema.outboundSuppression).values({
        scope: "email",
        value: "jane@samplegoods.com",
        reason: "Opt out",
        createdBy: "fixture",
      });
      const generate = mock(generated);
      expect(value(await runReview({ maxDrafts: 1 }, generate)).approved).toBe(
        0,
      );
      expect(generate).not.toHaveBeenCalled();
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: true,
          researchInstructions: "Different research requirements",
        }),
      );
      expect(value(await runReview({ maxDrafts: 1 }, generate)).approved).toBe(
        0,
      );
      expect(generate).not.toHaveBeenCalled();
    });
    test("older receipts without a research policy snapshot remain held across Playbook revisions", async () => {
      const { store, review, db, schema } = active();
      const context = await automaticFixture();
      await db.execute(
        sql`update outbound_integration_job set input = input - 'researchPolicyHash' where id = ${context.research}`,
      );
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: true,
          voiceNotes: "New voice",
        }),
      );
      const generate = mock(generated);
      const result = value(await runReview({ maxDrafts: 1 }, generate));
      expect(result.approved).toBe(0);
      expect(generate).not.toHaveBeenCalled();
      expect(
        value(await store.readProspect(fixture.prospectId))?.approvedAt,
      ).toBeNull();
    });
    test("disabled automatic mode and a paused campaign never approve drafts", async () => {
      const { store, review, db, schema } = active();
      const context = await automaticFixture();
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: false,
        }),
      );
      expect(value(await runReview()).processed).toBe(0);
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: true,
        }),
      );
      await db
        .update(schema.outboundCampaign)
        .set({ status: "paused" })
        .where(eq(schema.outboundCampaign.id, context.campaign.id));
      expect(value(await runReview()).processed).toBe(0);
    });
    test("a lost draft provider request is marked uncertain and is never purchased again", async () => {
      const { store, review, db, schema } = active();
      const context = await automaticFixture();
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: true,
          voiceNotes: "New voice",
        }),
      );
      const row = value(await store.readProspect(fixture.prospectId))!;
      const policy = await store.policy();
      const [job] = await db
        .insert(schema.outboundIntegrationJob)
        .values({
          provider: "automation",
          prospectId: row.id,
          status: "starting",
          requestId: `draft-review:${row.id}:${row.revision}:${policy.revision}`,
          input: {
            operation: "draftReview",
            prospectId: row.id,
            prospectRevision: row.revision,
            campaignId: context.campaign.id,
            campaignRevision: context.campaign.revision,
            playbookRevision: policy.revision,
            regenerate: true,
            readinessKey: draftReviewReadinessKey(
              row.details,
              policy.settings.senderConfirmed,
            ),
            resumeId: "",
          },
          output: {
            stage: "draft",
            lease: {
              token: randomUUID(),
              expiresAt: new Date(now.getTime() - 1).toISOString(),
            },
          },
        })
        .returning();
      const generate = mock(generated);
      expect(value(await runReview({ maxDrafts: 1 }, generate)).processed).toBe(
        0,
      );
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: true,
          voiceNotes: "Another voice",
        }),
      );
      expect(value(await runReview({ maxDrafts: 1 }, generate)).processed).toBe(
        0,
      );
      expect(generate).not.toHaveBeenCalled();
      const [saved] = await db
        .select()
        .from(schema.outboundIntegrationJob)
        .where(eq(schema.outboundIntegrationJob.id, job!.id));
      expect(saved?.status).toBe("uncertain");
    });
    test("expiry and any earlier send attempt block automatic approval without altering draft history", async () => {
      const { store, review, db, schema } = active();
      await automaticFixture();
      const before = value(await store.readProspect(fixture.prospectId))!;
      const generate = mock(generated);
      setSystemTime(new Date(now.getTime() + 8 * 86_400_000));
      expect(value(await runReview({ maxDrafts: 1 }, generate)).approved).toBe(
        0,
      );
      expect(generate).not.toHaveBeenCalled();
      setSystemTime(now);
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: true,
          voiceNotes: "New voice",
        }),
      );
      await db.insert(schema.outboundSendAttempt).values({
        prospectId: before.id,
        inboxId: fixture.inboxId,
        revision: before.revision,
        step: 1,
        status: "uncertain",
        messageId: "<fixture@samplegoods.com>",
        contentHash: "fixture",
      });
      expect(value(await runReview({ maxDrafts: 1 }, generate)).approved).toBe(
        0,
      );
      expect(generate).not.toHaveBeenCalled();
      expect(value(await store.readProspect(before.id))?.revision).toBe(
        before.revision,
      );
    });
    test("a Playbook change during generation rejects the draft and leaves the earlier version intact", async () => {
      const { store, review } = active();
      await automaticFixture();
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: true,
          voiceNotes: "New voice",
        }),
      );
      const before = value(await store.readProspect(fixture.prospectId))!;
      const generate = mock(
        async (...arguments_: Parameters<typeof generated>) => {
          value(
            await store.savePlaybook("operator", {
              ...settings,
              automationEnabled: true,
              voiceNotes: "Changed during request",
            }),
          );
          return generated(...arguments_);
        },
      );
      expect(value(await runReview({ maxDrafts: 1 }, generate)).approved).toBe(
        0,
      );
      expect(value(await store.readProspect(before.id))?.messages).toEqual(
        before.messages,
      );
      expect(value(await store.readProspect(before.id))?.revision).toBe(
        before.revision,
      );
    });
    test("fresh receipt checks resume a failed preflight without changing the prospect revision", async () => {
      const { store, review } = active();
      await automaticFixture();
      const before = value(await store.readProspect(fixture.prospectId))!;
      setSystemTime(new Date(now.getTime() + 2 * 86_400_000));
      const generate = mock(generated);
      expect(value(await runReview({ maxDrafts: 1 }, generate)).approved).toBe(
        0,
      );
      value(
        await store.patchProspect(
          "operator",
          before.id,
          { mxCheckedAt: new Date().toISOString() },
          before.revision,
        ),
      );
      expect(value(await store.readProspect(before.id))?.revision).toBe(
        before.revision,
      );
      expect(value(await runReview({ maxDrafts: 1 }, generate)).approved).toBe(
        1,
      );
      expect(generate).not.toHaveBeenCalled();
    });
    test("editable verified labels cannot replace the actual provider receipt", async () => {
      const { store, review, db } = active();
      await automaticFixture();
      await db.execute(
        sql`update outbound_integration_job set status = 'failed' where provider = 'apollo'`,
      );
      const generate = mock(generated);
      expect(value(await runReview({ maxDrafts: 1 }, generate)).approved).toBe(
        0,
      );
      expect(generate).not.toHaveBeenCalled();
      expect(
        value(await store.readProspect(fixture.prospectId))?.approvedAt,
      ).toBeNull();
    });
    test("explicit resume admits a known failed review, but provider uncertainty remains a hold across edits", async () => {
      const { store, review } = active();
      await automaticFixture();
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: true,
          voiceNotes: "New voice",
        }),
      );
      const before = value(await store.readProspect(fixture.prospectId))!;
      const holding = mock(
        async (...arguments_: Parameters<typeof generated>) => {
          value(
            await store.reviewProspect("operator", {
              prospect: before.id,
              revision: before.revision,
              decision: "hold",
              reason: "Pause briefly",
            }),
          );
          return generated(...arguments_);
        },
      );
      expect(value(await runReview({ maxDrafts: 1 }, holding)).approved).toBe(
        0,
      );
      value(
        await store.reviewProspect("operator", {
          prospect: before.id,
          revision: before.revision,
          decision: "review",
          reason: "",
        }),
      );
      expect(value(await runReview({ maxDrafts: 1 }, generated)).approved).toBe(
        1,
      );
    });
    test("thrown provider errors are uncertain and do not replay after a Playbook edit", async () => {
      const { store, review, db, schema } = active();
      await automaticFixture();
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: true,
          voiceNotes: "New voice",
        }),
      );
      const generate = mock(async () => {
        throw new Error("Lost provider connection");
      });
      expect(value(await runReview({ maxDrafts: 1 }, generate)).approved).toBe(
        0,
      );
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: true,
          voiceNotes: "Next voice",
        }),
      );
      expect(value(await runReview({ maxDrafts: 1 }, generate)).processed).toBe(
        0,
      );
      expect(generate).toHaveBeenCalledTimes(1);
      const [job] = await db
        .select()
        .from(schema.outboundIntegrationJob)
        .where(eq(schema.outboundIntegrationJob.status, "uncertain"));
      expect(job?.input["operation"]).toBe("draftReview");
      const item = value(await store.getReviewItem({ id: fixture.prospectId }));
      expect(
        item?.prospect.issues.some(
          (issue) => issue.code === "automaticReviewUncertain",
        ),
      ).toBe(true);
    });
    test("pausing during generation retains the completed draft and resumes without another provider call", async () => {
      const { store, review } = active();
      await automaticFixture();
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: true,
          voiceNotes: "New voice",
        }),
      );
      const generate = mock(
        async (...arguments_: Parameters<typeof generated>) => {
          value(
            await store.savePlaybook("operator", {
              ...settings,
              automationEnabled: false,
              voiceNotes: "New voice",
            }),
          );
          return generated(...arguments_);
        },
      );
      expect(value(await runReview({ maxDrafts: 1 }, generate)).approved).toBe(
        0,
      );
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: true,
          voiceNotes: "New voice",
        }),
      );
      expect(value(await runReview({ maxDrafts: 1 }, generate)).approved).toBe(
        1,
      );
      expect(generate).toHaveBeenCalledTimes(1);
    });
    test("a fresh standalone verification can replace an older automation verification receipt", async () => {
      const { store, review, research, db, schema } = active();
      const context = await automaticFixture();
      const row = value(await store.readProspect(fixture.prospectId))!;
      const [original] = await db
        .insert(schema.outboundIntegrationJob)
        .values({
          provider: "automation",
          prospectId: row.id,
          status: "complete",
          input: {
            operation: "campaignAutomation",
            campaignId: context.campaign.id,
            campaignRevision: context.campaign.revision,
            playbookRevision: (await store.policy()).revision,
          },
          output: {
            prospectId: row.id,
            stage: "complete",
            selection: {
              status: "selected",
              provisional: false,
              person: {
                name: row.details.name,
                first: row.details.first,
                title: row.details.title,
                email: row.details.email,
                domain: row.details.domain,
                linkedinUrl: row.details.linkedinUrl,
              },
              details: {
                roleSource: row.details.roleSource,
                roleCheckedAt: row.details.roleCheckedAt,
                timezone: row.details.timezone,
              },
            },
            qualification: {
              status: "qualified",
              details: { ...row.details, gap: "product-published-data" },
            },
            verification: {
              requestId: "expired-old-verification",
              records: [],
            },
            verificationResult: {
              requestId: "expired-old-verification",
              status: "complete",
              results: [],
            },
          },
        })
        .returning();
      value(
        await store.patchProspect(
          "operator",
          row.id,
          { automationEvidenceId: original!.id },
          row.revision,
        ),
      );
      value(await research.saveAndApply("operator", await input()));
      value(await store.generateDrafts("operator", { prospect: row.id }));
      expect(value(await runReview({ maxDrafts: 1 }, generated)).approved).toBe(
        1,
      );
    });
    test("stale known MX refreshes from actual DNS before automatic approval", async () => {
      const { store, db, schema } = active();
      await automaticFixture();
      const before = value(await store.readProspect(fixture.prospectId))!;
      setSystemTime(new Date(now.getTime() + 2 * 86_400_000));
      const checkMx = mock(async () => ({
        success: true as const,
        data: {
          provider: "google" as const,
          records: ["aspmx.l.google.com"],
          checkedAt: new Date().toISOString(),
        },
      }));
      const generate = mock(generated);
      expect(
        value(await runReview({ maxDrafts: 1 }, generate, checkMx)).approved,
      ).toBe(1);
      expect(checkMx).toHaveBeenCalledTimes(1);
      expect(checkMx).toHaveBeenCalledWith(before.details.email);
      expect(generate).not.toHaveBeenCalled();
      const after = value(await store.readProspect(before.id))!;
      expect(after.details.mxCheckedAt).toBe(new Date().toISOString());
      expect(after.details.evidenceCheckedAt).toBe(
        before.details.evidenceCheckedAt,
      );
      expect(after.revision).toBe(before.revision);
      expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(
        0,
      );
    });
    test.each(["unknown", "microsoft"] as const)(
      "changed MX provider %s remains held",
      async (provider) => {
        const { store } = active();
        await automaticFixture();
        setSystemTime(new Date(now.getTime() + 2 * 86_400_000));
        const checkMx = mock(async () => ({
          success: true as const,
          data: {
            provider,
            records: [],
            checkedAt: new Date().toISOString(),
          },
        }));
        const generate = mock(generated);
        expect(
          value(await runReview({ maxDrafts: 1 }, generate, checkMx)).approved,
        ).toBe(0);
        const after = value(await store.readProspect(fixture.prospectId))!;
        expect(after.details.mxProvider).toBe(provider);
        expect(after.details.mxCheckedAt).toBe(new Date().toISOString());
        expect(after.approvedAt).toBeNull();
        expect(generate).not.toHaveBeenCalled();
      },
    );
    test("a hold racing a changed-provider DNS response is preserved", async () => {
      const { store } = active();
      await automaticFixture();
      const before = value(await store.readProspect(fixture.prospectId))!;
      setSystemTime(new Date(now.getTime() + 2 * 86_400_000));
      const checkMx = mock(async () => {
        value(
          await store.reviewProspect("operator", {
            prospect: before.id,
            revision: before.revision,
            decision: "hold",
            reason: "Keep this lead paused",
          }),
        );
        return {
          success: true as const,
          data: {
            provider: "microsoft" as const,
            records: [],
            checkedAt: new Date().toISOString(),
          },
        };
      });
      expect(
        value(await runReview({ maxDrafts: 1 }, generated, checkMx)).approved,
      ).toBe(0);
      const after = value(await store.readProspect(before.id))!;
      expect(after.status).toBe("held");
      expect(after.holdReason).toBe("Keep this lead paused");
      expect(after.details.mxProvider).toBe(before.details.mxProvider);
      expect(after.details.mxCheckedAt).toBe(before.details.mxCheckedAt);
      expect(after.revision).toBe(before.revision);
    });
    test("paused automation performs no DNS lookup and a pause during DNS discards the result", async () => {
      const { store } = active();
      await automaticFixture();
      const before = value(await store.readProspect(fixture.prospectId))!;
      setSystemTime(new Date(now.getTime() + 2 * 86_400_000));
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: false,
        }),
      );
      const checkMx = mock(async () => {
        value(
          await store.savePlaybook("operator", {
            ...settings,
            automationEnabled: false,
          }),
        );
        return {
          success: true as const,
          data: {
            provider: "google" as const,
            records: [],
            checkedAt: new Date().toISOString(),
          },
        };
      });
      expect(
        value(await runReview({ maxDrafts: 1 }, generated, checkMx)).processed,
      ).toBe(0);
      expect(checkMx).not.toHaveBeenCalled();
      value(
        await store.savePlaybook("operator", {
          ...settings,
          automationEnabled: true,
        }),
      );
      expect(
        value(await runReview({ maxDrafts: 1 }, generated, checkMx)).approved,
      ).toBe(0);
      expect(checkMx).toHaveBeenCalledTimes(1);
      expect(
        value(await store.readProspect(before.id))?.details.mxCheckedAt,
      ).toBe(before.details.mxCheckedAt);
    });
    test("editing a held draft or its details never resumes automatic review", async () => {
      const { store } = active();
      await automaticFixture();
      const before = value(await store.readProspect(fixture.prospectId))!;
      value(
        await store.reviewProspect("operator", {
          prospect: before.id,
          revision: before.revision,
          decision: "hold",
          reason: "Discuss before outreach",
        }),
      );
      value(
        await store.saveDraft("operator", {
          prospect: before.id,
          revision: before.revision,
          subject: before.messages[0]!.subject,
          body: before.messages[0]!.body,
          followupOne: before.messages[1]!.body,
          followupTwo: before.messages[2]!.body,
        }),
      );
      const edited = value(await store.readProspect(before.id))!;
      expect(edited.status).toBe("held");
      expect(edited.holdReason).toBe("Discuss before outreach");
      value(
        await store.patchProspect(
          "operator",
          before.id,
          { notes: "Updated while paused" },
          edited.revision,
        ),
      );
      const detailed = value(await store.readProspect(before.id))!;
      expect(detailed.status).toBe("held");
      expect(detailed.holdReason).toBe("Discuss before outreach");
      expect(value(await runReview({ maxDrafts: 1 })).processed).toBe(0);
    });
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
      await db.insert(schema.outboundIntegrationJob).values({
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
