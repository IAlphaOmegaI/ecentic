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
} = repository(schema.googleMerchantOffer);

export type Type = Document<typeof schema.googleMerchantOffer>;

/**
 * Insert an offer's push record, or refresh it in place — keyed on the
 * (storeId, offerKey) unique index (offerKey = the full Google identity
 * `contentLanguage~feedLabel~offerId`) so re-pushing an offer updates its
 * lifecycle row instead of failing the constraint, and multi-market offers
 * sharing an offerId never overwrite each other.
 */
export const sync = async (
  environment: Environment,
  data: Insertable<typeof schema.googleMerchantOffer>,
  options?: ExecuteOptions,
) =>
  upsert(
    environment,
    { ...data, updatedAt: new Date() },
    {
      target: [
        schema.googleMerchantOffer.storeId,
        schema.googleMerchantOffer.offerKey,
      ],
      ...options,
    },
  );
