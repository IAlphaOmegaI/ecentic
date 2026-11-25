import { resultify } from "@zenncore/utils";
import { z } from "zod";
import { normalizeDomain } from "@/lib/outbound";
import {
  configurationError,
  IntegrationError,
  identifierSchema,
  inputError,
  request,
} from "./http";

export type CompanySearchCriteria = {
  countries: string[];
  platforms: ("shopify" | "woocommerce")[];
  keywords?: string[];
  excludedKeywords?: string[];
  teamSizeMin?: number | null;
  teamSizeMax?: number | null;
  annualRevenueMin?: number | null;
  annualRevenueMax?: number | null;
};

export type CompanyCandidate = {
  name: string;
  domain: string;
  website: string;
  country: string | null;
  platform: "shopify" | "woocommerce" | null;
  teamSize: number | null;
  annualRevenue: number | null;
  source: "apollo" | "clay";
  sourceId: string | null;
  sourcePayload: Record<string, unknown>;
};

const regions = new Intl.DisplayNames(["en"], {
  type: "region",
  fallback: "none",
});
const countryOverrides: Record<string, string> = {
  CD: "Democratic Republic of the Congo",
  CG: "Republic of the Congo",
  CI: "Ivory Coast",
  HK: "Hong Kong",
  MK: "Macedonia",
  MO: "Macao",
  PS: "Palestinian Territory",
  SZ: "Swaziland",
  TL: "East Timor",
  TR: "Turkey",
  VI: "U.S. Virgin Islands",
};
const countryName = (code: string) => {
  if (
    !/^[A-Z]{2}$/.test(code) ||
    ["EU", "EZ", "UN", "QO", "ZZ", "XA", "XB"].includes(code)
  )
    return null;
  return countryOverrides[code] ?? regions.of(code) ?? null;
};
const countryCodes = Array.from({ length: 26 }, (_, first) =>
  Array.from({ length: 26 }, (_, second) =>
    String.fromCharCode(65 + first, 65 + second),
  ),
).flat();
const normalizeCountry = (value: string | null | undefined) => {
  if (!value?.trim()) return null;
  const normalized = value.trim();
  const code = normalized.toUpperCase();
  if (countryName(code)) return code;
  return (
    countryCodes.find((candidate) =>
      [countryName(candidate), regions.of(candidate)].some(
        (name) => name?.toLowerCase() === normalized.toLowerCase(),
      ),
    ) ?? null
  );
};
const term = z
  .string()
  .trim()
  .min(1)
  .max(150)
  .refine((value) =>
    [...value].every(
      (character) =>
        character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
    ),
  );
const bound = z.number().int().min(0).max(1_000_000_000_000).nullish();
const criteriaSchema = z
  .object({
    countries: z
      .array(
        z
          .string()
          .trim()
          .toUpperCase()
          .refine((country) => Boolean(countryName(country))),
      )
      .min(1)
      .max(25),
    platforms: z
      .array(z.enum(["shopify", "woocommerce"]))
      .min(1)
      .max(2),
    keywords: z.array(term).max(50).default([]),
    excludedKeywords: z.array(term).max(50).default([]),
    teamSizeMin: bound,
    teamSizeMax: bound,
    annualRevenueMin: bound,
    annualRevenueMax: bound,
  })
  .refine(
    (criteria) =>
      (criteria.teamSizeMin ?? 0) <=
        (criteria.teamSizeMax ?? Number.MAX_SAFE_INTEGER) &&
      (criteria.annualRevenueMin ?? 0) <=
        (criteria.annualRevenueMax ?? Number.MAX_SAFE_INTEGER),
  );
const limitSchema = z.number().int().min(1).max(100).default(25);
const text = z.string().max(4000).nullish().catch(null);
const number = z.number().finite().nonnegative().nullish().catch(null);
const technologySchema = z.object({
  uid: text,
  name: text,
  category: text,
});
const apolloCompanySchema = z.object({
  id: z.string().min(1).max(200),
  name: text,
  primary_domain: text,
  website_url: text,
  country: text,
  country_code: text,
  estimated_num_employees: number,
  annual_revenue: number,
  annual_revenue_printed: text,
  industry: text,
  short_description: text,
  linkedin_url: text,
  technology_names: z.array(z.string()).max(1000).nullish().catch(null),
  current_technologies: z
    .array(technologySchema)
    .max(1000)
    .nullish()
    .catch(null),
});
const clayCompanySchema = z.object({
  clay_company_id: z.union([
    z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    z.string().regex(/^\d+$/).max(50),
  ]),
  name: text,
  domain: text,
  country: text,
  size: text,
  type: text,
  industry: text,
  location: text,
  description: text,
  linkedin_url: text,
  annual_revenue: text,
  total_funding_amount_range_usd: z
    .union([z.string().max(4000), z.number().finite().nonnegative()])
    .nullish()
    .catch(null),
});
const companyLocation = (
  domain: string | null | undefined,
  website?: string | null,
) => {
  const normalized = normalizeDomain(domain || website || "");
  if (!normalized) return null;
  const parsed = website ? resultify(() => new URL(website)) : null;
  if (parsed?.success && normalizeDomain(parsed.data.href) !== normalized)
    return null;
  return { domain: normalized, website: `https://${normalized}` };
};
const apolloPlatform = (value: z.infer<typeof apolloCompanySchema>) => {
  const technologies = [
    ...(value.technology_names ?? []),
    ...(value.current_technologies ?? []).flatMap((technology) =>
      [technology.uid, technology.name].filter((name): name is string =>
        Boolean(name),
      ),
    ),
  ].map((name) => name.toLowerCase().replaceAll(" ", "_"));
  const shopify = technologies.some((name) =>
    [
      "shopify",
      "shopify_plus",
      "shopify_custom",
      "shopify_professional",
      "shopify_unlimited",
      "shopify_hydrogen",
    ].includes(name),
  );
  const woocommerce = technologies.some((name) =>
    ["woo_commerce", "woocommerce"].includes(name),
  );
  if (shopify === woocommerce) return null;
  return shopify ? ("shopify" as const) : ("woocommerce" as const);
};

const wholeObservation = (
  value: number | null | undefined,
  maximum = Number.MAX_SAFE_INTEGER,
) =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  value <= maximum
    ? value
    : null;

/** Search filters are provider hints. Missing fields never inherit the query's values. */
export const normalizeApolloCompany = (
  input: unknown,
): CompanyCandidate | null => {
  const parsed = apolloCompanySchema.safeParse(input);
  if (!parsed.success) return null;
  const value = parsed.data;
  const name = value.name?.trim();
  if (!name) return null;
  const location = companyLocation(value.primary_domain, value.website_url);
  if (!location) return null;
  return {
    name,
    ...location,
    country:
      normalizeCountry(value.country_code) ?? normalizeCountry(value.country),
    platform: apolloPlatform(value),
    teamSize: wholeObservation(value.estimated_num_employees, 2_147_483_647),
    annualRevenue: wholeObservation(value.annual_revenue),
    source: "apollo",
    sourceId: value.id,
    sourcePayload: value,
  };
};

/** Reuse actual provider fields before buying the same organization facts again. */
export const savedApolloCompany = (
  company: Pick<CompanyCandidate, "domain" | "sourceId" | "sourcePayload"> & {
    source: CompanyCandidate["source"] | "saved";
  },
  criteria: CompanySearchCriteria,
): CompanyCandidate | null => {
  if (company.source !== "apollo") return null;
  const saved = normalizeApolloCompany(company.sourcePayload);
  if (
    !saved ||
    saved.domain !== normalizeDomain(company.domain) ||
    saved.sourceId !== company.sourceId ||
    !saved.country ||
    (saved.teamSize === null &&
      (criteria.teamSizeMin != null || criteria.teamSizeMax != null)) ||
    (saved.annualRevenue === null &&
      (criteria.annualRevenueMin != null || criteria.annualRevenueMax != null))
  )
    return null;
  // Keep the original receipt and observation time; reuse is not a fresh check.
  return { ...saved, sourcePayload: company.sourcePayload };
};

/** Clay's size and revenue fields are ranges; do not manufacture a point estimate. */
export const normalizeClayCompany = (
  input: unknown,
): CompanyCandidate | null => {
  const parsed = clayCompanySchema.safeParse(input);
  if (!parsed.success) return null;
  const value = parsed.data;
  const name = value.name?.trim();
  if (!name) return null;
  const location = companyLocation(value.domain);
  if (!location) return null;
  return {
    name,
    ...location,
    country: normalizeCountry(value.country),
    platform: null,
    teamSize:
      value.size && /^\d+$/.test(value.size)
        ? wholeObservation(Number(value.size), 2_147_483_647)
        : null,
    annualRevenue: null,
    source: "clay",
    sourceId: String(value.clay_company_id),
    sourcePayload: value,
  };
};

const credentials = async (provider: "apollo" | "clay") => {
  const Credentials = await import(
    "@/server/app/outbound/provider-credentials"
  );
  const resolved = await Credentials.resolveKey(provider);
  if (!resolved.success || !resolved.data) return configurationError(provider);
  return { success: true as const, data: resolved.data };
};
const companies = (
  records: unknown[],
  normalize: (record: unknown) => CompanyCandidate | null,
) => [
  ...new Map(
    records.flatMap((record) => {
      const company = normalize(record);
      return company ? [[company.domain, company] as const] : [];
    }),
  ).values(),
];
const contractError = (provider: "apollo" | "clay") => ({
  success: false as const,
  error: new IntegrationError(
    provider,
    "contract",
    "The provider returned inconsistent company-search pagination.",
  ),
});

const breadcrumbValue = z
  .union([
    z.string().max(4000),
    z.number().finite(),
    z.array(z.union([z.string().max(4000), z.number().finite()])).max(500),
    z.object({
      min: z.union([z.string().max(50), z.number().finite()]).optional(),
      max: z.union([z.string().max(50), z.number().finite()]).optional(),
    }),
  ])
  .nullable();
const apolloBreadcrumbSchema = z.object({
  signal_field_name: z.string().max(200),
  value: breadcrumbValue,
  label: z.string().max(1000).optional(),
  display_name: z.string().max(4000).optional(),
});

/** Compare acknowledged values only; a missing echo is recorded, never invented. */
const apolloAcknowledgesFilters = (
  body: Record<string, unknown>,
  breadcrumbs: z.infer<typeof apolloBreadcrumbSchema>[],
) => {
  const expected = {
    ...body,
    ...(typeof body["revenue_range"] === "object" &&
    body["revenue_range"] !== null
      ? Object.fromEntries(
          Object.entries(body["revenue_range"]).map(([key, value]) => [
            `revenue_range[${key}]`,
            value,
          ]),
        )
      : {}),
  };
  const fields = [
    ...new Set(breadcrumbs.map((entry) => entry.signal_field_name)),
  ];
  return fields.every((field) => {
    if (!(field in expected)) return true;
    const sent = expected[field];
    const received = breadcrumbs
      .filter((entry) => entry.signal_field_name === field)
      .flatMap((entry) =>
        Array.isArray(entry.value) ? entry.value : [entry.value],
      );
    if (Array.isArray(sent)) {
      const normalize = (value: unknown) =>
        typeof value === "string"
          ? field === "organization_locations"
            ? (normalizeCountry(value) ?? value.trim().toLowerCase())
            : value.trim().toLowerCase()
          : null;
      const requestedValues = [...new Set(sent.map(normalize))].sort();
      const acknowledgedValues = [...new Set(received.map(normalize))].sort();
      return (
        !acknowledgedValues.includes(null) &&
        JSON.stringify(requestedValues) === JSON.stringify(acknowledgedValues)
      );
    }
    if (typeof sent === "number")
      return (
        received.length === 1 &&
        received[0] !== null &&
        Number(received[0]) === sent
      );
    if (typeof sent === "object" && sent !== null) {
      const actual = received[0];
      return (
        received.length === 1 &&
        typeof actual === "object" &&
        actual !== null &&
        Object.keys(sent).length === Object.keys(actual).length &&
        Object.entries(sent).every(
          ([key, value]) =>
            key in actual &&
            Number(actual[key as keyof typeof actual]) === value,
        )
      );
    }
    return false;
  });
};

/** One billed search page only; no person lookup, company enrichment or automatic retry. */
export const searchApolloCompanies = async (input: {
  criteria: CompanySearchCriteria;
  page?: number;
  limit?: number;
}) => {
  const parsed = z
    .object({
      criteria: criteriaSchema,
      page: z.number().int().min(1).max(500).default(1),
      limit: limitSchema,
    })
    .safeParse(input);
  if (!parsed.success)
    return inputError(
      "apollo",
      "Check company criteria and use at most 100 results per page.",
    );
  const key = await credentials("apollo");
  if (!key.success) return key;
  const { criteria, page, limit } = parsed.data;
  // Apollo's maintained CLI posts these arrays/ranges as JSON, despite the
  // generated reference describing query parameters. Match its wire format.
  // https://github.com/apolloio/apollo-io-cli/blob/main/src/commands/companies.ts
  const body = {
    page,
    per_page: limit,
    organization_locations: [...new Set(criteria.countries)].map(
      (country) => countryName(country) ?? country,
    ),
    currently_using_any_of_technology_uids: [
      ...new Set(criteria.platforms),
    ].map((platform) =>
      platform === "woocommerce" ? "woo_commerce" : "shopify",
    ),
    ...(criteria.keywords.length
      ? { q_organization_keyword_tags: criteria.keywords }
      : {}),
    ...(criteria.excludedKeywords.length
      ? { q_not_organization_keyword_tags: criteria.excludedKeywords }
      : {}),
    ...(criteria.teamSizeMin != null || criteria.teamSizeMax != null
      ? {
          organization_num_employees_ranges: [
            `${criteria.teamSizeMin ?? 0},${criteria.teamSizeMax ?? 1_000_000_000_000}`,
          ],
        }
      : {}),
    ...(criteria.annualRevenueMin != null || criteria.annualRevenueMax != null
      ? {
          revenue_range: {
            ...(criteria.annualRevenueMin != null
              ? { min: criteria.annualRevenueMin }
              : {}),
            ...(criteria.annualRevenueMax != null
              ? { max: criteria.annualRevenueMax }
              : {}),
          },
        }
      : {}),
  };
  const response = await request(
    "apollo",
    "https://api.apollo.io/api/v1/mixed_companies/search",
    {
      method: "POST",
      headers: {
        "x-api-key": key.data,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    z.object({
      organizations: z.array(z.unknown()).max(limit),
      breadcrumbs: z.array(apolloBreadcrumbSchema).max(500).nullish(),
      partial_results_only: z.boolean().nullish(),
      partial_results_limit: z.number().int().nonnegative().nullish(),
      pagination: z
        .object({
          page: z.number().int().min(1).optional(),
          per_page: z.number().int().min(1).optional(),
          total_pages: z.number().int().nonnegative().optional(),
          total_entries: z.number().int().nonnegative().optional(),
        })
        .optional(),
    }),
  );
  if (!response.success) return response;
  const value = response.data.value;
  const receipt = {
    requestFormat: "json-body",
    request: body,
    breadcrumbs: value.breadcrumbs ?? null,
    pagination: value.pagination ?? null,
    partialResultsOnly: value.partial_results_only ?? null,
    partialResultsLimit: value.partial_results_limit ?? null,
    returnedCount: value.organizations.length,
  };
  if (!apolloAcknowledgesFilters(body, value.breadcrumbs ?? []))
    return {
      success: false as const,
      error: new IntegrationError(
        "apollo",
        "contract",
        "Apollo acknowledged different company filters from the request.",
        502,
        null,
        "filter_acknowledgement_mismatch",
        receipt,
      ),
    };
  const records = value.organizations.filter(
    (record) => apolloCompanySchema.safeParse(record).success,
  );
  if (value.organizations.length && !records.length)
    return contractError("apollo");
  if (
    (value.pagination?.page != null && value.pagination.page !== page) ||
    (value.pagination?.per_page != null && value.pagination.per_page !== limit)
  )
    return contractError("apollo");
  const hasMore =
    value.pagination?.total_pages != null
      ? page < value.pagination.total_pages
      : value.organizations.length === limit;
  return {
    success: true as const,
    data: {
      companies: companies(records, normalizeApolloCompany),
      nextPage: hasMore && page < 500 ? page + 1 : null,
      total: value.pagination?.total_entries ?? null,
      receipt,
    },
  };
};

// Clay's authenticated query reference, checked 15 November 2026, uses these
// exact enum brackets. Overlapping brackets need qualification after discovery.
const revenueBuckets = [
  ["0-500K", 0, 500_000],
  ["500K-1M", 500_000, 1_000_000],
  ["1M-5M", 1_000_000, 5_000_000],
  ["5M-10M", 5_000_000, 10_000_000],
  ["10M-25M", 10_000_000, 25_000_000],
  ["25M-75M", 25_000_000, 75_000_000],
  ["75M-200M", 75_000_000, 200_000_000],
  ["200M-500M", 200_000_000, 500_000_000],
  ["500M-1B", 500_000_000, 1_000_000_000],
  ["1B-10B", 1_000_000_000, 10_000_000_000],
  ["10B-100B", 10_000_000_000, 100_000_000_000],
  ["100B-1T", 100_000_000_000, 1_000_000_000_000],
] as const;
const queryList = (values: string[]) =>
  `(${values.map((value) => JSON.stringify(value)).join(", ")})`;

export const buildClayCompanyQuery = (input: CompanySearchCriteria) => {
  const parsed = criteriaSchema.safeParse(input);
  if (!parsed.success)
    return inputError("clay", "Check company search criteria.");
  const criteria = parsed.data;
  const revenue =
    criteria.annualRevenueMin != null || criteria.annualRevenueMax != null
      ? revenueBuckets
          .filter(
            ([, minimum, maximum]) =>
              maximum >= (criteria.annualRevenueMin ?? 0) &&
              minimum <=
                (criteria.annualRevenueMax ?? Number.POSITIVE_INFINITY),
          )
          .map(([label]) => label)
      : [];
  const predicates = [
    `locations.any(is_headquarters = true and country_name in ${queryList([...new Set(criteria.countries)].map((country) => countryName(country) ?? country))})`,
    `technographics.any(product in ${queryList([...new Set(criteria.platforms)].map((platform) => (platform === "shopify" ? "Shopify" : "WooCommerce")))})`,
    ...(criteria.keywords.length
      ? [`description contains ${queryList(criteria.keywords)}`]
      : []),
    ...criteria.excludedKeywords.map(
      (keyword) => `not (description contains ${JSON.stringify(keyword)})`,
    ),
    ...(criteria.teamSizeMin != null
      ? [`estimated_employee_count >= ${criteria.teamSizeMin}`]
      : []),
    ...(criteria.teamSizeMax != null
      ? [`estimated_employee_count <= ${criteria.teamSizeMax}`]
      : []),
    ...(revenue.length ? [`annual_revenue in ${queryList(revenue)}`] : []),
  ];
  return {
    success: true as const,
    data: `select from companies where ${predicates.join(" and ")}`,
  };
};

/** Persist this ID before requesting a page. Each search owns a stateful iterator. */
export const startClayCompanySearch = async ({
  criteria,
}: {
  criteria: CompanySearchCriteria;
}) => {
  const query = buildClayCompanyQuery(criteria);
  if (!query.success) return query;
  const key = await credentials("clay");
  if (!key.success) return key;
  const response = await request(
    "clay",
    "https://api.clay.com/public/v0/search/query-mode",
    {
      method: "POST",
      headers: { "clay-api-key": key.data, "Content-Type": "application/json" },
      body: JSON.stringify({ query: query.data }),
    },
    z.object({
      search_id: identifierSchema,
      source_type: z.literal("companies"),
    }),
  );
  if (!response.success) return response;
  return {
    success: true as const,
    data: { searchId: response.data.value.search_id, source: "clay" as const },
  };
};

/** This POST advances the iterator; serialize per searchId and never replay an uncertain call. */
export const nextClayCompanies = async (input: {
  searchId: string;
  limit?: number;
}) => {
  const parsed = z
    .object({ searchId: identifierSchema, limit: limitSchema })
    .safeParse(input);
  if (!parsed.success) return inputError("clay");
  const key = await credentials("clay");
  if (!key.success) return key;
  const { searchId, limit } = parsed.data;
  const response = await request(
    "clay",
    `https://api.clay.com/public/v0/search/query-mode/${encodeURIComponent(searchId)}/run`,
    {
      method: "POST",
      headers: { "clay-api-key": key.data, "Content-Type": "application/json" },
      body: JSON.stringify({ limit }),
    },
    z.object({
      data: z.array(z.unknown()).max(limit),
      source_type: z.literal("companies"),
      has_more: z.boolean(),
      exhaustion_reason: z.enum(["query_limit", "no_more_results"]).optional(),
    }),
  );
  if (!response.success) return response;
  const records = response.data.value.data.filter(
    (record) => clayCompanySchema.safeParse(record).success,
  );
  if (response.data.value.data.length && !records.length)
    return contractError("clay");
  if (response.data.value.has_more && response.data.value.exhaustion_reason)
    return contractError("clay");
  return {
    success: true as const,
    data: {
      companies: companies(records, normalizeClayCompany),
      searchId,
      hasMore: response.data.value.has_more,
      exhaustionReason: response.data.value.exhaustion_reason ?? null,
    },
  };
};
