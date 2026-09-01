"use server";

import { and, eq } from "drizzle-orm";
import { withAuthentication } from "@/server/utils/authentication";
import { withSubscription } from "@/server/utils/entitlement";
import { isPlanKey } from "@/server/utils/stripe";
import { schema } from "../../database";
import { Environment } from "../../utils/environment";
import { RequestError, ValidationError } from "../../utils/error";
import { repository } from "../../utils/repository";
import * as Store from "../store";
import { billingFor, discoverOffers, resolveOffers } from "./offer-resolve";

const offers = repository(schema.competitorOffer);

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

export type SellerOffer = {
  seller: string;
  sellerDomain: string | null;
  title: string | null;
  price: number | null;
  /** The price observed the time before, when there is one. */
  previousPrice: number | null;
  currency: string | null;
  total: number | null;
  offerUrl: string | null;
  imageUrl: string | null;
  position: number | null;
  measuredAt: Date;
  /** How many times we have observed this seller on this product. */
  observations: number;
};

/**
 * The current shelf for one product: who sells it, at what price, and whether
 * that price moved since we last looked.
 *
 * `competitor_offer` has been written on every resolution and read by nothing —
 * the price series existed with no surface. This is the read side.
 *
 * Grouped in JS rather than SQL. The per-seller latest-plus-previous shape
 * wants a window function, which the query builder expresses badly, and the row
 * count here is small and bounded: one product, a handful of sellers, one row
 * per refresh. A `distinct on` would be tidier at ten times the scale and
 * harder to change at this one.
 */
export const listOffersForProduct = withAuthentication(
  async (
    context,
    { store: storeId, product: productId }: { store: string; product: string },
  ) => {
    const owned = await ownedStore(storeId, context.session.user.id);
    if (!owned.success) return owned;

    const history = await offers.find(Environment.SERVER, {
      where: and(
        eq(schema.competitorOffer.storeId, storeId),
        eq(schema.competitorOffer.productId, productId),
      ),
      orderBy: [
        { column: schema.competitorOffer.measuredAt, direction: "desc" },
      ],
      // Bounded so a long-lived product cannot turn this into a table scan the
      // page waits on. Newest first, so the cap drops the oldest history rather
      // than the current shelf.
      limit: 200,
    });
    if (!history.success) return history;

    const bySeller = new Map<string, typeof history.data>();
    for (const row of history.data) {
      const key = row.sellerDomain ?? row.seller ?? row.id;
      bySeller.set(key, [...(bySeller.get(key) ?? []), row]);
    }

    const amount = (value: string | null) => {
      if (value === null) return null;
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const sellers = [...bySeller.values()]
      .map((rows): SellerOffer | null => {
        // Already sorted newest-first by the query, so [0] is current and the
        // first row after it with a different price is what it moved from.
        const [current] = rows;
        if (!current) return null;

        const price = amount(current.priceAmount);
        const previous =
          rows
            .slice(1)
            .map((row) => amount(row.priceAmount))
            .find((value) => value !== null && value !== price) ?? null;

        return {
          seller: current.seller ?? current.sellerDomain ?? "Unknown seller",
          sellerDomain: current.sellerDomain,
          title: current.title,
          price,
          previousPrice: previous,
          currency: current.currency,
          total: amount(current.total),
          offerUrl: current.offerUrl,
          imageUrl: current.imageUrl,
          position: current.position,
          measuredAt: current.measuredAt,
          observations: rows.length,
        };
      })
      .filter((offer): offer is SellerOffer => offer !== null)
      // Cheapest first: on a shelf, that is the one that beats the merchant.
      .sort(
        (a, b) =>
          (a.price ?? Number.POSITIVE_INFINITY) -
          (b.price ?? Number.POSITIVE_INFINITY),
      );

    return { success: true as const, data: sellers };
  },
  "Offers.listOffersForProduct",
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
