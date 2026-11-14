import { describe, expect, test } from "bun:test";
import { scopeOptimizationProducts } from "../utils/optimization-scope";

const products = [
  { id: "store-a-product", userId: "merchant", storeId: "a" },
  { id: "store-b-product", userId: "merchant", storeId: "b" },
  { id: "foreign-product", userId: "other-merchant", storeId: "a" },
];

describe("bulk optimization scope", () => {
  test("a store-level action never includes the same merchant's other store", () => {
    expect(
      scopeOptimizationProducts(products, "merchant", "a").map(
        (product) => product.id,
      ),
    ).toEqual(["store-a-product"]);
  });
  test("unscoped legacy actions retain only the current merchant's products", () => {
    expect(
      scopeOptimizationProducts(products, "merchant").map(
        (product) => product.id,
      ),
    ).toEqual(["store-a-product", "store-b-product"]);
  });
  test("unknown store and foreign owner leave nothing eligible to publish", () => {
    expect(scopeOptimizationProducts(products, "merchant", "missing")).toEqual(
      [],
    );
    expect(scopeOptimizationProducts(products, "missing", "a")).toEqual([]);
  });
});
