import { describe, expect, test } from "bun:test";
import {
  comparisonOrigin,
  duplicateComparisonIndexes,
} from "../../lib/ucp-comparison";

describe("UCP comparison storefront inputs", () => {
  test("normalizes a bare domain before the backend discovers its UCP profile", () => {
    expect(comparisonOrigin("  SHOP.example.com  ")).toBe(
      "https://shop.example.com",
    );
  });

  test("pasted product links resolve to their storefront origin", () => {
    expect(
      comparisonOrigin("https://shop.example.com/products/shirt?q=blue#size"),
    ).toBe("https://shop.example.com");
    expect(comparisonOrigin("http://localhost:8080/catalog")).toBe(
      "http://localhost:8080",
    );
  });

  test("rejects empty, malformed, credential-bearing, and non-HTTP addresses", () => {
    for (const value of [
      "",
      "   ",
      "not a domain",
      "store",
      "ftp://shop.example.com",
      "https://user:secret@shop.example.com",
      "https://shop.example.com:bad",
    ])
      expect(comparisonOrigin(value)).toBeNull();
  });

  test("rejects source duplicates even with case, path, or default port differences", () => {
    expect(
      duplicateComparisonIndexes("shop.example.com", [
        "https://SHOP.example.com:443/products",
        "rival.example.com",
      ]),
    ).toEqual([0]);
  });

  test("marks only later duplicate roster entries and ignores invalid entries", () => {
    expect(
      duplicateComparisonIndexes("shop.example.com", [
        "",
        "rival.example.com",
        "https://rival.example.com/item",
        "other.example.com",
      ]),
    ).toEqual([2]);
    expect(
      duplicateComparisonIndexes("shop.example.com", ["other.example.com"]),
    ).toEqual([]);
  });
});
