import { jsonHeaders, openIdConfiguration } from "@/lib/agent-discovery";

/**
 * OpenID Connect Discovery 1.0.
 * @see http://openid.net/specs/openid-connect-discovery-1_0.html
 */
export const GET = () =>
  new Response(JSON.stringify(openIdConfiguration, null, 2), {
    headers: jsonHeaders,
  });
