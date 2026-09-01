"use server";

import { withAuthentication } from "@/server/utils/authentication";
import { withSubscription } from "@/server/utils/entitlement";
import { isPlanKey } from "@/server/utils/stripe";
import { Environment } from "../../utils/environment";
import { RequestError, ValidationError } from "../../utils/error";
import * as Store from "../store";
import { billingFor, discoverOffers, resolveOffers } from "./offer-resolve";

/**
 * Product-level competitor offers — the interactive entry point.
 *
 * Thin on purpose. The work lives in `offer-resolve.ts`, which is not a
 * `"use server"` module, so the scheduled refresh can reuse it without turning
 * a cron job into a second unauthenticated door onto a paid operation. What
 * this file adds is the session: ownership of the store, and the billing gate.
 */

const ownedStore = async (storeId: string, userId: string) => {
  const store = await Store.get(Environment.SERVER, storeId);
  if (!store.success) return store;
  if (!store.data)
    return {
      success: false as const,
      error: new RequestError("Store not found"),
    };
  if (store.data.userId !== userId)
    return {
      success: false as const,
      error: new RequestError("Not authorized"),
    };

  return { success: true as const, data: store.data };
};

/**
 * Resolves one product's competing offers and writes them to the roster.
 *
 * Behind `withSubscription` because it spends money on the merchant's behalf —
 * the same gate `measureCatalogRank` puts on the Shopify Catalog call.
 */
export const resolveOffersForProduct = withSubscription(
  async (
    context,
    { store: storeId, product: productId }: { store: string; product: string },
  ) => {
    const owned = await ownedStore(storeId, context.session.user.id);
    if (!owned.success) return owned;

    const plan = context.subscription.plan ?? "";

    const resolution = await resolveOffers({
      userId: context.session.user.id,
      storeId,
      productId,
      plan: isPlanKey(plan) ? plan : null,
    });

    if (resolution.success)
      context.span.addBreadcrumb({
        category: "offers.resolve",
        data: {
          product: productId,
          offers: resolution.data.offers,
          rejected: resolution.data.rejected,
          credits: resolution.data.credits,
          cached: resolution.data.cached,
        },
      });

    return resolution;
  },
  "Offers.resolveOffersForProduct",
);

/**
 * Streams measured competitor discovery for a set of products.
 *
 * `withAuthentication`, NOT `withSubscription`, and that is the deliberate part.
 * The competitor step in onboarding runs before any billing row exists, so
 * gating this the way `resolveOffersForProduct` is gated would make measured
 * rivals invisible at exactly the moment the product has to demonstrate it is
 * not guessing. AGENTS.md draws the same line: modules shared with the free
 * onboarding scan stay on `withAuthentication`.
 *
 * The spend gate moves into the body instead. An entitled account draws on its
 * plan's monthly allowance; everyone else draws on a small lifetime one
 * (`TRIAL_LOOKUP_LIMIT`), so a free account can see the feature work without
 * being an open tap.
 */
export const streamOfferDiscovery = withAuthentication(
  async (
    context,
    { store: storeId, products }: { store: string; products: string[] },
  ) => {
    if (products.length === 0)
      return {
        success: false as const,
        error: new ValidationError("No products selected"),
      };

    const owned = await ownedStore(storeId, context.session.user.id);
    if (!owned.success) return owned;

    // The absence of a billing row is a supported state here, not a rejection —
    // see the note on the wrapper above.
    const billing = await billingFor(context.session.user.id);

    return {
      success: true as const,
      data: discoverOffers({
        userId: context.session.user.id,
        storeId,
        productIds: products,
        ...billing,
      }),
    };
  },
  "Offers.streamOfferDiscovery",
);
