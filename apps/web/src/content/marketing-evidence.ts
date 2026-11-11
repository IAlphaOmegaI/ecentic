import { aiChannels, channelCheckedAt } from "./ai-channels";

/** Known figures are retained separately from the missing method and denominators. */
export const simulationEvidence = {
  id: "assistant-disagreement",
  status: "pending",
  sampleSize: 36_797,
  year: 2026,
  sourceKey: "research2026",
  models: [
    { id: "chatgpt", rate: 51.6, count: null, total: null },
    { id: "claude", rate: null, count: null, total: null },
    { id: "gemini", rate: null, count: null, total: null },
  ],
  optionalModels: [{ id: "perplexity", rate: null, count: null, total: null }],
  pendingIds: [
    "claudeRate",
    "geminiRate",
    "simulationDenominators",
    "simulationMethod",
    "perplexityComparableRate",
  ],
} as const;

/** The first and third rows were already approved in the original brief. */
export const catalogFindings = [
  {
    id: "catalogFaults",
    companyId: "spiritsMarketplace",
    total: 9_699,
    failureCount: null,
    percentage: 88,
    rounded: true,
    approval: "approved",
    sourceKey: "catalogAudits2026",
    pendingIds: [],
  },
  {
    id: "missingOfferFacts",
    companyId: "spiritsMarketplace",
    total: 45,
    failureCount: 45,
    percentage: 100,
    rounded: false,
    approval: "pending",
    sourceKey: "catalogAudits2026",
    pendingIds: ["missingOfferFactsApproval"],
  },
  {
    id: "storeNotNamed",
    companyId: "spiritsMarketplace",
    total: 20,
    failureCount: 20,
    percentage: 100,
    rounded: false,
    approval: "approved",
    sourceKey: "catalogAudits2026",
    pendingIds: [],
  },
  {
    id: "missingDescriptions",
    companyId: "workspaceNetwork",
    total: 167,
    failureCount: 167,
    percentage: 100,
    rounded: false,
    approval: "pending",
    sourceKey: "catalogAudits2026",
    pendingIds: ["missingDescriptionsApproval"],
  },
  {
    id: "paymentBlocked",
    companyId: "skincareBrand",
    total: 6,
    failureCount: 6,
    percentage: 100,
    rounded: false,
    approval: "pending",
    sourceKey: "catalogAudits2026",
    pendingIds: ["paymentBlockedApproval"],
  },
] as const;

/** Only events with a first-party article and a verified publication date. */
export const commerceTimeline = [
  {
    id: "googleUcp",
    date: "2026-01-11",
    provider: "google",
    checkedAt: "2026-11-10",
    source: {
      url: "https://blog.google/products/ads-commerce/agentic-commerce-ai-tools-protocol-retailers-platforms/",
    },
  },
  {
    id: "amazonAlexa",
    date: "2026-05-13",
    provider: "amazon",
    checkedAt: "2026-11-10",
    source: {
      url: "https://www.aboutamazon.com/news/retail/alexa-for-shopping-ai-assistant",
    },
  },
  {
    id: "metaMuse",
    date: "2026-09-08",
    provider: "meta",
    checkedAt: "2026-11-10",
    source: {
      url: "https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/",
    },
  },
  {
    id: "googleCart",
    date: "2026-10-15",
    provider: "google",
    checkedAt: "2026-11-10",
    source: {
      url: "https://blog.google/products-and-platforms/products/shopping/universal-cart-launch/",
    },
  },
  {
    id: "shopifyAgentTools",
    date: "2026-10-28",
    provider: "shopify",
    checkedAt: "2026-11-10",
    source: {
      url: "https://www.shopify.com/news/fall-26-edition-developer",
    },
  },
  {
    id: "amazonWorkspace",
    date: "2026-11-04",
    provider: "amazon",
    checkedAt: "2026-11-10",
    source: {
      url: "https://www.aboutamazon.com/news/retail/amazon-shop-direct-merchant-workspace",
    },
  },
] as const;

/**
 * Status, check date and links are always derived from the profile registry.
 * Comparison prose must preserve every eligibility/checkout qualifier in the
 * matching enterpriseChannels.pages entry; update both locales and surfaces
 * together when a verified platform fact changes. See the delivery parity audit.
 */
export const channelComparisons = aiChannels.map((channel) => ({
  key: channel.key,
  href: channel.href,
  status: channel.status,
  checkedAt: channel.checkedAt,
  sources: channel.sources,
}));

export const comparisonCheckedAt = channelCheckedAt;

export const duaEvidence = {
  id: "duaVisits",
  status: "approved",
  metric: "ai-or-direct-visits",
  changePercent: 12,
  periodStart: "2026-04",
  periodEnd: "2026-07",
  confirmed: "2026-09-03",
  sourceKey: "duaPilot",
  href: "/stories/dua-flavours",
  pendingIds: ["duaStartingPoint", "duaChanges", "duaAprilStart"],
} as const;

/** Optional context remains unpublished until the primary statistics are verified. */
export const marketContext = [
  {
    id: "commerceForecast",
    status: "pending",
    value: null,
    range: null,
    year: 2030,
    sourceKey: "mckinseyForecast",
    pendingIds: ["commerceForecastSource"],
  },
  {
    id: "retailAiTraffic",
    status: "pending",
    value: null,
    range: null,
    year: 2026,
    sourceKey: "adobeTraffic",
    pendingIds: ["retailAiTrafficSource"],
  },
  {
    id: "relativeConversion",
    status: "pending",
    value: null,
    range: null,
    year: 2026,
    sourceKey: "adobeConversion",
    pendingIds: ["relativeConversionSource"],
  },
] as const;

export const evidenceSources = {
  research2026: { href: null, published: false },
  catalogAudits2026: { href: null, published: true },
  duaPilot: { href: "/stories/dua-flavours", published: true },
  mckinseyForecast: { href: null, published: false },
  adobeTraffic: { href: null, published: false },
  adobeConversion: { href: null, published: false },
} as const;

/** Review inventory only. Server chart wrappers pass selected display props. */
export const evidencePending = [
  { id: "claudeRate", owner: "Alvi", chart: "C1" },
  { id: "geminiRate", owner: "Alvi", chart: "C1" },
  { id: "simulationDenominators", owner: "Alvi", chart: "C1" },
  { id: "simulationMethod", owner: "Alvi", chart: "C1" },
  { id: "perplexityComparableRate", owner: "Alvi", chart: "C1" },
  { id: "missingOfferFactsApproval", owner: "Xhurian", chart: "C2" },
  { id: "missingDescriptionsApproval", owner: "Xhurian", chart: "C2" },
  { id: "paymentBlockedApproval", owner: "Xhurian", chart: "C2" },
  { id: "copilotLaunchSource", owner: "Xhurian", chart: "C3" },
  { id: "openaiCheckoutChangeSource", owner: "Xhurian", chart: "C3" },
  { id: "duaStartingPoint", owner: "Xhurian", chart: "C5" },
  { id: "duaChanges", owner: "Xhurian", chart: "C5" },
  { id: "duaAprilStart", owner: "Xhurian", chart: "C5" },
  { id: "commerceForecastSource", owner: "Xhurian", chart: "C6" },
  { id: "retailAiTrafficSource", owner: "Xhurian", chart: "C6" },
  { id: "relativeConversionSource", owner: "Xhurian", chart: "C6" },
] as const;
