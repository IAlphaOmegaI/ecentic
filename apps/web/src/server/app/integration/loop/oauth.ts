// Loop authorization is per consenting merchant; server credentials never cross to the browser.
import { createHash, timingSafeEqual } from "node:crypto";
import {
  authorizationUrl,
  createOAuthState,
  createPkce,
  exchangeOAuthCode,
  type LoopAuth,
  LoopClient,
  type LoopOAuthAuth,
  refreshOAuthToken,
} from "@ecentic/loop";
import { resultify } from "@zenncore/utils";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/server/database";
import * as Model from "./model";
import { LoopLifecycleError, oauthConfiguration, safeError } from "./types";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const validate = async (input: {
  store: string;
  generation: number;
  auth: LoopAuth;
}) => {
  const client = new LoopClient({
    store: input.store,
    auth: input.auth,
    beforeRequest: ({ bucket }) => Model.reserveRequest({ ...input, bucket }),
  });
  const identity = await client.identity();
  // TODO(loop-confirm): the auth/me API-key contract and identity fields need provider confirmation.
  if (!identity.shop_id)
    throw new LoopLifecycleError("shop_identity_unconfirmed");
  const to = new Date();
  const page = await client.list({
    from: new Date(to.getTime() - 86_400_000).toISOString(),
    to: to.toISOString(),
    filter: "created_at",
    state: "open",
    pageSize: 1,
  });
  if (
    page.returns.some(
      (returned) => returned.shop_id && returned.shop_id !== identity.shop_id,
    )
  )
    throw new LoopLifecycleError("shop_mismatch");
  return { ...identity, shop_id: identity.shop_id };
};
export const connectApiKey = async (input: {
  store: string;
  user: string;
  apiKey: string;
  webhookSecret: string;
}) => {
  const pending = await Model.prepare(input);
  const result = await resultify(async () => {
    const auth: LoopAuth = { mode: "api_key", apiKey: input.apiKey };
    const identity = await validate({
      store: input.store,
      generation: pending.generation,
      auth,
    });
    if (
      identity.scopes.length &&
      (!identity.scopes.includes("returns") ||
        !identity.scopes.includes("developer_tools"))
    )
      throw new LoopLifecycleError("missing_scopes");
    await Model.activate({
      store: input.store,
      generation: pending.generation,
      auth,
      shopId: identity.shop_id,
      scopes: identity.scopes.length
        ? identity.scopes
        : ["returns", "developer_tools"],
    });
  });
  if (!result.success) {
    await Model.markFailedConnect(
      { store: input.store, generation: pending.generation },
      safeError(result.error),
    );
    throw new LoopLifecycleError(safeError(result.error));
  }
};
export const beginInstall = async (input: {
  store?: string;
  user: string;
  organization: string;
}) => {
  const config = oauthConfiguration();
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(input.organization))
    throw new LoopLifecycleError("invalid_organization");
  const stores = input.store
    ? [await Model.requireStore({ store: input.store, user: input.user })]
    : await db
        .select()
        .from(schema.store)
        .where(
          and(
            eq(schema.store.userId, input.user),
            eq(schema.store.platform, "shopify"),
            eq(schema.store.status, "connected"),
          ),
        )
        .limit(2);
  if (stores.length !== 1 || !stores[0])
    throw new LoopLifecycleError("select_store");
  const store = stores[0].id;
  const pending = await Model.prepare({ store, user: input.user });
  const state = createOAuthState(store);
  const pkce = createPkce(store);
  await db.insert(schema.loopInstallation).values({
    id: hash(state),
    storeId: store,
    userId: input.user,
    organization: input.organization,
    verifier: pkce.verifier,
    stateHash: hash(state),
    generation: pending.generation,
    expiresAt: new Date(Date.now() + 600_000),
  });
  return {
    cookie: state,
    url: authorizationUrl(store, {
      ...config,
      enabled: true,
      organization: input.organization,
      state,
      challenge: pkce.challenge,
    }),
  };
};
export const completeInstall = async (input: {
  user: string;
  code: string;
  state: string;
  cookie: string;
}) => {
  const config = oauthConfiguration();
  if (
    !input.code ||
    input.code.length > 16_384 ||
    !/^[A-Za-z0-9_-]{43}$/.test(input.state) ||
    !/^[A-Za-z0-9_-]{43}$/.test(input.cookie) ||
    !timingSafeEqual(Buffer.from(input.state), Buffer.from(input.cookie))
  )
    throw new LoopLifecycleError("invalid_state");
  // One-use state belongs to this authenticated account and exact consent generation.
  const [pending] = await db
    .delete(schema.loopInstallation)
    .where(
      and(
        eq(schema.loopInstallation.id, hash(input.state)),
        eq(schema.loopInstallation.userId, input.user),
        gt(schema.loopInstallation.expiresAt, new Date()),
      ),
    )
    .returning();
  if (!pending) throw new LoopLifecycleError("expired_installation");
  await Model.requireStore({ store: pending.storeId, user: input.user });
  const result = await resultify(async () => {
    const auth = await exchangeOAuthCode(pending.storeId, {
      ...config,
      enabled: true,
      code: input.code,
      verifier: pending.verifier,
      beforeRequest: ({ bucket }) =>
        Model.reserveRequest({
          store: pending.storeId,
          generation: pending.generation,
          bucket,
        }),
    });
    const identity = await validate({
      store: pending.storeId,
      generation: pending.generation,
      auth,
    });
    await Model.activate({
      store: pending.storeId,
      generation: pending.generation,
      auth,
      shopId: identity.shop_id,
      scopes: auth.scopes,
    });
  });
  if (!result.success) {
    await Model.markFailedConnect(
      { store: pending.storeId, generation: pending.generation },
      safeError(result.error),
    );
    throw new LoopLifecycleError(safeError(result.error));
  }
  return { store: pending.storeId };
};
export const refreshConnection = async (
  input: { store: string; generation: number },
  auth: LoopOAuthAuth,
) => {
  const config = oauthConfiguration();
  await Model.requireActive(input);
  const next = await refreshOAuthToken(input.store, {
    ...config,
    enabled: true,
    refreshToken: auth.refreshToken,
    beforeRequest: ({ bucket }) => Model.reserveRequest({ ...input, bucket }),
  });
  await Model.withActive(input, async (transaction) => {
    await transaction
      .update(schema.loopConnection)
      .set({
        accessToken: next.accessToken,
        refreshToken: next.refreshToken,
        accessTokenExpiresAt: new Date(next.expiresAt),
        updatedAt: new Date(),
      })
      .where(eq(schema.loopConnection.storeId, input.store));
  });
  return next;
};
