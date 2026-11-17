import { RechargeError, type RechargeFetch, readResponse, send } from "./http";

export type OAuthTokens = {
  accessToken: string;
  refreshToken: string | null;
  scopes: string[];
  expiresAt: string | null;
};

type Credentials = {
  clientId: string;
  clientSecret?: string;
  fetch?: RechargeFetch;
  now?: number;
};

const token = async (
  parameters: Record<string, string>,
  {
    clientId,
    clientSecret,
    fetch: transport = fetch,
    now = Date.now(),
  }: Credentials,
): Promise<OAuthTokens> => {
  const response = await send(
    transport,
    "https://www.admin.rechargeapps.com/oauth/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        ...parameters,
        client_id: clientId,
        // TODO(recharge-confirm): documented OAuth examples omit client_secret.
        // Only supply it after the partner app's contract has been confirmed.
        ...(clientSecret ? { client_secret: clientSecret } : {}),
      }),
    },
  );
  if (!response.ok)
    throw new RechargeError(
      "Recharge authorization failed. Reconnect the store.",
      response.status,
    );
  const data = await readResponse(response);
  if (typeof data["access_token"] !== "string" || !data["access_token"])
    throw new RechargeError("Recharge did not return an access token.");
  const expiry = Number(data["expires_in"]);
  return {
    accessToken: data["access_token"],
    refreshToken:
      typeof data["refresh_token"] === "string" && data["refresh_token"]
        ? data["refresh_token"]
        : null,
    scopes:
      typeof data["scope"] === "string"
        ? [...new Set(data["scope"].split(/\s+/).filter(Boolean))]
        : [],
    // The current docs call access tokens permanent and supply no expiry.
    // TODO(recharge-confirm): expiry and refresh-token rotation for partner apps.
    expiresAt:
      Number.isFinite(expiry) && expiry > 0 && expiry <= 315_576_000
        ? new Date(now + expiry * 1000).toISOString()
        : null,
  };
};

export const exchangeCode = ({
  code,
  redirectUri,
  ...credentials
}: Credentials & { code: string; redirectUri: string }) =>
  token(
    { code, redirect_uri: redirectUri, grant_type: "authorization_code" },
    credentials,
  );

export const refreshToken = ({
  refreshToken: refresh,
  ...credentials
}: Credentials & { refreshToken: string }) =>
  token({ refresh_token: refresh, grant_type: "refresh_token" }, credentials);

export const installUrl = (clientId: string, shop: string) => {
  const name = shop.replace(/\.myshopify\.com$/i, "").toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name))
    throw new RechargeError("A valid Shopify store domain is required.");
  const url = new URL(
    `https://admin.rechargeapps.com/partners/app/${encodeURIComponent(clientId)}/install`,
  );
  url.searchParams.set("myshopify_domain", name);
  return url.toString();
};
