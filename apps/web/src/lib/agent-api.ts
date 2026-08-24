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
    path: "/api/v1/skills",
    method: "GET",
    summary: "Agent skills ecentic publishes, with their SKILL.md locations.",
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

export const discoveryIndex = () => ({
  version: API_VERSION,
  protocols: [
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
  ],
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
      "One-time free simulation of your top 10 products across ChatGPT, Claude, Gemini, and Perplexity.",
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
      "Up to 100 products, daily agent simulations, competitor battlecards, manual optimization suggestions.",
  },
  {
    key: "scale",
    name: "Scale",
    billing: "subscription",
    price: { amountCents: 4490, interval: "month" },
    currency: "USD",
    performanceFee: null,
    summary: "Automated listing optimization on top of the Compete loop.",
  },
  {
    key: "dominate",
    name: "Dominate",
    billing: "subscription",
    price: { amountCents: 14900, interval: "month" },
    currency: "USD",
    performanceFee: null,
    summary: "Top tier — the full optimization loop across the whole catalog.",
  },
] as const;

export const plansIndex = () => ({
  version: API_VERSION,
  currency: "USD",
  documentation: `${seo.host}/pricing`,
  checkout: `${seo.host}/sign-up`,
  plans: PLAN_CATALOG,
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

export const skillsIndex = () => ({
  version: API_VERSION,
  index: `${seo.host}/.well-known/agent-skills/index.json`,
  skills: SKILLS.map((skill) => ({
    ...skill,
    url: `${seo.host}${skill.path}`,
  })),
});

export const healthIndex = (timestamp: string) => ({
  status: "ok" as const,
  service: seo.name,
  version: API_VERSION,
  timestamp,
});
