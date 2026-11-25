import { describe, expect, test } from "bun:test";
import { access, merge, removeUndefinedEntries } from "../src/helpers/object";

describe("access", () => {
  test("reads complete nested paths without changing the source", () => {
    const source = { merchant: { address: { country: "AL" } }, count: 0 };
    expect(access(source, "merchant.address.country")).toBe("AL");
    expect(access(source, "merchant.address")).toEqual({ country: "AL" });
    expect(access(source, "count")).toBe(0);
    expect(source).toEqual({
      merchant: { address: { country: "AL" } },
      count: 0,
    });
  });

  test("preserves numeric and symbol property keys", () => {
    const key = Symbol("merchant");
    expect(access({ [key]: "ecentic", 0: false }, key)).toBe("ecentic");
    expect(access({ 0: false }, 0)).toBe(false);
  });

  test("reads array indices and absent optional parents", () => {
    const source: { merchant?: { name: string }; prices: number[] } = {
      prices: [10, 20],
    };
    expect(access(source, "prices.1")).toBe(20);
    expect(access(source, "merchant.name")).toBeUndefined();
  });
});

describe("removeUndefinedEntries", () => {
  test("keeps false and zero while removing existing empty-value categories", () => {
    const source = {
      enabled: false,
      count: 0,
      title: "Product",
      empty: "" as const,
      missing: undefined,
      absent: null,
      items: [],
      details: {},
    };
    expect(removeUndefinedEntries(source)).toEqual({
      enabled: false,
      count: 0,
      title: "Product",
      items: [],
      details: {},
    });
    expect(Object.keys(source)).toHaveLength(8);
  });
});

describe("merge", () => {
  test("merges nested objects and array entries without mutating the target", () => {
    const source = { details: { stock: 3, active: true }, prices: [10, 20] };
    const merged = merge(source, {
      details: { stock: 0, active: false },
      prices: [5],
    });
    expect(merged).toEqual({
      details: { stock: 0, active: false },
      prices: [5, 20],
    });
    expect(source).toEqual({
      details: { stock: 3, active: true },
      prices: [10, 20],
    });
    expect(merged.details).not.toBe(source.details);
  });

  test("retains a defined target when a source property is undefined", () => {
    expect(
      merge(
        { merchant: { name: "ecentic", active: true } },
        {
          merchant: { name: undefined, active: false },
        },
      ),
    ).toEqual({ merchant: { name: "ecentic", active: false } });
  });
});
