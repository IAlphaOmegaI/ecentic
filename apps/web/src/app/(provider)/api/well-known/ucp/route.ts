import { jsonHeaders, ucpDiscoveryProfile } from "@/lib/agent-discovery";

/**
 * Mirrored UCP profile behind the `/.well-known/ucp` rewrite (kept in sync
 * with `app/.well-known/ucp/route.ts` via shared `ucpDiscoveryProfile`).
 */
export const GET = () =>
  new Response(JSON.stringify(ucpDiscoveryProfile, null, 2), {
    headers: jsonHeaders,
  });

export const OPTIONS = () =>
  new Response(null, {
    headers: jsonHeaders,
  });
