import { randomUUID } from "node:crypto";
import {
  createRechargeClient,
  exchangeCode,
  installUrl,
  type OAuthTokens,
} from "@ecentic/recharge";
import { and, eq, isNull } from "drizzle-orm";
import { sanitizeRedirect } from "@/lib/redirect";
import { db, schema } from "@/server/database";
import * as Model from "./model";
import { configuration, RechargeLifecycleError } from "./types";

const shopDomain = (value: string) => {
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(url.hostname))
    throw new RechargeLifecycleError("invalid_shop");
  return url.hostname;
};

export const beginInstall = async (input: {
  store: string;
  user: string;
  returnTo?: string;
}) => {
  const config = configuration();
  const store = await Model.requireStore(input);
  if (store.platform !== "shopify" || store.status !== "connected")
    throw new RechargeLifecycleError("connect_shopify_first");
  const cookie = await Model.newInstallation({
    ...input,
    returnTo: sanitizeRedirect(input.returnTo, `/dashboard/${store.id}`),
  });
  return { cookie, url: installUrl(config.clientId, shopDomain(store.domain)) };
};

export const redeemPending = async ({
  cookie,
  user,
}: {
  cookie: string;
  user: string;
}) => {
  const config = configuration();
  const installation = await Model.claimInstallation(cookie, user);
  const grant: OAuthTokens = installation.grant
    ? JSON.parse(installation.grant)
    : await (async () => {
        if (!installation.code) throw new RechargeLifecycleError("expired");
        // TODO(recharge-confirm): partner OAuth examples omit client_secret;
        // add it only when Recharge confirms this app's token contract.
        const tokens = await exchangeCode({
          code: installation.code,
          clientId: config.clientId,
          redirectUri: config.redirectUri,
        });
        await Model.saveGrant(installation, JSON.stringify(tokens));
        return tokens;
      })();
  if (grant.scopes.some((scope) => scope.startsWith("write_")))
    throw new RechargeLifecycleError("write_scopes_not_allowed");

  // This first store-info call has one consumer: the atomically claimed pending
  // installation. Once identified, every API call runs under the store DB lease.
  const client = createRechargeClient({
    getAccessToken: async () => grant.accessToken,
    beforeRequest: () => Model.reserveInstallationCall(installation),
  });
  const external = await client.getStore();
  const domain = shopDomain(
    external.external_platform_domain ??
      external.platform_domain ??
      `${external.identifier}.myshopify.com`,
  );
  if (external.external_platform && external.external_platform !== "shopify")
    throw new RechargeLifecycleError("connect_shopify_first");
  const stores = await Model.read(() =>
    db
      .select()
      .from(schema.store)
      .where(
        and(
          eq(schema.store.userId, user),
          eq(schema.store.platform, "shopify"),
          eq(schema.store.status, "connected"),
        ),
      ),
  );
  const store = stores.find(
    (candidate) =>
      (!installation.storeId || candidate.id === installation.storeId) &&
      shopDomain(candidate.domain) === domain,
  );
  if (!store) throw new RechargeLifecycleError("shop_mismatch");

  const attached = await db.transaction(async (transaction) => {
    // Lock the owner row too, so disconnect/account deletion cannot race attach.
    const [owned] = await transaction
      .select()
      .from(schema.store)
      .where(and(eq(schema.store.id, store.id), eq(schema.store.userId, user)))
      .for("update");
    if (!owned || owned.platform !== "shopify" || owned.status !== "connected")
      throw new RechargeLifecycleError("connect_shopify_first");
    const [pending] = await transaction
      .select()
      .from(schema.rechargeInstallation)
      .where(
        and(
          eq(schema.rechargeInstallation.id, installation.id),
          eq(schema.rechargeInstallation.lease, installation.lease!),
        ),
      )
      .for("update");
    if (!pending || pending.expiresAt < new Date())
      throw new RechargeLifecycleError("expired");
    const [previous] = await transaction
      .select()
      .from(schema.rechargeConnection)
      .where(eq(schema.rechargeConnection.storeId, store.id))
      .for("update");
    // A Marketplace grant may not have been bound to this store when disconnect
    // purged pending installs. It cannot revive a later explicit disconnect.
    if (
      previous?.uninstalledAt &&
      previous.uninstalledAt >= installation.createdAt
    )
      return false;
    const generation = (previous?.generation ?? 0) + 1;
    const values = {
      storeId: store.id,
      externalStoreId: external.id == null ? null : String(external.id),
      domain,
      currency: external.currency ?? null,
      accessToken: grant.accessToken,
      refreshToken: grant.refreshToken,
      accessTokenExpiresAt: grant.expiresAt ? new Date(grant.expiresAt) : null,
      scopes: grant.scopes,
      generation,
      status: "syncing" as const,
      installedAt: new Date(),
      uninstalledAt: null,
      lease: null,
      leaseUntil: null,
      nextRequestAt: null,
      error: null,
      updatedAt: new Date(),
    };
    const [connection] = await transaction
      .insert(schema.rechargeConnection)
      .values(values)
      .onConflictDoUpdate({
        target: schema.rechargeConnection.storeId,
        set: values,
      })
      .returning();
    if (!connection) throw new RechargeLifecycleError("install_failed");
    await transaction
      .delete(schema.rechargeJob)
      .where(eq(schema.rechargeJob.storeId, store.id));
    const run = randomUUID();
    await Model.enqueue(
      {
        store: store.id,
        generation,
        kind: "hooks",
        key: `${connection.id}:${generation}:hooks:install`,
      },
      transaction,
    );
    await Model.enqueue(
      {
        store: store.id,
        generation,
        kind: "products",
        key: `${connection.id}:${generation}:products:${run}`,
        payload: { run },
      },
      transaction,
    );
    await transaction
      .delete(schema.rechargeInstallation)
      .where(eq(schema.rechargeInstallation.id, installation.id));
    return true;
  });
  if (!attached) {
    await discardPending(cookie);
    throw new RechargeLifecycleError("superseded");
  }
  return {
    store: store.id,
    returnTo: sanitizeRedirect(installation.returnTo, `/dashboard/${store.id}`),
  };
};

export const releasePending = async (cookie: string) => {
  // A stored grant survives a transient store-info failure until the short TTL.
  await db
    .update(schema.rechargeInstallation)
    .set({ state: "pending", lease: null })
    .where(
      and(
        eq(schema.rechargeInstallation.id, Model.installationHash(cookie)),
        eq(schema.rechargeInstallation.state, "redeeming"),
        isNull(schema.rechargeInstallation.code),
      ),
    );
};

export const discardPending = async (cookie: string) => {
  await db
    .delete(schema.rechargeInstallation)
    .where(eq(schema.rechargeInstallation.id, Model.installationHash(cookie)));
};
