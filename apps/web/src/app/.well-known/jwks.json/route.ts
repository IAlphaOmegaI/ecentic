import { jsonHeaders } from "@/lib/agent-discovery";
import { webBotAuthPublicJwk } from "@/server/utils/web-bot-auth";

/**
 * JWKS for OAuth/OIDC discovery (`jwks_uri`).
 * Publishes the same Ed25519 public key used for Web Bot Auth / HTTP Message
 * Signatures. Agent MCP credentials are opaque API keys, not JWTs.
 */
export const GET = () =>
  new Response(JSON.stringify({ keys: [webBotAuthPublicJwk] }, null, 2), {
    headers: {
      ...jsonHeaders,
      "Content-Type": "application/jwk-set+json; charset=utf-8",
    },
  });
