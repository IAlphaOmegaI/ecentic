import { describe, expect, test } from "bun:test";
import {
  discountedPrice,
  normalizeSubscriptionOffers,
  type RechargePlan,
} from "./offers";
import {
  composeSubscriptionOffers,
  formatSubscriptionOffers,
} from "./publication";

const plan: RechargePlan = {
  id: 1,
  type: "subscription",
  external_product_id: { ecommerce: "100" },
  external_plan_id: "500",
  discount_type: "percentage",
  discount_amount: "15",
  subscription_preferences: {
    order_interval_frequency: 1,
    interval_unit: "month",
    charge_interval_frequency: 1,
  },
};
const products = [
  {
    external_product_id: "100",
    variants: [
      { external_variant_id: "101", prices: { unit_price: "20.00" } },
      { external_variant_id: "102", prices: { unit_price: "30.00" } },
    ],
  },
];

describe("subscription offers", () => {
  test.each([
    ["day", 30],
    ["week", 2],
    ["month", 1],
  ] as const)(
    "reads the documented %s interval for delivery and billing",
    (unit, frequency) => {
      const offers = normalizeSubscriptionOffers({
        products,
        plans: [
          {
            ...plan,
            subscription_preferences: {
              interval_unit: unit,
              order_interval_frequency: frequency,
              charge_interval_frequency: frequency,
            },
          },
        ],
        currency: "USD",
      });
      expect(offers).toHaveLength(2);
      expect(offers[0]).toMatchObject({
        price: "17.00",
        orderIntervalUnit: unit,
        orderIntervalFrequency: frequency,
        chargeIntervalFrequency: frequency,
        pricingStatus: "available",
        unavailableReason: null,
      });
    },
  );

  test.each([undefined, null, "", "year"])(
    "keeps a missing or unsupported interval unit unavailable (%s)",
    (unit) => {
      const offers = normalizeSubscriptionOffers({
        products,
        plans: [
          {
            ...plan,
            subscription_preferences: {
              interval_unit: unit,
              order_interval_frequency: 1,
              charge_interval_frequency: 1,
            },
          },
        ],
        currency: "USD",
      });
      expect(offers[0]).toMatchObject({
        price: null,
        orderIntervalUnit: null,
        pricingStatus: "unavailable",
        unavailableReason: "missing-delivery-interval",
      });
    },
  );

  test("keeps distinct plans and variants with exact price, discount and intervals", () => {
    const offers = normalizeSubscriptionOffers({
      products,
      plans: [
        plan,
        {
          ...plan,
          id: 2,
          discount_type: "fixed_amount",
          discount_amount: "3.25",
        },
      ],
      currency: "USD",
    });
    expect(offers).toHaveLength(4);
    expect(offers[0]).toMatchObject({
      externalProductId: "100",
      externalVariantId: "101",
      planId: "1",
      sellingPlanId: "500",
      price: "17.00",
      discountType: "percentage",
      discountAmount: "15",
      orderIntervalUnit: "month",
      orderIntervalFrequency: 1,
      chargeIntervalFrequency: 1,
      pricingStatus: "available",
    });
    expect(offers[2]?.price).toBe("16.75");
  });

  test("respects variant restrictions, deleted plans and one-time offers", () => {
    const offers = normalizeSubscriptionOffers({
      products,
      plans: [
        {
          ...plan,
          has_variant_restrictions: true,
          external_variant_ids: ["102"],
        },
        { ...plan, id: 2, deleted_at: "2026-11-17" },
        { ...plan, id: 3, type: "onetime" },
      ],
      currency: "USD",
    });
    expect(offers).toHaveLength(1);
    expect(offers[0]?.externalVariantId).toBe("102");
  });

  test.each(["api", "checkout_page"] as const)(
    "excludes plans explicitly hidden from %s while retaining visible plans",
    (channel) => {
      const offers = normalizeSubscriptionOffers({
        products,
        plans: [
          {
            ...plan,
            channel_settings: {
              api: { display: true },
              checkout_page: { display: true },
              [channel]: { display: false },
            },
          },
          { ...plan, id: 2 },
        ],
        currency: "USD",
      });
      expect(offers).toHaveLength(2);
      expect(offers.map((offer) => offer.planId)).toEqual(["2", "2"]);
    },
  );

  test.each([
    ["omitted", undefined],
    ["empty", {}],
    ["display omitted", { api: {}, checkout_page: {} }],
    ["visible", { api: { display: true }, checkout_page: { display: true } }],
  ] satisfies [string, RechargePlan["channel_settings"]][])(
    "allows plans with %s channel settings",
    (_label, channels) => {
      const offers = normalizeSubscriptionOffers({
        products,
        plans: [{ ...plan, channel_settings: channels }],
        currency: "USD",
      });
      expect(offers.map((offer) => offer.price)).toEqual(["17.00", "25.50"]);
    },
  );

  test.each(["percentage", "fixed_amount"])(
    "retains %s pricing progressions as unavailable instead of publishing a flat recurring price",
    (discount) => {
      const offers = normalizeSubscriptionOffers({
        products,
        plans: [
          {
            ...plan,
            subscription_preferences: {
              ...plan.subscription_preferences,
              pricing_progression: [
                {
                  recurring_discount_after_cycle: 1,
                  recurring_discount_amount: 5,
                  recurring_discount_type: discount,
                },
              ],
            },
          },
        ],
        currency: "USD",
      });
      expect(offers).toHaveLength(2);
      expect(offers[0]).toMatchObject({
        externalVariantId: "101",
        planId: "1",
        sellingPlanId: "500",
        price: null,
        currency: "USD",
        orderIntervalUnit: "month",
        orderIntervalFrequency: 1,
        chargeIntervalFrequency: 1,
        pricingStatus: "unavailable",
        unavailableReason: "unsupported-pricing-progression",
      });
      const structured = {
        "@type": "Product",
        offers: { "@type": "Offer", price: "20.00", priceCurrency: "USD" },
      };
      expect(
        composeSubscriptionOffers(structured, offers, {
          externalId: "100",
          url: null,
        }),
      ).toEqual(structured);
      expect(formatSubscriptionOffers(offers)).toBe("");
    },
  );

  test.each([[null], [[]]])(
    "keeps ordinary subscription pricing when progression is null or empty (%j)",
    (progression) => {
      const offers = normalizeSubscriptionOffers({
        products,
        plans: [
          {
            ...plan,
            subscription_preferences: {
              ...plan.subscription_preferences,
              pricing_progression: progression,
            },
          },
        ],
        currency: "USD",
      });
      expect(offers.map((offer) => offer.price)).toEqual(["17.00", "25.50"]);
    },
  );

  test("uses matched catalog variant prices and never a product-wide lowest price", () => {
    const offers = normalizeSubscriptionOffers({
      products,
      plans: [plan],
      catalog: [
        {
          externalProductId: "100",
          externalVariantId: "101",
          price: "40.00",
          currency: "EUR",
        },
      ],
    });
    expect(offers[0]?.price).toBe("34.00");
    expect(offers[0]?.currency).toBe("EUR");
    expect(offers[1]?.price).toBeNull();
  });

  test("normalizes Shopify plans entirely from imported catalog variants", () => {
    const offers = normalizeSubscriptionOffers({
      products: [],
      plans: [plan],
      catalog: [
        {
          externalProductId: "100",
          externalVariantId: "101",
          price: "20.00",
          currency: "USD",
        },
        {
          externalProductId: "100",
          externalVariantId: "102",
          price: "30.00",
          currency: "USD",
        },
      ],
    });
    expect(offers).toHaveLength(2);
    expect(offers[0]).toMatchObject({
      externalProductId: "100",
      externalVariantId: "101",
      planId: "1",
      sellingPlanId: "500",
      price: "17.00",
      currency: "USD",
      pricingStatus: "available",
    });
    expect(offers[1]).toMatchObject({
      externalVariantId: "102",
      price: "25.50",
    });
    expect(
      normalizeSubscriptionOffers({ products: [], plans: [plan], catalog: [] }),
    ).toEqual([]);
  });

  test("retains prepaid intervals but does not invent monthly price or billing amount", () => {
    const offers = normalizeSubscriptionOffers({
      products,
      plans: [
        {
          ...plan,
          type: "prepaid",
          subscription_preferences: {
            order_interval_frequency: 1,
            interval_unit: "month",
            charge_interval_frequency: 3,
          },
        },
      ],
      currency: "USD",
    });
    expect(offers[0]).toMatchObject({
      price: null,
      chargeIntervalFrequency: 3,
      orderIntervalFrequency: 1,
      pricingStatus: "unavailable",
      unavailableReason: "unsupported-plan-pricing",
    });
  });

  test("does not publish invalid discounts, missing intervals or unsupported currency data", () => {
    const discounts = normalizeSubscriptionOffers({
      products,
      plans: [{ ...plan, discount_amount: "150" }],
      currency: "USD",
    });
    expect(discounts[0]?.price).toBeNull();
    const missing = normalizeSubscriptionOffers({
      products,
      plans: [{ ...plan, subscription_preferences: null }],
      currency: "USD",
    });
    expect(missing[0]?.price).toBeNull();
  });

  test("deduplicates repeated variant and plan records", () => {
    expect(
      normalizeSubscriptionOffers({
        products: [...products, ...products],
        plans: [plan, plan],
        currency: "USD",
      }),
    ).toHaveLength(2);
  });

  test("never guesses a zero discount when the plan's discount amount is missing", () => {
    const offers = normalizeSubscriptionOffers({
      products,
      plans: [{ ...plan, discount_amount: null }],
      currency: "USD",
    });
    expect(offers[0]?.price).toBeNull();
    expect(offers[0]?.unavailableReason).toBe("missing-discount-amount");
  });

  test("preserves external numeric-string IDs and rejects already imprecise numbers", () => {
    const offers = normalizeSubscriptionOffers({
      products,
      plans: [
        {
          ...plan,
          id: "9007199254740993",
          external_plan_id: "9007199254740995",
        },
        { ...plan, id: Number.MAX_SAFE_INTEGER + 1 },
      ],
      currency: "USD",
    });
    expect(offers).toHaveLength(2);
    expect(offers[0]?.planId).toBe("9007199254740993");
    expect(offers[0]?.sellingPlanId).toBe("9007199254740995");
  });
});

describe("currency-aware decimal math", () => {
  test("rounds once without binary floating-point errors", () => {
    expect(
      discountedPrice({
        price: "19.99",
        currency: "USD",
        discountType: "percentage",
        discountAmount: "15",
      }),
    ).toBe("16.99");
    expect(
      discountedPrice({
        price: "0.30",
        currency: "USD",
        discountType: "fixed_amount",
        discountAmount: "0.20",
      }),
    ).toBe("0.10");
    expect(
      discountedPrice({
        price: "999",
        currency: "JPY",
        discountType: "percentage",
        discountAmount: "10",
      }),
    ).toBe("899");
    expect(
      discountedPrice({
        price: "1.999",
        currency: "KWD",
        discountType: "percentage",
        discountAmount: "10",
      }),
    ).toBe("1.799");
  });

  test("rejects unsupported or negative discounts and clamps valid fixed discounts at zero", () => {
    expect(
      discountedPrice({
        price: "10",
        currency: "USD",
        discountType: "percentage",
        discountAmount: "-5",
      }),
    ).toBeNull();
    expect(
      discountedPrice({
        price: "10",
        currency: "USD",
        discountType: "percentage",
        discountAmount: "101",
      }),
    ).toBeNull();
    expect(
      discountedPrice({
        price: "10",
        currency: "USD",
        discountType: "fixed_amount",
        discountAmount: "20",
      }),
    ).toBe("0.00");
  });
});
