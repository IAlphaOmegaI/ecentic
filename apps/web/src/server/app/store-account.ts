"use server";

import { resultify } from "@zenncore/utils";
import { db, schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.store_account);

export type Type = Document<typeof schema.store_account>;

export const getByStore = withAuthentication(
  async (_, { store: storeId }: { store: string }) => {
    const result = await resultify(() =>
      db.query.store_account.findFirst({
        where: { storeId },
      }),
    );

    if (!result.success) return result;

    return { success: true as const, data: result.data };
  },
  "StoreAccount.getByStore",
);
