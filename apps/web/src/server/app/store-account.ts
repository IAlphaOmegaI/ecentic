"use server";

import { eq } from "drizzle-orm";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { Environment } from "../utils/environment";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.store_account);

export type Type = Document<typeof schema.store_account>;

export const getForStore = withAuthentication(
  async (_, { store: storeId }: { store: string }) => {
    const result = await find(Environment.SERVER, {
      where: eq(schema.store_account.storeId, storeId),
      limit: 1,
    });

    if (!result.success) return result;

    return { success: true as const, data: result.data[0] ?? null };
  },
  "StoreAccount.getForStore",
);

export const getByStoreAccountId = withAuthentication(
  async (_, { storeAccountId }: { storeAccountId: string }) => {
    return find(Environment.SERVER, {
      where: eq(schema.store_account.storeAccountId, storeAccountId),
    });
  },
  "StoreAccount.getByStoreAccountId",
);
