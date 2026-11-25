import { describe, expect, test } from "bun:test";
import {
  assessAnswer,
  combineMetrics,
  computeGaps,
  exchangeSummary,
  feedbackDiff,
  groundedAttributes,
  knownAiReturns,
  measure,
  measurementMappings,
  productFingerprint,
  reasonFingerprint,
  type SignalLine,
  type SignalProduct,
  selectControls,
} from "../app/integration/loop/signals";

const store = "merchant-a";
const now = new Date("2026-11-24T12:00:00Z");
const start = new Date("2026-09-25T12:00:00Z");
const product: SignalProduct = {
  id: "shoes",
  storeId: store,
  title: "Fixture shoe",
  description: "Blue cotton shoe",
  price: "50",
  currency: "USD",
  rawData: JSON.stringify({
    product_type: "Shoes",
    options: [
      { name: "Size", position: 1 },
      { name: "Color", position: 2 },
    ],
    variants: [
      { id: 10, option1: "8", option2: "Blue" },
      { id: 11, option1: "9", option2: "Blue" },
      { id: 12, option1: "10", option2: "Red" },
    ],
  }),
};
const mappings = [
  {
    storeId: store,
    reason: "too small",
    parentReason: "",
    category: "fit",
    dataFixable: true,
  },
  {
    storeId: store,
    reason: "changed mind",
    parentReason: "",
    category: "changed_mind",
    dataFixable: false,
  },
];
const line = (id: number, overrides: Partial<SignalLine> = {}): SignalLine => ({
  storeId: store,
  productId: product.id,
  loopReturnId: `return-${id}`,
  lineItemId: `line-${id}`,
  providerOrderId: `order-${id}`,
  variantId: "10",
  returnReason: "Too small",
  parentReturnReason: null,
  redactedComment: "runs small",
  price: "50",
  refund: "45",
  currency: "USD",
  returnState: "closed",
  createdAt: new Date("2026-11-10T12:00:00Z"),
  returnedAt: null,
  exchangeVariant: "11",
  ...overrides,
});
const five = Array.from({ length: 5 }, (_, index) => line(index));

describe("merchant return signals", () => {
  test("requires five same-gap returned items and a twenty-percent share inside the window", () => {
    expect(
      computeGaps({
        store,
        lines: five.slice(0, 4),
        products: [product],
        mappings,
        now,
      }),
    ).toEqual([]);
    const other = Array.from({ length: 20 }, (_, index) =>
      line(index + 5, { returnReason: "Changed mind" }),
    );
    const [gap] = computeGaps({
      store,
      lines: [...five, ...other],
      products: [product],
      mappings,
      now,
    });
    expect(gap).toMatchObject({
      count: 5,
      share: 0.2,
      refundValue: "225.00",
      currency: "USD",
    });
    expect(
      computeGaps({
        store,
        lines: [...five, ...other, line(30, { returnReason: "Changed mind" })],
        products: [product],
        mappings,
        now,
      }),
    ).toEqual([]);
    expect(
      computeGaps({
        store,
        lines: five.map((entry) => ({
          ...entry,
          createdAt: new Date("2026-08-01"),
        })),
        products: [product],
        mappings,
        now,
      }),
    ).toEqual([]);
  });

  test("excludes cancelled and duplicate line snapshots and respects merchant overrides", () => {
    expect(
      computeGaps({
        store,
        lines: [...five, ...five],
        products: [product],
        mappings,
        now,
      })[0]?.count,
    ).toBe(5);
    expect(
      computeGaps({
        store,
        lines: five.map((entry) => ({ ...entry, returnState: "cancelled" })),
        products: [product],
        mappings,
        now,
      }),
    ).toEqual([]);
    expect(
      computeGaps({
        store,
        lines: five,
        products: [product],
        mappings: [{ ...mappings[0]!, dataFixable: false }],
        now,
      }),
    ).toEqual([]);
  });

  test("uses the same-product variant catalog and rejects exchanges that also change color", () => {
    expect(exchangeSummary(store, product, five)).toEqual({
      up: 5,
      down: 0,
      same: 0,
      oneSizeUp: 5,
      known: 5,
    });
    expect(
      exchangeSummary(store, product, [line(1, { exchangeVariant: "12" })])
        .known,
    ).toBe(0);
  });

  test("never mixes merchant inputs, including an empty/undefined merchant", () => {
    for (const missing of ["", undefined])
      expect(() =>
        computeGaps({
          store: missing as string,
          lines: [],
          products: [],
          mappings: [],
          now,
        }),
      ).toThrow();
    expect(() =>
      computeGaps({
        store,
        lines: [line(1, { storeId: "merchant-b" })],
        products: [product],
        mappings,
        now,
      }),
    ).toThrow("exactly one merchant");
    expect(() =>
      selectControls({
        store,
        product,
        products: [{ ...product, storeId: "merchant-b" }],
      }),
    ).toThrow();
    expect(() =>
      knownAiReturns({
        store,
        lines: [],
        mappings,
        product: product.id,
        attribute: "fit",
        orders: [
          { storeId: "merchant-b", shopifyOrderId: "order-1", orderedAt: now },
        ],
        start,
        end: now,
      }),
    ).toThrow();
  });

  test("selects deterministic similar controls inside this merchant and excludes treated products", () => {
    const candidate = (
      id: string,
      price: string,
      extra: Partial<SignalProduct> = {},
    ): SignalProduct => ({ ...product, id, price, ...extra });
    const products = [
      candidate("b", "49"),
      candidate("a", "51"),
      candidate("treated", "50"),
      candidate("cheap", "5"),
      candidate("foreign-currency", "50", { currency: "EUR" }),
      candidate("other-category", "50", { rawData: '{"product_type":"Hats"}' }),
    ];
    expect(
      selectControls({ store, product, products, excluded: ["treated"] }),
    ).toEqual(["a", "b"]);
    expect(
      selectControls({
        store,
        product,
        products: [...products].reverse(),
        excluded: ["treated"],
      }),
    ).toEqual(["a", "b"]);
  });

  test("does not fabricate ordered-unit rates from returned items", () => {
    expect(
      measure({
        store,
        lines: five,
        mappings,
        products: [product.id],
        attribute: "fit",
        start,
        end: now,
      }),
    ).toMatchObject({
      returns: 5,
      gapReturns: 5,
      gapShare: 1,
      returnedUnits: 5,
      orderedUnits: null,
      returnRate: null,
    });
    expect(
      measure({
        store,
        lines: [],
        mappings,
        products: [product.id],
        attribute: "fit",
        start,
        end: now,
      }).gapShare,
    ).toBeNull();
  });

  test("freezes existing classifications while admitting newly introduced reason pairs", () => {
    const merged = measurementMappings(store, mappings, [
      { ...mappings[0]!, dataFixable: false },
      { ...mappings[0]!, reason: "runs undersized" },
    ]);
    const current = [line(1), line(2, { returnReason: "Runs undersized" })];
    expect(
      measure({
        store,
        lines: current,
        mappings: merged,
        products: [product.id],
        attribute: "fit",
        start,
        end: now,
      }).gapReturns,
    ).toBe(2);
  });

  test("recomputes a control baseline from the remaining matching products without inventing a rate", () => {
    const surviving = measure({
      store,
      lines: five,
      mappings,
      products: [product.id],
      attribute: "fit",
      start,
      end: now,
    });
    expect(combineMetrics(store, [surviving], start, now)).toMatchObject({
      returns: 5,
      gapReturns: 5,
      gapShare: 1,
      returnRate: null,
    });
    expect(combineMetrics(store, [], start, now)).toMatchObject({
      returns: 0,
      gapShare: null,
      returnRate: null,
    });
  });

  test("deduplicates explicit order markers and never infers unmarked AI orders", () => {
    const order = {
      storeId: store,
      shopifyOrderId: "order-1",
      orderedAt: new Date("2026-11-01"),
    };
    const measured = knownAiReturns({
      store,
      lines: five,
      mappings,
      product: product.id,
      attribute: "fit",
      orders: [order, order],
      start,
      end: now,
    });
    expect(measured).toEqual({
      returns: 1,
      gapReturns: 1,
      gapShare: 1,
      returnRate: null,
      knownOrders: 1,
    });
    expect(
      knownAiReturns({
        store,
        lines: five,
        mappings,
        product: product.id,
        attribute: "fit",
        orders: [],
        start,
        end: now,
      }).returns,
    ).toBe(0);
  });

  test("keeps only literal redacted comment attributes and labels proposed claims as feedback", () => {
    expect(
      groundedAttributes(
        store,
        ["runs half a size small"],
        ["runs half a size small", "100% cotton", "runs two sizes large"],
      ),
    ).toEqual(["runs half a size small"]);
    const [diff] = feedbackDiff({
      store,
      product,
      attribute: "fit",
      count: 5,
      comments: ["runs small <script>bad()</script> email me@personal.example"],
    });
    expect(diff?.source).toBe("return_feedback");
    expect(diff?.after).toContain("Return feedback");
    expect(diff?.after).not.toContain("<script>");
    expect(diff?.after).not.toContain("me@personal.example");
    expect(diff?.before).toBe(product.description);
  });

  test("requires source facts and actual answer quotes before declaring a contradiction", () => {
    expect(
      assessAnswer({
        store,
        product,
        answer: "Fixture shoe is red",
        quote: "is red",
        fact: "Blue cotton shoe",
        verdict: "wrong",
      }).status,
    ).toBe("wrong");
    expect(
      assessAnswer({
        store,
        product,
        answer: "Fixture shoe is red",
        quote: "is red",
        fact: "Green wool shoe",
        verdict: "wrong",
      }).status,
    ).toBe("inconclusive");
    expect(
      assessAnswer({
        store,
        product,
        answer: "Fixture shoe is red",
        quote: "is green",
        fact: "Blue cotton shoe",
        verdict: "wrong",
      }).status,
    ).toBe("inconclusive");
    expect(productFingerprint(store, product)).not.toBe(
      productFingerprint(store, { ...product, description: "Changed" }),
    );
    expect(productFingerprint(store, product)).not.toBe(
      productFingerprint(store, { ...product, title: "Changed title" }),
    );
  });

  test("reason revision follows the target product's merchant mappings", () => {
    const initial = reasonFingerprint(store, product.id, [line(1)], mappings);
    expect(
      reasonFingerprint(store, product.id, [line(1)], [...mappings].reverse()),
    ).toBe(initial);
    expect(
      reasonFingerprint(
        store,
        product.id,
        [line(1)],
        mappings.map((mapping) =>
          mapping.reason === "too small"
            ? { ...mapping, dataFixable: false }
            : mapping,
        ),
      ),
    ).not.toBe(initial);
    expect(
      reasonFingerprint(
        store,
        product.id,
        [line(1)],
        [
          ...mappings,
          {
            storeId: store,
            reason: "arrived late",
            parentReason: "",
            category: "shipping",
            dataFixable: false,
          },
        ],
      ),
    ).toBe(initial);
  });
});
