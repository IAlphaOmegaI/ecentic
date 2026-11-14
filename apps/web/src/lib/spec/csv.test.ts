import { describe, expect, test } from "bun:test";
import { csvPrice, parseCsvProducts } from "../csv";

describe("CSV catalog review and import", () => {
  test("keeps explicit currency and aliases while skipping untitled records", () => {
    const rows = parseCsvProducts(
      "\uFEFFid,name,price,currency,image_link,link\r\n001,Mouse,45,eur,https://images.test/mouse.png,https://shop.test/mouse\r\n002,,18,USD,,\r\n003,Keyboard,100,,,\r\n",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: "001",
      title: "Mouse",
      currency: "eur",
      image: "https://images.test/mouse.png",
      url: "https://shop.test/mouse",
    });
    expect(csvPrice(rows[0]?.price, rows[0]?.currency)).toEqual({
      price: "45",
      currency: "EUR",
    });
    expect(csvPrice(rows[1]?.price, rows[1]?.currency)).toEqual({
      price: "100",
      currency: null,
    });
  });
  test("preserves quoted multiline descriptions and escaped quotes", () => {
    const rows = parseCsvProducts(
      'title,description,price\n"Mouse, quiet","A ""silent"" click\nand a rechargeable battery",45 EUR\nKeyboard,Compact,60',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.title).toBe("Mouse, quiet");
    expect(rows[0]?.description).toBe(
      'A "silent" click\nand a rechargeable battery',
    );
    expect(rows[1]?.title).toBe("Keyboard");
  });
  test("currency column overrides a price code and missing currency stays unspecified", () => {
    expect(csvPrice("GBP 12.50")).toEqual({ price: "12.50", currency: "GBP" });
    expect(csvPrice("12.50 eur")).toEqual({ price: "12.50", currency: "EUR" });
    expect(csvPrice("12.50 USD", " CAD ")).toEqual({
      price: "12.50",
      currency: "CAD",
    });
    expect(csvPrice("$12.50")).toEqual({ price: "12.50", currency: null });
    expect(csvPrice("45", "")).toEqual({ price: "45", currency: null });
    expect(csvPrice(undefined, "JPY")).toEqual({
      price: null,
      currency: "JPY",
    });
  });
  test("empty and header-only files contain no importable rows", () => {
    expect(parseCsvProducts("")).toEqual([]);
    expect(parseCsvProducts("title,price\n")).toEqual([]);
    expect(parseCsvProducts("name,price\n,45")).toEqual([]);
  });
});
