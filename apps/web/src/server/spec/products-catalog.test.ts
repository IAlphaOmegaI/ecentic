import { describe, expect, test } from "bun:test";
import { parseProductFilters } from "@/lib/filters";
import { normalizeProductSort } from "@/lib/products-catalog";

describe("catalog query input", () => {
  test("missing or invalid sort inputs return the stable most-recent order", () => {
    for (const input of [
      undefined,
      null,
      "title",
      { field: "constructor", direction: "asc" },
      { field: "title; drop table product", direction: "asc" },
    ])
      expect(normalizeProductSort(input)).toEqual({
        field: "updatedAt",
        direction: "desc",
      });
  });

  test("supported fields preserve ascending and descending intent", () => {
    expect(normalizeProductSort({ field: "price", direction: "asc" })).toEqual({
      field: "price",
      direction: "asc",
    });
    expect(
      normalizeProductSort({ field: "winRate", direction: "desc" }),
    ).toEqual({
      field: "winRate",
      direction: "desc",
    });
    expect(
      normalizeProductSort({ field: "quality", direction: "sideways" }),
    ).toEqual({
      field: "quality",
      direction: "desc",
    });
  });

  test("malformed and prototype-named filter fields are ignored", () => {
    expect(parseProductFilters("not json")).toEqual([]);
    expect(
      parseProductFilters(
        JSON.stringify([
          { field: "constructor", operator: "isEmpty" },
          { field: "__proto__", operator: "contains", value: "x" },
          { field: "price", operator: "equals", value: "NaN" },
          { field: "description", operator: "isEmpty", value: "discard" },
        ]),
      ),
    ).toEqual([{ field: "description", operator: "isEmpty" }]);
  });
});
