// Deliberately NOT a "use server" module: every export of an action file is a
// publicly invocable endpoint, and this module's rows carry OAuth tokens. It
// is server-internal plumbing — server actions in `integration/` compose it
// behind their own authentication and ownership checks.

import { resultify } from "@zenncore/utils";
import { db, schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import type { Environment } from "../utils/environment";
import { RequestError } from "../utils/error";
import type { Document, ExecuteOptions, Insertable } from "../utils/repository";
import { repository } from "../utils/repository";

export const {
  get,
  paginate,
  create,
  update,
  destroy,
  exists,
  count,
  find,
  upsert,
} = repository(schema.googleMerchantAccount);

export type Type = Document<typeof schema.googleMerchantAccount>;

/**
 * Insert a store's Google Merchant link row, or refresh it in place when the
 * store already has one. Keyed on the 1:1 `storeId` unique index so
 * reconnecting Google updates tokens/state instead of failing the constraint.
 */
export const sync = async (
  environment: Environment,
  data: Insertable<typeof schema.googleMerchantAccount>,
  options?: ExecuteOptions,
) =>
  upsert(
    environment,
    { ...data, updatedAt: new Date() },
    {
      target: [schema.googleMerchantAccount.storeId],
      ...options,
    },
  );

export const getForStore = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    // Ownership gate: a session alone must not read another user's store
    // record — this row carries the Google OAuth grant.
    const store = await resultify(
      async () => await db.query.store.findFirst({ where: { id: storeId } }),
    );
    if (!store.success) return store;
    if (!store.data || store.data.userId !== context.session.user.id)
      return {
        success: false as const,
        error: new RequestError("Store not found"),
      };

    const result = await resultify(
      async () =>
        await db.query.googleMerchantAccount.findFirst({
          where: { storeId },
        }),
    );

    if (!result.success) return result;

    // Tokens never leave the server boundary — callers needing API access go
    // through the integration actions, which resolve tokens internally.
    return {
      success: true as const,
      data: result.data
        ? { ...result.data, accessToken: null, refreshToken: null }
        : undefined,
    };
  },
  "GoogleMerchantAccount.getForStore",
);
