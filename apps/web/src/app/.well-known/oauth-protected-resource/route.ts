import { jsonHeaders, oauthProtectedResource } from "@/lib/agent-discovery";

/**
 * RFC 9728 OAuth 2.0 Protected Resource Metadata.
 * @see https://datatracker.ietf.org/doc/html/rfc9728
 */
export const GET = () =>
  new Response(JSON.stringify(oauthProtectedResource, null, 2), {
    headers: jsonHeaders,
  });
