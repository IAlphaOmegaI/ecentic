/** Public product facts only. Never pass Recharge customer or order payloads here. */
export type PublishableSubscriptionOffer = {
  externalProductId: string;
  externalVariantId: string | null;
  planId: string;
  sellingPlanId?: string | null;
  price: string | null;
  currency: string | null;
  orderIntervalUnit: string | null;
  orderIntervalFrequency: number | null;
  chargeIntervalFrequency: number | null;
  pricingStatus?: string;
};

export type PricedSubscriptionOffer = PublishableSubscriptionOffer & {
  externalVariantId: string;
  price: string;
  currency: string;
  orderIntervalUnit: "day" | "week" | "month";
  orderIntervalFrequency: number;
  chargeIntervalFrequency: number;
};

const MARKER = "ecentic:recharge:";
const UNITS = { day: "DAY", week: "WEE", month: "MON" } as const;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const isPricedSubscriptionOffer = (
  offer: PublishableSubscriptionOffer,
): offer is PricedSubscriptionOffer =>
  offer.pricingStatus !== "unavailable" &&
  Boolean(offer.externalVariantId) &&
  typeof offer.price === "string" &&
  /^\d+(?:\.\d+)?$/.test(offer.price) &&
  Number(offer.price) > 0 &&
  typeof offer.currency === "string" &&
  /^[A-Z]{3}$/.test(offer.currency) &&
  (offer.orderIntervalUnit === "day" ||
    offer.orderIntervalUnit === "week" ||
    offer.orderIntervalUnit === "month") &&
  Number.isInteger(offer.orderIntervalFrequency) &&
  Number(offer.orderIntervalFrequency) > 0 &&
  Number.isInteger(offer.chargeIntervalFrequency) &&
  Number(offer.chargeIntervalFrequency) > 0 &&
  // Prepaid allocations need an authoritative price per billing period.
  offer.chargeIntervalFrequency === offer.orderIntervalFrequency;

export const describeSubscriptionOffer = (offer: PricedSubscriptionOffer) =>
  `${offer.currency} ${offer.price} with a subscription; delivery and billing every ${offer.orderIntervalFrequency} ${offer.orderIntervalUnit}${offer.orderIntervalFrequency === 1 ? "" : "s"} (variant ${offer.externalVariantId}, plan ${offer.planId})`;

export const formatSubscriptionOffers = (
  offers: PublishableSubscriptionOffer[],
) =>
  offers
    .filter(isPricedSubscriptionOffer)
    .map((offer) => `Subscription offer: ${describeSubscriptionOffer(offer)}`)
    .join("\n");

/**
 * Add conditional offers without replacing the ordinary purchase price. Rebuild
 * our own entries on every publish so removed plans cannot survive in saved JSON.
 * Schema.org priceType accepts text; referenceQuantity states the billing unit.
 * billingDuration is deliberately absent: Recharge has not given a contract term.
 */
export const composeSubscriptionOffers = (
  structured: unknown,
  offers: PublishableSubscriptionOffer[],
  product: { externalId: string | null; url: string | null },
): unknown => {
  if (!record(structured)) return structured;
  const types = Array.isArray(structured["@type"])
    ? structured["@type"]
    : [structured["@type"]];
  if (!types.includes("Product") && !types.includes("ProductGroup"))
    return structured;

  const current = Array.isArray(structured["offers"])
    ? structured["offers"]
    : structured["offers"]
      ? [structured["offers"]]
      : [];
  const ordinary = current.filter(
    (offer) =>
      !record(offer) ||
      typeof offer["identifier"] !== "string" ||
      !offer["identifier"].startsWith(MARKER),
  );
  const eligible = offers.filter(
    (offer): offer is PricedSubscriptionOffer =>
      offer.externalProductId === product.externalId &&
      isPricedSubscriptionOffer(offer),
  );
  const unique = [
    ...new Map(
      eligible.map((offer) => [
        `${offer.externalVariantId}:${offer.planId}`,
        offer,
      ]),
    ).values(),
  ];
  const subscriptions = unique.map((offer) => ({
    "@type": "Offer",
    identifier: `${MARKER}${offer.externalVariantId}:${offer.planId}`,
    name: "Subscription",
    description: describeSubscriptionOffer(offer),
    price: offer.price,
    priceCurrency: offer.currency,
    ...(product.url ? { url: product.url } : {}),
    itemOffered: {
      "@type": "Product",
      productID: offer.externalVariantId,
      ...(typeof structured["name"] === "string"
        ? { name: structured["name"] }
        : {}),
    },
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: offer.price,
      priceCurrency: offer.currency,
      priceType: "Subscription",
      referenceQuantity: {
        "@type": "QuantitativeValue",
        value: offer.chargeIntervalFrequency,
        unitCode: UNITS[offer.orderIntervalUnit],
      },
    },
  }));
  const combined = [...ordinary, ...subscriptions];
  if (combined.length === 0) {
    const { offers: _offers, ...remaining } = structured;
    return remaining;
  }
  return {
    ...structured,
    offers: combined.length === 1 ? combined[0] : combined,
  };
};
