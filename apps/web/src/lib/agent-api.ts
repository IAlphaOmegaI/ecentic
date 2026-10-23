import { seo } from "@/lib/seo";

/**
 * Payloads for the public, unauthenticated agent API at `/api/v1`.
 *
 * Kept here rather than inside the route handlers so the same objects can be
 * asserted in tests and referenced by the OpenAPI document — a schema that
 * drifts from its endpoint is worse than no schema, because an agent trusts it.
 */

/**
 * The API version this surface serves. Versioning is in the URL path, so an
 * agent that pins `/api/v1/...` keeps the contract it integrated against; a
 * breaking change ships as `/api/v2` beside it.
 */
export const API_VERSION = "1";
export const API_VERSION_HEADER = "API-Version";

/**
 * Published support window. A version is announced as deprecated with a
 * `Deprecation` header, and its removal date with `Sunset` (RFC 8594), at least
 * this many days before it stops answering.
 */
export const DEPRECATION_NOTICE_DAYS = 180;

export type Endpoint = {
  path: string;
  method: "GET" | "POST";
  summary: string;
  authentication: "none" | "bearer" | "x402";
};

export const V1_ENDPOINTS: readonly Endpoint[] = [
  {
    path: "/api/v1",
    method: "GET",
    summary: "Index of the public ecentic agent API.",
    authentication: "none",
  },
  {
    path: "/api/v1/health",
    method: "GET",
    summary: "Liveness of the ecentic service.",
    authentication: "none",
  },
  {
    path: "/api/v1/discovery",
    method: "GET",
    summary:
      "Every machine-readable discovery document ecentic publishes, by protocol.",
    authentication: "none",
  },
  {
    path: "/api/v1/plans",
    method: "GET",
    summary: "Public ecentic plan catalog with prices and billing mode.",
    authentication: "none",
  },
  {
    path: "/api/v1/onboarding",
    method: "GET",
    summary:
      "What an agent can do before any human step, each signal with a URL that proves it.",
    authentication: "none",
  },
  {
    path: "/api/v1/sandbox",
    method: "GET",
    summary: "Zero-auth sandbox: what it offers, its limits, and its caveats.",
    authentication: "none",
  },
  {
    path: "/api/v1/sandbox/simulation",
    method: "POST",
    summary:
      "Run a synthetic product-vs-competitor simulation with no account.",
    authentication: "none",
  },
  {
    path: "/api/v1/skills",
    method: "GET",
    summary: "Agent skills ecentic publishes, with their SKILL.md locations.",
    authentication: "none",
  },
  {
    path: "/api/v1/news",
    method: "GET",
    summary:
      "AI-commerce news wire: Google News search results parsed into JSON records.",
    authentication: "none",
  },
  {
    path: "/api/mcp",
    method: "POST",
    summary: "MCP JSON-RPC endpoint (tools/list, tools/call).",
    authentication: "bearer",
  },
  {
    path: "/api",
    method: "GET",
    summary: "x402-payable agent API root.",
    authentication: "x402",
  },
] as const;

export const apiIndex = () => ({
  name: "ecentic agent API",
  version: API_VERSION,
  description:
    "Public, unauthenticated JSON surface for AI agents evaluating or integrating ecentic. Every response is application/json; every failure is RFC 9457 application/problem+json.",
  documentation: `${seo.host}/docs`,
  openapi: `${seo.host}/openapi.json`,
  versioning: {
    strategy: "url-path",
    current: `v${API_VERSION}`,
    header: API_VERSION_HEADER,
    policy: `${seo.host}/docs/versioning`,
    deprecationNoticeDays: DEPRECATION_NOTICE_DAYS,
    signals: {
      deprecation:
        "Deprecation header (RFC 9745) on every response of a deprecated version.",
      sunset:
        "Sunset header (RFC 8594) carrying the date the version stops answering.",
    },
  },
  rateLimit: {
    policy: `${seo.host}/docs/rate-limits`,
    headers: [
      "RateLimit-Policy",
      "RateLimit",
      "RateLimit-Limit",
      "RateLimit-Remaining",
      "RateLimit-Reset",
      "Retry-After",
    ],
  },
  errors: {
    mediaType: "application/problem+json",
    specification: "https://www.rfc-editor.org/rfc/rfc9457",
    documentation: `${seo.host}/docs/errors`,
  },
  endpoints: V1_ENDPOINTS.map((endpoint) => ({
    ...endpoint,
    url: `${seo.host}${endpoint.path}`,
  })),
});

const PROTOCOLS = [
  {
    name: "Model Context Protocol",
    key: "mcp",
    version: "2025-03-26",
    transport: "http-json-rpc",
    endpoint: `${seo.host}/api/mcp`,
    manifests: [
      `${seo.host}/.well-known/mcp.json`,
      `${seo.host}/.well-known/mcp/server-card.json`,
    ],
  },
  {
    name: "Universal Commerce Protocol",
    key: "ucp",
    version: "2026-04-08",
    transport: "rest",
    endpoint: `${seo.host}/ucp`,
    manifests: [`${seo.host}/.well-known/ucp`],
  },
  {
    name: "Agentic Commerce Protocol",
    key: "acp",
    version: "2026-01-30",
    transport: "rest",
    endpoint: `${seo.host}/api/acp`,
    manifests: [`${seo.host}/.well-known/acp.json`],
  },
  {
    name: "OpenAPI",
    key: "openapi",
    version: "3.1.0",
    transport: "rest",
    endpoint: `${seo.host}/api/v1`,
    manifests: [`${seo.host}/openapi.json`],
  },
  {
    name: "x402",
    key: "x402",
    version: "1",
    transport: "http",
    endpoint: `${seo.host}/api`,
    manifests: [`${seo.host}/openapi.json`],
  },
] as const;

export type ProtocolKey = (typeof PROTOCOLS)[number]["key"];

export const isProtocolKey = (value: string): value is ProtocolKey =>
  PROTOCOLS.some((protocol) => protocol.key === value);

export const discoveryIndex = (protocol?: string) => ({
  version: API_VERSION,
  protocols: protocol
    ? PROTOCOLS.filter((entry) => entry.key === protocol)
    : PROTOCOLS,
  documents: {
    llms: `${seo.host}/llms.txt`,
    agentInstructions: `${seo.host}/.well-known/agent-instructions.md`,
    apiCatalog: `${seo.host}/.well-known/api-catalog`,
    openapi: `${seo.host}/openapi.json`,
    authentication: `${seo.host}/auth.md`,
    agentSkills: `${seo.host}/.well-known/agent-skills/index.json`,
    oauthProtectedResource: `${seo.host}/.well-known/oauth-protected-resource`,
    oauthAuthorizationServer: `${seo.host}/.well-known/oauth-authorization-server`,
    openIdConfiguration: `${seo.host}/.well-known/openid-configuration`,
    jwks: `${seo.host}/.well-known/jwks.json`,
    sitemap: `${seo.host}/sitemap.xml`,
    documentation: `${seo.host}/docs`,
  },
});

/**
 * Public plan catalog. Prices mirror `/pricing` — the marketing page and this
 * endpoint must never quote different numbers to a human and an agent.
 */
export const PLAN_CATALOG = [
  {
    key: "scan",
    name: "Scan",
    billing: "free",
    price: null,
    currency: "USD",
    performanceFee: null,
    summary:
      "One-time free simulation of your top 10 products across ChatGPT, Claude and Gemini.",
  },
  {
    key: "payg",
    name: "Pay-as-you-go",
    billing: "usage",
    price: null,
    currency: "USD",
    performanceFee: {
      rateBps: 300,
      capCents: 50000,
      basis: "AI-attributed orders",
    },
    summary:
      "Free to start, no card required. 3% on AI-attributed orders, capped at $500/month.",
  },
  {
    key: "compete",
    name: "Compete",
    billing: "subscription",
    price: { amountCents: 1490, interval: "month" },
    currency: "USD",
    performanceFee: null,
    summary:
      "Up to 100 products, agent simulations and rescans, competitor battlecards, field-by-field fix suggestions.",
  },
  {
    key: "scale",
    name: "Scale",
    billing: "subscription",
    price: { amountCents: 4490, interval: "month" },
    currency: "USD",
    performanceFee: null,
    summary:
      "Up to 1000 products, with one-click fixes published to your store on top of the Compete loop.",
  },
  {
    key: "dominate",
    name: "Dominate",
    billing: "subscription",
    price: { amountCents: 14900, interval: "month" },
    currency: "USD",
    performanceFee: null,
    summary:
      "Everything in Scale plus Google Merchant Center sync for Shopify stores and agent checkout setup through UCP.",
  },
] as const;

export type PlanKey = (typeof PLAN_CATALOG)[number]["key"];

export const isPlanKey = (value: string): value is PlanKey =>
  PLAN_CATALOG.some((plan) => plan.key === value);

/**
 * One plan's price as it is spoken and written — "$14.90", "$149". Whole
 * amounts drop the cents so nobody quotes "$149.00" on a call.
 *
 * This exists so every surface that names a price reads it from
 * {@link PLAN_CATALOG} rather than holding its own copy. `spec/agent-api.test.ts`
 * asserts the message catalogs agree with it.
 */
export const formatPlanPrice = (key: PlanKey): string | null => {
  const plan = PLAN_CATALOG.find((entry) => entry.key === key);
  if (!plan?.price) return null;

  const amount = plan.price.amountCents / 100;

  return `$${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
};

/**
 * `key` narrows the catalog to one plan. An agent that already knows which plan
 * it is quoting should not have to fetch five and filter client-side, and the
 * parameter gives the operation a typed input an LLM can fill in.
 */
export const plansIndex = (key?: string) => ({
  version: API_VERSION,
  currency: "USD",
  documentation: `${seo.host}/pricing`,
  checkout: `${seo.host}/sign-up`,
  plans: key ? PLAN_CATALOG.filter((plan) => plan.key === key) : PLAN_CATALOG,
});

/**
 * Mirrors `public/.well-known/agent-skills/index.json`. Restated as JSON over
 * the API so an agent that found `/api/v1` first does not have to know the
 * `.well-known` convention to reach the skills.
 */
export const SKILLS = [
  {
    name: "agent-commerce",
    summary:
      "Connect a Shopify or WooCommerce store to ecentic, measure AI agent traffic, and improve agent-driven commerce readiness.",
    whenToUse:
      "Setting up agent tracking, UCP hosting, or catalog sync for a merchant.",
    path: "/.well-known/agent-skills/agent-commerce/SKILL.md",
  },
  {
    name: "optimize-listings",
    summary:
      "Optimize ecommerce product listings so AI shopping agents recommend them.",
    whenToUse:
      "Improving titles, descriptions, attributes, or win rate against named competitors.",
    path: "/.well-known/agent-skills/optimize-listings/SKILL.md",
  },
  {
    name: "validate-ucp",
    summary:
      "Validate a store's Universal Commerce Protocol implementation against the published spec.",
    whenToUse:
      "Checking whether a storefront's UCP discovery profile and endpoints are agent-reachable.",
    path: "/.well-known/agent-skills/validate-ucp/SKILL.md",
  },
] as const;

export type SkillName = (typeof SKILLS)[number]["name"];

export const isSkillName = (value: string): value is SkillName =>
  SKILLS.some((skill) => skill.name === value);

export const skillsIndex = (name?: string) => ({
  version: API_VERSION,
  index: `${seo.host}/.well-known/agent-skills/index.json`,
  skills: (name ? SKILLS.filter((skill) => skill.name === name) : SKILLS).map(
    (skill) => ({
      ...skill,
      url: `${seo.host}${skill.path}`,
    }),
  ),
});

export const healthIndex = (timestamp: string) => ({
  status: "ok" as const,
  service: seo.name,
  version: API_VERSION,
  timestamp,
});

/**
 * Onboarding signals, each with a URL that proves it.
 *
 * The readiness audit reported these as "described but not verified live" — it
 * could read the claims in prose and had no way to check them. Every entry here
 * therefore carries a `verify` URL an auditor (or an agent) can fetch and an
 * `evidence` line naming what to look for in the response, so the claim and its
 * proof travel together.
 */
export const ONBOARDING_SIGNALS = [
  {
    key: "zero-auth-access",
    available: true,
    summary:
      "Every endpoint under /api/v1 answers without any credential, as does the MCP `list_plans` tool.",
    verify: `${seo.host}/api/v1`,
    evidence: "Returns 200 with no Authorization header.",
  },
  {
    key: "free-tier",
    available: true,
    summary:
      "A one-time Scan is free and needs no card. Pay-as-you-go is free to start and only bills a performance fee on AI-attributed orders.",
    verify: `${seo.host}/api/v1/plans`,
    evidence: 'Two entries have billing "free" and "usage" with price null.',
  },
  {
    key: "self-serve-api-keys",
    available: true,
    summary:
      "Keys are minted by the account holder — through the dashboard, or over MCP with the `create_api_key` tool. No sales contact, no manual provisioning.",
    verify: `${seo.host}/auth.md`,
    evidence:
      'MCP tools/list includes "create_api_key"; /auth.md documents the flow.',
  },
  {
    key: "sandbox",
    available: true,
    summary:
      "A zero-auth sandbox returns the exact response shape of a real simulation from synthetic data, so a client can be built and tested before an account exists.",
    verify: `${seo.host}/api/v1/sandbox`,
    evidence: "POST /api/v1/sandbox/simulation returns 200 with no credential.",
  },
  {
    key: "no-sales-contact-required",
    available: true,
    summary:
      "Sign-up, plan selection, and checkout are entirely self-serve. Enterprise terms are optional, not a gate.",
    verify: `${seo.host}/pricing`,
    evidence: "Every plan links to self-serve checkout.",
  },
] as const;

export const onboardingIndex = () => ({
  version: API_VERSION,
  summary:
    "What an agent can do with ecentic before any human step, and how to verify each claim.",
  signals: ONBOARDING_SIGNALS,
  start: {
    withoutAccount: `${seo.host}/api/v1/sandbox`,
    createAccount: `${seo.host}/sign-up`,
    credentials: `${seo.host}/auth.md`,
    documentation: `${seo.host}/docs`,
  },
});

/** Assistants the simulation engine compares a product across. */
export const SANDBOX_ASSISTANTS = [
  "chatgpt",
  "claude",
  "gemini",
  "perplexity",
] as const;

export type SandboxAssistant = (typeof SANDBOX_ASSISTANTS)[number];

/**
 * Ceilings on the sandbox request body. The endpoint is unauthenticated, so
 * these are the only thing standing between it and being used as free storage
 * or an amplifier — they are enforced before parsing, not after.
 */
export const SANDBOX_LIMITS = {
  bodyBytes: 16_384,
  titleChars: 200,
  descriptionChars: 2_000,
  competitors: 5,
} as const;

/**
 * Whether a raw body is over the sandbox ceiling, measured in **bytes**.
 *
 * `String.length` counts UTF-16 code units, so a body of 16k multibyte
 * characters passes a naive length check while arriving as roughly 48KB on the
 * wire — which is the whole thing the ceiling exists to prevent.
 */
export const exceedsSandboxBody = (raw: string) =>
  new TextEncoder().encode(raw).byteLength > SANDBOX_LIMITS.bodyBytes;

export const sandboxIndex = () => ({
  version: API_VERSION,
  mode: "sandbox_fixture" as const,
  summary:
    "A zero-auth sandbox that returns the exact response shape of a real ecentic simulation, computed from synthetic scoring. Build and test a client before creating an account.",
  disclaimer:
    "Sandbox output is synthetic. Scores are derived deterministically from the request and are NOT a measurement of how any assistant actually ranks the product. Nothing is stored, nothing is billed, and no model is called.",
  guarantees: {
    authentication: "none",
    persistence: "none",
    billing: "none",
    externalCalls: "none",
    deterministic: "Identical input always produces identical output.",
  },
  limits: SANDBOX_LIMITS,
  endpoints: [
    {
      path: "/api/v1/sandbox/simulation",
      method: "POST" as const,
      summary:
        "Compare one product against competitors across the four assistants.",
    },
  ].map((endpoint) => ({ ...endpoint, url: `${seo.host}${endpoint.path}` })),
  runForReal: `${seo.host}/sign-up`,
  documentation: `${seo.host}/docs`,
});

/**
 * FNV-1a. The sandbox needs scores that differ per input and never differ
 * across calls with the same input — `Math.random()` would break the second
 * half of that, and a fixed table would break the first, leaving a client
 * unable to tell its own request changes from noise.
 */
const fingerprint = (value: string) =>
  [...value].reduce(
    (hash, character) =>
      Math.imul(hash ^ character.charCodeAt(0), 0x01000193) >>> 0,
    0x811c9dc5,
  );

const scoreFor = (seed: string) => 55 + (fingerprint(seed) % 41);

export type SandboxSimulationInput = {
  product: { title: string; description?: string; priceCents?: number };
  competitors: readonly {
    title: string;
    description?: string;
    priceCents?: number;
  }[];
  assistants: readonly SandboxAssistant[];
};

export const sandboxSimulation = (input: SandboxSimulationInput) => {
  const comparisons = input.assistants.flatMap((assistant) =>
    input.competitors.map((competitor) => {
      const productScore = scoreFor(
        `${assistant}|${input.product.title}|${competitor.title}`,
      );
      const competitorScore = scoreFor(
        `${assistant}|${competitor.title}|${input.product.title}`,
      );
      return {
        assistant,
        competitor: competitor.title,
        winner:
          productScore >= competitorScore
            ? ("product" as const)
            : ("competitor" as const),
        productScore,
        competitorScore,
        reasoning:
          productScore >= competitorScore
            ? "Synthetic verdict: the product's stated attributes cover more of the comparison criteria than the competitor's."
            : "Synthetic verdict: the competitor states an attribute the product leaves unstated, so the comparison resolves against the product.",
      };
    }),
  );

  const wins = comparisons.filter(
    (comparison) => comparison.winner === "product",
  ).length;

  return {
    version: API_VERSION,
    mode: "sandbox_fixture" as const,
    deterministic: true as const,
    disclaimer:
      "Synthetic output. Scores are derived from the request text, not from any assistant. Nothing was stored or billed.",
    input: {
      product: input.product,
      competitors: input.competitors,
      assistants: input.assistants,
    },
    result: {
      winRate: comparisons.length === 0 ? 0 : wins / comparisons.length,
      wins,
      comparisons,
    },
    runForReal: `${seo.host}/sign-up`,
  };
};
