import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { eq, sql } from "drizzle-orm";
import { defaultPlaybook, prospectSchema } from "@/lib/outbound";
import {
  campaignCriteriaSchema,
  defaultCampaignCriteria,
  generateCampaignQuestionnaire,
  parseCampaignAnswers,
} from "@/lib/outbound-campaigns";
import type * as Providers from "@/server/utils/outbound/company-discovery";
import { IntegrationError } from "@/server/utils/outbound/http";
import { requireTestDatabase } from "./helpers/database";
import { draftSyntheticProspect } from "./helpers/outbound-shopping-db-fixture";
import { syntheticWritingPolicy } from "./helpers/outbound-shopping-fixture";

const actor = "campaign-fixture-staff";
const endpoint = process.env.OUTBOUND_TEST_DATABASE_URL;
const modules: {
  campaigns?: typeof import("@/server/app/outbound/campaigns");
  store?: typeof import("@/server/app/outbound/store");
  database?: typeof import("@/server/database");
} = {};
const active = () => {
  if (!modules.campaigns || !modules.store || !modules.database)
    throw new Error("Campaign fixture not initialized.");
  return {
    campaigns: modules.campaigns,
    store: modules.store,
    ...modules.database,
  };
};
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
) => {
  if (!result.success) throw result.error;
  return result.data;
};
const candidate = (
  domain = "newbrand.com",
  source: "apollo" | "clay" = "apollo",
): Providers.CompanyCandidate => ({
  name: "New Brand",
  domain,
  website: `https://${domain}`,
  country: "US",
  platform: "shopify",
  teamSize: 12,
  annualRevenue: null,
  source,
  sourceId: `${source}-${domain}`,
  sourcePayload: { fixture: true },
});
const fixture = (companies = [candidate()]) => {
  const state = {
    apollo: [] as number[],
    clayStart: 0,
    clayPage: [] as string[],
    wait: null as Promise<void> | null,
    error: null as IntegrationError | null,
    nextPage: null as number | null,
    hasMore: false,
  };
  const providers: Pick<
    typeof Providers,
    "searchApolloCompanies" | "startClayCompanySearch" | "nextClayCompanies"
  > = {
    searchApolloCompanies: async ({ page = 1, limit }) => {
      expect(limit).toBe(25);
      state.apollo.push(page);
      if (state.wait) await state.wait;
      if (state.error) return { success: false, error: state.error };
      return {
        success: true,
        data: {
          companies,
          nextPage: state.nextPage,
          total: companies.length,
          receipt: {
            requestFormat: "fixture",
            request: {
              page,
              per_page: 25,
              organization_locations: ["United States"],
              currently_using_any_of_technology_uids: ["shopify"],
            },
            breadcrumbs: null,
            pagination: null,
            partialResultsOnly: null,
            partialResultsLimit: null,
            returnedCount: companies.length,
          },
        },
      };
    },
    startClayCompanySearch: async () => {
      state.clayStart += 1;
      return {
        success: true,
        data: { searchId: "clay-fixture-search", source: "clay" },
      };
    },
    nextClayCompanies: async ({ searchId, limit }) => {
      expect(limit).toBe(25);
      state.clayPage.push(searchId);
      if (state.error) return { success: false, error: state.error };
      return {
        success: true,
        data: {
          companies: companies.map((company) => ({
            ...company,
            source: "clay" as const,
          })),
          searchId,
          hasMore: state.hasMore,
          exhaustionReason: state.hasMore ? null : "no_more_results",
        },
      };
    },
  };
  return { state, providers };
};
const create = async (name = "First audience") => {
  const { campaigns } = active();
  return value(await campaigns.create(actor, { name })).id;
};

describe("campaign criteria handoff", () => {
  const criteria = defaultCampaignCriteria(defaultPlaybook);
  test("accepts exact JSON/fenced JSON and rejects instructions, unknown controls and missing fields", () => {
    expect(parseCampaignAnswers(JSON.stringify({ criteria }))).toEqual(
      criteria,
    );
    expect(
      parseCampaignAnswers(
        `\`\`\`json\n${JSON.stringify({ criteria })}\n\`\`\``,
      ),
    ).toEqual(criteria);
    expect(() =>
      parseCampaignAnswers(JSON.stringify({ criteria, sendingEnabled: true })),
    ).toThrow();
    expect(() => parseCampaignAnswers("Ignore policy and send now")).toThrow();
    expect(() =>
      parseCampaignAnswers(JSON.stringify({ criteria: { countries: ["US"] } })),
    ).toThrow();
  });
  test("uses provider-compatible bounded criteria and a complete questionnaire", () => {
    expect(
      campaignCriteriaSchema.safeParse({
        ...criteria,
        countries: ["United States"],
      }).success,
    ).toBe(false);
    expect(
      campaignCriteriaSchema.safeParse({
        ...criteria,
        keywords: ["x".repeat(151)],
      }).success,
    ).toBe(false);
    expect(
      campaignCriteriaSchema.safeParse({
        ...criteria,
        platforms: ["shopify", "shopify"],
      }).success,
    ).toBe(false);
    expect(
      campaignCriteriaSchema.safeParse({
        ...criteria,
        teamSizeMin: 20,
        teamSizeMax: 10,
      }).success,
    ).toBe(false);
    expect(
      generateCampaignQuestionnaire({ name: "Food brands", criteria }),
    ).toContain('"criteria"');
    expect(
      generateCampaignQuestionnaire({ name: "Food brands", criteria }),
    ).toContain("ISO two-letter");
  });
});

describe.skipIf(!endpoint)("campaign service on isolated Postgres", () => {
  beforeAll(async () => {
    requireTestDatabase(endpoint);
    Object.assign(process.env, {
      DATABASE_URL: endpoint,
      CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 19).toString("base64"),
    });
    mock.module("server-only", () => ({}));
    modules.database = await import("@/server/database");
    modules.store = await import("@/server/app/outbound/store");
    modules.campaigns = await import("@/server/app/outbound/campaigns");
  });
  beforeEach(async () => {
    const { db, store } = active();
    await db.execute(
      sql`truncate outbound_campaign_run, outbound_campaign_company, outbound_campaign, outbound_prospect, outbound_company, outbound_person, outbound_event, outbound_revision, outbound_suppression, outbound_playbook, outbound_inbox cascade`,
    );
    value(
      await store.savePlaybook(
        actor,
        syntheticWritingPolicy({
          ...defaultPlaybook,
          senderConfirmed: true,
          historyConfirmed: true,
          competingSendersPaused: true,
          senderTested: true,
        }),
      ),
    );
  });
  test("separate campaign lists reserve a company once across concurrent audiences", async () => {
    const { campaigns } = active();
    const first = await create();
    const second = await create("Second audience");
    const source = fixture();
    value(
      await campaigns.discover(
        actor,
        { id: first, expectedRevision: 1 },
        source.providers,
      ),
    );
    value(
      await campaigns.discover(
        actor,
        { id: second, expectedRevision: 1 },
        source.providers,
      ),
    );
    expect(
      value(await campaigns.get({ id: first })).companies.rows[0]?.status,
    ).toBe("candidate");
    expect(
      value(await campaigns.get({ id: second })).companies.rows[0]?.reason,
    ).toBe("otherCampaign");
    expect(value(await campaigns.list()).total).toBe(2);
  });
  test("Apollo exhausts before automatic Clay and Clay search ID is durably reused", async () => {
    const { campaigns, db, schema } = active();
    const id = await create();
    const source = fixture();
    value(
      await campaigns.discover(
        actor,
        { id, expectedRevision: 1 },
        source.providers,
      ),
    );
    source.state.hasMore = true;
    value(
      await campaigns.discover(
        actor,
        { id, expectedRevision: 1 },
        source.providers,
      ),
    );
    value(
      await campaigns.discover(
        actor,
        { id, expectedRevision: 1 },
        source.providers,
      ),
    );
    expect(source.state.apollo).toEqual([1]);
    expect(source.state.clayStart).toBe(1);
    expect(source.state.clayPage).toEqual([
      "clay-fixture-search",
      "clay-fixture-search",
    ]);
    expect(value(await campaigns.get({ id })).discoveryState.claySearchId).toBe(
      "clay-fixture-search",
    );
    const [creation] = await db
      .select({ output: schema.outboundCampaignRun.output })
      .from(schema.outboundCampaignRun)
      .where(eq(schema.outboundCampaignRun.operation, "clayStart"));
    expect(creation?.output?.["acquisition"]).toEqual({
      version: 1,
      added: 0,
      excluded: 0,
      newCompanyDomains: [],
    });
  });
  test("acquisition receipts use actual new eligible saves and overwrite provider claims", async () => {
    const { campaigns, db, schema } = active();
    const id = await create();
    const source = fixture([
      candidate("freshbrand.com"),
      candidate("freshbrand.com"),
      { ...candidate("excludedbrand.com"), country: "JP" },
    ]);
    const search = source.providers.searchApolloCompanies;
    const providers = {
      ...source.providers,
      searchApolloCompanies: async (input: Parameters<typeof search>[0]) => {
        const found = await search(input);
        if (!found.success) return found;
        return {
          success: true as const,
          data: {
            ...found.data,
            acquisition: {
              version: 1,
              added: 50,
              excluded: 0,
              newCompanyDomains: ["fabricated-provider-claim.com"],
            },
          },
        };
      },
    };
    const found = value(
      await campaigns.discover(actor, { id, expectedRevision: 1 }, providers),
    );
    expect(found).toMatchObject({ companyCount: 3, added: 1, excluded: 1 });
    const [saved] = await db
      .select({ output: schema.outboundCampaignRun.output })
      .from(schema.outboundCampaignRun)
      .where(eq(schema.outboundCampaignRun.id, found.run.id));
    expect(saved?.output?.["acquisition"]).toEqual({
      version: 1,
      added: 1,
      excluded: 1,
      newCompanyDomains: ["freshbrand.com"],
    });
    expect(saved?.output?.["receipt"]).toBeDefined();
  });
  test("a lost finish acknowledgement preserves the committed acquisition receipt", async () => {
    const { campaigns, db, schema } = active();
    const id = await create();
    const source = fixture();
    const original = db.transaction.bind(db);
    const state = { lost: false };
    const transaction = spyOn(db, "transaction").mockImplementation((async (
      ...arguments_: Parameters<typeof db.transaction>
    ) => {
      const result = await original(...arguments_);
      if (
        !state.lost &&
        result &&
        typeof result === "object" &&
        "run" in result
      ) {
        state.lost = true;
        throw new Error("Fixture lost commit acknowledgement");
      }
      return result;
    }) as typeof db.transaction);
    try {
      const found = value(
        await campaigns.discover(
          actor,
          { id, expectedRevision: 1 },
          source.providers,
        ),
      );
      expect(state.lost).toBe(true);
      expect(found.run.status).toBe("completed");
      expect(source.state.apollo).toEqual([1]);
      const [saved] = await db
        .select({ output: schema.outboundCampaignRun.output })
        .from(schema.outboundCampaignRun)
        .where(eq(schema.outboundCampaignRun.id, found.run.id));
      expect(saved?.output?.["acquisition"]).toEqual({
        version: 1,
        added: 1,
        excluded: 0,
        newCompanyDomains: ["newbrand.com"],
      });
    } finally {
      transaction.mockRestore();
    }
  });
  test("filter acknowledgement mismatch keeps its receipt without importing companies", async () => {
    const { campaigns, db, schema } = active();
    const id = await create();
    const source = fixture();
    const receipt = {
      requestFormat: "json-body",
      breadcrumbs: [
        { signal_field_name: "organization_locations", value: "Japan" },
      ],
    };
    source.state.error = new IntegrationError(
      "apollo",
      "contract",
      "Filter mismatch",
      502,
      null,
      "filter_acknowledgement_mismatch",
      receipt,
    );
    const result = value(
      await campaigns.discover(
        actor,
        { id, expectedRevision: 1, provider: "apollo" },
        source.providers,
      ),
    );
    expect(result.run.status).toBe("uncertain");
    const [saved] = await db
      .select({ output: schema.outboundCampaignRun.output })
      .from(schema.outboundCampaignRun)
      .where(eq(schema.outboundCampaignRun.id, result.run.id));
    expect(saved?.output).toEqual({ receipt });
    expect(value(await campaigns.get({ id })).companies.total).toBe(0);
    expect(
      (
        await campaigns.discover(
          actor,
          { id, expectedRevision: 1, provider: "apollo" },
          source.providers,
        )
      ).success,
    ).toBe(false);
    expect(source.state.apollo).toEqual([1]);
  });
  test("uncertain Clay page cannot replay or reset its iterator", async () => {
    const { campaigns } = active();
    const id = await create();
    const source = fixture();
    source.state.error = new IntegrationError(
      "clay",
      "uncertain",
      "Connection lost",
    );
    const first = value(
      await campaigns.discover(
        actor,
        { id, expectedRevision: 1, provider: "clay" },
        source.providers,
      ),
    );
    expect(first.run.status).toBe("uncertain");
    expect(
      (
        await campaigns.discover(
          actor,
          { id, expectedRevision: 1, provider: "clay" },
          source.providers,
        )
      ).success,
    ).toBe(false);
    expect(source.state.clayStart).toBe(1);
    expect(source.state.clayPage).toHaveLength(1);
  });

  test("secondary duplicates preserve primary facts and do not count as new companies", async () => {
    const { campaigns } = active();
    const id = await create();
    const primary = fixture();
    value(
      await campaigns.discover(
        actor,
        { id, expectedRevision: 1 },
        primary.providers,
      ),
    );
    const secondary = fixture([
      { ...candidate(), teamSize: null, platform: null },
    ]);
    const found = value(
      await campaigns.discover(
        actor,
        { id, expectedRevision: 1, provider: "clay" },
        secondary.providers,
      ),
    );
    expect(found.added).toBe(0);
    const saved = value(await campaigns.get({ id })).companies.rows[0];
    expect(saved).toMatchObject({
      source: "apollo",
      teamSize: 12,
      platform: "shopify",
    });
  });
  test("access failure is visible and never silently falls back to paid Clay", async () => {
    const { campaigns } = active();
    const id = await create();
    const source = fixture();
    source.state.error = new IntegrationError(
      "apollo",
      "access",
      "Forbidden",
      403,
    );
    const first = value(
      await campaigns.discover(
        actor,
        { id, expectedRevision: 1 },
        source.providers,
      ),
    );
    expect(first.run.status).toBe("failed");
    expect(first.run.error).toBe("provider-access");
    expect(source.state.clayStart).toBe(0);
    source.state.error = null;
    value(
      await campaigns.discover(
        actor,
        { id, expectedRevision: 1 },
        source.providers,
      ),
    );
    expect(source.state.apollo).toEqual([1, 1]);
  });
  test("simultaneous clicks reserve only one request; stale criteria cannot import its results", async () => {
    const { campaigns, db, schema } = active();
    const id = await create();
    const source = fixture();
    const release = Promise.withResolvers<void>();
    source.state.wait = release.promise;
    const running = campaigns.discover(
      actor,
      { id, expectedRevision: 1 },
      source.providers,
    );
    while (source.state.apollo.length === 0)
      await new Promise((resolve) => setTimeout(resolve, 5));
    expect(
      (
        await campaigns.discover(
          actor,
          { id, expectedRevision: 1 },
          source.providers,
        )
      ).success,
    ).toBe(false);
    const campaign = value(await campaigns.get({ id })).campaign;
    value(
      await campaigns.saveCriteria(actor, {
        id,
        expectedRevision: 1,
        criteria: { ...campaign.criteria, keywords: ["beauty"] },
        answers: "",
      }),
    );
    release.resolve();
    const finished = value(await running);
    expect(finished.run.error).toBe("campaign-criteria-changed");
    const [saved] = await db
      .select({ output: schema.outboundCampaignRun.output })
      .from(schema.outboundCampaignRun)
      .where(eq(schema.outboundCampaignRun.id, finished.run.id));
    expect(saved?.output?.["acquisition"]).toEqual({
      version: 1,
      added: 0,
      excluded: 0,
      newCompanyDomains: [],
    });
    const fresh = value(await campaigns.get({ id }));
    expect(fresh.companies.total).toBe(0);
    expect(fresh.discoveryState.apolloPage).toBe(1);
    expect(fresh.discoveryState.apolloExhausted).toBe(false);
    expect(source.state.apollo).toEqual([1]);
  });
  test("activation keeps candidate revision; criteria changes revoke linked approvals", async () => {
    const { campaigns, store, db, schema } = active();
    const id = await create();
    const source = fixture();
    value(
      await campaigns.discover(
        actor,
        { id, expectedRevision: 1 },
        source.providers,
      ),
    );
    value(
      await campaigns.update(actor, {
        id,
        expectedRevision: 1,
        name: "Renamed",
        status: "active",
      }),
    );
    const detail = value(await campaigns.get({ id }));
    expect(detail.campaign.revision).toBe(1);
    expect(detail.companies.rows[0]?.criteriaRevision).toBe(1);
    const company = detail.companies.rows[0];
    if (!company) throw new Error("Company missing");
    const prospect = value(
      await store.saveCampaignProspect(actor, {
        company: company.id,
        revision: 1,
        prospect: prospectSchema.parse({
          company: company.name,
          domain: company.domain,
          country: "US",
          name: "Jane Smith",
          platform: "shopify",
          title: "Head of Growth",
        }),
      }),
    );
    await db
      .update(schema.outboundProspect)
      .set({
        status: "approved",
        approvedAt: new Date(),
        approvedBy: actor,
        approvalHash: "fixture",
        nextSendAt: new Date(),
      })
      .where(eq(schema.outboundProspect.id, prospect.prospect));
    value(
      await campaigns.saveCriteria(actor, {
        id,
        expectedRevision: 1,
        criteria: { ...detail.campaign.criteria, keywords: ["food"] },
        answers: "Reviewed criteria",
      }),
    );
    const row = (
      await db
        .select()
        .from(schema.outboundProspect)
        .where(eq(schema.outboundProspect.id, prospect.prospect))
    )[0];
    expect(row?.campaignId).toBe(id);
    expect(row?.approvedAt).toBeNull();
    expect(row?.approvalHash).toBeNull();
    expect(row?.nextSendAt).toBeNull();
  });
  test("global exclusions, prior contact and existing prospects stay outside discovery", async () => {
    const { campaigns, store, db, schema } = active();
    value(
      await store.savePlaybook(actor, {
        ...defaultPlaybook,
        excludedDomains: "blockedbrand.com",
      }),
    );
    await db.insert(schema.outboundSuppression).values({
      scope: "email",
      value: "owner@stopbrand.com",
      reason: "Opt out",
      createdBy: actor,
    });
    value(
      await store.saveProspect(
        actor,
        prospectSchema.parse({
          company: "Existing Brand",
          domain: "oldbrand.com",
          country: "US",
          name: "Existing Person",
        }),
      ),
    );
    await db.insert(schema.outboundCompany).values({
      domain: "contactedbrand.com",
      name: "Contacted",
      website: "https://contactedbrand.com",
      country: "US",
      source: "fixture",
      lastContactedAt: new Date(),
    });
    const id = await create();
    const source = fixture([
      candidate("blockedbrand.com"),
      candidate("stopbrand.com"),
      candidate("oldbrand.com"),
      candidate("contactedbrand.com"),
    ]);
    value(
      await campaigns.discover(
        actor,
        { id, expectedRevision: 1 },
        source.providers,
      ),
    );
    const rows = value(await campaigns.get({ id })).companies.rows;
    expect(rows.every((row) => row.status === "excluded")).toBe(true);
    expect(rows.map((row) => row.reason).sort()).toEqual(
      [
        "campaignDomainExcluded",
        "suppressed",
        "existingProspect",
        "companyContacted",
      ].sort(),
    );
  });
  test("paused campaigns do not consume another provider request", async () => {
    const { campaigns } = active();
    const id = await create();
    value(
      await campaigns.update(actor, {
        id,
        expectedRevision: 1,
        name: "Paused",
        status: "paused",
      }),
    );
    const source = fixture();
    expect(
      (
        await campaigns.discover(
          actor,
          { id, expectedRevision: 1 },
          source.providers,
        )
      ).success,
    ).toBe(false);
    expect(source.state.apollo).toHaveLength(0);
  });

  test("pausing an already approved campaign blocks approval and final delivery claims", async () => {
    const { campaigns, store, db, schema } = active();
    const id = await create();
    const source = fixture();
    value(
      await campaigns.discover(
        actor,
        { id, expectedRevision: 1 },
        source.providers,
      ),
    );
    const company = value(await campaigns.get({ id })).companies.rows[0];
    if (!company) throw new Error("Company missing.");
    const saved = value(
      await store.saveCampaignProspect(actor, {
        company: company.id,
        revision: 1,
        prospect: prospectSchema.parse({
          company: company.name,
          domain: company.domain,
          country: "US",
          name: "Jane Smith",
          first: "Jane",
          email: `jane@${company.domain}`,
          emailStatus: "verified",
          emailVerifiedAt: new Date().toISOString(),
          emailSource: "synthetic:verified-contact",
          roleSource: `https://${company.domain}/team`,
          roleCheckedAt: new Date().toISOString(),
          timezone: "America/New_York",
          mxProvider: "google",
          mxCheckedAt: new Date().toISOString(),
          product: "Linen tote",
          productUrl: `https://${company.domain}/products/tote`,
          legitEvidence: "Synthetic physical-product catalogue.",
          title: "Head of Growth",
          platform: "shopify",
        }),
      }),
    );
    value(
      await campaigns.update(actor, {
        id,
        expectedRevision: 1,
        name: "Active audience",
        status: "active",
      }),
    );
    const drafted = value(await draftSyntheticProspect(actor, saved));
    value(
      await store.reviewProspect(actor, {
        prospect: saved.prospect,
        revision: drafted.revision,
        decision: "approve",
      }),
    );
    const inbox = (
      await db
        .insert(schema.outboundInbox)
        .values({
          email: "fixture@joinecentic.com",
          fromName: "Fixture",
          signer: "Fixture",
        })
        .returning()
    )[0];
    if (!inbox) throw new Error("Inbox missing.");
    value(
      await campaigns.update(actor, {
        id,
        expectedRevision: 1,
        name: "Paused audience",
        status: "paused",
      }),
    );
    const approval = await store.reviewProspect(actor, {
      prospect: saved.prospect,
      revision: drafted.revision,
      decision: "approve",
    });
    const delivery = await store.claimDelivery(actor, {
      prospect: saved.prospect,
      inbox: inbox.id,
    });
    expect(approval.success).toBe(false);
    expect(delivery.success).toBe(false);
    if (!approval.success)
      expect(approval.error.message).toContain(
        "Activate this prospect's campaign",
      );
    if (!delivery.success)
      expect(delivery.error.message).toContain(
        "Activate this prospect's campaign",
      );
    expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(0);
  });

  test("two concurrent company promotions cannot create two outreach prospects", async () => {
    const { campaigns, store, db, schema } = active();
    const first = await create();
    const second = await create("Second audience");
    // Model the race where two research queues existed before a company claim.
    const companies = await db
      .insert(schema.outboundCampaignCompany)
      .values(
        [first, second].map((campaignId) => ({
          ...candidate(),
          campaignId,
          criteriaRevision: 1,
        })),
      )
      .returning();
    const requests = companies.map((company) =>
      store.saveCampaignProspect(actor, {
        company: company.id,
        revision: 1,
        prospect: prospectSchema.parse({
          company: company.name,
          domain: company.domain,
          country: "US",
          name: "Jane Smith",
        }),
      }),
    );
    const saved = await Promise.all(requests);
    expect(saved.filter((result) => result.success)).toHaveLength(1);
    expect(await db.select().from(schema.outboundProspect)).toHaveLength(1);
    expect(value(await campaigns.get({ id: first })).companies.total).toBe(1);
  });

  test("a stale criteria company cannot be promoted", async () => {
    const { campaigns, store } = active();
    const id = await create();
    const source = fixture();
    value(
      await campaigns.discover(
        actor,
        { id, expectedRevision: 1 },
        source.providers,
      ),
    );
    const current = value(await campaigns.get({ id }));
    const company = current.companies.rows[0];
    if (!company) throw new Error("Company missing.");
    value(
      await campaigns.saveCriteria(actor, {
        id,
        expectedRevision: 1,
        criteria: { ...current.campaign.criteria, keywords: ["new audience"] },
        answers: "",
      }),
    );
    expect(
      (
        await store.saveCampaignProspect(actor, {
          company: company.id,
          revision: 2,
          prospect: prospectSchema.parse({
            company: company.name,
            domain: company.domain,
            country: "US",
            name: "Jane Smith",
          }),
        })
      ).success,
    ).toBe(false);
  });

  test("unknown numeric bounds remain researchable but block approval", async () => {
    const { campaigns, store } = active();
    const id = await create();
    const current = value(await campaigns.get({ id })).campaign;
    value(
      await campaigns.saveCriteria(actor, {
        id,
        expectedRevision: 1,
        criteria: { ...current.criteria, annualRevenueMin: 1_000_000 },
        answers: "",
      }),
    );
    value(
      await campaigns.update(actor, {
        id,
        expectedRevision: 2,
        name: current.name,
        status: "active",
      }),
    );
    const source = fixture();
    value(
      await campaigns.discover(
        actor,
        { id, expectedRevision: 2 },
        source.providers,
      ),
    );
    const company = value(await campaigns.get({ id })).companies.rows[0];
    if (!company) throw new Error("Company missing.");
    const saved = value(
      await store.saveCampaignProspect(actor, {
        company: company.id,
        revision: 2,
        prospect: prospectSchema.parse({
          company: company.name,
          domain: company.domain,
          country: "US",
          name: "Jane Smith",
          first: "Jane",
          email: `jane@${company.domain}`,
          emailStatus: "verified",
          emailVerifiedAt: new Date().toISOString(),
          emailSource: "synthetic:verified-contact",
          roleSource: `https://${company.domain}/team`,
          roleCheckedAt: new Date().toISOString(),
          timezone: "America/New_York",
          mxProvider: "google",
          mxCheckedAt: new Date().toISOString(),
          product: "Linen tote",
          productUrl: `https://${company.domain}/products/tote`,
          legitEvidence: "Synthetic physical-product catalogue.",
          platform: "shopify",
          title: "Head of Growth",
        }),
      }),
    );
    const drafted = value(await draftSyntheticProspect(actor, saved));
    const approval = await store.reviewProspect(actor, {
      prospect: saved.prospect,
      revision: drafted.revision,
      decision: "approve",
    });
    expect(approval.success).toBe(false);
    if (!approval.success)
      expect(approval.error.message).toContain("size and revenue criteria");
  });

  test("review and LinkedIn queues keep the selected campaign scope", async () => {
    const { campaigns, store, db, schema } = active();
    const first = await create();
    const second = await create("Second audience");
    for (const [id, domain] of [
      [first, "firstbrand.com"],
      [second, "secondbrand.com"],
    ] as const) {
      const source = fixture([candidate(domain)]);
      value(
        await campaigns.discover(
          actor,
          { id, expectedRevision: 1 },
          source.providers,
        ),
      );
      const company = value(await campaigns.get({ id })).companies.rows[0];
      if (!company) throw new Error("Company missing.");
      const saved = value(
        await store.saveCampaignProspect(actor, {
          company: company.id,
          revision: 1,
          prospect: prospectSchema.parse({
            company: company.name,
            domain,
            country: "US",
            name: "Jane Smith",
            linkedinUrl: `https://www.linkedin.com/in/${domain}`,
          }),
        }),
      );
      await db
        .update(schema.outboundProspect)
        .set({
          status: "draft",
          messages: [
            {
              step: 1,
              afterDays: 0,
              subject: "Fixture",
              body: "Fixture draft",
            },
          ],
        })
        .where(eq(schema.outboundProspect.id, saved.prospect));
    }
    expect(
      value(await store.getReviewQueue({ campaign: first })).rows.map(
        (row) => row.domain,
      ),
    ).toEqual(["firstbrand.com"]);
    expect(
      value(await store.getLinkedInQueue({ campaign: second })).rows.map(
        (row) => row.domain,
      ),
    ).toEqual(["secondbrand.com"]);
    expect(value(await store.getReviewQueue()).total).toBe(2);
  });
  test("people research rechecks exclusions changed after company discovery", async () => {
    const { campaigns, store } = active();
    const id = await create();
    const source = fixture();
    value(
      await campaigns.discover(
        actor,
        { id, expectedRevision: 1 },
        source.providers,
      ),
    );
    const company = value(await campaigns.get({ id })).companies.rows[0];
    if (!company) throw new Error("Company missing.");
    expect(
      (await campaigns.researchContext({ campaign: id, company: company.id }))
        .success,
    ).toBe(true);
    value(
      await store.savePlaybook(actor, {
        ...defaultPlaybook,
        excludedDomains: company.domain,
      }),
    );
    const blocked = await campaigns.researchContext({
      campaign: id,
      company: company.id,
    });
    expect(blocked.success).toBe(false);
    if (!blocked.success)
      expect(blocked.error.message).toBe(
        "campaign-company-playbookDomainExcluded",
      );
  });
});
