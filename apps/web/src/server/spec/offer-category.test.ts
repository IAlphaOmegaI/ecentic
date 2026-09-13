import { describe, expect, test } from "bun:test";
import { assess } from "../app/intelligence/offer-assess";
import {
  categoryQueryFromCatalog,
  isSpecificProductType,
} from "../app/intelligence/offer-category-query";
import {
  categoryPeerDomain,
  categoryPeerHost,
  type Offer,
} from "../utils/serp";

const offer = (partial: Partial<Offer> & { title: string }): Offer => ({
  seller: partial.seller ?? "Amazon.com",
  sellerDomain: partial.sellerDomain ?? "amazon.com",
  title: partial.title,
  price: partial.price ?? 40,
  currency: partial.currency ?? "USD",
  shipping: partial.shipping ?? null,
  total: partial.total ?? null,
  url: partial.url ?? null,
  image: partial.image ?? null,
  rating: partial.rating ?? null,
  reviews: partial.reviews ?? null,
  position: partial.position ?? 1,
});

describe("isSpecificProductType", () => {
  test("accepts a concrete Shopify product type", () => {
    expect(isSpecificProductType("Hats")).toBe(true);
    expect(isSpecificProductType("Women's Accessories")).toBe(true);
  });

  test("rejects empty and ultra-vague catch-alls", () => {
    expect(isSpecificProductType(null)).toBe(false);
    expect(isSpecificProductType("")).toBe(false);
    expect(isSpecificProductType("Accessories")).toBe(false);
    expect(isSpecificProductType("Other")).toBe(false);
    expect(isSpecificProductType("uncategorized")).toBe(false);
  });
});

describe("categoryQueryFromCatalog", () => {
  test("prefers a specific product_type from rawData", () => {
    const query = categoryQueryFromCatalog(
      JSON.stringify({ product_type: "Hats", vendor: "Sophia" }),
    );
    expect(query).toBe("Hats");
  });

  test("returns null for vague product_type", () => {
    expect(
      categoryQueryFromCatalog(JSON.stringify({ product_type: "Accessories" })),
    ).toBeNull();
  });

  test("returns null when rawData is missing", () => {
    expect(categoryQueryFromCatalog(null)).toBeNull();
  });
});

describe("assess — category mode", () => {
  test("same-SKU mode rejects peers that only share a generic noun with a unique title", () => {
    const rejection = assess(
      offer({ title: "Brixton Cotton Cap", price: 42 }),
      { title: "Sophia Mija Designer Fedora Edition", price: "40" },
    );
    expect(rejection).toBe("unrelated");
  });

  test("category mode accepts peers that overlap the broadened query", () => {
    const rejection = assess(
      offer({ title: "Brixton Wide Brim Hat", price: 42 }),
      { title: "Sophia Mija Hat", price: "40" },
      { against: "women's wide brim hat" },
    );
    expect(rejection).toBeNull();
  });

  test("category mode still enforces the price band", () => {
    const rejection = assess(
      offer({ title: "Brixton Wide Brim Hat", price: 120 }),
      { title: "Sophia Mija Hat", price: "40" },
      { against: "women's wide brim hat" },
    );
    expect(rejection).toBe("price-band");
  });
});

describe("categoryPeerDomain", () => {
  test("keeps distinct Amazon peers under different keys", () => {
    const first = categoryPeerDomain("Amazon.com", "Brixton Hat");
    const second = categoryPeerDomain("Amazon.com", "Lack of Color Hat");
    expect(first).not.toBe(second);
    expect(categoryPeerHost(first)).toBe("amazon.com");
  });

  test("falls back to peer# when source has no host", () => {
    const domain = categoryPeerDomain("Etsy", "Handmade Straw Hat");
    expect(domain.startsWith("peer#")).toBe(true);
  });
});
