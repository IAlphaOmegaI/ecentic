import { describe, expect, test } from "bun:test";
import {
  composeSubscriptionOffers,
  formatSubscriptionOffers,
  type PublishableSubscriptionOffer,
} from "./publication";

const offer: PublishableSubscriptionOffer = {
  externalProductId: "product-1",
  externalVariantId: "variant-2",
  planId: "plan-3",
  price: "18.00",
  currency: "USD",
  orderIntervalUnit: "month",
  orderIntervalFrequency: 1,
  chargeIntervalFrequency: 1,
};
const product = { externalId: "product-1", url: "https://shop.example/p" };
const original = {
  "@type": "Product",
  name: "Coffee",
  offers: { "@type": "Offer", price: "20.00", priceCurrency: "USD" },
};

describe("subscription publication", () => {
  test("preserves the ordinary offer and exact variant + plan identities", () => {
    const result = composeSubscriptionOffers(original, [offer], product) as {
      offers: Record<string, unknown>[];
    };
    expect(result.offers[0]).toEqual(original.offers);
    expect(result.offers[1]).toMatchObject({
      identifier: "ecentic:recharge:variant-2:plan-3",
      price: "18.00",
      priceCurrency: "USD",
      priceSpecification: {
        referenceQuantity: { value: 1, unitCode: "MON" },
      },
    });
    expect(original.offers.price).toBe("20.00");
  });

  test("replaces old offers, removes deleted plans and deduplicates a replay", () => {
    const first = composeSubscriptionOffers(original, [offer, offer], product);
    expect(composeSubscriptionOffers(first, [offer], product)).toEqual(first);
    expect(composeSubscriptionOffers(first, [], product)).toEqual(original);
  });

  test("does not publish unpriced, prepaid, unknown interval or other products", () => {
    const invalid = [
      { ...offer, price: null },
      { ...offer, currency: null },
      { ...offer, externalProductId: "other" },
      { ...offer, externalVariantId: null },
      { ...offer, orderIntervalUnit: "year" },
      { ...offer, chargeIntervalFrequency: 3 },
      { ...offer, pricingStatus: "unavailable" },
    ];
    expect(composeSubscriptionOffers(original, invalid, product)).toEqual(
      original,
    );
  });

  test("keeps each variant and interval explicit in simulation input", () => {
    expect(formatSubscriptionOffers([offer])).toContain(
      "USD 18.00 with a subscription; delivery and billing every 1 month (variant variant-2, plan plan-3)",
    );
    expect(formatSubscriptionOffers([{ ...offer, price: null }])).toBe("");
  });
});
