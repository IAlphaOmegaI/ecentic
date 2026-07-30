import {
  jsonHeaders,
  oauthAuthorizationServer,
} from "@/lib/agent-discovery";

/**
 * RFC 8414 OAuth 2.0 Authorization Server Metadata.
 * @see https://www.rfc-editor.org/rfc/rfc8414
 */
export const GET = () =>
  new Response(JSON.stringify(oauthAuthorizationServer, null, 2), {
    headers: jsonHeaders,
  });
