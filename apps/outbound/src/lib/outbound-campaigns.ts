import { z } from "zod";
import { normalizeDomain, type Playbook, splitList } from "./outbound";

const searchTerm = z
  .string()
  .trim()
  .min(1)
  .max(150)
  .refine(
    (value) =>
      [...value].every(
        (character) =>
          character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
      ),
    "Use plain search text without control characters.",
  );
const bound = z.number().int().nonnegative().max(1_000_000_000_000).nullable();
export const campaignStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "archived",
]);
export const campaignCriteriaSchema = z
  .strictObject({
    objective: z.string().trim().min(1).max(4000),
    qualificationNotes: z.string().trim().max(10000),
    countries: z
      .array(
        z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^[A-Z]{2}$/),
      )
      .min(1)
      .max(25),
    platforms: z
      .array(z.enum(["shopify", "woocommerce"]))
      .min(1)
      .max(2)
      .refine(
        (values) => new Set(values).size === values.length,
        "Choose each platform once.",
      ),
    keywords: z.array(searchTerm).max(50),
    excludedKeywords: z.array(searchTerm).max(50),
    targetRoles: z.array(searchTerm).min(1).max(50),
    excludedRoles: z.array(searchTerm).max(48),
    excludedDomains: z
      .array(
        z
          .string()
          .trim()
          .refine(
            (value) => Boolean(normalizeDomain(value)),
            "Use a valid company domain.",
          ),
      )
      .max(500),
    teamSizeMin: bound,
    teamSizeMax: bound,
    annualRevenueMin: bound,
    annualRevenueMax: bound,
  })
  .superRefine((value, context) => {
    for (const [minimum, maximum] of [
      ["teamSizeMin", "teamSizeMax"],
      ["annualRevenueMin", "annualRevenueMax"],
    ] as const) {
      if (
        value[minimum] !== null &&
        value[maximum] !== null &&
        value[minimum] > value[maximum]
      ) {
        context.addIssue({
          code: "custom",
          path: [maximum],
          message: "The maximum must be at least the minimum.",
        });
      }
    }
  });
export type CampaignCriteria = z.infer<typeof campaignCriteriaSchema>;
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;
export type DiscoveryProvider = "apollo" | "clay";
export type Campaign = {
  id: string;
  name: string;
  status: CampaignStatus;
  criteria: CampaignCriteria;
  revision: number;
  answers: string;
  createdAt: string;
  updatedAt: string;
};
export type CampaignCompany = {
  id: string;
  campaignId: string;
  domain: string;
  name: string;
  website: string;
  country: string | null;
  platform: "shopify" | "woocommerce" | null;
  teamSize: number | null;
  annualRevenue: number | null;
  source: DiscoveryProvider | "saved";
  sourceId: string | null;
  status: "candidate" | "added" | "excluded";
  reason: string;
  prospectId: string | null;
  criteriaRevision: number;
  createdAt: string;
  updatedAt: string;
};
export type CampaignRun = {
  id: string;
  campaignId: string;
  provider: DiscoveryProvider;
  operation: "apolloPage" | "clayStart" | "clayPage";
  status: "starting" | "completed" | "failed" | "uncertain";
  criteriaRevision: number;
  companyCount: number;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
};
export type CampaignDiscoveryState = {
  apolloPage: number;
  apolloExhausted: boolean;
  claySearchId: string | null;
  clayExhausted: boolean;
};
export const initialCampaignDiscoveryState = (): CampaignDiscoveryState => ({
  apolloPage: 1,
  apolloExhausted: false,
  claySearchId: null,
  clayExhausted: false,
});
export const defaultCampaignCriteria = (playbook: Playbook): CampaignCriteria =>
  campaignCriteriaSchema.parse({
    objective:
      "Find established brands selling their own physical products that ecentic can help make easier for AI shopping agents to understand.",
    qualificationNotes: playbook.targetingNotes,
    countries: splitList(playbook.allowedCountries),
    platforms: ["shopify", "woocommerce"],
    keywords: [],
    excludedKeywords: [],
    targetRoles: splitList(playbook.targetRoles),
    excludedRoles: splitList(playbook.excludedRoles),
    excludedDomains: splitList(playbook.excludedDomains),
    teamSizeMin: null,
    teamSizeMax: null,
    annualRevenueMin: null,
    annualRevenueMax: null,
  });

export const campaignAnswersSchema = z.strictObject({
  criteria: campaignCriteriaSchema,
});
/** Parse only an exact JSON document or one fenced JSON block. Never execute pasted instructions. */
export const parseCampaignAnswers = (answers: string): CampaignCriteria => {
  if (answers.length > 50000)
    throw new Error("Campaign answers must be at most 50,000 characters.");
  const trimmed = answers.trim();
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(trimmed);
  return campaignAnswersSchema.parse(JSON.parse(fenced?.[1] ?? trimmed))
    .criteria;
};
export const generateCampaignQuestionnaire = ({
  name,
  criteria,
}: Pick<
  Campaign,
  "name" | "criteria"
>) => `Help define the company-discovery criteria for ecentic Outbound campaign "${name}".

Use the current ecentic context and my answers to the questions below. Do not invent product claims, funding, team size, revenue, contact details, or domains. These answers configure company discovery; they do not authorize sending. The global Playbook still controls message formula, sender identities, exclusions, approval, and sending limits.

1. Which brand types, physical-product categories, countries, and Shopify/WooCommerce platforms should this campaign target?
2. What specific objective and qualification evidence distinguish this campaign from our other campaigns? Include established-brand, funding, team or retail-distribution requirements in qualificationNotes when relevant.
3. Which company-search keywords help find them, and which keywords identify businesses to exclude?
4. Are numeric team-size or annual-revenue bounds truly required? Use null when unknown or unnecessary; never invent a revenue floor.
5. Which current decision-maker roles are appropriate, and which roles must be excluded?
6. Which exact known domains must this campaign exclude? Do not guess domains from company names. Global customer, investor, partner, suppression and contact-history exclusions still apply across campaigns.
7. What should staff verify on the real website before a company proceeds to contact research? Put non-machine-verifiable requirements in qualificationNotes.

Return ONLY one JSON object with the exact shape below. Every field is required. Do not include explanations or unknown fields. Arrays contain strings; platforms may contain only "shopify" and "woocommerce"; numeric bounds are nonnegative integers or null. Countries must be uppercase ISO two-letter country codes (for example US, CA or GB). This output will be previewed and can be edited in the app before saving.\n\n${JSON.stringify({ criteria }, null, 2)}`;

const countryKey = (value: string) => {
  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, string> = {
    "united states": "us",
    "united states of america": "us",
    usa: "us",
    "united kingdom": "gb",
    uk: "gb",
    germany: "de",
    austria: "at",
    switzerland: "ch",
    france: "fr",
    spain: "es",
    italy: "it",
    netherlands: "nl",
    canada: "ca",
    australia: "au",
  };
  return aliases[normalized] ?? normalized;
};
export const campaignCountryMatches = (countries: string[], country: string) =>
  countries.some((allowed) => countryKey(allowed) === countryKey(country));
export const campaignDomainExcluded = (
  criteria: CampaignCriteria,
  domain: string,
) =>
  criteria.excludedDomains.some((entry) => {
    const excluded = normalizeDomain(entry);
    const normalized = normalizeDomain(domain);
    return normalized === excluded || normalized.endsWith(`.${excluded}`);
  });
/** Hard known mismatches exclude a candidate. Unknown observations stay visible for research. */
export const candidateExclusion = (
  criteria: CampaignCriteria,
  company: Pick<
    CampaignCompany,
    "domain" | "country" | "platform" | "teamSize" | "annualRevenue"
  >,
): string | null => {
  switch (true) {
    case campaignDomainExcluded(criteria, company.domain):
      return "campaignDomainExcluded";
    case Boolean(company.country) &&
      !campaignCountryMatches(criteria.countries, company.country ?? ""):
      return "countryMismatch";
    case company.platform !== null &&
      !criteria.platforms.includes(company.platform):
      return "platformMismatch";
    case company.teamSize !== null &&
      criteria.teamSizeMin !== null &&
      company.teamSize < criteria.teamSizeMin:
      return "teamSizeMismatch";
    case company.teamSize !== null &&
      criteria.teamSizeMax !== null &&
      company.teamSize > criteria.teamSizeMax:
      return "teamSizeMismatch";
    case company.annualRevenue !== null &&
      criteria.annualRevenueMin !== null &&
      company.annualRevenue < criteria.annualRevenueMin:
      return "revenueMismatch";
    case company.annualRevenue !== null &&
      criteria.annualRevenueMax !== null &&
      company.annualRevenue > criteria.annualRevenueMax:
      return "revenueMismatch";
    default:
      return null;
  }
};
/** Exact numeric filters require observed values before a candidate can become a contact. */
export const companyQualificationIssues = (
  criteria: CampaignCriteria,
  company: Parameters<typeof candidateExclusion>[1],
) => [
  ...(candidateExclusion(criteria, company)
    ? [candidateExclusion(criteria, company) as string]
    : []),
  ...(!company.country ? ["countryUnknown"] : []),
  ...(!company.platform ? ["platformUnknown"] : []),
  ...(company.teamSize === null &&
  (criteria.teamSizeMin !== null || criteria.teamSizeMax !== null)
    ? ["teamSizeUnknown"]
    : []),
  ...(company.annualRevenue === null &&
  (criteria.annualRevenueMin !== null || criteria.annualRevenueMax !== null)
    ? ["revenueUnknown"]
    : []),
];
