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
import { defaultPlaybook } from "@/lib/outbound";
import type * as Providers from "@/server/utils/outbound/company-discovery";
import { IntegrationError } from "@/server/utils/outbound/http";

const endpoint = process.env["OUTBOUND_DISCOVERY_TEST_DATABASE_URL"];
const actor = "automatic-discovery-fixture";
const now = new Date("2026-11-19T17:00:00Z");
const originalKeys = {
  apollo: process.env.OUTBOUND_APOLLO_API_KEY,
  clay: process.env.OUTBOUND_CLAY_API_KEY,
};
const modules: {
  discovery?: typeof import("@/server/app/outbound/automatic-company-discovery");
  campaigns?: typeof import("@/server/app/outbound/campaigns");
  store?: typeof import("@/server/app/outbound/store");
  database?: typeof import("@/server/database");
} = {};
const active = () => {
  if (
    !modules.discovery ||
    !modules.campaigns ||
    !modules.store ||
    !modules.database
  )
    throw new Error("Fixture missing");
  return {
    discovery: modules.discovery,
    campaigns: modules.campaigns,
    store: modules.store,
    ...modules.database,
  };
};
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const candidate = (domain = "samplegoods.com"): Providers.CompanyCandidate => ({
  domain,
  name: domain,
  website: `https://${domain}`,
  country: "US",
  platform: "shopify",
  teamSize: 12,
  annualRevenue: null,
  source: "apollo",
  sourceId: domain,
  sourcePayload: { fixture: true },
});
const fixture = () => {
  const state = {
    companies: [candidate()],
    nextPage: 2 as number | null,
    wait: null as Promise<void> | null,
    error: null as IntegrationError | null,
  };
  const providers = {
    searchApolloCompanies: mock(
      async ({ page = 1, limit = 25 }: { page?: number; limit?: number }) => {
        if (state.wait) await state.wait;
        if (state.error) return { success: false as const, error: state.error };
        return {
          success: true as const,
          data: {
            companies: state.companies,
            nextPage: state.nextPage,
            total: 500,
            receipt: {
              requestFormat: "fixture",
              request: {
                page,
                per_page: limit,
                organization_locations: ["United States"],
                currently_using_any_of_technology_uids: ["shopify" as const],
              },
              breadcrumbs: null,
              pagination: null,
              partialResultsOnly: null,
              partialResultsLimit: null,
              returnedCount: state.companies.length,
            },
          },
        };
      },
    ),
    startClayCompanySearch: mock(async () => ({
      success: true as const,
      data: { searchId: "saved-clay-search", source: "clay" as const },
    })),
    nextClayCompanies: mock(async ({ searchId }: { searchId: string }) => ({
      success: true as const,
      data: {
        companies: state.companies.map((company) => ({
          ...company,
          source: "clay" as const,
        })),
        searchId,
        hasMore: true,
        exhaustionReason: null,
      },
    })),
  } satisfies Pick<
    typeof Providers,
    "searchApolloCompanies" | "startClayCompanySearch" | "nextClayCompanies"
  >;
  return { state, providers };
};
const create = async (name = "First audience") => {
  const { campaigns } = active();
  const created = value(await campaigns.create(actor, { name }));
  value(
    await campaigns.update(actor, {
      id: created.id,
      name,
      status: "active",
      expectedRevision: 1,
    }),
  );
  return created.id;
};
const insertCandidates = async (
  campaignId: string,
  count: number,
  attempted = false,
) => {
  const { db, schema, store } = active();
  const policy = await store.policy();
  const companies = await db
    .insert(schema.outboundCampaignCompany)
    .values(
      Array.from({ length: count }, (_, position) => ({
        ...candidate(`brand${position}.com`),
        campaignId,
        criteriaRevision: 1,
      })),
    )
    .returning();
  if (attempted)
    await db.insert(schema.outboundIntegrationJob).values(
      companies.map((company) => ({
        provider: "automation" as const,
        status: "failed" as const,
        input: {
          operation: "campaignAutomation",
          companyId: company.id,
          companyDomain: company.domain,
          campaignId,
          campaignRevision: 1,
          playbookRevision: policy.revision,
        },
        output: { stage: "qualify" },
        error: "qualification-held",
      })),
    );
  return companies;
};

describe.skipIf(!endpoint)("bounded automatic company replenishment", () => {
  beforeAll(async () => {
    if (!endpoint) throw new Error("Dedicated local fixture database required");
    const address = new URL(endpoint);
    if (
      !["127.0.0.1", "localhost"].includes(address.hostname) ||
      address.pathname !== "/outbound_discovery_test"
    )
      throw new Error(
        "Only the dedicated local outbound_discovery_test database is allowed",
      );
    Object.assign(process.env, {
      DATABASE_URL: endpoint,
      CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 19).toString("base64"),
    });
    mock.module("server-only", () => ({}));
    modules.database = await import("@/server/database");
    modules.store = await import("@/server/app/outbound/store");
    modules.campaigns = await import("@/server/app/outbound/campaigns");
    modules.discovery = await import(
      "@/server/app/outbound/automatic-company-discovery"
    );
  });
  beforeEach(async () => {
    setSystemTime(now);
    Object.assign(process.env, {
      OUTBOUND_APOLLO_API_KEY: "fixture-provider-never-called",
      OUTBOUND_CLAY_API_KEY: "fixture-provider-never-called",
    });
    const { db, store } = active();
    await db.execute(sql`set client_min_messages to warning`);
    await db.execute(
      sql`truncate outbound_campaign_run,outbound_campaign_company,outbound_campaign,outbound_prospect,outbound_company,outbound_person,outbound_event,outbound_revision,outbound_suppression,outbound_playbook,outbound_inbox,outbound_integration_job,outbound_provider_credential cascade`,
    );
    value(
      await store.savePlaybook(actor, {
        ...defaultPlaybook,
        automationEnabled: true,
      }),
    );
  });
  afterAll(() => {
    setSystemTime();
    for (const [provider, original] of Object.entries(originalKeys)) {
      const name = `OUTBOUND_${provider.toUpperCase()}_API_KEY`;
      if (original === undefined) Reflect.deleteProperty(process.env, name);
      else Object.assign(process.env, { [name]: original });
    }
  });

  test("backlog and daily acquisition limits follow shared delivery capacity", () => {
    const { discovery } = active();
    expect(
      discovery.discoveryLimits({
        weeklyTarget: 200,
        dailyCapacity: 15,
        campaigns: 1,
      }),
    ).toEqual({ target: 45, lowWater: 23, dailyOperations: 8 });
    expect(
      discovery.discoveryLimits({
        weeklyTarget: 200,
        dailyCapacity: 15,
        campaigns: 3,
      }),
    ).toEqual({ target: 25, lowWater: 13, dailyOperations: 4 });
    expect(
      discovery.discoveryLimits({
        weeklyTarget: 5000,
        dailyCapacity: 1000,
        campaigns: 1,
      }).dailyOperations,
    ).toBe(12);
  });
  test("preparation pause and inactive campaigns never request a provider", async () => {
    const { store, discovery, campaigns } = active();
    const id = await create();
    const source = fixture();
    value(
      await store.savePlaybook(actor, {
        ...defaultPlaybook,
        automationEnabled: false,
      }),
    );
    expect(value(await discovery.run({}, source.providers)).processed).toBe(0);
    value(
      await store.savePlaybook(actor, {
        ...defaultPlaybook,
        automationEnabled: true,
      }),
    );
    value(
      await campaigns.update(actor, {
        id,
        name: "First audience",
        status: "paused",
        expectedRevision: 1,
      }),
    );
    expect(value(await discovery.run({}, source.providers)).processed).toBe(0);
    expect(source.providers.searchApolloCompanies).not.toHaveBeenCalled();
  });
  test("missing provider credentials hold discovery without creating a paid attempt", async () => {
    const { discovery, db, schema } = active();
    await create();
    const source = fixture();
    Reflect.deleteProperty(process.env, "OUTBOUND_APOLLO_API_KEY");
    const status = value(await discovery.getStatus()).campaigns[0];
    expect(status?.reason).toBe("provider-not-configured");
    expect(status?.providerConfigured).toBe(false);
    expect(value(await discovery.run({}, source.providers)).processed).toBe(0);
    expect(await db.select().from(schema.outboundCampaignRun)).toHaveLength(0);
    expect(source.providers.searchApolloCompanies).not.toHaveBeenCalled();
    expect(source.providers.startClayCompanySearch).not.toHaveBeenCalled();
  });
  test("already attempted candidate rows do not falsely satisfy the backlog", async () => {
    const { discovery } = active();
    const id = await create();
    await insertCandidates(id, 40, true);
    const source = fixture();
    expect(value(await discovery.getStatus()).campaigns[0]?.backlog).toBe(0);
    expect(value(await discovery.run({}, source.providers)).added).toBe(1);
    expect(source.providers.searchApolloCompanies).toHaveBeenCalledTimes(1);
  });
  test("a usable backlog prevents unnecessary paid pages", async () => {
    const { discovery } = active();
    const id = await create();
    await insertCandidates(id, 40);
    const source = fixture();
    expect(value(await discovery.getStatus()).campaigns[0]?.reason).toBe(
      "backlog-ready",
    );
    expect(value(await discovery.run({}, source.providers)).processed).toBe(0);
    expect(source.providers.searchApolloCompanies).not.toHaveBeenCalled();
  });
  test("concurrent ticks reserve at most one page for the same campaign", async () => {
    const { discovery } = active();
    await create();
    const source = fixture();
    const results = await Promise.all([
      discovery.run({}, source.providers),
      discovery.run({}, source.providers),
    ]);
    expect(results.every((result) => result.success)).toBe(true);
    expect(source.providers.searchApolloCompanies).toHaveBeenCalledTimes(1);
  });
  test("campaigns rotate fairly with a one-campaign run budget", async () => {
    const { discovery } = active();
    await create();
    await create("Second audience");
    const source = fixture();
    const first = value(
      await discovery.run({ maxCampaigns: 1 }, source.providers),
    );
    source.state.companies = [candidate("secondbrand.com")];
    const second = value(
      await discovery.run({ maxCampaigns: 1 }, source.providers),
    );
    expect(first.results).toHaveLength(1);
    expect(second.results).toHaveLength(1);
    expect(first.results[0]?.campaignId).not.toBe(
      second.results[0]?.campaignId,
    );
  });
  test("known quota failure backs off and a refreshed credential can resume", async () => {
    const { discovery, db, schema } = active();
    await create();
    const source = fixture();
    source.state.error = new IntegrationError(
      "apollo",
      "quota",
      "fixture quota",
      429,
    );
    expect(
      value(await discovery.run({}, source.providers)).results[0]?.status,
    ).toBe("failed");
    setSystemTime(new Date(now.getTime() + 10 * 60_000));
    source.state.error = null;
    expect(value(await discovery.getStatus()).campaigns[0]?.reason).toBe(
      "provider-backoff",
    );
    expect(value(await discovery.run({}, source.providers)).processed).toBe(0);
    await db.insert(schema.outboundProviderCredential).values({
      provider: "apollo",
      apiKey: "fixture-only-key",
      validatedAt: new Date(),
      createdBy: actor,
      updatedBy: actor,
      updatedAt: new Date(),
    });
    expect(value(await discovery.run({}, source.providers)).added).toBe(1);
    expect(source.providers.searchApolloCompanies).toHaveBeenCalledTimes(2);
  });
  test("ambiguous paid results remain blocked after time and credentials change", async () => {
    const { discovery, db, schema } = active();
    await create();
    const source = fixture();
    source.state.error = new IntegrationError(
      "apollo",
      "unavailable",
      "fixture lost response",
      502,
    );
    expect(
      value(await discovery.run({}, source.providers)).results[0]?.status,
    ).toBe("uncertain");
    setSystemTime(new Date(now.getTime() + 48 * 60 * 60_000));
    await db.insert(schema.outboundProviderCredential).values({
      provider: "apollo",
      apiKey: "fixture-only-key",
      validatedAt: new Date(),
      createdBy: actor,
      updatedBy: actor,
      updatedAt: new Date(),
    });
    source.state.error = null;
    expect(value(await discovery.getStatus()).campaigns[0]?.reason).toBe(
      "campaign-run-unresolved",
    );
    expect(value(await discovery.run({}, source.providers)).processed).toBe(0);
    expect(source.providers.searchApolloCompanies).toHaveBeenCalledTimes(1);
  });
  test("Apollo exhaustion advances to one durable Clay operation per tick", async () => {
    const { discovery } = active();
    await create();
    const source = fixture();
    source.state.companies = [];
    source.state.nextPage = null;
    value(await discovery.run({}, source.providers));
    setSystemTime(new Date(now.getTime() + 6 * 60_000));
    value(await discovery.run({}, source.providers));
    expect(source.providers.startClayCompanySearch).toHaveBeenCalledTimes(1);
    expect(source.providers.nextClayCompanies).not.toHaveBeenCalled();
    setSystemTime(new Date(now.getTime() + 12 * 60_000));
    source.state.companies = [candidate("claybrand.com")];
    expect(value(await discovery.run({}, source.providers)).added).toBe(1);
    expect(source.providers.startClayCompanySearch).toHaveBeenCalledTimes(1);
    expect(source.providers.nextClayCompanies).toHaveBeenCalledWith({
      searchId: "saved-clay-search",
      limit: 25,
    });
  });
  test("daily budget stops empty or excluded pages from becoming an unbounded loop", async () => {
    const { discovery, db, schema, campaigns } = active();
    const id = await create();
    const campaign = value(await campaigns.get({ id })).campaign;
    await db.insert(schema.outboundCampaignRun).values(
      Array.from({ length: 20 }, (_, position) => ({
        campaignId: id,
        requestId: randomUUID(),
        provider: "apollo" as const,
        operation: "apolloPage" as const,
        status: "completed" as const,
        criteriaRevision: 1,
        criteria: campaign.criteria,
        cursor: { page: position + 1 },
        createdBy: actor,
        startedAt: new Date(now.getTime() - (position + 2) * 60 * 60_000),
        completedAt: new Date(now.getTime() - (position + 2) * 60 * 60_000),
      })),
    );
    const source = fixture();
    expect(value(await discovery.getStatus()).campaigns[0]?.reason).toBe(
      "daily-discovery-limit",
    );
    expect(value(await discovery.run({}, source.providers)).processed).toBe(0);
    expect(source.providers.searchApolloCompanies).not.toHaveBeenCalled();
  });
  test("deadline reserves enough time before any provider operation", async () => {
    const { discovery } = active();
    await create();
    const source = fixture();
    expect(
      value(
        await discovery.run(
          { deadline: Date.now() + 20_000 },
          source.providers,
        ),
      ).processed,
    ).toBe(0);
    expect(source.providers.searchApolloCompanies).not.toHaveBeenCalled();
  });
  test("a pause wins at the durable reservation even after a status snapshot", async () => {
    const { discovery, store, campaigns } = active();
    const id = await create();
    const status = value(await discovery.getStatus());
    expect(status.campaigns[0]?.reason).toBeNull();
    value(
      await store.savePlaybook(actor, {
        ...defaultPlaybook,
        automationEnabled: false,
      }),
    );
    const source = fixture();
    const result = await campaigns.discover(
      actor,
      { id, expectedRevision: 1 },
      source.providers,
      {
        guard: async () => {
          if (!(await store.policy()).settings.automationEnabled)
            throw new Error("fixture paused");
        },
      },
    );
    expect(result.success).toBe(false);
    expect(source.providers.searchApolloCompanies).not.toHaveBeenCalled();
  });
});
