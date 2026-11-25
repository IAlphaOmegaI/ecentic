import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import * as Discovery from "@/server/utils/outbound/company-discovery";

mock.module("server-only", () => ({}));
const Credentials = await import("@/server/app/outbound/provider-credentials");
const resolveKey = spyOn(Credentials, "resolveKey");
const originalFetch = globalThis.fetch;
beforeEach(() =>
  resolveKey.mockResolvedValue({ success: true, data: "fixture-key" }),
);
afterEach(() => {
  globalThis.fetch = originalFetch;
});
afterAll(() => resolveKey.mockRestore());

const criteria: Discovery.CompanySearchCriteria = {
  countries: ["US", "GB"],
  platforms: ["shopify", "woocommerce"],
  keywords: ["coffee", "beauty"],
  excludedKeywords: ["agency"],
  teamSizeMin: 3,
  teamSizeMax: 200,
  annualRevenueMin: 1_200_000,
  annualRevenueMax: 120_000_000,
};
const apolloCompany = {
  id: "apollo-company-1",
  name: "Example Brand",
  primary_domain: "example-brand.co.uk",
  website_url: "https://www.example-brand.co.uk/shop",
  country: "United Kingdom",
  estimated_num_employees: 23,
  annual_revenue: 2_000_000,
  current_technologies: [{ uid: "woo_commerce", name: "Woo Commerce" }],
};
const clayCompany = {
  clay_company_id: 42,
  name: "Example Brand",
  domain: "example-brand.com",
  country: "United States",
  size: "11-50",
  type: "Privately Held",
  industry: "Food & Beverages",
  location: "California, United States",
  description: "Packaged coffee",
  linkedin_url: "https://www.linkedin.com/company/example-brand",
  annual_revenue: "1M-5M",
  total_funding_amount_range_usd: null,
};
const json = (body: unknown, status = 200, headers?: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
const fetched = (
  handler: (
    url: string | URL | Request,
    options?: RequestInit,
  ) => Promise<Response>,
) => {
  globalThis.fetch = Object.assign(handler, {
    preconnect: originalFetch.preconnect,
  });
};

describe("company discovery provider contracts", () => {
  test("saved company receipts avoid repeat enrichment without inventing missing facts or dates", () => {
    const sourcePayload = {
      ...apolloCompany,
      _outboundSource: "apollo-organization-enrichment",
      _outboundObservedAt: "2026-10-01T10:00:00.000Z",
    };
    const company = {
      domain: "example-brand.co.uk",
      source: "apollo" as const,
      sourceId: apolloCompany.id,
      sourcePayload,
    };
    expect(Discovery.savedApolloCompany(company, criteria)).toMatchObject({
      country: "GB",
      teamSize: 23,
      annualRevenue: 2_000_000,
      sourcePayload,
    });
    expect(Discovery.savedApolloCompany(company, criteria)?.sourcePayload).toBe(
      sourcePayload,
    );
    for (const changed of [
      { ...company, domain: "another-company.com" },
      { ...company, sourceId: "different-provider-record" },
      { ...company, source: "clay" as const },
      { ...company, sourcePayload: { ...sourcePayload, country: null } },
      {
        ...company,
        sourcePayload: { ...sourcePayload, estimated_num_employees: null },
      },
      { ...company, sourcePayload: { ...sourcePayload, annual_revenue: null } },
    ])
      expect(Discovery.savedApolloCompany(changed, criteria)).toBeNull();
    expect(
      Discovery.savedApolloCompany(
        {
          ...company,
          sourcePayload: {
            ...sourcePayload,
            estimated_num_employees: null,
            annual_revenue: null,
          },
        },
        { countries: ["GB"], platforms: ["woocommerce"] },
      ),
    ).toMatchObject({ country: "GB", teamSize: null, annualRevenue: null });
  });
  test("Apollo matches the official CLI JSON body and preserves filter acknowledgements", async () => {
    const calls: { url: URL; options?: RequestInit }[] = [];
    fetched(async (input, options) => {
      calls.push({ url: new URL(String(input)), options });
      return json({
        organizations: [apolloCompany],
        breadcrumbs: [
          {
            signal_field_name: "organization_locations",
            value: "united states",
          },
          {
            signal_field_name: "organization_locations",
            value: "United Kingdom",
          },
          {
            signal_field_name: "currently_using_any_of_technology_uids",
            value: ["shopify", "woo_commerce"],
          },
        ],
        partial_results_only: false,
        pagination: {
          page: 2,
          per_page: 25,
          total_entries: 88,
          total_pages: 4,
        },
      });
    });
    const result = await Discovery.searchApolloCompanies({ criteria, page: 2 });
    expect(result.success).toBe(true);
    if (!result.success) throw result.error;
    expect(result.data.nextPage).toBe(3);
    expect(result.data.total).toBe(88);
    expect(calls).toHaveLength(1);
    const call = calls[0];
    if (!call) throw new Error("Expected one company search request.");
    expect(call.url.pathname).toBe("/api/v1/mixed_companies/search");
    expect(call.url.search).toBe("");
    expect(JSON.parse(String(call.options?.body))).toEqual({
      page: 2,
      per_page: 25,
      organization_locations: ["United States", "United Kingdom"],
      currently_using_any_of_technology_uids: ["shopify", "woo_commerce"],
      q_organization_keyword_tags: ["coffee", "beauty"],
      q_not_organization_keyword_tags: ["agency"],
      organization_num_employees_ranges: ["3,200"],
      revenue_range: { min: 1_200_000, max: 120_000_000 },
    });
    expect(call.options).toMatchObject({
      method: "POST",
      redirect: "error",
      cache: "no-store",
    });
    expect(call.options?.headers).toMatchObject({
      "Content-Type": "application/json",
    });
    expect(result.data.companies[0]).toMatchObject({
      country: "GB",
      platform: "woocommerce",
      teamSize: 23,
      annualRevenue: 2_000_000,
    });
    expect(result.data.companies[0]).not.toHaveProperty("email");
    expect(result.data.receipt).toMatchObject({
      requestFormat: "json-body",
      returnedCount: 1,
      pagination: { page: 2, per_page: 25, total_entries: 88, total_pages: 4 },
      partialResultsOnly: false,
      breadcrumbs: [
        { signal_field_name: "organization_locations", value: "united states" },
        {
          signal_field_name: "organization_locations",
          value: "United Kingdom",
        },
        {
          signal_field_name: "currently_using_any_of_technology_uids",
          value: ["shopify", "woo_commerce"],
        },
      ],
    });
    expect(JSON.stringify(result.data.receipt)).not.toContain("fixture-key");
  });

  test("mismatched acknowledged filters fail closed and retain their safe receipt", async () => {
    fetched(async () =>
      json({
        organizations: [apolloCompany],
        breadcrumbs: [
          {
            signal_field_name: "currently_using_any_of_technology_uids",
            value: "wordpress_org",
          },
        ],
        pagination: {
          page: 1,
          per_page: 25,
          total_entries: 99,
          total_pages: 4,
        },
      }),
    );
    const result = await Discovery.searchApolloCompanies({ criteria });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: "contract",
        providerCode: "filter_acknowledgement_mismatch",
        receipt: {
          breadcrumbs: [
            {
              signal_field_name: "currently_using_any_of_technology_uids",
              value: "wordpress_org",
            },
          ],
          pagination: { page: 1, per_page: 25 },
        },
      },
    });
    expect(result).not.toHaveProperty("data.companies");
  });

  test("missing acknowledgements stay absent and optional filters are omitted from JSON", async () => {
    const bodies: Record<string, unknown>[] = [];
    fetched(async (_, options) => {
      bodies.push(JSON.parse(String(options?.body)));
      return json({ organizations: [apolloCompany] });
    });
    const result = await Discovery.searchApolloCompanies({
      criteria: { countries: ["US"], platforms: ["shopify"] },
    });
    expect(result.success).toBe(true);
    if (!result.success) throw result.error;
    expect(bodies[0]).toEqual({
      page: 1,
      per_page: 25,
      organization_locations: ["United States"],
      currently_using_any_of_technology_uids: ["shopify"],
    });
    expect(result.data.receipt.breadcrumbs).toBeNull();
  });

  test("missing company facts stay unknown, independently of selected filters", () => {
    expect(
      Discovery.normalizeApolloCompany({
        id: "1",
        name: "Brand",
        primary_domain: "brand.example",
      }),
    ).toMatchObject({
      country: null,
      platform: null,
      teamSize: null,
      annualRevenue: null,
    });
    expect(
      Discovery.normalizeApolloCompany({
        ...apolloCompany,
        website_url: "https://different-company.com",
      }),
    ).toBeNull();
    expect(
      Discovery.normalizeApolloCompany({
        ...apolloCompany,
        primary_domain: "localhost",
        website_url: null,
      }),
    ).toBeNull();
    expect(
      Discovery.normalizeApolloCompany({ ...apolloCompany, name: null }),
    ).toBeNull();
  });

  test("optional changed metadata cannot reject a valid company or invent numeric facts", () => {
    expect(
      Discovery.normalizeApolloCompany({
        ...apolloCompany,
        country: { label: "US" },
        estimated_num_employees: 12.5,
        annual_revenue: Number.MAX_SAFE_INTEGER + 1,
        current_technologies: "unexpected",
      }),
    ).toMatchObject({
      country: null,
      platform: null,
      teamSize: null,
      annualRevenue: null,
    });
    expect(
      Discovery.normalizeApolloCompany({
        ...apolloCompany,
        estimated_num_employees: 3_000_000_000,
      }),
    ).toMatchObject({ teamSize: null });
    expect(
      Discovery.normalizeClayCompany({
        ...clayCompany,
        clay_company_id: "42",
        size: "3000000000",
        total_funding_amount_range_usd: "1M-5M",
      }),
    ).toMatchObject({
      sourceId: "42",
      teamSize: null,
      sourcePayload: { total_funding_amount_range_usd: "1M-5M" },
    });
  });

  test("Apollo identifies unavailable plan filters without exposing response bodies", async () => {
    fetched(async () =>
      json(
        {
          error:
            "Cannot access advanced filters currently_using_any_of_technology_uids on free plan. Please start a trial or upgrade.",
        },
        422,
      ),
    );
    expect(await Discovery.searchApolloCompanies({ criteria })).toMatchObject({
      success: false,
      error: {
        code: "access",
        providerCode: "advanced_filters_require_plan",
        message:
          "Apollo requires a trial or paid plan for these company filters.",
      },
    });
  });

  test("Clay identifies paid advanced filters separately from a bad API key", async () => {
    fetched(async () =>
      json(
        {
          message:
            "Advanced filters and cross-entity company/people/job attributes require a paid plan.",
        },
        403,
      ),
    );
    expect(await Discovery.startClayCompanySearch({ criteria })).toMatchObject({
      success: false,
      error: {
        code: "access",
        providerCode: "advanced_filters_require_plan",
        message: "Clay requires a paid plan for these company filters.",
      },
    });
  });

  test("one unusable company does not discard the other results from a charged page", async () => {
    fetched(async () =>
      json({
        organizations: [
          apolloCompany,
          { person: { email: "not-a-company@example.com" } },
        ],
        pagination: { page: 1, per_page: 25, total_pages: 2 },
      }),
    );
    const result = await Discovery.searchApolloCompanies({ criteria });
    expect(result).toMatchObject({ success: true, data: { nextPage: 2 } });
    if (!result.success) throw result.error;
    expect(result.data.companies).toHaveLength(1);
  });

  test("Apollo deduplicates domains, uses raw pagination and stops at the display cap", async () => {
    fetched(async () =>
      json({
        organizations: [apolloCompany, { ...apolloCompany, id: "duplicate" }],
        pagination: { page: 500, per_page: 2, total_pages: 600 },
      }),
    );
    const result = await Discovery.searchApolloCompanies({
      criteria,
      page: 500,
      limit: 2,
    });
    expect(result).toMatchObject({
      success: true,
      data: { nextPage: null, total: null },
    });
    if (!result.success) throw result.error;
    expect(result.data.companies).toHaveLength(1);
  });

  test("rejects malformed filters before touching credentials or the network", async () => {
    const calls: unknown[] = [];
    fetched(async (...input) => {
      calls.push(input);
      return json({});
    });
    for (const invalid of [
      { criteria, page: 501 },
      { criteria, limit: 101 },
      { criteria: { ...criteria, countries: ["ZZ"] } },
      { criteria: { ...criteria, platforms: [] } },
      { criteria: { ...criteria, teamSizeMin: 1000, teamSizeMax: 10 } },
      { criteria: { ...criteria, annualRevenueMin: -1 } },
    ])
      expect(await Discovery.searchApolloCompanies(invalid)).toMatchObject({
        success: false,
        error: { code: "input" },
      });
    expect(calls).toHaveLength(0);
  });

  test("bad pagination and over-limit responses are contracts, not empty successful searches", async () => {
    fetched(async () =>
      json({ organizations: [], pagination: { page: 8, per_page: 25 } }),
    );
    expect(await Discovery.searchApolloCompanies({ criteria })).toMatchObject({
      success: false,
      error: { code: "contract" },
    });
    fetched(async () =>
      json({ organizations: [apolloCompany, apolloCompany] }),
    );
    expect(
      await Discovery.searchApolloCompanies({ criteria, limit: 1 }),
    ).toMatchObject({ success: false, error: { code: "contract" } });
    fetched(async () =>
      json({
        organizations: [{ person: { email: "not-a-company@example.com" } }],
      }),
    );
    expect(await Discovery.searchApolloCompanies({ criteria })).toMatchObject({
      success: false,
      error: { code: "contract" },
    });
  });

  test("Clay uses its company DSL, headquarters predicate and revenue buckets", () => {
    const result = Discovery.buildClayCompanyQuery(criteria);
    expect(result.success).toBe(true);
    if (!result.success) throw result.error;
    expect(result.data).toStartWith("select from companies where ");
    expect(result.data).toContain(
      'locations.any(is_headquarters = true and country_name in ("United States", "United Kingdom"))',
    );
    expect(result.data).toContain(
      'technographics.any(product in ("Shopify", "WooCommerce"))',
    );
    expect(result.data).toContain('description contains ("coffee", "beauty")');
    expect(result.data).toContain('not (description contains "agency")');
    expect(result.data).toContain("estimated_employee_count >= 3");
    expect(result.data).toContain("estimated_employee_count <= 200");
    expect(result.data).toContain(
      'annual_revenue in ("1M-5M", "5M-10M", "10M-25M", "25M-75M", "75M-200M")',
    );
    expect(result.data).not.toContain("annual_revenue >=");
  });

  test("Clay query literals cannot turn user text into a second predicate", () => {
    const keyword = 'coffee") or domain = "unrequested.example';
    const result = Discovery.buildClayCompanyQuery({
      ...criteria,
      keywords: [keyword],
    });
    expect(result.success).toBe(true);
    if (!result.success) throw result.error;
    expect(result.data).toContain(
      `description contains (${JSON.stringify(keyword)})`,
    );
    expect(
      Discovery.buildClayCompanyQuery({
        ...criteria,
        keywords: ["coffee\nselect from people"],
      }),
    ).toMatchObject({ success: false });
  });

  test("Clay preserves range receipts without turning them into exact facts", () => {
    const company = Discovery.normalizeClayCompany(clayCompany);
    expect(company).toMatchObject({
      source: "clay",
      sourceId: "42",
      country: "US",
      platform: null,
      teamSize: null,
      annualRevenue: null,
    });
    expect(company?.sourcePayload).toMatchObject({
      size: "11-50",
      annual_revenue: "1M-5M",
    });
    expect(
      Discovery.normalizeClayCompany({ ...clayCompany, domain: null }),
    ).toBeNull();
  });

  test("Clay creation and iterator advancement are separate requests with a resumable ID", async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    fetched(async (input, options) => {
      calls.push({
        url: String(input),
        body: JSON.parse(String(options?.body)),
      });
      return calls.length === 1
        ? json({ search_id: "search_fixture", source_type: "companies" })
        : json({
            data: [clayCompany],
            source_type: "companies",
            has_more: true,
          });
    });
    const started = await Discovery.startClayCompanySearch({ criteria });
    expect(started).toEqual({
      success: true,
      data: { searchId: "search_fixture", source: "clay" },
    });
    expect(calls).toHaveLength(1);
    const page = await Discovery.nextClayCompanies({
      searchId: "search_fixture",
      limit: 10,
    });
    expect(page).toMatchObject({
      success: true,
      data: {
        searchId: "search_fixture",
        hasMore: true,
        exhaustionReason: null,
      },
    });
    expect(calls[1]).toEqual({
      url: "https://api.clay.com/public/v0/search/query-mode/search_fixture/run",
      body: { limit: 10 },
    });
    expect(calls[1]?.body).not.toHaveProperty("cursor");
  });

  test("Clay refuses people results and reports exhaustion explicitly", async () => {
    fetched(async () =>
      json({ search_id: "search_fixture", source_type: "people" }),
    );
    expect(await Discovery.startClayCompanySearch({ criteria })).toMatchObject({
      success: false,
      error: { code: "contract" },
    });
    fetched(async () =>
      json({
        data: [],
        source_type: "companies",
        has_more: false,
        exhaustion_reason: "query_limit",
      }),
    );
    expect(
      await Discovery.nextClayCompanies({ searchId: "search_fixture" }),
    ).toMatchObject({
      success: true,
      data: { hasMore: false, exhaustionReason: "query_limit" },
    });
  });

  test("access/quota/rate errors remain distinct and redact provider bodies", async () => {
    for (const [status, code] of [
      [403, "access"],
      [402, "quota"],
      [429, "rate-limit"],
    ] as const) {
      fetched(async () =>
        json({ message: "private-debug-fixture" }, status, {
          "retry-after": "45",
        }),
      );
      const result = await Discovery.nextClayCompanies({
        searchId: "search_fixture",
      });
      expect(result).toMatchObject({
        success: false,
        error: { code, retryAfterSeconds: 45 },
      });
      if (!result.success)
        expect(result.error.message).not.toContain("private-debug");
    }
  });

  test("an interrupted paid search or iterator is uncertain and is not retried", async () => {
    const calls: unknown[] = [];
    fetched(async (...input) => {
      calls.push(input);
      throw new TypeError("interrupted");
    });
    expect(await Discovery.searchApolloCompanies({ criteria })).toMatchObject({
      success: false,
      error: { code: "uncertain" },
    });
    expect(
      await Discovery.nextClayCompanies({ searchId: "search_fixture" }),
    ).toMatchObject({ success: false, error: { code: "uncertain" } });
    expect(calls).toHaveLength(2);
  });
});
