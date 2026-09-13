import type { Offer } from "../../utils/serp";

/**
 * Relevance guard for measured offers — deterministic and free.
 *
 * Google clusters the catalog, so there is no entity-resolution subsystem here
 * — but a free-text search can still resolve to the wrong cluster, and a wrong
 * competitor is worse than none: it is a confident, measured-looking comparison
 * against an unrelated product.
 *
 * Lives beside the budget helpers rather than in `offer-resolve.ts` so specs
 * (and the category fallback) can import it without pulling the streaming /
 * RSC surface that module also hosts.
 */

/**
 * The band `judge.ts` has always asserted to the detection model ("within
 * ±40% of its price") and that nothing could enforce, because until
 * `priceAmount` there was no numeric price on either side to compare.
 */
const PRICE_BAND = 0.4;

/** Low on purpose: this rejects the unrelated, not the imperfectly worded. */
const TOKEN_OVERLAP = 0.25;

export const significantTokens = (value: string) =>
  new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );

const amount = (value: string | null) => {
  if (!value) return null;
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

export type Rejection = "price-band" | "unrelated";

export const assess = (
  offer: Offer,
  product: { title: string; price: string | null },
  /**
   * Token source for relatedness. Same-SKU mode uses the product title;
   * category fallback uses the broadened shopping query so unique names like
   * "Sophia Mija Hat" do not reject every peer that only shares "hat".
   */
  options: { against?: string } = {},
): Rejection | null => {
  const ours = amount(product.price);

  if (ours !== null && ours > 0 && offer.price !== null) {
    const ratio = offer.price / ours;
    if (ratio < 1 - PRICE_BAND || ratio > 1 + PRICE_BAND) return "price-band";
  }

  // An offer with no title cannot be checked for relatedness; the price band is
  // the only guard it gets, which is why it is not rejected outright.
  if (!offer.title) return null;

  const ourTokens = significantTokens(options.against ?? product.title);
  if (ourTokens.size === 0) return null;

  const theirTokens = significantTokens(offer.title);
  const shared = [...ourTokens].filter((token) =>
    theirTokens.has(token),
  ).length;

  return shared / ourTokens.size >= TOKEN_OVERLAP ? null : "unrelated";
};
