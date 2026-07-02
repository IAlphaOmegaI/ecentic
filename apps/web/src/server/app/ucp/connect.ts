/**
 * Ecentic side of the woo-ucp plugin's one-click connect: an OAuth 2.0
 * authorization-code flow with PKCE where the WooCommerce store is the
 * authorization + resource server and Ecentic is the client.
 *
 * Flow: the store admin lands on `/api/integrations/woo/start` → Ecentic
 * mints state + PKCE and redirects to the store's `/ucp-connect/authorize` →
 * the admin approves inside wp-admin → the store redirects back to
 * `/api/integrations/woo/callback` with a one-time code → Ecentic exchanges
 * it at the store's `/ucp-connect/token` (back-channel, form-encoded) for a
 * freshly minted WooCommerce REST API key, creates the store + syncs its
 * catalog, then pushes the hosted-UCP connection settings (store id, bridge
 * secret, endpoint URLs) to the plugin over the bridge.
 */

import { createHash, randomBytes } from "node:crypto";
import { resultify } from "@zenncore/utils";
import { db } from "@/server/database";
import { redis } from "@/server/utils/durable";
import { Environment } from "@/server/utils/environment";
import * as HTTP from "@/server/utils/http";
import { normalizeStoreUrl } from "@/server/utils/woocommerce";
import * as WooCommerce from "../integration/woocommerce";
import * as StoreAccount from "../store-account";
import * as Bridge from "./bridge";
import { appHost, ucpEndpointUrl, ucpProfileUrl } from "./store-context";

const STATE_TTL_SECONDS = 600;

const stateKey = (state: string) => `ucp:connect:${state}`;

type ConnectState = {
  user: string;
  storeUrl: string;
  name: string;
  verifier: string;
};

export const callbackUrl = () => `${appHost()}/api/integrations/woo/callback`;

/**
 * Mints state + PKCE for a connect attempt and returns the store's authorize
 * URL to redirect the admin to.
 */
export const beginConnect = async ({
  user,
  storeUrl,
  name,
}: {
  user: string;
  storeUrl: string;
  name: string;
}): Promise<
  { success: true; authorizeUrl: string } | { success: false; error: Error }
> => {
  const normalized = normalizeStoreUrl(storeUrl);
  const parsed = await resultify(async () => new URL(normalized));
  if (!parsed.success) {
    return { success: false, error: new Error("Invalid store URL") };
  }

  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const saved = await resultify(() =>
    redis.set(
      stateKey(state),
      { user, storeUrl: normalized, name, verifier } satisfies ConnectState,
      { ex: STATE_TTL_SECONDS },
    ),
  );
  if (!saved.success) return { success: false, error: saved.error };

  const authorize = new URL(`${normalized}/ucp-connect/authorize`);
  authorize.searchParams.set("client_id", "ecentic");
  authorize.searchParams.set("redirect_uri", callbackUrl());
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");

  return { success: true, authorizeUrl: authorize.toString() };
};

type TokenResponse = {
  consumer_key: string;
  consumer_secret: string;
  key_id: number;
  permissions: string;
  store: {
    url: string;
    name: string;
    wc_version: string | null;
    ucp_version: string;
  };
};

/**
 * Completes the connect flow after the store redirects back with a one-time
 * code: token exchange → store + catalog import → bridge configuration.
 */
export const completeConnect = async ({
  user,
  state,
  code,
}: {
  user: string;
  state: string;
  code: string;
}): Promise<
  { success: true; store: string } | { success: false; error: Error }
> => {
  const stored = await resultify(() =>
    redis.get<ConnectState>(stateKey(state)),
  );
  if (!stored.success || !stored.data) {
    return { success: false, error: new Error("Unknown or expired state") };
  }
  await resultify(() => redis.del(stateKey(state))); // one-time use

  const connectState = stored.data;
  if (connectState.user !== user) {
    return {
      success: false,
      error: new Error("Connect attempt belongs to a different account"),
    };
  }

  // Back-channel token exchange — the store's endpoint reads form fields.
  const token = await HTTP.request(
    `${connectState.storeUrl}/ucp-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        code_verifier: connectState.verifier,
        redirect_uri: callbackUrl(),
      }).toString(),
    },
  );
  if (!token.success) return token;

  const credentials = await HTTP.parse<TokenResponse>(token);
  if (!credentials.success) return credentials;

  const connected = await WooCommerce.connectForUser(Environment.SERVER, {
    user,
    domain: connectState.storeUrl,
    consumerKey: credentials.data.consumer_key,
    consumerSecret: credentials.data.consumer_secret,
  });
  if (!connected.success) return connected;

  const storeId = connected.data.id;

  // Mint the bridge secret and push the hosted-UCP settings to the plugin so
  // its /.well-known/ucp starts advertising this backend.
  const bridgeSecret = randomBytes(32).toString("base64url");

  const account = await resultify(() =>
    db.query.store_account.findFirst({ where: { storeId } }),
  );
  if (account.success && account.data) {
    await StoreAccount.update(Environment.SERVER, account.data.id, {
      bridgeSecret,
    });
  }

  const configured = await Bridge.configureConnection(
    {
      domain: connectState.storeUrl,
      consumerKey: credentials.data.consumer_key,
      consumerSecret: credentials.data.consumer_secret,
    },
    {
      store_id: storeId,
      bridge_secret: bridgeSecret,
      events_url: `${appHost()}/api/ucp/stores/${storeId}/events`,
      profile_url: ucpProfileUrl(storeId),
      endpoint: ucpEndpointUrl(storeId),
    },
  );

  // A failed configure call is non-fatal: the store is connected and synced;
  // the plugin will fall back to prompting a reconnect for hosted UCP.
  if (!configured.success) {
    return { success: true, store: storeId };
  }

  return { success: true, store: storeId };
};
