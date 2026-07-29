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
  '</api/mcp>; rel="service-desc"; type="application/json"',
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
      anchor: `${seo.host}/api/mcp`,
      "service-desc": [
        {
          href: `${seo.host}/api/openapi/mcp`,
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
    "Access-Control-Allow-Headers": "Content-Type, If-None-Match, Authorization",
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
  documentationUrl: `${host}/auth.md`,
  transport: {
    type: "streamable-http",
    endpoint: `${host}/api/mcp`,
  },
  capabilities: {
    tools: {},
  },
  authentication: {
    required: true,
    schemes: ["bearer"],
  },
  instructions:
    "Authenticate with Authorization: Bearer ecentic_sk_…. Discover registration at /auth.md and OAuth Protected Resource Metadata at /.well-known/oauth-protected-resource.",
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

/**
 * Root OpenAPI document with MPP `x-payment-info` payment discovery.
 * @see https://paymentauth.org/draft-payment-discovery-00.txt
 */
export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "ecentic agent commerce API",
    version: "1.0.0",
    description:
      "Agent-facing ecentic surfaces: MCP, UCP discovery, ACP checkout bootstrapping, and payable agent API access.",
  },
  servers: [{ url: host }],
  "x-service-info": {
    categories: ["developer-tools", "data"],
    docs: {
      homepage: `${host}/resources`,
      apiReference: `${host}/.well-known/api-catalog`,
      llms: `${host}/llms.txt`,
    },
  },
  paths: {
    "/api": {
      get: {
        summary: "Agent API root (x402 / MPP payable)",
        operationId: "getAgentApiRoot",
        description:
          "Returns HTTP 402 Payment Required with x402 payment requirements unless a valid payment proof is supplied.",
        "x-payment-info": {
          intent: "charge",
          method: "stripe",
          amount: "0.01",
          currency: "USD",
          description: "Per-request access to the ecentic agent API root.",
        },
        responses: {
          "200": {
            description: "Paid access granted",
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
          "402": {
            description: "Payment Required (x402 / MPP challenge)",
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
        },
      },
    },
    "/api/mcp": {
      post: {
        summary: "JSON-RPC MCP request",
        operationId: "postMcp",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "JSON-RPC response",
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
        },
      },
    },
    "/.well-known/ucp": {
      get: {
        summary: "Universal Commerce Protocol discovery profile",
        operationId: "getWellKnownUcp",
        responses: {
          "200": {
            description: "UCP business profile",
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
        },
      },
    },
    "/.well-known/acp.json": {
      get: {
        summary: "Agentic Commerce Protocol discovery document",
        operationId: "getWellKnownAcp",
        responses: {
          "200": {
            description: "ACP discovery document",
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
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
          "Agent API key (ecentic_sk_…) or OAuth access token from the authorization server.",
      },
    },
  },
} as const;

/** USDC on Base — used in the public x402 challenge when no override is set. */
const x402UsdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

/**
 * x402 Payment Required body for unpaid agent API probes.
 * @see https://x402.org
 */
export const x402PaymentRequired = (payTo: string) =>
  ({
    x402Version: 1,
    error: "Payment required to access the ecentic agent API",
    accepts: [
      {
        scheme: "exact",
        network: "base",
        maxAmountRequired: "10000",
        resource: `${host}/api`,
        description: "ecentic agent API access",
        mimeType: "application/json",
        payTo,
        maxTimeoutSeconds: 60,
        asset: x402UsdcBase,
        extra: {
          name: "USDC",
          version: "2",
          facilitator: "https://x402.org/facilitator",
        },
      },
    ],
  }) as const;

export const resolveX402PayTo = () =>
  process.env.X402_PAY_TO?.trim() ||
  "0x0000000000000000000000000000000000000000";

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

## Related links

- Site: ${host}
- MCP endpoint: ${resource}
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
