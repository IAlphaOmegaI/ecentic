import { composeSubscriptionOffers } from "@ecentic/recharge";
import * as Recharge from "../app/integration/recharge";
import type * as Product from "../app/product";

/** Callers must already have resolved the product for their account or job. */
export const composeForProduct = async (
  product: Product.Type,
  structured: unknown,
) => {
  const offers = await Recharge.listOffersForProducts({
    store: product.storeId,
    products: [product.id],
  });
  return composeSubscriptionOffers(structured, offers, product);
};

export const composeJsonForProduct = async (
  product: Product.Type,
  structured: string,
) =>
  JSON.stringify(
    await composeForProduct(product, JSON.parse(structured)),
    null,
    2,
  );
