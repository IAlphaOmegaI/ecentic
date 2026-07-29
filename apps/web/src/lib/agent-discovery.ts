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
- UCP agent profile: ${host}/ucp/agent-profile
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
