import type { Result } from "@zenncore/utils";
import { RequestError } from "../../../utils/error";
import * as HTTP from "../../../utils/http";

/**
 * Backoff for a refresh interrupted by a transient failure. Expiring offline
 * access tokens live 60 minutes against a five-minute refresh threshold, so
 * every connected store rotates roughly hourly — often enough that an edge blip
 * on the token endpoint is a routine event rather than an exceptional one.
 */
export const REFRESH_RETRY_DELAYS_MS = [1000, 3000, 8000];

/** The wire shape Shopify answers a successful token grant with. */
export type TokenPayload = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
};

/**
 * Redeems a Shopify expiring-offline refresh token for a fresh access/refresh
 * pair, retrying transient failures and classifying the ones that survive.
 *
 * Lives apart from `refreshAccessToken` so this policy can be exercised without
 * a database — the action wrapping it makes three round-trips before it ever
 * reaches the network.
 */
export const redeemRefreshToken = async (
  {
    shop,
    clientId,
    clientSecret,
    refreshToken,
  }: {
    shop: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  },
  { delays = REFRESH_RETRY_DELAYS_MS }: { delays?: number[] } = {},
): Promise<Result<TokenPayload, Error>> => {
  const attempt = () =>
    HTTP.request(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      },
      // Well under `HTTP.request`'s 60s default. Refreshes run inside
      // interactive server actions, and five attempts at the default would let
      // one stall a request for five minutes — past the platform's function
      // ceiling. The token endpoint answers in well under a second when it is
      // healthy, so a stall is itself the signal to back off.
      { timeout: 10000 },
    );

  // Shopify's contract for expiring offline tokens is explicit: network errors,
  // timeouts, 429 and 5xx are transient and must be retried with the SAME
  // refresh token. Rotation is not consumed by a failed attempt — the platform
  // replays the identical refresh response for an hour afterwards so that an
  // interrupted rotation can be resumed rather than orphaning the grant.
  const retriable = (response: Awaited<ReturnType<typeof attempt>>) =>
    !response.success ||
    response.data.status === 429 ||
    response.data.status >= 500;

  const first = await attempt();

  const response = await (async () => {
    if (!retriable(first)) return first;

    for (const delay of delays) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      const retried = await attempt();
      if (!retriable(retried)) return retried;
    }

    return attempt();
  })();

  const token = await HTTP.parse<TokenPayload>(response);

  if (token.success) return token;

  // A genuinely dead grant is a 401 carrying a JSON `invalid_request` body —
  // that parses cleanly and arrives here as a `RequestError`. Everything else
  // that outlives the retries above (notably the edge's HTML error pages, which
  // fail to parse at all) says nothing about the stored token, so it must not
  // send the merchant through a reinstall.
  const { statusCode } = token.error as Error & { statusCode?: number };

  return {
    success: false,
    error:
      statusCode === 401
        ? new Error(
            "Shopify rejected the token refresh. Please reconnect your store (Settings → Integrations).",
            { cause: token.error },
          )
        : // Wording is load-bearing: the sync toasts decide whether to offer the
          // reconnect CTA by matching the prose against
          // /reconnect your store|access token/i. A transient failure must miss
          // that pattern, or the merchant is sent to reinstall over an outage
          // that resolves itself.
          new RequestError(
            "Shopify could not be reached to refresh authorization. Please try again shortly.",
            { cause: token.error, statusCode },
          ),
  };
};
