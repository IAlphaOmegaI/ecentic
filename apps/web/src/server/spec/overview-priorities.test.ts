import { describe, expect, test } from "bun:test";
import { overviewPriorities } from "../../app/[locale]/(main)/dashboard/[store]/(overview)/_components/priorities";
import type * as Optimization from "../app/optimization";
import type * as Product from "../app/product";

const date = new Date("2026-11-13T00:00:00Z");
const product: Product.Type = {
  id: "product-1",
  storeId: "store-1",
  userId: "user-1",
  externalId: "external-1",
  title: "Headphones",
  description: "Wireless headphones",
  price: "49.00",
  compareAtPrice: null,
  currency: "USD",
  images: null,
  url: null,
  sku: "HP-1",
  gtin: null,
  mpn: null,
  status: "active",
  rawData: null,
  structuredData: "{}",
  syncedAt: date,
  createdAt: date,
  updatedAt: date,
};
const emptyQueue: Optimization.DashboardData = {
  pending: [],
  published: [],
  dismissed: [],
  products: { [product.id]: product },
  shopifyStores: [],
  currentStore: { id: "store-1", name: "Store", platform: "csv" },
  diagnostics: {
    lowWinRateCount: 0,
    publishableCount: 0,
    nonPublishableCount: 0,
    insights: [],
  },
  outlook: {
    baselineWinRate: 0,
    averageLift: 0,
    productCount: 0,
    startedAt: null,
  },
};
const insight: Optimization.DashboardData["diagnostics"]["insights"][number] = {
  productId: product.id,
  winRate: 25,
  category: "platform",
  severity: "high",
  message: "Review product details",
  recommendation: "Update the source catalog",
};
const manualQueue: Optimization.DashboardData = {
  ...emptyQueue,
  diagnostics: {
    ...emptyQueue.diagnostics,
    nonPublishableCount: 1,
    insights: [insight, { ...insight, category: "content" }],
  },
};

describe("overview next steps", () => {
  test("a compared product missing an image or structured data is not all clear", () => {
    const result = overviewPriorities(
      [{ quality: 83, simulations: 12 }],
      emptyQueue,
    );
    expect(result.incompleteCount).toBe(1);
    expect(result.untestedCount).toBe(0);
    expect(result.allClear).toBe(false);
  });

  test("manual Optimize work remains actionable without a publishable rewrite", () => {
    const result = overviewPriorities(
      [{ quality: 100, simulations: 12 }],
      manualQueue,
    );
    expect(manualQueue.pending).toHaveLength(0);
    expect(result.opportunityCount).toBe(1);
    expect(result.allClear).toBe(false);
  });

  test("a rewrite and multiple diagnostics count once for the same product", () => {
    const result = overviewPriorities([{ quality: 100, simulations: 12 }], {
      ...manualQueue,
      pending: [{ product, winRate: 25, estimatedLift: 0, models: [] }],
    });
    expect(result.opportunityCount).toBe(1);
  });

  test("dismissed work and diagnostics for removed products do not create a next step", () => {
    const result = overviewPriorities([{ quality: 100, simulations: 12 }], {
      ...manualQueue,
      dismissed: [
        {
          id: "dismissal-1",
          userId: "user-1",
          productId: product.id,
          status: "dismissed",
          proposedTitle: null,
          proposedDescription: null,
          winRateBefore: null,
          estimatedLift: null,
          winRateAfter: null,
          publishedAt: null,
          createdAt: date,
          updatedAt: date,
        },
      ],
      diagnostics: {
        ...manualQueue.diagnostics,
        insights: [insight, { ...insight, productId: "removed" }],
      },
    });
    expect(result.opportunityCount).toBe(0);
    expect(result.allClear).toBe(true);
  });

  test("an untested catalog still needs a comparison", () => {
    const result = overviewPriorities(
      [{ quality: 100, simulations: 0 }],
      emptyQueue,
    );
    expect(result.untestedCount).toBe(1);
    expect(result.allClear).toBe(false);
  });

  test("an unavailable optimization check is not equivalent to an empty queue", () => {
    const result = overviewPriorities(
      [{ quality: 100, simulations: 12 }],
      null,
    );
    expect(result.opportunityCount).toBeNull();
    expect(result.allClear).toBe(false);
  });

  test("an empty catalog is not all clear", () => {
    const result = overviewPriorities([], emptyQueue);
    expect(result.hasProducts).toBe(false);
    expect(result.allClear).toBe(false);
  });

  test("complete, compared products and an empty actionable queue are all clear", () => {
    expect(
      overviewPriorities([{ quality: 100, simulations: 12 }], emptyQueue)
        .allClear,
    ).toBe(true);
  });
});
