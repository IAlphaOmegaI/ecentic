import { seo } from "@/lib/seo";

/**
 * Token endpoint advertised in OAuth/OIDC discovery.
 * Agents authenticate to MCP with long-lived API keys (`ecentic_sk_…`), not
 * OAuth access tokens — see /auth.md and /.well-known/oauth-authorization-server.
 */
export const POST = () =>
  Response.json(
    {
      error: "unsupported_grant_type",
      error_description:
        "ecentic does not issue OAuth access tokens for agents yet. Create an account, mint an API key via MCP create_api_key or the dashboard, and send Authorization: Bearer ecentic_sk_… . See /auth.md.",
      error_uri: `${seo.host}/auth.md`,
    },
    {
      status: 400,
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );

export const GET = () =>
  Response.json(
    {
      error: "invalid_request",
      error_description:
        "Use POST with an OAuth token request, or prefer API keys per /auth.md.",
      error_uri: `${seo.host}/auth.md`,
    },
    {
      status: 405,
      headers: {
        Allow: "POST",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
