"use server";

import { eq } from "drizzle-orm";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { Environment } from "../utils/environment";
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
  async (_, { store: storeId }: { store: string }) => {
    const rows = await find(Environment.SERVER, {
      where: eq(schema.store_account.storeId, storeId),
      limit: 1,
    });
    if (!rows.success) return rows;

    return { success: true as const, data: rows.data[0] };
  },
  "StoreAccount.getForStore",
);
