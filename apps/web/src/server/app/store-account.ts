// Server-internal only: these repository delegates return decrypted credentials.
// Never export this module as remotely invocable Server Actions.

import { and, eq } from "drizzle-orm";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { Environment } from "../utils/environment";
import { RequestError } from "../utils/error";
import type { Document, ExecuteOptions, Insertable } from "../utils/repository";
import { repository } from "../utils/repository";
import * as Store from "./store";

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
} = repository(schema.store_account);

export type Type = Document<typeof schema.store_account>;

/**
 * Insert a store's credentials, or refresh them in place when the store already
 * has a credential row. Keyed on the 1:1 `storeId` unique index so reconnecting
 * a store updates its tokens/keys instead of failing the unique constraint.
 */
export const sync = async (
  environment: Environment,
  data: Insertable<typeof schema.store_account>,
  options?: ExecuteOptions,
) =>
  upsert(
    environment,
    { ...data, updatedAt: new Date() },
    {
      target: [schema.store_account.storeId],
      ...options,
    },
  );

export const getForStore = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const owned = await Store.find(Environment.SERVER, {
      where: and(
        eq(schema.store.id, storeId),
        eq(schema.store.userId, context.session.user.id),
      ),
      limit: 1,
    });
    if (!owned.success) return owned;
    if (!owned.data[0])
      return {
        success: false as const,
        error: new RequestError("Store not found"),
      };
    const rows = await find(Environment.SERVER, {
      where: eq(schema.store_account.storeId, storeId),
      limit: 1,
    });
    if (!rows.success) return rows;

    return { success: true as const, data: rows.data[0] };
  },
  "StoreAccount.getForStore",
);
