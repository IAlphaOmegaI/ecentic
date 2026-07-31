// Server-internal plumbing, deliberately NOT "use server" — see the note in
// google-merchant-account.ts.

import { schema } from "../database";
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
} = repository(schema.googleMerchantUcp);

export type Type = Document<typeof schema.googleMerchantUcp>;

/**
 * Insert a product's UCP checkout settings, or refresh them in place — keyed
 * on the (storeId, productId) unique index so re-saving a product's
 * eligibility updates its row instead of failing the constraint.
 */
export const sync = async (
  environment: Environment,
  data: Insertable<typeof schema.googleMerchantUcp>,
  options?: ExecuteOptions,
) =>
  upsert(
    environment,
    { ...data, updatedAt: new Date() },
    {
      target: [
        schema.googleMerchantUcp.storeId,
        schema.googleMerchantUcp.productId,
      ],
      ...options,
    },
  );
