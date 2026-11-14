import { describe, expect, test } from "bun:test";
import { selectUcpGenerationProducts } from "../utils/ucp-product-scope";

const products = [
  { id: "own-a", userId: "merchant", storeId: "a" },
  { id: "own-b", userId: "merchant", storeId: "b" },
  { id: "foreign-a", userId: "other", storeId: "a" },
];
describe("UCP structured-data generation scope", () => {
  test("a store action does not generate for a sibling store or another account", () => {
    expect(
      selectUcpGenerationProducts(products, "merchant", "a").map(
        (product) => product.id,
      ),
    ).toEqual(["own-a"]);
  });
  test("legacy account action retains every owned product", () => {
    expect(
      selectUcpGenerationProducts(products, "merchant").map(
        (product) => product.id,
      ),
    ).toEqual(["own-a", "own-b"]);
  });
  test("an unknown or empty store has no generation candidates", () => {
    expect(
      selectUcpGenerationProducts(products, "merchant", "unknown"),
    ).toEqual([]);
    expect(selectUcpGenerationProducts(products, "merchant", "")).toEqual([]);
  });
});
