// biome-ignore-all lint/complexity/useLiteralKeys: Unknown provider records require bracket access under noPropertyAccessFromIndexSignature.
import { createHash, randomBytes } from "node:crypto";
import { assertMerchant, LoopError, record } from "./guard";
import { readResponse, send } from "./http";
import type { LoopFetch, LoopOAuthAuth, LoopReservation } from "./types";

export const createPkce = (store: string) => {
  assertMerchant(store);
  const verifier = randomBytes(32).toString("base64url");
  return {
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
};

export const createOAuthState = (store: string) => {
  assertMerchant(store);
  return randomBytes(32).toString("base64url");
};

export type LoopAuthorizationOptions = {
  enabled: boolean;
  clientId: string;
  redirectUri: string;
  organization: string;
  state: string;
  challenge: string;
  /** TODO(loop-confirm): Loop must confirm the returns scopes before this flag is enabled. */
  scopes: readonly string[];
};

export const authorizationUrl = (
  store: string,
  options: LoopAuthorizationOptions,
) => {
  assertMerchant(store);
  if (!options.enabled) throw new LoopError("Loop OAuth is not enabled.");
  if (
    !options.clientId ||
    !options.organization ||
    options.organization.length > 256 ||
    !/^[A-Za-z0-9_-]{32,128}$/.test(options.state) ||
    !/^[A-Za-z0-9_-]{43}$/.test(options.challenge) ||
    !options.scopes.length ||
    options.scopes.some((scope) => !/^[a-z][a-z0-9_:.-]{0,99}$/.test(scope))
  )
    throw new LoopError("Loop OAuth configuration is incomplete.");
  const callback = new URL(options.redirectUri);
  if (
    callback.protocol !== "https:" ||
    callback.username ||
    callback.password ||
    callback.hash
  )
    throw new LoopError("Loop OAuth requires an HTTPS callback.");
  const url = new URL("https://oauth.loopreturns.com/authorize");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: options.clientId,
    redirect_uri: callback.toString(),
    organization: options.organization,
    audience: "https://api.loopreturns.com/api",
    state: options.state,
    scope: [...new Set([...options.scopes, "offline_access"])].join(" "),
    // TODO(loop-confirm): partner documentation omits PKCE; confirm S256 support before rollout.
    code_challenge: options.challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
};

type Credentials = {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  beforeRequest: (reservation: LoopReservation) => Promise<void>;
  fetch?: LoopFetch;
  now?: () => number;
};

const token = async (
  store: string,
  parameters: Record<string, string>,
  options: Credentials,
  previous?: string,
): Promise<LoopOAuthAuth & { scopes: string[] }> => {
  assertMerchant(store);
  if (
    !options.enabled ||
    !options.clientId ||
    !options.clientSecret ||
    typeof options.beforeRequest !== "function"
  )
    throw new LoopError("Loop OAuth is not configured.");
  await options.beforeRequest({
    store,
    bucket: "api",
    limit: 300,
    interval: 60000,
  });
  await options.beforeRequest({
    store,
    bucket: "auth",
    limit: 20,
    interval: 60000,
  });
  const response = await send(
    store,
    options.fetch ?? fetch,
    "https://oauth.loopreturns.com/oauth/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        ...parameters,
        client_id: options.clientId,
        client_secret: options.clientSecret,
      }).toString(),
    },
  );
  if (!response.ok) {
    await response.body?.cancel();
    throw new LoopError(
      "Loop authorization failed. Reconnect the integration.",
      response.status,
    );
  }
  const source = record(await readResponse(store, response, 64 * 1024));
  const access = source["access_token"];
  const refresh = source["refresh_token"] ?? previous;
  const expiry = Number(source["expires_in"]);
  if (
    typeof access !== "string" ||
    !access ||
    access.length > 16_384 ||
    typeof refresh !== "string" ||
    !refresh ||
    refresh.length > 16_384 ||
    !Number.isFinite(expiry) ||
    expiry <= 0 ||
    expiry > 86_400
  )
    throw new LoopError("Loop returned incomplete authorization credentials.");
  return {
    mode: "oauth",
    accessToken: access,
    refreshToken: refresh,
    expiresAt: (options.now ?? Date.now)() + expiry * 1000,
    scopes:
      typeof source["scope"] === "string"
        ? source["scope"].split(/\s+/).filter(Boolean).slice(0, 100)
        : [],
  };
};

export const exchangeOAuthCode = (
  store: string,
  options: Credentials & {
    code: string;
    redirectUri: string;
    verifier: string;
  },
) => {
  assertMerchant(store);
  if (!options.code || !/^[A-Za-z0-9._~-]{43,128}$/.test(options.verifier))
    throw new LoopError("Loop OAuth code or verifier is missing.");
  return token(
    store,
    {
      grant_type: "authorization_code",
      code: options.code,
      redirect_uri: options.redirectUri,
      code_verifier: options.verifier,
    },
    options,
  );
};

export const refreshOAuthToken = (
  store: string,
  options: Credentials & { refreshToken: string },
) => {
  assertMerchant(store);
  if (!options.refreshToken)
    throw new LoopError("Loop refresh token is missing.");
  return token(
    store,
    { grant_type: "refresh_token", refresh_token: options.refreshToken },
    options,
    options.refreshToken,
  );
};
