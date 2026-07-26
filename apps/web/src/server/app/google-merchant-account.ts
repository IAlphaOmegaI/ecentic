"use server";

import { resultify } from "@zenncore/utils";
import { db, schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import type { Environment } from "../utils/environment";
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
  async (_, { store: storeId }: { store: string }) => {
    const result = await resultify(
      async () =>
        await db.query.googleMerchantAccount.findFirst({
          where: { storeId },
        }),
    );

    if (!result.success) return result;

    return { success: true as const, data: result.data };
  },
  "GoogleMerchantAccount.getForStore",
);
