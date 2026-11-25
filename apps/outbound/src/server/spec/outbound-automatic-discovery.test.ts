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
import { requireTestDatabase } from "./helpers/database";

const endpoint = process.env["OUTBOUND_TEST_DATABASE_URL"];
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
    onRequest: null as (() => Promise<void>) | null,
    error: null as IntegrationError | null,
  };
  const providers = {
    searchApolloCompanies: mock(
      async ({ page = 1, limit = 25 }: { page?: number; limit?: number }) => {
        await state.onRequest?.();
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

const recordAcquisition = async (
  campaignId: string,
  options: {
    domains: string[];
    startedAt?: Date;
    completedAt?: Date;
    status?: "completed" | "failed";
    output?: Record<string, unknown>;
  },
) => {
  const { db, schema } = active();
  const [campaign] = await db
    .select()
    .from(schema.outboundCampaign)
    .where(eq(schema.outboundCampaign.id, campaignId));
  if (!campaign) throw new Error("Campaign fixture missing");
  const [run] = await db
    .insert(schema.outboundCampaignRun)
    .values({
      campaignId,
      requestId: randomUUID(),
      provider: "apollo",
      operation: "apolloPage",
      status: options.status ?? "completed",
      criteriaRevision: campaign.revision,
      criteria: campaign.criteria,
      cursor: { page: 1 },
      companyCount: 25,
      output: options.output ?? {
        acquisition: {
          version: 1,
          added: options.domains.length,
          excluded: 0,
          newCompanyDomains: options.domains,
        },
      },
      createdBy: actor,
      startedAt: options.startedAt ?? new Date(now.getTime() - 60 * 60_000),
      completedAt: options.completedAt ?? new Date(now.getTime() - 60 * 60_000),
    })
    .returning();
  if (!run) throw new Error("Run fixture missing");
  return run;
};

describe("automatic company acquisition and replenishment", () => {
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

  test("backlog sizing follows shared capacity without imposing an operation quota", () => {
    const { discovery } = active();
    expect(
      discovery.discoveryLimits({
        weeklyTarget: 200,
        dailyCapacity: 15,
        campaigns: 1,
      }),
    ).toEqual({ target: 45, lowWater: 23 });
    expect(
      discovery.discoveryLimits({
        weeklyTarget: 200,
        dailyCapacity: 15,
        campaigns: 3,
      }),
    ).toEqual({ target: 25, lowWater: 13 });
    expect(
      discovery.discoveryLimits({
        weeklyTarget: 5000,
        dailyCapacity: 1000,
        campaigns: 1,
      }),
    ).toEqual({ target: 100, lowWater: 50 });
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
  test("pausing automatic Apollo preserves the cursor and reserves no paid search until resumed", async () => {
    const { discovery, store, db, schema } = active();
    const id = await create();
    const source = fixture();
    const before = await store.policy();
    value(
      await store.savePlaybook(actor, {
        ...before.settings,
        automaticApolloEnabled: false,
      }),
    );
    expect(value(await discovery.getStatus()).campaigns[0]?.reason).toBe(
      "apollo-paused",
    );
    expect(value(await discovery.run({}, source.providers)).processed).toBe(0);
    expect(source.providers.searchApolloCompanies).not.toHaveBeenCalled();
    expect(source.providers.startClayCompanySearch).not.toHaveBeenCalled();
    expect(await db.select().from(schema.outboundCampaignRun)).toHaveLength(0);
    const [paused] = await db
      .select()
      .from(schema.outboundCampaign)
      .where(eq(schema.outboundCampaign.id, id));
    expect(paused?.discoveryState.apolloPage).toBe(1);
    expect((await store.policy()).revision).toBe(before.revision);
    value(await store.savePlaybook(actor, before.settings));
    expect(value(await discovery.run({}, source.providers)).added).toBe(1);
    expect(source.providers.searchApolloCompanies).toHaveBeenCalledTimes(1);
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
  test("a usable backlog does not stop acquisition before the daily company target", async () => {
    const { discovery } = active();
    const id = await create();
    await insertCandidates(id, 40);
    const source = fixture();
    const status = value(await discovery.getStatus());
    expect(status.dailyTarget).toBe(50);
    expect(status.discoveredToday).toBe(0);
    expect(status.dayTimezone).toBe("UTC");
    expect(status.dayStart).toBe("2026-11-19T00:00:00.000Z");
    expect(status.dayEnd).toBe("2026-11-20T00:00:00.000Z");
    expect(status.campaigns[0]).toMatchObject({
      backlog: 40,
      dailyTarget: 50,
      discoveredToday: 0,
      dayStart: status.dayStart,
      dayEnd: status.dayEnd,
      dayTimezone: "UTC",
      reason: null,
    });
    expect(value(await discovery.run({}, source.providers)).added).toBe(1);
    expect(value(await discovery.getStatus()).discoveredToday).toBe(1);
    expect(source.providers.searchApolloCompanies).toHaveBeenCalledTimes(1);
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
    const { discovery, db, schema } = active();
    await create();
    const source = fixture();
    source.state.companies = [];
    source.state.nextPage = null;
    value(await discovery.run({}, source.providers));
    setSystemTime(new Date(now.getTime() + 6 * 60_000));
    value(await discovery.run({}, source.providers));
    expect(source.providers.startClayCompanySearch).toHaveBeenCalledTimes(1);
    expect(source.providers.nextClayCompanies).not.toHaveBeenCalled();
    expect(value(await discovery.getStatus()).discoveredToday).toBe(0);
    const [started] = await db
      .select()
      .from(schema.outboundCampaignRun)
      .where(eq(schema.outboundCampaignRun.operation, "clayStart"));
    expect(started?.output?.["acquisition"]).toEqual({
      version: 1,
      added: 0,
      excluded: 0,
      newCompanyDomains: [],
    });
    setSystemTime(new Date(now.getTime() + 12 * 60_000));
    source.state.companies = [candidate("claybrand.com")];
    expect(value(await discovery.run({}, source.providers)).added).toBe(1);
    expect(source.providers.startClayCompanySearch).toHaveBeenCalledTimes(1);
    expect(source.providers.nextClayCompanies).toHaveBeenCalledWith({
      searchId: "saved-clay-search",
      limit: 25,
    });
    expect(value(await discovery.getStatus()).discoveredToday).toBe(1);
  });
  test("low-yield pages continue past eight operations until fifty companies are saved", async () => {
    const { discovery, db, schema } = active();
    await create();
    const source = fixture();
    for (const page of Array.from({ length: 10 }, (_, index) => index)) {
      setSystemTime(new Date(now.getTime() + page * 6 * 60_000));
      source.state.companies = Array.from({ length: 5 }, (_, index) =>
        candidate(`new-${page}-${index}.com`),
      );
      source.state.nextPage = page + 2;
      expect(value(await discovery.run({}, source.providers)).added).toBe(5);
      expect(value(await discovery.getStatus()).discoveredToday).toBe(
        (page + 1) * 5,
      );
    }
    expect(source.providers.searchApolloCompanies).toHaveBeenCalledTimes(10);
    expect(await db.select().from(schema.outboundCampaignCompany)).toHaveLength(
      50,
    );
    const status = value(await discovery.getStatus());
    expect(status.campaigns[0]?.operations).toBe(10);
    expect(status.campaigns[0]?.reason).toBe("backlog-ready");
    expect(value(await discovery.run({}, source.providers)).processed).toBe(0);
    expect(source.providers.searchApolloCompanies).toHaveBeenCalledTimes(10);
  }, 30000);
  test("replenishment resumes after the daily target when the usable queue is consumed", async () => {
    const { discovery, db, schema } = active();
    const id = await create();
    await insertCandidates(id, 40);
    await recordAcquisition(id, {
      domains: Array.from({ length: 50 }, (_, index) => `saved-${index}.com`),
    });
    const source = fixture();
    expect(value(await discovery.getStatus()).campaigns[0]?.reason).toBe(
      "backlog-ready",
    );
    expect(value(await discovery.run({}, source.providers)).processed).toBe(0);
    await db
      .update(schema.outboundCampaignCompany)
      .set({ status: "excluded", reason: "qualification-held" })
      .where(eq(schema.outboundCampaignCompany.campaignId, id));
    const depleted = value(await discovery.getStatus());
    expect(depleted.discoveredToday).toBe(50);
    expect(depleted.campaigns[0]).toMatchObject({ backlog: 0, reason: null });
    expect(value(await discovery.run({}, source.providers)).added).toBe(1);
    expect(value(await discovery.getStatus()).discoveredToday).toBe(51);
    expect(source.providers.searchApolloCompanies).toHaveBeenCalledTimes(1);
  });
  test("twenty-five returned records do not count duplicates or excluded companies", async () => {
    const { discovery, db, schema, campaigns } = active();
    const id = await create();
    const blocked = Array.from(
      { length: 23 },
      (_, index) => `blocked-${index}.com`,
    );
    await db.insert(schema.outboundSuppression).values(
      blocked.map((domain) => ({
        scope: "domain" as const,
        value: domain,
        reason: "Fixture exclusion",
        createdBy: actor,
      })),
    );
    const source = fixture();
    source.state.companies = [
      candidate("new-company.com"),
      candidate("new-company.com"),
      ...blocked.map((domain) => candidate(domain)),
    ];
    const found = value(
      await campaigns.discover(
        actor,
        { id, expectedRevision: 1 },
        source.providers,
      ),
    );
    expect(found.companyCount).toBe(25);
    expect(found.added).toBe(1);
    expect(found.excluded).toBe(23);
    const [run] = await db
      .select()
      .from(schema.outboundCampaignRun)
      .where(eq(schema.outboundCampaignRun.id, found.run.id));
    expect(run?.output?.["acquisition"]).toEqual({
      version: 1,
      added: 1,
      excluded: 23,
      newCompanyDomains: ["new-company.com"],
    });
    expect(value(await discovery.getStatus()).discoveredToday).toBe(1);
  });
  test("revived rows and company domains known anywhere cannot earn new-company credit", async () => {
    const { discovery, db, schema, campaigns } = active();
    const id = await create();
    const peer = await create("Other audience");
    await db.insert(schema.outboundCampaignCompany).values([
      {
        ...candidate("revived-here.com"),
        campaignId: id,
        criteriaRevision: 1,
        status: "excluded",
      },
      {
        ...candidate("known-in-peer.com"),
        campaignId: peer,
        criteriaRevision: 1,
        status: "excluded",
      },
    ]);
    await db.insert(schema.outboundCompany).values({
      domain: "known-company.com",
      name: "Known company",
      website: "https://known-company.com",
      country: "US",
      source: "fixture",
    });
    const source = fixture();
    source.state.companies = [
      "revived-here.com",
      "known-in-peer.com",
      "known-company.com",
      "genuinely-new.com",
    ].map((domain) => candidate(domain));
    const found = value(
      await campaigns.discover(
        actor,
        { id, expectedRevision: 1 },
        source.providers,
      ),
    );
    expect(found.added).toBe(4);
    const [run] = await db
      .select()
      .from(schema.outboundCampaignRun)
      .where(eq(schema.outboundCampaignRun.id, found.run.id));
    expect(run?.output?.["acquisition"]).toEqual({
      version: 1,
      added: 4,
      excluded: 0,
      newCompanyDomains: ["genuinely-new.com"],
    });
    expect(value(await discovery.getStatus()).discoveredToday).toBe(1);
  });
  test("concurrent campaign discoveries save and credit a shared domain only once", async () => {
    const { discovery, db, schema, campaigns } = active();
    const first = await create();
    const second = await create("Other audience");
    const source = fixture();
    const results = await Promise.all(
      [first, second].map((id) =>
        campaigns.discover(
          actor,
          { id, expectedRevision: 1 },
          source.providers,
        ),
      ),
    );
    expect(results.every((result) => result.success)).toBe(true);
    expect(
      results.map(value).reduce((total, result) => total + result.added, 0),
    ).toBe(1);
    const saved = await db.select().from(schema.outboundCampaignCompany);
    expect(
      saved.filter((company) => company.status === "candidate"),
    ).toHaveLength(1);
    expect(
      saved.filter((company) => company.reason === "otherCampaign"),
    ).toHaveLength(1);
    const status = value(await discovery.getStatus());
    expect(status.discoveredToday).toBe(1);
    expect(
      status.campaigns.every((campaign) => campaign.discoveredToday === 1),
    ).toBe(true);
  });
  test("only unique versioned completed receipts contribute to the shared daily total", async () => {
    const { discovery } = active();
    const first = await create();
    const second = await create("Other audience");
    await recordAcquisition(first, {
      domains: ["shared.com", "first.com", "shared.com"],
    });
    await recordAcquisition(second, { domains: ["shared.com", "second.com"] });
    await recordAcquisition(first, {
      domains: [],
      output: {
        companies: Array.from({ length: 25 }, (_, index) =>
          candidate(`legacy-${index}.com`),
        ),
      },
    });
    await recordAcquisition(first, {
      domains: ["failed.com"],
      status: "failed",
    });
    await recordAcquisition(first, {
      domains: [],
      output: {
        acquisition: {
          version: 2,
          added: 50,
          excluded: 0,
          newCompanyDomains: ["wrong-version.com"],
        },
      },
    });
    await recordAcquisition(first, {
      domains: [],
      output: {
        acquisition: {
          version: 1,
          added: 50,
          excluded: 0,
          newCompanyDomains: null,
        },
      },
    });
    const status = value(await discovery.getStatus());
    expect(status.discoveredToday).toBe(3);
    expect(
      status.campaigns.every((campaign) => campaign.discoveredToday === 3),
    ).toBe(true);
  });
  test("acquisition uses the UTC completion day and resets at midnight", async () => {
    const { discovery } = active();
    const id = await create();
    await recordAcquisition(id, {
      domains: ["yesterday.com"],
      startedAt: new Date("2026-11-18T23:50:00Z"),
      completedAt: new Date("2026-11-18T23:59:59.999Z"),
    });
    await recordAcquisition(id, {
      domains: ["crossed-midnight.com"],
      startedAt: new Date("2026-11-18T23:55:00Z"),
      completedAt: new Date("2026-11-19T00:00:00Z"),
    });
    await recordAcquisition(id, {
      domains: ["late-today.com"],
      startedAt: new Date("2026-11-19T23:50:00Z"),
      completedAt: new Date("2026-11-19T23:59:59.999Z"),
    });
    await recordAcquisition(id, {
      domains: ["next-day.com"],
      startedAt: new Date("2026-11-19T23:55:00Z"),
      completedAt: new Date("2026-11-20T00:00:00Z"),
    });
    setSystemTime(new Date("2026-11-19T23:59:59.999Z"));
    expect(value(await discovery.getStatus())).toMatchObject({
      discoveredToday: 2,
      dayStart: "2026-11-19T00:00:00.000Z",
      dayEnd: "2026-11-20T00:00:00.000Z",
      dayTimezone: "UTC",
    });
    setSystemTime(new Date("2026-11-20T00:00:00Z"));
    expect(value(await discovery.getStatus())).toMatchObject({
      discoveredToday: 1,
      dayStart: "2026-11-20T00:00:00.000Z",
      dayEnd: "2026-11-21T00:00:00.000Z",
      dayTimezone: "UTC",
    });
  });
  test("daily acquisition and operation diagnostics are not truncated to two hundred runs", async () => {
    const { discovery, db, schema, campaigns } = active();
    const id = await create();
    const campaign = value(await campaigns.get({ id })).campaign;
    await db.insert(schema.outboundCampaignRun).values(
      Array.from({ length: 225 }, (_, position) => ({
        campaignId: id,
        requestId: randomUUID(),
        provider: "apollo" as const,
        operation: "apolloPage" as const,
        status: "completed" as const,
        criteriaRevision: 1,
        criteria: campaign.criteria,
        cursor: { page: position + 1 },
        output: {
          acquisition: {
            version: 1,
            added: 1,
            excluded: 0,
            newCompanyDomains: [`saved-${position}.com`],
          },
        },
        createdBy: actor,
        startedAt: new Date(now.getTime() - 120 * 60_000 + position * 1000),
        completedAt: new Date(now.getTime() - 60 * 60_000 + position * 1000),
      })),
    );
    const source = fixture();
    const status = value(await discovery.getStatus());
    expect(status.discoveredToday).toBe(225);
    expect(status.campaigns[0]).toMatchObject({
      operations: 225,
      backlog: 0,
      reason: null,
    });
    expect(value(await discovery.run({}, source.providers)).added).toBe(1);
    expect(source.providers.searchApolloCompanies).toHaveBeenCalledTimes(1);
  });
  test("a criteria change during a provider request stores a zero-acquisition receipt", async () => {
    const { discovery, db, schema, campaigns } = active();
    const id = await create();
    const source = fixture();
    source.state.onRequest = async () => {
      await db
        .update(schema.outboundCampaign)
        .set({ revision: 2 })
        .where(eq(schema.outboundCampaign.id, id));
    };
    const found = value(
      await campaigns.discover(
        actor,
        { id, expectedRevision: 1 },
        source.providers,
      ),
    );
    expect(found.run.error).toBe("campaign-criteria-changed");
    expect(found.added).toBe(0);
    expect(await db.select().from(schema.outboundCampaignCompany)).toHaveLength(
      0,
    );
    const [run] = await db
      .select()
      .from(schema.outboundCampaignRun)
      .where(eq(schema.outboundCampaignRun.id, found.run.id));
    expect(run?.output?.["acquisition"]).toEqual({
      version: 1,
      added: 0,
      excluded: 0,
      newCompanyDomains: [],
    });
    expect(value(await discovery.getStatus()).discoveredToday).toBe(0);
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
