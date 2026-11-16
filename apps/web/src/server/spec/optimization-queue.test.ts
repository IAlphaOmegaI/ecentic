import { describe, expect, test } from "bun:test";
import {
  listingQueue,
  matchesListing,
} from "../../app/[locale]/(main)/dashboard/[store]/optimize/_components/queue";
import type { DashboardData } from "../app/optimization";

const data = {
  pending: [
    { product: { id: "first" }, winRate: 0, models: [], estimatedLift: 20 },
  ],
  dismissed: [{ productId: "dismissed" }],
  products: {
    first: { id: "first", title: "Zero", sku: "ZERO-1" },
    second: { id: "second", title: "Second", sku: null },
    dismissed: { id: "dismissed", title: "Dismissed", sku: null },
  },
  diagnostics: {
    insights: [
      { productId: "second", winRate: 40, category: "content" },
      { productId: "first", winRate: 0, category: "seo" },
      { productId: "second", winRate: 40, category: "seo" },
      { productId: "dismissed", winRate: 0, category: "seo" },
      { productId: "removed", winRate: 0, category: "seo" },
    ],
  },
} as unknown as DashboardData;

describe("optimization review queue", () => {
  test("deduplicates saved diagnostics, keeps true zero first and omits removed/dismissed products", () => {
    const queue = listingQueue(data);
    expect(queue.map((item) => item.product.id)).toEqual(["first", "second"]);
    expect(queue[0]?.rate).toBe(0);
    expect(queue[0]?.candidate).toBeDefined();
    expect(queue[1]?.candidate).toBeUndefined();
    expect(queue[1]?.insights.length).toBe(2);
  });
  test("search works with missing SKU, opaque ID and whitespace", () => {
    expect(
      matchesListing(
        { id: "opaque-id", title: "Product", sku: null },
        " OPAQUE ",
      ),
    ).toBe(true);
    expect(
      matchesListing({ id: "first", title: "Product", sku: "SKU-8" }, "sku-8"),
    ).toBe(true);
    expect(
      matchesListing({ id: "first", title: "Product", sku: null }, "none"),
    ).toBe(false);
  });
});
