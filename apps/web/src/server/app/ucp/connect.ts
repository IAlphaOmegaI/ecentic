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
import { withContext } from "@/server/utils/context";
import { redis } from "@/server/utils/durable";
import { Environment } from "@/server/utils/environment";
import { RequestError, ValidationError } from "@/server/utils/error";
import * as HTTP from "@/server/utils/http";
import { isSafePublicHttpUrl } from "@/server/utils/ssrf";
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
export const beginConnect = withContext(
  async (
    context,
    {
      user,
      storeUrl,
      name,
    }: {
      user: string;
      storeUrl: string;
      name: string;
    },
  ) => {
    const normalized = normalizeStoreUrl(storeUrl);
    const parsed = await resultify(async () => new URL(normalized));
    if (!parsed.success) {
      return {
        success: false as const,
        error: new ValidationError("Invalid store URL"),
      };
    }

    // SSRF guard: the callback later POSTs to this origin server-side.
    if (!(await isSafePublicHttpUrl(normalized))) {
      return {
        success: false as const,
        error: new ValidationError("Store URL must be a public HTTPS URL"),
      };
    }

    context.span.addBreadcrumb({
      category: "ucp.connect.begin",
      data: { "store.host": parsed.data.host },
    });

    // Plugin-installed probe: an installed plugin answers /.well-known/ucp
    // (200 once configured, 503 not_configured before connect); a bare
    // WordPress 404s. Without the plugin, send the admin to install it —
    // activation auto-resumes the connect flow.
    const probe = await resultify(() =>
      fetch(`${normalized}/.well-known/ucp`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5_000),
      }),
    );
    const installed =
      probe.success && (probe.data.status === 200 || probe.data.status === 503);

    if (!installed) {
      return {
        success: true as const,
        data: {
          next: "install" as const,
          url: `${normalized}/wp-admin/plugin-install.php?tab=upload`,
        },
      };
    }

    const state = randomBytes(24).toString("base64url");
    const verifier = randomBytes(48).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");

    const saved = await resultify(
      async () =>
        await redis.set(
          stateKey(state),
          { user, storeUrl: normalized, name, verifier } satisfies ConnectState,
          { ex: STATE_TTL_SECONDS },
        ),
    );
    if (!saved.success) return saved;

    const authorize = new URL(`${normalized}/ucp-connect/authorize`);
    authorize.searchParams.set("client_id", "ecentic");
    authorize.searchParams.set("redirect_uri", callbackUrl());
    authorize.searchParams.set("state", state);
    authorize.searchParams.set("code_challenge", challenge);
    authorize.searchParams.set("code_challenge_method", "S256");

    return {
      success: true as const,
      data: { next: "authorize" as const, url: authorize.toString() },
    };
  },
  "UcpConnect.begin",
);

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
export const completeConnect = withContext(
  async (
    context,
    {
      user,
      state,
      code,
    }: {
      user: string;
      state: string;
      code: string;
    },
  ) => {
    // Atomic single-use consume — a replayed state loses the GETDEL race.
    const stored = await resultify(
      async () => await redis.getdel<ConnectState>(stateKey(state)),
    );
    if (!stored.success) return stored;
    if (!stored.data) {
      return {
        success: false as const,
        error: new RequestError("Unknown or expired connect state"),
      };
    }

    const connectState = stored.data;
    if (connectState.user !== user) {
      return {
        success: false as const,
        error: new RequestError(
          "Connect attempt belongs to a different account",
        ),
      };
    }

    // Defense in depth: the state's store URL was vetted at /start, but this
    // is the request that actually leaves the network.
    if (!(await isSafePublicHttpUrl(connectState.storeUrl))) {
      return {
        success: false as const,
        error: new ValidationError("Store URL must be a public HTTPS URL"),
      };
    }

    context.span.addBreadcrumb({
      category: "ucp.connect.complete",
      data: { "store.host": connectState.storeUrl },
    });

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
      { timeout: 15_000 },
    );
    if (!token.success) return token;

    const credentials = await HTTP.parse<TokenResponse>(token);
    if (!credentials.success) return credentials;

    // Reconnects rotate the existing store's credentials instead of
    // duplicating the store (the plugin revokes the old WC key on re-issue).
    const existing = await resultify(
      async () =>
        await db.query.store.findFirst({
          where: {
            userId: user,
            domain: connectState.storeUrl,
            platform: "woocommerce",
          },
        }),
    );

    const storeResult = await (async () => {
      if (existing.success && existing.data) {
        const store = existing.data;
        const account = await resultify(
          async () =>
            await db.query.store_account.findFirst({
              where: { storeId: store.id },
            }),
        );
        const saved =
          account.success && account.data
            ? await StoreAccount.update(Environment.SERVER, account.data.id, {
                consumerKey: credentials.data.consumer_key,
                consumerSecret: credentials.data.consumer_secret,
              })
            : await StoreAccount.create(Environment.SERVER, {
                storeId: store.id,
                consumerKey: credentials.data.consumer_key,
                consumerSecret: credentials.data.consumer_secret,
              });
        if (!saved.success) return saved;

        // Refresh the catalog with the new key; a failed sync isn't fatal to
        // the reconnect.
        await WooCommerce.syncWooCommerceCatalog(Environment.SERVER, {
          user,
          store: store.id,
        });

        return { success: true as const, data: store };
      }

      return WooCommerce.connectForUser(Environment.SERVER, {
        user,
        domain: connectState.storeUrl,
        consumerKey: credentials.data.consumer_key,
        consumerSecret: credentials.data.consumer_secret,
      });
    })();
    if (!storeResult.success) return storeResult;

    const storeId = storeResult.data.id;

    // Mint the bridge secret and push the hosted-UCP settings to the plugin so
    // its /.well-known/ucp starts advertising this backend.
    const bridgeSecret = randomBytes(32).toString("base64url");

    const account = await resultify(
      async () =>
        await db.query.store_account.findFirst({ where: { storeId } }),
    );
    if (account.success && account.data) {
      await StoreAccount.update(Environment.SERVER, account.data.id, {
        bridgeSecret,
      });
    }

    // A failed configure call is non-fatal: the store is connected and synced;
    // the plugin will fall back to prompting a reconnect for hosted UCP.
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

    context.span.addBreadcrumb({
      category: "ucp.connect.configured",
      data: { "store.id": storeId, "bridge.configured": configured.success },
    });

    return { success: true as const, data: { store: storeId } };
  },
  "UcpConnect.complete",
);
