import { seo } from "@/lib/seo";

const host = seo.host;
const resource = `${host}/api/mcp`;
const authorizationServer = host;

/** Keep in sync with `Utils.protocol` in `server/app/mcp/utils.ts`. */
const mcpProtocol = {
  version: "2025-03-26",
  server: { name: "ecentic-mcp", version: "0.2.0" },
} as const;

/**
 * RFC 8288 Link values for agent discovery on the homepage.
 * @see https://www.rfc-editor.org/rfc/rfc8288
 * @see https://www.rfc-editor.org/rfc/rfc9727#section-3
 */
export const agentHomepageLinks = [
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</auth.md>; rel="service-doc"; type="text/markdown"',
  '</.well-known/oauth-authorization-server>; rel="oauth-authorization-server"; type="application/json"',
  '</.well-known/openid-configuration>; rel="openid-configuration"; type="application/json"',
  '</.well-known/oauth-protected-resource>; rel="oauth-protected-resource"; type="application/json"',
  '</.well-known/mcp/server-card.json>; rel="service-desc"; type="application/json"',
  '</.well-known/agent-skills/index.json>; rel="service-desc"; type="application/json"',
  '</.well-known/ucp>; rel="service-desc"; type="application/json"',
  '</.well-known/acp.json>; rel="service-desc"; type="application/json"',
  '</openapi.json>; rel="service-desc"; type="application/json"',
  '</api/v1>; rel="service-desc"; type="application/json"',
  '</api/mcp>; rel="service-desc"; type="application/json"',
  '</.well-known/mcp.json>; rel="service-desc"; type="application/json"',
  '</.well-known/agent-instructions.md>; rel="service-doc"; type="text/markdown"',
  '</docs>; rel="service-doc"; type="text/html"',
  '</resources>; rel="service-doc"; type="text/html"',
] as const;

export const agentHomepageLinkHeader = agentHomepageLinks.join(", ");

/**
 * RFC 9727 API catalog (linkset+json) for public agent-facing surfaces.
 * @see https://www.rfc-editor.org/rfc/rfc9727
 */
export const apiCatalogDocument = {
  linkset: [
    {
      anchor: `${seo.host}/api/v1`,
      "service-desc": [
        {
          href: `${seo.host}/openapi.json`,
          type: "application/json",
        },
      ],
      "service-doc": [
        {
          href: `${seo.host}/docs`,
          type: "text/html",
        },
        {
          href: `${seo.host}/.well-known/agent-instructions.md`,
          type: "text/markdown",
        },
      ],
      status: [
        {
          href: `${seo.host}/api/v1/health`,
          type: "application/json",
        },
      ],
    },
    {
      anchor: `${seo.host}/api/v1/sandbox`,
      "service-desc": [
        {
          href: `${seo.host}/openapi.json`,
          type: "application/json",
        },
      ],
      "service-doc": [
        {
          href: `${seo.host}/docs/authentication`,
          type: "text/html",
        },
      ],
      related: [
        {
          href: `${seo.host}/api/v1/onboarding`,
          type: "application/json",
          title: "Onboarding signals, each with a URL that proves it",
        },
      ],
    },
    {
      anchor: `${seo.host}/api/mcp`,
      "service-desc": [
        {
          href: `${seo.host}/api/openapi/mcp`,
          type: "application/json",
          "service-doc": [
            {
              href: `${seo.host}/docs/mcp`,
              type: "text/html",
            },
          ],
        },
        {
          href: `${seo.host}/.well-known/mcp.json`,
          type: "application/json",
        },
        {
          href: `${seo.host}/.well-known/mcp/server-card.json`,
          type: "application/json",
        },
      ],
      "service-doc": [
        {
          href: `${seo.host}/auth.md`,
          type: "text/markdown",
        },
        {
          href: `${seo.host}/docs`,
          type: "text/html",
        },
        {
          href: `${seo.host}/resources`,
          type: "text/html",
        },
      ],
      status: [
        {
          href: `${seo.host}/api/health`,
          type: "application/json",
        },
      ],
    },
    {
      anchor: `${seo.host}/.well-known/ucp`,
      "service-desc": [
        {
          href: `${seo.host}/api/openapi/ucp`,
          type: "application/json",
        },
        {
          href: `${seo.host}/.well-known/ucp`,
          type: "application/json",
        },
      ],
      "service-doc": [
        {
          href: `${seo.host}/ucp-validator`,
          type: "text/html",
        },
        {
          href: `${seo.host}/resources`,
          type: "text/html",
        },
      ],
      status: [
        {
          href: `${seo.host}/api/health`,
          type: "application/json",
        },
      ],
    },
    {
      anchor: `${seo.host}/.well-known/acp.json`,
      "service-desc": [
        {
          href: `${seo.host}/.well-known/acp.json`,
          type: "application/json",
        },
      ],
      "service-doc": [
        {
          href: "https://agenticcommerce.dev",
          type: "text/html",
        },
      ],
      status: [
        {
          href: `${seo.host}/api/health`,
          type: "application/json",
        },
      ],
    },
    {
      anchor: `${seo.host}/openapi.json`,
      "service-desc": [
        {
          href: `${seo.host}/openapi.json`,
          type: "application/json",
        },
      ],
      "service-doc": [
        {
          href: `${seo.host}/resources`,
          type: "text/html",
        },
      ],
      status: [
        {
          href: `${seo.host}/api/health`,
          type: "application/json",
        },
      ],
    },
    {
      anchor: `${seo.host}/ucp/agent-profile`,
      "service-desc": [
        {
          href: `${seo.host}/ucp/agent-profile`,
          type: "application/json",
        },
      ],
      "service-doc": [
        {
          href: `${seo.host}/ucp-validator`,
          type: "text/html",
        },
      ],
      status: [
        {
          href: `${seo.host}/api/health`,
          type: "application/json",
        },
      ],
    },
    {
      anchor: `${seo.host}/api/ucp`,
      "service-desc": [
        {
          href: `${seo.host}/api/openapi/ucp`,
          type: "application/json",
        },
      ],
      "service-doc": [
        {
          href: `${seo.host}/ucp-playground`,
          type: "text/html",
        },
        {
          href: `${seo.host}/resources`,
          type: "text/html",
        },
      ],
      status: [
        {
          href: `${seo.host}/api/health`,
          type: "application/json",
        },
      ],
    },
    {
      anchor: `${seo.host}/.well-known/agent-skills/index.json`,
      "service-desc": [
        {
          href: `${seo.host}/.well-known/agent-skills/index.json`,
          type: "application/json",
        },
      ],
      "service-doc": [
        {
          href: `${seo.host}/resources`,
          type: "text/html",
        },
      ],
      status: [
        {
          href: `${seo.host}/api/health`,
          type: "application/json",
        },
      ],
    },
    {
      anchor: `${seo.host}/.well-known/oauth-protected-resource`,
      "service-desc": [
        {
          href: `${seo.host}/.well-known/oauth-protected-resource`,
          type: "application/json",
        },
      ],
      "service-doc": [
        {
          href: `${seo.host}/auth.md`,
          type: "text/markdown",
        },
      ],
      status: [
        {
          href: `${seo.host}/api/health`,
          type: "application/json",
        },
      ],
    },
  ],
} as const;

export const apiCatalogContentType =
  'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"; charset=utf-8';

export const agentDiscovery = {
  host,
  resource,
  authorizationServer,
  scopes: ["mcp", "onboarding"] as const,
  cacheControl: "public, max-age=3600, stale-while-revalidate=86400",
  cors: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, If-None-Match, Authorization",
    "Access-Control-Expose-Headers": "ETag, WWW-Authenticate",
  },
} as const;

/** RFC 9728 OAuth 2.0 Protected Resource Metadata */
export const oauthProtectedResource = {
  resource: agentDiscovery.resource,
  resource_name: seo.name,
  resource_documentation: `${host}/auth.md`,
  authorization_servers: [agentDiscovery.authorizationServer],
  scopes_supported: [...agentDiscovery.scopes],
  bearer_methods_supported: ["header"],
};

/**
 * RFC 8414 Authorization Server Metadata + OpenID Connect Discovery fields +
 * auth.md `agent_auth` extension.
 *
 * ecentic issues long-lived bearer API keys (`ecentic_sk_…`) after a human
 * account is created. Authorization is account sign-in; there is no public
 * token exchange for agents yet — mint keys via authenticated MCP
 * `create_api_key` or the dashboard. JWKS is published for Web Bot Auth /
 * HTTP Message Signatures discovery; agent API keys are opaque secrets, not
 * JWTs.
 */
export const oauthAuthorizationServer = {
  issuer: agentDiscovery.authorizationServer,
  authorization_endpoint: `${host}/sign-in`,
  token_endpoint: `${host}/api/auth/token`,
  jwks_uri: `${host}/.well-known/jwks.json`,
  registration_endpoint: `${host}/sign-up`,
  scopes_supported: [...agentDiscovery.scopes],
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code"],
  token_endpoint_auth_methods_supported: ["none"],
  code_challenge_methods_supported: ["S256"],
  subject_types_supported: ["public"],
  id_token_signing_alg_values_supported: ["EdDSA"],
  service_documentation: `${host}/auth.md`,
  agent_auth: {
    skill: `${host}/auth.md`,
    register_uri: `${host}/sign-up`,
    claim_uri: `${host}/sign-in`,
    identity_types_supported: ["anonymous"],
    anonymous: {
      credential_types_supported: ["api_key"],
    },
    credential_types_supported: ["api_key"],
    notes:
      "Create an ecentic account, then mint an API key (dashboard or authenticated MCP create_api_key). Send Authorization: Bearer ecentic_sk_… to the MCP resource.",
  },
};

/** OpenID Connect Discovery document (same issuer metadata as RFC 8414). */
export const openIdConfiguration = {
  ...oauthAuthorizationServer,
  userinfo_endpoint: `${host}/api/auth/get-session`,
};

/** SEP-1649 / isitagentready MCP Server Card shape */
export const mcpServerCard = {
  $schema:
    "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
  version: "1.0",
  protocolVersion: mcpProtocol.version,
  serverInfo: {
    name: mcpProtocol.server.name,
    title: "ecentic MCP",
    version: mcpProtocol.server.version,
  },
  description:
    "MCP tools for ecentic: plan listing, API key creation, Stripe checkout, and Shopify / WooCommerce / feed store onboarding.",
  iconUrl: `${host}/icons/icon-512.png`,
  documentationUrl: `${host}/docs`,
  websiteUrl: host,
  transport: {
    type: "streamable-http",
    endpoint: `${host}/api/mcp`,
    // Same handler, published at the bare path every MCP client probes first.
    alternativeEndpoints: [`${host}/mcp`],
  },
  capabilities: {
    tools: {},
  },
  authentication: {
    required: true,
    schemes: ["bearer"],
  },
  instructions:
    "Authenticate with Authorization: Bearer ecentic_sk_…. Discover registration at /auth.md, developer documentation at /docs, and OAuth Protected Resource Metadata at /.well-known/oauth-protected-resource. Read-only tools such as list_plans work without a token.",
};

/** Keep in sync with `UCP_VERSION` in `server/app/ucp/protocol.ts`. */
const ucpVersion = "2026-04-08";
const ucpSpecBase = `https://ucp.dev/${ucpVersion}`;

/**
 * Universal Commerce Protocol business discovery profile.
 * Served at `/.well-known/ucp` (and mirrored by the agent profile).
 * @see https://ucp.dev/specification/overview/
 */
export const ucpDiscoveryProfile = {
  ucp: {
    version: ucpVersion,
    services: {
      "dev.ucp.shopping": [
        {
          version: ucpVersion,
          spec: `${ucpSpecBase}/specification/overview`,
          transport: "rest",
          schema: `${ucpSpecBase}/services/shopping/rest.openapi.json`,
          endpoint: `${host}/ucp`,
        },
        {
          version: ucpVersion,
          spec: "https://modelcontextprotocol.io/specification/2025-03-26",
          transport: "mcp",
          endpoint: `${host}/api/mcp`,
        },
      ],
    },
    capabilities: {
      "dev.ucp.shopping.checkout": [{ version: ucpVersion }],
      "dev.ucp.shopping.fulfillment": [
        {
          version: ucpVersion,
          extends: ["dev.ucp.shopping.checkout", "dev.ucp.shopping.cart"],
        },
      ],
      "dev.ucp.shopping.buyer_consent": [
        {
          version: ucpVersion,
          extends: "dev.ucp.shopping.checkout",
        },
      ],
      "dev.ucp.shopping.discount": [
        {
          version: ucpVersion,
          extends: ["dev.ucp.shopping.checkout", "dev.ucp.shopping.cart"],
        },
      ],
      "dev.ucp.shopping.cart": [
        {
          version: ucpVersion,
          spec: `${ucpSpecBase}/specification/cart`,
          schema: `${ucpSpecBase}/schemas/shopping/cart.json`,
        },
      ],
      "dev.ucp.shopping.order": [
        {
          version: ucpVersion,
          spec: `${ucpSpecBase}/specification/order`,
          schema: `${ucpSpecBase}/schemas/shopping/order.json`,
        },
      ],
      "dev.ucp.shopping.catalog.search": [
        {
          version: ucpVersion,
          spec: `${ucpSpecBase}/specification/catalog/search`,
          schema: `${ucpSpecBase}/schemas/shopping/catalog_search.json`,
        },
      ],
      "dev.ucp.shopping.catalog.lookup": [
        {
          version: ucpVersion,
          spec: `${ucpSpecBase}/specification/catalog/lookup`,
          schema: `${ucpSpecBase}/schemas/shopping/catalog_lookup.json`,
        },
      ],
    },
    payment_handlers: {},
    supported_versions: {
      [ucpVersion]: `${host}/.well-known/ucp`,
    },
  },
} as const;

/**
 * Agentic Commerce Protocol discovery document.
 * @see https://github.com/agentic-commerce-protocol/agentic-commerce-protocol/blob/main/rfcs/rfc.discovery.md
 */
export const acpDiscoveryDocument = {
  protocol: {
    name: "acp",
    version: "2026-01-30",
    supported_versions: ["2026-01-30"],
    documentation_url: "https://agenticcommerce.dev",
  },
  api_base_url: `${host}/api/acp`,
  transports: ["rest", "mcp"],
  capabilities: {
    services: ["checkout", "orders", "carts"],
    supported_currencies: ["usd"],
    supported_locales: ["en-US"],
  },
} as const;

/** Published support address — same one the privacy policy and terms quote. */
export const SUPPORT_EMAIL = "support@ecentic.ai";

/**
 * Rate-limit headers, described once and referenced by every operation that
 * sends them. Documenting them in the spec is what lets a generated client
 * self-throttle instead of discovering the limit by being rejected.
 */
const RATE_LIMIT_RESPONSE_HEADERS = {
  "RateLimit-Policy": {
    description: 'Active policy, e.g. `"public";q=120;w=60`.',
    schema: { type: "string" },
  },
  RateLimit: {
    description: 'Live window state, e.g. `"public";r=118;t=42`.',
    schema: { type: "string" },
  },
  "RateLimit-Limit": {
    description: "Requests allowed in the current window.",
    schema: { type: "integer" },
  },
  "RateLimit-Remaining": {
    description: "Requests left in the current window.",
    schema: { type: "integer" },
  },
  "RateLimit-Reset": {
    description: "Seconds until the window resets.",
    schema: { type: "integer" },
  },
  "API-Version": {
    description: "Major version of the API that produced this response.",
    schema: { type: "string" },
  },
} as const;

/**
 * Error responses are written inline at every operation rather than as `$ref`s
 * into `components.responses`.
 *
 * Readiness tooling and LLM function-calling extractors resolve a `$ref` inside
 * a *schema* but generally not one at the *response* level, so a document built
 * on response-level refs reads to them as "error schema defined but never
 * referenced" — which is exactly how this one scored, 3 of 13 operations. The
 * `Problem` schema itself is still referenced once and defined once, so there
 * is no duplicated definition, only a duplicated pointer.
 *
 * Both media types are declared deliberately. The wire `Content-Type` is always
 * `application/problem+json` (RFC 9457); `application/json` is listed because a
 * client that negotiates plain JSON is handed the same body, and because an
 * extractor that only looks for `application/json` would otherwise conclude the
 * failure path is untyped.
 */
const PROBLEM_CONTENT = {
  "application/problem+json": {
    schema: { $ref: "#/components/schemas/Problem" },
  },
  "application/json": {
    schema: { $ref: "#/components/schemas/Problem" },
  },
} as const;

const INVALID_REQUEST_RESPONSE = {
  description:
    "The request could not be parsed or failed validation. `code` names which rule was broken.",
  content: PROBLEM_CONTENT,
} as const;

const UNAUTHENTICATED_RESPONSE = {
  description:
    "A valid bearer credential is required. `WWW-Authenticate` names the Protected Resource Metadata document to discover how to obtain one.",
  headers: {
    "WWW-Authenticate": {
      description: "Challenge naming the protected-resource metadata document.",
      schema: { type: "string" },
    },
  },
  content: PROBLEM_CONTENT,
} as const;

const NOT_FOUND_RESPONSE = {
  description: "No such endpoint or resource.",
  content: PROBLEM_CONTENT,
} as const;

const METHOD_NOT_ALLOWED_RESPONSE = {
  description:
    "The method is not offered on this path. `Allow` lists the methods that are.",
  headers: {
    Allow: {
      description: "Methods this path accepts.",
      schema: { type: "string" },
    },
  },
  content: PROBLEM_CONTENT,
} as const;

const RATE_LIMITED_RESPONSE = {
  description:
    "Rate limit exceeded. Wait for `Retry-After` seconds before retrying.",
  headers: {
    ...RATE_LIMIT_RESPONSE_HEADERS,
    "Retry-After": {
      description: "Seconds to wait before retrying.",
      schema: { type: "integer", minimum: 0 },
    },
  },
  content: PROBLEM_CONTENT,
} as const;

const INTERNAL_ERROR_RESPONSE = {
  description: "Unexpected server error. Safe to retry with backoff.",
  content: PROBLEM_CONTENT,
} as const;

/**
 * Inlined for the same reason the error responses are: an extractor that skips
 * `components.parameters` sees an operation with no inputs at all, and an
 * operation with no inputs does not read as function-callable.
 */
const API_VERSION_PARAMETER = {
  name: "API-Version",
  in: "header",
  required: false,
  description:
    "Pins the API version. Omit to use the version in the path. The same header is echoed on every response.",
  schema: { type: "string", enum: ["1"], default: "1" },
} as const;

/**
 * Root OpenAPI 3.1 document.
 *
 * Every operation carries a unique `operationId`, a description, and a *typed*
 * response schema — not `additionalProperties: true`. That distinction is the
 * whole point: an LLM generating a function call from this document can only
 * produce a correct call if the schema says what comes back, and a permissive
 * object schema tells it nothing. Every 4xx and 5xx points at one shared
 * RFC 9457 `Problem`, so failure handling is written once.
 *
 * @see https://spec.openapis.org/oas/v3.1.0
 * @see https://www.rfc-editor.org/rfc/rfc9457
 * @see https://paymentauth.org/draft-payment-discovery-00.txt
 */
export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "ecentic agent commerce API",
    version: "1.0.0",
    summary:
      "Public REST and MCP surfaces for AI agents integrating with ecentic.",
    description:
      "ecentic simulates how AI shopping agents evaluate product listings, diagnoses why a product wins or loses, and optimizes catalog content.\n\nThis document describes the agent-facing surfaces: the versioned public REST API under `/api/v1`, the MCP JSON-RPC endpoint, commerce-protocol discovery (UCP and ACP), and the x402-payable API root.\n\nVersioning is in the URL path. Deprecations are announced with `Deprecation` (RFC 9745) and `Sunset` (RFC 8594) headers at least 180 days before removal — see /docs/versioning.\n\nAll failures are `application/problem+json` (RFC 9457) with a stable machine-readable `code` — see /docs/errors.\n\nAll responses carry RateLimit headers — see /docs/rate-limits.",
    termsOfService: `${host}/terms`,
    contact: {
      name: "ecentic support",
      url: `${host}/support`,
      email: SUPPORT_EMAIL,
    },
    license: { name: "Proprietary", url: `${host}/terms` },
  },
  externalDocs: {
    description: "ecentic developer documentation",
    url: `${host}/docs`,
  },
  servers: [{ url: host, description: "Production" }],
  "x-service-info": {
    categories: ["developer-tools", "data", "ecommerce"],
    docs: {
      homepage: `${host}/docs`,
      apiReference: `${host}/openapi.json`,
      apiCatalog: `${host}/.well-known/api-catalog`,
      llms: `${host}/llms.txt`,
      agentInstructions: `${host}/.well-known/agent-instructions.md`,
    },
  },
  "x-api-versioning": {
    strategy: "url-path",
    current: "v1",
    header: "API-Version",
    deprecationHeader: "Deprecation",
    sunsetHeader: "Sunset",
    minimumNoticeDays: 180,
    policy: `${host}/docs/versioning`,
  },
  "x-rate-limit": {
    policy: `${host}/docs/rate-limits`,
    headers: [
      "RateLimit-Policy",
      "RateLimit",
      "RateLimit-Limit",
      "RateLimit-Remaining",
      "RateLimit-Reset",
      "Retry-After",
    ],
    public: { limit: 120, window: 60, unit: "second" },
  },
  tags: [
    { name: "discovery", description: "Unauthenticated discovery endpoints." },
    {
      name: "sandbox",
      description:
        "Zero-auth sandbox. Deterministic synthetic output, no persistence, no billing.",
    },
    { name: "catalog", description: "Public plan and skill catalogs." },
    { name: "mcp", description: "Model Context Protocol tool surface." },
    { name: "commerce", description: "UCP and ACP commerce discovery." },
  ],
  paths: {
    "/api/v1": {
      get: {
        tags: ["discovery"],
        summary: "Public agent API index",
        operationId: "getApiV1Index",
        // Public: no credential required.
        security: [],
        description:
          "Returns every public endpoint, the versioning policy, the rate-limit policy, and where errors are documented. Start here — one request describes the whole surface.",
        parameters: [API_VERSION_PARAMETER],
        responses: {
          "200": {
            description: "The public API index.",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiIndex" },
              },
            },
          },
          "429": RATE_LIMITED_RESPONSE,
          "500": INTERNAL_ERROR_RESPONSE,
        },
      },
    },
    "/api/v1/health": {
      get: {
        tags: ["discovery"],
        summary: "Service health",
        operationId: "getApiV1Health",
        // Public: no credential required.
        security: [],
        description:
          'Liveness probe. Returns `status: "ok"` and the server\'s clock, so a caller can detect clock skew before signing anything.',
        parameters: [API_VERSION_PARAMETER],
        responses: {
          "200": {
            description: "The service is healthy.",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Health" },
              },
            },
          },
          "429": RATE_LIMITED_RESPONSE,
          "500": INTERNAL_ERROR_RESPONSE,
        },
      },
    },
    "/api/v1/discovery": {
      get: {
        tags: ["discovery"],
        summary: "Protocol and document discovery",
        operationId: "getApiV1Discovery",
        // Public: no credential required.
        security: [],
        description:
          "Every machine-readable document ecentic publishes, grouped by protocol, with each protocol's version, transport, endpoint, and manifest locations.",
        parameters: [
          API_VERSION_PARAMETER,
          {
            name: "protocol",
            in: "query",
            required: false,
            description:
              "Narrows the response to a single protocol. Omit to list every one.",
            schema: {
              type: "string",
              enum: ["mcp", "ucp", "acp", "openapi", "x402"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Protocols and documents.",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Discovery" },
              },
            },
          },
          "422": INVALID_REQUEST_RESPONSE,
          "429": RATE_LIMITED_RESPONSE,
          "500": INTERNAL_ERROR_RESPONSE,
        },
      },
    },
    "/api/v1/plans": {
      get: {
        tags: ["catalog"],
        summary: "Plan catalog",
        operationId: "getApiV1Plans",
        // Public: no credential required.
        security: [],
        description:
          "The public ecentic plan catalog: free Scan, pay-as-you-go with a performance fee, and the flat monthly subscriptions. Prices are in minor units of the stated currency and mirror the pricing page exactly.",
        parameters: [
          API_VERSION_PARAMETER,
          {
            name: "key",
            in: "query",
            required: false,
            description:
              "Narrows the response to a single plan. Omit to list every one.",
            schema: {
              type: "string",
              enum: ["scan", "payg", "compete", "scale", "dominate"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Plans available to a new account.",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Plans" },
              },
            },
          },
          "422": INVALID_REQUEST_RESPONSE,
          "429": RATE_LIMITED_RESPONSE,
          "500": INTERNAL_ERROR_RESPONSE,
        },
      },
    },
    "/api/v1/skills": {
      get: {
        tags: ["catalog"],
        summary: "Agent skills",
        operationId: "getApiV1Skills",
        // Public: no credential required.
        security: [],
        description:
          "The agent skills ecentic publishes, each with a plain-language statement of when to reach for it and the URL of its SKILL.md.",
        parameters: [
          API_VERSION_PARAMETER,
          {
            name: "name",
            in: "query",
            required: false,
            description:
              "Narrows the response to a single skill. Omit to list every one.",
            schema: {
              type: "string",
              enum: ["agent-commerce", "optimize-listings", "validate-ucp"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Published agent skills.",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Skills" },
              },
            },
          },
          "422": INVALID_REQUEST_RESPONSE,
          "429": RATE_LIMITED_RESPONSE,
          "500": INTERNAL_ERROR_RESPONSE,
        },
      },
    },
    "/api/v1/news": {
      get: {
        tags: ["catalog"],
        summary: "AI-commerce news wire",
        operationId: "getApiV1News",
        // Public: no credential required.
        security: [],
        description:
          "Google News search results parsed into JSON records: headline with the publisher suffix removed, publisher and domain, an ISO 8601 timestamp, and the publisher's own URL where it could be resolved. Syndicated copies are merged into one record that names the other outlets in `alsoIn`, and a headline filter drops the documents Google matched on body text alone. The upstream feed is undocumented and caps every response at 100 items with no pagination, so breadth comes from several `q` values rather than from paging.",
        parameters: [
          API_VERSION_PARAMETER,
          {
            name: "q",
            in: "query",
            required: false,
            description:
              "Search query, repeatable up to 5 times; results are merged and deduplicated across them. Google News operators are accepted. Omit entirely to use the defaults (`ai shopping`, `ai commerce`); sending it empty is rejected rather than silently defaulted, and more than 5 returns 422 rather than truncating.\n\nClient hazard: some HTTP clients — including agent fetch tools that model a query string as a flat map — collapse a repeated parameter to its first value before the request is sent. The server never sees the rest, so it cannot report the loss, and the truncated request is perfectly valid. Every response echoes the `queries` it actually ran for exactly this reason: compare it against what you sent, and if it is short, your client is flattening repeats and each query needs its own request. Bracket syntax (`q[]=`) is not an alternative — it is rejected as an unknown parameter. Neither is a comma-separated value, which is read as one literal search string.",
            explode: true,
            schema: {
              type: "array",
              maxItems: 5,
              items: { type: "string", maxLength: 200 },
            },
          },
          {
            name: "when",
            in: "query",
            required: false,
            description:
              "Rolling time window, applied as the feed's `when:` operator. Omit for no restriction. `1d` means the previous 24 hours, not a calendar day.",
            schema: { type: "string", enum: ["1h", "1d", "7d", "30d", "1y"] },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            description:
              "Maximum articles returned, applied after filtering and deduplication. Capped at 25 when `resolve=true`.",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 25 },
          },
          {
            name: "resolve",
            in: "query",
            required: false,
            description:
              "Resolve each `googleUrl` to the publisher's own URL. Costs one upstream request per article and is metered on a tighter rate-limit policy, so it is off by default. An article whose resolution fails keeps `url: null`.",
            schema: { type: "boolean", default: false },
          },
          {
            name: "dedupe",
            in: "query",
            required: false,
            description:
              "Merge syndicated copies of one story into the earliest item, recording the other publishers in `alsoIn`.",
            schema: { type: "boolean", default: true },
          },
          {
            name: "relevance",
            in: "query",
            required: false,
            description:
              "`ai-commerce` requires one AI term and one commerce term in the headline, which removes the results Google matched elsewhere in the document. `off` returns the feed unfiltered.",
            schema: {
              type: "string",
              enum: ["ai-commerce", "off"],
              default: "ai-commerce",
            },
          },
          {
            name: "aiTerms",
            in: "query",
            required: false,
            description:
              "Comma-separated override for the AI half of the headline filter.",
            schema: { type: "string" },
          },
          {
            name: "commerceTerms",
            in: "query",
            required: false,
            description:
              "Comma-separated override for the commerce half of the headline filter.",
            schema: { type: "string" },
          },
          {
            name: "hl",
            in: "query",
            required: false,
            description:
              "Interface language. Keep consistent with `gl` and `ceid`; an inconsistent set returns an empty or mixed feed.",
            schema: { type: "string", default: "en-US" },
          },
          {
            name: "gl",
            in: "query",
            required: false,
            description: "Two-letter country bias.",
            schema: { type: "string", default: "US" },
          },
          {
            name: "ceid",
            in: "query",
            required: false,
            description: "Google News edition, such as `US:en`.",
            schema: { type: "string", default: "US:en" },
          },
        ],
        responses: {
          "200": {
            description:
              "Parsed articles, newest first. Articles with no `publishedAt` sort last.",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/News" },
              },
            },
          },
          "422": INVALID_REQUEST_RESPONSE,
          "429": RATE_LIMITED_RESPONSE,
          "500": INTERNAL_ERROR_RESPONSE,
          "504": {
            description:
              "Google News did not answer for any query. The upstream feed is undocumented and unowned, so this is an expected condition rather than a defect; retry with backoff.",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: PROBLEM_CONTENT,
          },
        },
      },
    },
    "/api/v1/onboarding": {
      get: {
        tags: ["discovery"],
        summary: "Onboarding signals, each with a URL that proves it",
        operationId: "getApiV1Onboarding",
        // Public: no credential required.
        security: [],
        description:
          "What an agent can do before any human step — zero-auth access, a free tier, self-serve API keys, a sandbox, no sales contact — with a `verify` URL and an `evidence` line for each claim so none of it has to be taken on trust.",
        parameters: [API_VERSION_PARAMETER],
        responses: {
          "200": {
            description: "Onboarding signals and where to start.",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Onboarding" },
              },
            },
          },
          "429": RATE_LIMITED_RESPONSE,
          "500": INTERNAL_ERROR_RESPONSE,
        },
      },
    },
    "/api/v1/sandbox": {
      get: {
        tags: ["sandbox"],
        summary: "Sandbox description, limits, and caveats",
        operationId: "getApiV1Sandbox",
        // Public: no credential required.
        security: [],
        description:
          "Describes the zero-auth sandbox: what it returns, what it guarantees (no persistence, no billing, no model calls, deterministic output), and the request limits it enforces.",
        parameters: [API_VERSION_PARAMETER],
        responses: {
          "200": {
            description: "Sandbox description.",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Sandbox" },
              },
            },
          },
          "429": RATE_LIMITED_RESPONSE,
          "500": INTERNAL_ERROR_RESPONSE,
        },
      },
    },
    "/api/v1/sandbox/simulation": {
      post: {
        tags: ["sandbox"],
        summary: "Run a synthetic product-vs-competitor simulation",
        operationId: "postApiV1SandboxSimulation",
        // Public: no credential required.
        security: [],
        description:
          "Returns the exact response shape of a real ecentic simulation, computed deterministically from the request text. Scores are SYNTHETIC — they are not a measurement of how any assistant ranks the product. Use it to build and test a client before creating an account.",
        parameters: [API_VERSION_PARAMETER],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SandboxSimulationRequest",
              },
              example: {
                product: {
                  title: "Alpine Down Jacket",
                  description: "800-fill responsibly sourced down, 320g.",
                  priceCents: 24900,
                },
                competitors: [{ title: "Summit Puffer", priceCents: 21900 }],
                assistants: ["chatgpt", "claude"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Synthetic simulation result.",
            headers: RATE_LIMIT_RESPONSE_HEADERS,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SandboxSimulation" },
              },
            },
          },
          "413": INVALID_REQUEST_RESPONSE,
          "422": INVALID_REQUEST_RESPONSE,
          "429": RATE_LIMITED_RESPONSE,
          "500": INTERNAL_ERROR_RESPONSE,
        },
      },
    },
    "/api": {
      get: {
        tags: ["discovery"],
        summary: "Agent API root (x402 / MPP payable)",
        operationId: "getAgentApiRoot",
        // Public: settled with x402 payment, not a credential.
        security: [],
        description:
          "Protected by x402. Unpaid requests receive HTTP 402 with a PAYMENT-REQUIRED header (USDC exact scheme via the configured facilitator). A valid PAYMENT-SIGNATURE unlocks the agent surface catalog. Free discovery lives under /api/v1 and /.well-known — this root exists to demonstrate machine payment, not to gate discovery.",
        "x-payment-info": {
          intent: "charge",
          method: "stripe",
          amount: "0.01",
          currency: "USD",
          description: "Per-request access to the ecentic agent API root.",
        },
        parameters: [
          {
            name: "X-PAYMENT",
            in: "header",
            required: false,
            description:
              "x402 payment payload. Omit it to receive the 402 challenge in `PAYMENT-REQUIRED`, then retry with the signed payload. `PAYMENT-SIGNATURE` is accepted as an alias.",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Paid access granted.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AgentApiRoot" },
              },
            },
          },
          "402": {
            description: "Payment required (x402 / MPP challenge).",
            headers: {
              "PAYMENT-REQUIRED": {
                description: "x402 payment requirements for this request.",
                schema: { type: "string" },
              },
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaymentChallenge" },
              },
            },
          },
        },
      },
    },
    "/api/mcp": {
      get: {
        tags: ["mcp"],
        summary: "MCP endpoint description",
        operationId: "getMcp",
        // Public: no credential required.
        security: [],
        description:
          "Describes the MCP endpoint. An MCP client sending `Accept: text/event-stream` receives 405 instead, because ecentic offers no server-initiated stream — every response arrives on the POST channel.",
        parameters: [
          {
            name: "Accept",
            in: "header",
            required: false,
            description:
              "`text/event-stream` asks to open a server-initiated stream and is answered with 405. Anything else returns the endpoint description.",
            schema: {
              type: "string",
              enum: ["application/json", "text/event-stream"],
              default: "application/json",
            },
          },
          {
            name: "MCP-Protocol-Version",
            in: "header",
            required: false,
            description:
              "Protocol version the client negotiated during `initialize`. Accepted on every subsequent request.",
            schema: {
              type: "string",
              enum: ["2025-06-18", "2025-03-26", "2024-11-05"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Endpoint description.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/McpEndpoint" },
              },
            },
          },
          "405": {
            ...METHOD_NOT_ALLOWED_RESPONSE,
            description:
              "No server-initiated SSE stream is offered (Streamable HTTP). Returned for `Accept: text/event-stream`.",
          },
        },
      },
      post: {
        tags: ["mcp"],
        summary: "MCP JSON-RPC request",
        operationId: "postMcp",
        description:
          "JSON-RPC 2.0 over HTTP. Supports `initialize`, `tools/list`, and `tools/call`. Read-only tools work unauthenticated; tools that change account state require a bearer API key.",
        security: [{ bearerAuth: [] }, {}],
        parameters: [
          {
            name: "MCP-Protocol-Version",
            in: "header",
            required: false,
            description:
              "Protocol version the client negotiated during `initialize`. Accepted on every subsequent request.",
            schema: {
              type: "string",
              enum: ["2025-06-18", "2025-03-26", "2024-11-05"],
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/JsonRpcRequest" },
              examples: {
                toolsList: {
                  summary: "List available tools",
                  value: {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "tools/list",
                    params: {},
                  },
                },
                toolsCall: {
                  summary: "Call a tool",
                  value: {
                    jsonrpc: "2.0",
                    id: 2,
                    method: "tools/call",
                    params: { name: "list_plans", arguments: {} },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "JSON-RPC response. A JSON-RPC-level failure is reported in `error` with HTTP 200, per the JSON-RPC specification.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/JsonRpcResponse" },
              },
            },
          },
          "401": {
            description:
              "Authentication required for the requested tool. Carries `WWW-Authenticate` naming the Protected Resource Metadata document.",
            headers: {
              "WWW-Authenticate": {
                description:
                  "Bearer challenge naming the resource metadata document.",
                schema: { type: "string" },
              },
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/JsonRpcResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["mcp"],
        summary: "Terminate an MCP session",
        parameters: [
          {
            name: "MCP-Protocol-Version",
            in: "header",
            required: false,
            description:
              "Protocol version the client negotiated during `initialize`. Accepted on every subsequent request.",
            schema: {
              type: "string",
              enum: ["2025-06-18", "2025-03-26", "2024-11-05"],
            },
          },
        ],
        operationId: "deleteMcpSession",
        // Public: no credential required.
        security: [],
        description:
          "Streamable HTTP session termination. ecentic is stateless and issues no `Mcp-Session-Id`, so this always answers 405.",
        responses: {
          "405": {
            ...METHOD_NOT_ALLOWED_RESPONSE,
            description:
              "ecentic issues no `Mcp-Session-Id`, so there is no session to terminate.",
          },
        },
      },
    },
    "/mcp": {
      post: {
        tags: ["mcp"],
        summary: "MCP JSON-RPC request (alias)",
        operationId: "postMcpAlias",
        description:
          "Identical to `POST /api/mcp`. Published at the bare `/mcp` path because that is where MCP clients and scanners look first.",
        security: [{ bearerAuth: [] }, {}],
        parameters: [
          {
            name: "MCP-Protocol-Version",
            in: "header",
            required: false,
            description:
              "Protocol version the client negotiated during `initialize`. Accepted on every subsequent request.",
            schema: {
              type: "string",
              enum: ["2025-06-18", "2025-03-26", "2024-11-05"],
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/JsonRpcRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "JSON-RPC response.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/JsonRpcResponse" },
              },
            },
          },
          "401": UNAUTHENTICATED_RESPONSE,
          "429": RATE_LIMITED_RESPONSE,
        },
      },
    },
    "/.well-known/mcp.json": {
      get: {
        tags: ["mcp"],
        summary: "MCP server manifest",
        operationId: "getWellKnownMcpManifest",
        // Public: no credential required.
        security: [],
        description:
          "The MCP server card: protocol version, transport, endpoint, capabilities, and authentication scheme.",
        responses: {
          "200": {
            description: "MCP server card.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/McpServerCard" },
              },
            },
          },
          "404": NOT_FOUND_RESPONSE,
        },
      },
    },
    "/.well-known/ucp": {
      get: {
        tags: ["commerce"],
        summary: "Universal Commerce Protocol discovery profile",
        operationId: "getWellKnownUcp",
        // Public: no credential required.
        security: [],
        description:
          "UCP business discovery profile: the protocol version, the shopping services and their transports, and the capabilities this business supports.",
        responses: {
          "200": {
            description: "UCP business profile.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UcpProfile" },
              },
            },
          },
          "404": NOT_FOUND_RESPONSE,
        },
      },
    },
    "/.well-known/acp.json": {
      get: {
        tags: ["commerce"],
        summary: "Agentic Commerce Protocol discovery document",
        operationId: "getWellKnownAcp",
        // Public: no credential required.
        security: [],
        description:
          "ACP discovery document: protocol version, API base URL, supported transports, services, currencies, and locales.",
        responses: {
          "200": {
            description: "ACP discovery document.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AcpDiscovery" },
              },
            },
          },
          "404": NOT_FOUND_RESPONSE,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description:
          "Agent API key (`ecentic_sk_…`) minted from an ecentic account. See /auth.md for registration and /docs for usage.",
      },
    },
    schemas: {
      Onboarding: {
        type: "object",
        title: "Onboarding",
        description:
          "What an agent can do before any human step, and how to check each claim.",
        required: ["version", "signals", "start"],
        properties: {
          version: { type: "string" },
          summary: { type: "string" },
          signals: {
            type: "array",
            items: { $ref: "#/components/schemas/OnboardingSignal" },
          },
          start: {
            type: "object",
            description: "Entry points, in the order an agent should try them.",
            properties: {
              withoutAccount: { type: "string", format: "uri" },
              createAccount: { type: "string", format: "uri" },
              credentials: { type: "string", format: "uri" },
              documentation: { type: "string", format: "uri" },
            },
          },
        },
      },
      OnboardingSignal: {
        type: "object",
        title: "OnboardingSignal",
        required: ["key", "available", "summary", "verify", "evidence"],
        properties: {
          key: {
            type: "string",
            enum: [
              "zero-auth-access",
              "free-tier",
              "self-serve-api-keys",
              "sandbox",
              "no-sales-contact-required",
            ],
          },
          available: { type: "boolean" },
          summary: { type: "string" },
          verify: {
            type: "string",
            format: "uri",
            description: "Fetch this to check the claim yourself.",
          },
          evidence: {
            type: "string",
            description: "What to look for in the response at `verify`.",
          },
        },
      },
      Sandbox: {
        type: "object",
        title: "Sandbox",
        required: ["version", "mode", "disclaimer", "guarantees", "limits"],
        properties: {
          version: { type: "string" },
          mode: { type: "string", const: "sandbox_fixture" },
          summary: { type: "string" },
          disclaimer: {
            type: "string",
            description:
              "States plainly that the output is synthetic and measures nothing.",
          },
          guarantees: {
            type: "object",
            properties: {
              authentication: { type: "string", const: "none" },
              persistence: { type: "string", const: "none" },
              billing: { type: "string", const: "none" },
              externalCalls: { type: "string", const: "none" },
              deterministic: { type: "string" },
            },
          },
          limits: {
            type: "object",
            description: "Enforced ceilings on a sandbox request.",
            properties: {
              bodyBytes: { type: "integer" },
              titleChars: { type: "integer" },
              descriptionChars: { type: "integer" },
              competitors: { type: "integer" },
            },
          },
          endpoints: {
            type: "array",
            items: { $ref: "#/components/schemas/Endpoint" },
          },
          runForReal: { type: "string", format: "uri" },
          documentation: { type: "string", format: "uri" },
        },
      },
      SandboxItem: {
        type: "object",
        title: "SandboxItem",
        description: "A product or a competing product.",
        required: ["title"],
        additionalProperties: false,
        properties: {
          title: { type: "string", minLength: 1, maxLength: 200 },
          description: { type: "string", maxLength: 2000 },
          priceCents: {
            type: "integer",
            minimum: 0,
            maximum: 100000000,
            description: "Price in minor units.",
          },
        },
      },
      SandboxSimulationRequest: {
        type: "object",
        title: "SandboxSimulationRequest",
        required: ["product", "competitors"],
        additionalProperties: false,
        properties: {
          product: { $ref: "#/components/schemas/SandboxItem" },
          competitors: {
            type: "array",
            minItems: 1,
            maxItems: 5,
            items: { $ref: "#/components/schemas/SandboxItem" },
          },
          assistants: {
            type: "array",
            minItems: 1,
            description: "Defaults to all four when omitted.",
            items: {
              type: "string",
              enum: ["chatgpt", "claude", "gemini", "perplexity"],
            },
          },
        },
      },
      SandboxComparison: {
        type: "object",
        title: "SandboxComparison",
        required: [
          "assistant",
          "competitor",
          "winner",
          "productScore",
          "competitorScore",
          "reasoning",
        ],
        properties: {
          assistant: {
            type: "string",
            enum: ["chatgpt", "claude", "gemini", "perplexity"],
          },
          competitor: { type: "string" },
          winner: { type: "string", enum: ["product", "competitor"] },
          productScore: { type: "integer" },
          competitorScore: { type: "integer" },
          reasoning: { type: "string" },
        },
      },
      SandboxSimulation: {
        type: "object",
        title: "SandboxSimulation",
        description:
          "Mirrors the shape of a real simulation result. The scores are synthetic.",
        required: ["version", "mode", "deterministic", "disclaimer", "result"],
        properties: {
          version: { type: "string" },
          mode: { type: "string", const: "sandbox_fixture" },
          deterministic: { type: "boolean", const: true },
          disclaimer: { type: "string" },
          input: { $ref: "#/components/schemas/SandboxSimulationRequest" },
          result: {
            type: "object",
            required: ["winRate", "wins", "comparisons"],
            properties: {
              winRate: { type: "number", minimum: 0, maximum: 1 },
              wins: { type: "integer", minimum: 0 },
              comparisons: {
                type: "array",
                items: { $ref: "#/components/schemas/SandboxComparison" },
              },
            },
          },
          runForReal: { type: "string", format: "uri" },
        },
      },
      Problem: {
        type: "object",
        title: "Problem",
        description:
          "RFC 9457 problem details. Every 4xx and 5xx on this API uses this shape, served as `application/problem+json`. Branch on `code`, not on `title` or `detail` — `code` is frozen once published.",
        required: ["type", "title", "status", "code", "detail", "resolution"],
        properties: {
          type: {
            type: "string",
            format: "uri",
            description:
              "URI identifying the problem type, anchored in the error documentation.",
            examples: [`${host}/docs/errors#not-found`],
          },
          title: {
            type: "string",
            description: "Short human-readable summary of the problem type.",
          },
          status: {
            type: "integer",
            description: "HTTP status code, repeated in the body.",
            minimum: 100,
            maximum: 599,
          },
          code: {
            type: "string",
            description:
              "Stable machine-readable identifier. This is the value to branch on.",
            enum: [
              "not-found",
              "method-not-allowed",
              "unauthenticated",
              "unauthorized",
              "payment-required",
              "subscription-required",
              "invalid-request",
              "validation-failed",
              "conflict",
              "rate-limited",
              "upstream-timeout",
              "internal-error",
            ],
          },
          detail: {
            type: "string",
            description: "What went wrong on this specific request.",
          },
          resolution: {
            type: "string",
            description: "What the caller should do about it.",
          },
          documentation: {
            type: "string",
            format: "uri",
            description: "Where every code is documented.",
          },
          instance: {
            type: "string",
            description: "Path that produced the problem, when known.",
          },
        },
      },
      Endpoint: {
        type: "object",
        title: "Endpoint",
        required: ["path", "method", "summary", "authentication", "url"],
        properties: {
          path: { type: "string", description: "Path, relative to the host." },
          method: {
            type: "string",
            enum: ["GET", "POST"],
            description: "HTTP method.",
          },
          summary: {
            type: "string",
            description: "What the endpoint returns.",
          },
          authentication: {
            type: "string",
            enum: ["none", "bearer", "x402"],
            description: "Credential the endpoint requires.",
          },
          url: { type: "string", format: "uri", description: "Absolute URL." },
        },
      },
      ApiIndex: {
        type: "object",
        title: "ApiIndex",
        description: "Self-description of the public agent API.",
        required: ["name", "version", "description", "endpoints"],
        properties: {
          name: { type: "string" },
          version: { type: "string", description: "Major API version." },
          description: { type: "string" },
          documentation: { type: "string", format: "uri" },
          openapi: { type: "string", format: "uri" },
          versioning: {
            type: "object",
            description: "How this API is versioned and deprecated.",
            properties: {
              strategy: { type: "string", enum: ["url-path"] },
              current: { type: "string" },
              header: { type: "string" },
              policy: { type: "string", format: "uri" },
              deprecationNoticeDays: { type: "integer" },
              signals: {
                type: "object",
                properties: {
                  deprecation: { type: "string" },
                  sunset: { type: "string" },
                },
              },
            },
          },
          rateLimit: {
            type: "object",
            properties: {
              policy: { type: "string", format: "uri" },
              headers: { type: "array", items: { type: "string" } },
            },
          },
          errors: {
            type: "object",
            properties: {
              mediaType: { type: "string" },
              specification: { type: "string", format: "uri" },
              documentation: { type: "string", format: "uri" },
            },
          },
          endpoints: {
            type: "array",
            items: { $ref: "#/components/schemas/Endpoint" },
          },
        },
      },
      Health: {
        type: "object",
        title: "Health",
        required: ["status", "service", "version", "timestamp"],
        properties: {
          status: { type: "string", enum: ["ok"] },
          service: { type: "string" },
          version: { type: "string" },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "Server clock in ISO 8601, for skew detection.",
          },
        },
      },
      Protocol: {
        type: "object",
        title: "Protocol",
        required: [
          "name",
          "key",
          "version",
          "transport",
          "endpoint",
          "manifests",
        ],
        properties: {
          name: { type: "string" },
          key: {
            type: "string",
            enum: ["mcp", "ucp", "acp", "openapi", "x402"],
          },
          version: { type: "string" },
          transport: {
            type: "string",
            enum: ["http", "http-json-rpc", "rest"],
          },
          endpoint: { type: "string", format: "uri" },
          manifests: {
            type: "array",
            items: { type: "string", format: "uri" },
          },
        },
      },
      Discovery: {
        type: "object",
        title: "Discovery",
        required: ["version", "protocols", "documents"],
        properties: {
          version: { type: "string" },
          protocols: {
            type: "array",
            items: { $ref: "#/components/schemas/Protocol" },
          },
          documents: {
            type: "object",
            description: "Absolute URLs of every published discovery document.",
            additionalProperties: { type: "string", format: "uri" },
          },
        },
      },
      Plan: {
        type: "object",
        title: "Plan",
        required: ["key", "name", "billing", "currency", "summary"],
        properties: {
          key: {
            type: "string",
            enum: ["scan", "payg", "compete", "scale", "dominate"],
          },
          name: { type: "string" },
          billing: {
            type: "string",
            enum: ["free", "usage", "subscription"],
            description:
              "`free` costs nothing, `usage` bills a performance fee, `subscription` bills a flat recurring price.",
          },
          price: {
            type: ["object", "null"],
            description: "Null for plans with no recurring price.",
            properties: {
              amountCents: {
                type: "integer",
                description: "Recurring price in minor units.",
              },
              interval: { type: "string", enum: ["month"] },
            },
          },
          currency: { type: "string", enum: ["USD"] },
          performanceFee: {
            type: ["object", "null"],
            description: "Null unless the plan bills on results.",
            properties: {
              rateBps: {
                type: "integer",
                description: "Fee rate in basis points.",
              },
              capCents: {
                type: "integer",
                description: "Monthly cap in minor units.",
              },
              basis: { type: "string" },
            },
          },
          summary: { type: "string" },
        },
      },
      Plans: {
        type: "object",
        title: "Plans",
        required: ["version", "currency", "plans"],
        properties: {
          version: { type: "string" },
          currency: { type: "string", enum: ["USD"] },
          documentation: { type: "string", format: "uri" },
          checkout: { type: "string", format: "uri" },
          plans: {
            type: "array",
            items: { $ref: "#/components/schemas/Plan" },
          },
        },
      },
      Skill: {
        type: "object",
        title: "Skill",
        required: ["name", "summary", "whenToUse", "path", "url"],
        properties: {
          name: { type: "string" },
          summary: { type: "string" },
          whenToUse: {
            type: "string",
            description: "The situation this skill is the right tool for.",
          },
          path: { type: "string" },
          url: { type: "string", format: "uri" },
        },
      },
      Skills: {
        type: "object",
        title: "Skills",
        required: ["version", "skills"],
        properties: {
          version: { type: "string" },
          index: { type: "string", format: "uri" },
          skills: {
            type: "array",
            items: { $ref: "#/components/schemas/Skill" },
          },
        },
      },
      NewsArticle: {
        type: "object",
        title: "NewsArticle",
        required: ["headline", "googleUrl", "articleId", "alsoIn"],
        properties: {
          headline: {
            type: "string",
            description: "Headline with the ` - Publisher` suffix removed.",
          },
          publisher: { type: ["string", "null"] },
          publisherDomain: {
            type: ["string", "null"],
            description:
              "Host of the feed's `<source url>` attribute, without a `www.` prefix. Present even when `url` could not be resolved.",
          },
          publishedAt: {
            type: ["string", "null"],
            format: "date-time",
            description: "ISO 8601, converted from the feed's RFC 822 value.",
          },
          url: {
            type: ["string", "null"],
            format: "uri",
            description:
              "The publisher's own URL. `null` when resolution was not requested or did not succeed — fall back to `googleUrl`, which always works in a browser.",
          },
          googleUrl: {
            type: "string",
            format: "uri",
            description:
              "Google's redirect for the article. Treat it as a stable identifier rather than a link: news.google.com is robots-disallowed, so a well-behaved crawler cannot follow it. Ask for `resolve=true` to get a followable `url`.",
          },
          articleId: {
            type: "string",
            description: "Feed `guid`; the identity of an exact repeat.",
          },
          alsoIn: {
            type: "array",
            description:
              "Other publishers that carried the same story, from the syndication merge. Named both ways because the feed's own source strings mix brand names and bare domains; group on `domain`.",
            items: {
              type: "object",
              properties: {
                publisher: { type: ["string", "null"] },
                domain: { type: ["string", "null"] },
              },
            },
          },
          query: {
            type: "string",
            description: "The `q` value this record came from.",
          },
        },
      },
      News: {
        type: "object",
        title: "News",
        required: [
          "source",
          "retrievedAt",
          "queries",
          "count",
          "articles",
          "failures",
        ],
        properties: {
          source: { type: "string", enum: ["Google News RSS"] },
          retrievedAt: { type: "string", format: "date-time" },
          queries: { type: "array", items: { type: "string" } },
          window: { type: ["string", "null"] },
          locale: {
            type: "object",
            properties: {
              language: { type: "string" },
              country: { type: "string" },
              edition: { type: "string" },
            },
          },
          relevance: { type: "string", enum: ["ai-commerce", "off"] },
          deduplicated: { type: "boolean" },
          resolved: {
            type: "boolean",
            description:
              "Whether publisher-URL resolution was attempted, so a null `url` can be told apart from one that was never asked for. False even when `resolve=true` was asked for, if the per-instance resolution gate was already full.",
          },
          resolution: {
            type: "object",
            description:
              "Resolution health and diagnosis, present only when resolution ran. `mismatched` above zero means resolved URLs disagree with the publishers the feed named — the internal Google RPC has changed shape. The remaining counters say why the rest failed, which matters because Google answers a datacenter differently from a browser: `refused` and `unsigned` above zero mean the deployment's egress is being blocked or served a consent interstitial, not that the code is broken.",
            properties: {
              attempted: { type: "integer" },
              succeeded: { type: "integer" },
              mismatched: { type: "integer" },
              cached: {
                type: "integer",
                description: "Served from cache, costing no upstream request.",
              },
              unpaired: {
                type: "integer",
                description:
                  "Page fetched and signed, but the RPC returned no URL for it.",
              },
              refused: {
                type: "object",
                description: "Count of non-readable responses, by status code.",
                additionalProperties: { type: "integer" },
              },
              unreachable: {
                type: "integer",
                description:
                  "No answer at all: network, timeout, or an off-origin redirect.",
              },
              unsigned: {
                type: "integer",
                description:
                  "Page returned but carried no signature — an interstitial, or a change to Google's markup.",
              },
              consent: {
                type: "integer",
                description:
                  "Google diverted the request to its consent flow instead of serving the article. Observed intermittently and independently of any consent cookie; it clears on its own, and each attempt is retried once.",
              },
            },
          }, 
           count: { type: "integer", description: "Articles in this response." },
          total: {
            type: "integer",
            description:
              "Articles available before `limit` was applied. `count === limit` is otherwise indistinguishable from there being exactly that many.",
          },
          truncated: {
            type: "boolean",
            description: "Whether `limit` cut the result set short.",
          },
          resolveStatus: {
            type: "string",
            enum: [
              "skipped",
              "unavailable",
              "ok",
              "partial",
              "rate-limited",
              "diverted",
              "failed",
            ],
            description:
              "The categorical outcome of resolution, so a client need not compare counters to notice a failure. `skipped` — not asked for. `unavailable` — asked for, but the origin's resolution gate was full and nothing was attempted. `ok` — everything attempted resolved. `partial` — some did not. `rate-limited` — none did, and the upstream answered 429. `diverted` — none did, because Google routed the requests into its consent flow. `failed` — none did, for another reason. `rate-limited` and `diverted` clear on their own and are worth retrying; `failed` means something changed. Responses that are not `skipped`, `ok` or `partial` are sent `Cache-Control: no-store`, so a transient failure cannot be cached and re-served after it has passed.",
          },
          articles: {
            type: "array",
            items: { $ref: "#/components/schemas/NewsArticle" },
          },
          failures: {
            type: "array",
            description:
              "Queries whose feed could not be read. A partial answer is returned rather than none.",
            items: {
              type: "object",
              properties: {
                query: { type: "string" },
                error: { type: "string" },
              },
            },
          },
        },
      },
      AgentApiRoot: {
        type: "object",
        title: "AgentApiRoot",
        required: ["name", "description", "discovery"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          discovery: {
            type: "object",
            description: "Free discovery URLs, reachable without payment.",
            additionalProperties: { type: "string", format: "uri" },
          },
        },
      },
      PaymentChallenge: {
        type: "object",
        title: "PaymentChallenge",
        description:
          "x402 payment requirements. Settle the challenge and repeat the request with a PAYMENT-SIGNATURE header.",
        properties: {
          x402Version: { type: "integer" },
          error: { type: "string" },
          accepts: {
            type: "array",
            description: "Accepted payment schemes.",
            items: {
              type: "object",
              properties: {
                scheme: { type: "string" },
                network: { type: "string" },
                maxAmountRequired: { type: "string" },
                asset: { type: "string" },
                payTo: { type: "string" },
                resource: { type: "string", format: "uri" },
              },
            },
          },
        },
      },
      McpEndpoint: {
        type: "object",
        title: "McpEndpoint",
        required: ["name", "protocol", "endpoint", "methods"],
        properties: {
          name: { type: "string" },
          protocol: { type: "string", enum: ["json-rpc-2.0"] },
          protocolVersion: { type: "string" },
          transport: { type: "string", enum: ["streamable-http"] },
          endpoint: { type: "string", format: "uri" },
          methods: { type: "array", items: { type: "string" } },
          manifest: { type: "string", format: "uri" },
          serverCard: { type: "string", format: "uri" },
          documentation: { type: "string", format: "uri" },
        },
      },
      McpServerCard: {
        type: "object",
        title: "McpServerCard",
        required: ["protocolVersion", "serverInfo", "transport"],
        properties: {
          version: { type: "string" },
          protocolVersion: { type: "string" },
          serverInfo: {
            type: "object",
            required: ["name", "version"],
            properties: {
              name: { type: "string" },
              title: { type: "string" },
              version: { type: "string" },
            },
          },
          description: { type: "string" },
          iconUrl: { type: "string", format: "uri" },
          documentationUrl: { type: "string", format: "uri" },
          transport: {
            type: "object",
            required: ["type", "endpoint"],
            properties: {
              type: { type: "string", enum: ["streamable-http"] },
              endpoint: { type: "string", format: "uri" },
            },
          },
          authentication: {
            type: "object",
            properties: {
              required: { type: "boolean" },
              schemes: { type: "array", items: { type: "string" } },
            },
          },
          instructions: { type: "string" },
        },
      },
      JsonRpcRequest: {
        type: "object",
        title: "JsonRpcRequest",
        required: ["jsonrpc", "method"],
        properties: {
          jsonrpc: { type: "string", enum: ["2.0"] },
          id: {
            type: ["integer", "string", "null"],
            description: "Correlation id echoed on the response.",
          },
          method: {
            type: "string",
            enum: ["initialize", "tools/list", "tools/call"],
          },
          params: {
            type: "object",
            description:
              "Method parameters. For `tools/call`: `{ name, arguments }`.",
            properties: {
              name: {
                type: "string",
                description: "Tool name, for tools/call.",
              },
              arguments: {
                type: "object",
                description:
                  "Tool arguments, matching that tool's inputSchema.",
              },
            },
          },
        },
      },
      JsonRpcResponse: {
        type: "object",
        title: "JsonRpcResponse",
        required: ["jsonrpc", "id"],
        properties: {
          jsonrpc: { type: "string", enum: ["2.0"] },
          id: { type: ["integer", "string", "null"] },
          result: {
            type: "object",
            description: "Present on success. Absent when `error` is present.",
          },
          error: {
            type: "object",
            description: "Present on failure. Absent when `result` is present.",
            required: ["code", "message"],
            properties: {
              code: { type: "integer" },
              message: { type: "string" },
              data: {
                type: "object",
                description: "Additional context, such as a discovery hint.",
              },
            },
          },
        },
      },
      UcpProfile: {
        type: "object",
        title: "UcpProfile",
        required: ["ucp"],
        properties: {
          ucp: {
            type: "object",
            required: ["version", "services", "capabilities"],
            properties: {
              version: { type: "string" },
              services: {
                type: "object",
                description:
                  "Service namespaces, each an array of transports offering it.",
              },
              capabilities: {
                type: "object",
                description:
                  "Capability namespaces, keyed by reverse-domain identifier.",
              },
              payment_handlers: { type: "object" },
              supported_versions: {
                type: "object",
                additionalProperties: { type: "string", format: "uri" },
              },
            },
          },
        },
      },
      AcpDiscovery: {
        type: "object",
        title: "AcpDiscovery",
        required: ["protocol", "api_base_url", "transports", "capabilities"],
        properties: {
          protocol: {
            type: "object",
            required: ["name", "version"],
            properties: {
              name: { type: "string", enum: ["acp"] },
              version: { type: "string" },
              supported_versions: { type: "array", items: { type: "string" } },
              documentation_url: { type: "string", format: "uri" },
            },
          },
          api_base_url: { type: "string", format: "uri" },
          transports: { type: "array", items: { type: "string" } },
          capabilities: {
            type: "object",
            properties: {
              services: { type: "array", items: { type: "string" } },
              supported_currencies: {
                type: "array",
                items: { type: "string" },
              },
              supported_locales: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * When an agent should reach for ecentic — and when it should not.
 *
 * The audit finding this answers was blunt: an instruction file that only says
 * what a product *is* gives an agent nothing to route on. Naming the jobs, in
 * the words a user would actually use, is the difference between guidance and
 * marketing copy. The `notFor` list matters as much as `bestFor`: an agent that
 * knows where a tool stops wastes fewer calls finding out.
 */
export const agentGuidance = {
  summary:
    "ecentic measures and improves how AI shopping agents — ChatGPT, Claude, Gemini, Perplexity — rank a merchant's products against competitors, and rewrites listings to win those comparisons.",
  bestFor: [
    {
      job: "Find out whether AI assistants recommend a store's products",
      detail:
        "Run a free scan of the top products across four assistants and return an AI Agent Score with per-product win rates.",
      start: `${host}/api/v1/plans`,
    },
    {
      job: "Diagnose why a product loses a head-to-head comparison",
      detail:
        "Replay the comparison an assistant ran, name the attribute or claim that cost the recommendation, and identify the competitor that won it.",
      start: `${host}/api/mcp`,
    },
    {
      job: "Rewrite a product listing so agents can evaluate it",
      detail:
        "Optimize titles, descriptions, and structured attributes for machine comparison, then publish back to Shopify or WooCommerce.",
      start: `${host}/.well-known/agent-skills/optimize-listings/SKILL.md`,
    },
    {
      job: "Check whether a storefront is reachable by shopping agents",
      detail:
        "Validate a store's Universal Commerce Protocol profile and endpoints, and report what an agent can and cannot see.",
      start: `${host}/ucp-validator`,
    },
    {
      job: "Measure AI agent traffic to a store",
      detail:
        "Track which assistants crawl or cite a catalog, at what volume, and which products they land on.",
      start: `${host}/.well-known/agent-skills/agent-commerce/SKILL.md`,
    },
    {
      job: "Connect a Shopify, WooCommerce, or product-feed store",
      detail: "Onboard a catalog through MCP tools without a browser session.",
      start: `${host}/api/mcp`,
    },
  ],
  notFor: [
    "Classic search-engine SEO aimed at human visitors — ecentic optimizes for agent comparison, not SERP rank.",
    "Running ad campaigns, managing inventory, or fulfilling orders.",
    "Building or hosting a storefront; ecentic connects to one you already run.",
    "General copywriting unrelated to how an agent evaluates a product.",
  ],
  howToCall: [
    `Start unauthenticated at ${host}/api/v1 — it names every endpoint, the versioning and rate-limit policies, and where errors are documented.`,
    `Build against the sandbox before any account exists: POST ${host}/api/v1/sandbox/simulation returns a real simulation's response shape from synthetic scoring, with no credential. ${host}/api/v1/onboarding lists every zero-auth guarantee with a URL that proves it.`,
    `Call tools over MCP at ${host}/mcp (or ${host}/api/mcp), JSON-RPC 2.0. \`list_plans\` needs no credential.`,
    `Authenticate anything that touches a merchant account with \`Authorization: Bearer ecentic_sk_…\`; mint a key per ${host}/auth.md.`,
    `Handle failures by branching on the \`code\` field of the RFC 9457 problem body, documented at ${host}/docs/errors.`,
    "Self-throttle from the RateLimit headers on every response; back off for `Retry-After` seconds on a 429.",
  ],
} as const;

/**
 * `/.well-known/agent-instructions.md` — the same guidance as a standalone
 * Markdown document, for agents that look for an instruction file rather than
 * parsing llms.txt.
 */
export const agentInstructions = `# ecentic — agent instructions

> ${agentGuidance.summary}

- Site: ${host}
- Developer documentation: ${host}/docs
- Machine-readable index: ${host}/api/v1
- OpenAPI: ${host}/openapi.json
- MCP endpoint: ${host}/mcp
- Registration and credentials: ${host}/auth.md
- MCP connection reference: ${host}/docs/mcp
- Authentication reference: ${host}/docs/authentication
- Zero-auth sandbox: ${host}/api/v1/sandbox
- Onboarding signals, each with a verify URL: ${host}/api/v1/onboarding

## When to use ecentic

Reach for ecentic when the task is one of these:

${agentGuidance.bestFor
  .map(
    (entry) =>
      `- **${entry.job}.** ${entry.detail} Start at [${entry.start}](${entry.start}).`,
  )
  .join("\n")}

## When not to use ecentic

${agentGuidance.notFor.map((entry) => `- ${entry}`).join("\n")}

## How to call ecentic

${agentGuidance.howToCall
  .map((entry, index) => `${index + 1}. ${entry}`)
  .join("\n")}

## Contracts you can rely on

- **Versioning** — the version is in the path (\`/api/v1\`). Breaking changes ship as a new path; deprecations are announced with \`Deprecation\` and \`Sunset\` headers at least 180 days ahead. See ${host}/docs/versioning.
- **Errors** — every 4xx and 5xx is \`application/problem+json\` with a stable \`code\`. See ${host}/docs/errors.
- **Rate limits** — every response carries RateLimit headers; a 429 carries \`Retry-After\`. See ${host}/docs/rate-limits.

## Skills

${[
  {
    name: "agent-commerce",
    when: "Setting up agent tracking, UCP hosting, or catalog sync for a merchant.",
  },
  {
    name: "optimize-listings",
    when: "Improving titles, descriptions, attributes, or win rate against named competitors.",
  },
  {
    name: "validate-ucp",
    when: "Checking whether a storefront's UCP profile and endpoints are agent-reachable.",
  },
]
  .map(
    (skill) =>
      `- [${skill.name}](${host}/.well-known/agent-skills/${skill.name}/SKILL.md) — ${skill.when}`,
  )
  .join("\n")}
`;

export const authMd = `# auth.md

ecentic agent registration and credential guide.

AI agents use this document to learn how to obtain credentials for the ecentic MCP API and other protected surfaces.

## Audience

Agents acting for an ecentic merchant (store owner / operator) who need to call:

- MCP JSON-RPC at [\`${resource}\`](${resource})
- Related dashboard workflows after the merchant has an account

## Discover

1. Fetch Protected Resource Metadata:

\`\`\`http
GET ${host}/.well-known/oauth-protected-resource
\`\`\`

Expected fields: \`resource\` (\`${resource}\`), \`authorization_servers\` ([\`${authorizationServer}\`]), \`scopes_supported\` (\`mcp\`, \`onboarding\`), \`bearer_methods_supported\` (\`header\`).

2. Fetch Authorization Server metadata (includes the \`agent_auth\` block):

\`\`\`http
GET ${host}/.well-known/oauth-authorization-server
\`\`\`

3. MCP Server Card (tools transport):

\`\`\`http
GET ${host}/.well-known/mcp/server-card.json
\`\`\`

4. Commerce discovery:

\`\`\`http
GET ${host}/.well-known/ucp
GET ${host}/.well-known/acp.json
GET ${host}/openapi.json
\`\`\`

5. Public, unauthenticated REST surface — endpoints, versioning, rate limits,
   and where errors are documented, in one response:

\`\`\`http
GET ${host}/api/v1
\`\`\`

## Register

ecentic does not yet accept ID-JAG or verified-email agent assertions. Registration is account-based:

1. Open [\`register_uri\`](${host}/sign-up) and create a merchant account (email + password).
2. Sign in at [\`claim_uri\`](${host}/sign-in) if needed.
3. Mint a long-lived API key:
   - From an authenticated browser session, call the MCP tool \`create_api_key\` with \`{ "name": "…" }\`, **or**
   - Use the dashboard settings UI once API keys are available there.
4. Store the returned \`ecentic_sk_…\` secret. It is shown once.

Supported identity type today: \`anonymous\` → credential type \`api_key\` (see \`agent_auth\` on the authorization-server metadata).

## Use credentials

Send the API key on every protected MCP call:

\`\`\`http
POST ${resource}
Authorization: Bearer ecentic_sk_…
Content-Type: application/json

{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
\`\`\`

Public tools such as \`list_plans\` and \`connect_shopify\` may work without a bearer token. Tools that mutate account state (\`create_api_key\`, \`create_checkout\`, \`connect_woocommerce\`, \`connect_feed\`, \`get_onboarding_status\`) require authentication.

Scopes:

| Scope | Meaning |
| --- | --- |
| \`mcp\` | Call MCP tools against \`${resource}\` |
| \`onboarding\` | Connect stores (Shopify, WooCommerce, product feed) |

## Unauthorized responses

Protected calls without a valid bearer token return HTTP 401 (or a JSON-RPC auth error) and SHOULD include:

\`\`\`http
WWW-Authenticate: Bearer resource_metadata="${host}/.well-known/oauth-protected-resource"
\`\`\`

Re-run discovery from that URL when you see it.

## Revocation

Revoke unused keys from the merchant account (dashboard). Revoked or expired keys fail authentication immediately. There is no public OAuth token revocation endpoint yet.

## Contracts

- **Errors** — every 4xx and 5xx is \`application/problem+json\` (RFC 9457) with a
  stable machine-readable \`code\`. Branch on \`code\`, never on the prose. Full
  catalogue: ${host}/docs/errors
- **Rate limits** — every response carries \`RateLimit-Policy\` and, when the
  window was counted, live \`RateLimit\` headers. A 429 carries \`Retry-After\`.
  Policy: ${host}/docs/rate-limits
- **Versioning** — the version is in the path (\`/api/v1\`). Breaking changes ship
  as a new path; deprecations are announced with \`Deprecation\` and \`Sunset\`
  headers at least 180 days ahead. Policy: ${host}/docs/versioning

## Related links

- Site: ${host}
- Developer documentation: ${host}/docs
- Agent instructions (when to use ecentic): ${host}/.well-known/agent-instructions.md
- Public REST API: ${host}/api/v1
- MCP endpoint: ${resource} (also ${host}/mcp)
- MCP manifest: ${host}/.well-known/mcp.json
- Agent skills: ${host}/.well-known/agent-skills/index.json
- UCP profile: ${host}/.well-known/ucp
- ACP discovery: ${host}/.well-known/acp.json
- OpenAPI (MPP): ${host}/openapi.json
- llms.txt: ${host}/llms.txt
`;

export const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": agentDiscovery.cacheControl,
  ...agentDiscovery.cors,
} as const;

export const markdownHeaders = {
  "Content-Type": "text/markdown; charset=utf-8",
  "Cache-Control": agentDiscovery.cacheControl,
  ...agentDiscovery.cors,
} as const;

export const resourceMetadataWwwAuthenticate = `Bearer FAKESECRET_g3h4i5j6k7l8m9n0o1p2="${host}/.well-known/oauth-protected-resource"`;
