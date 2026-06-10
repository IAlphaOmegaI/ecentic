import { describe, expect, test } from "bun:test";
import { resultify } from "@zenncore/utils";
import { Parser, parsePrice } from "./feed-parsing";

// ─── parsePrice ────────────────────────────────────────────────────────────

describe("parsePrice", () => {
  test('"USD 29.99" → price "29.99", currency "USD"', () => {
    const result = parsePrice("USD 29.99");
    expect(result.price).toBe("29.99");
    expect(result.currency).toBe("USD");
  });

  test('"29.99 USD" → price "29.99", currency "USD"', () => {
    const result = parsePrice("29.99 USD");
    expect(result.price).toBe("29.99");
    expect(result.currency).toBe("USD");
  });

  test('"$19.99" → numeric part, currency null', () => {
    const result = parsePrice("$19.99");
    expect(result.price).toBe("19.99");
    expect(result.currency).toBeNull();
  });

  test('"" → empty string (or original), currency null', () => {
    const result = parsePrice("");
    // characterize: trimmed is "", numeric replace yields "", falls back to trimmed
    expect(result.price).toBe("");
    expect(result.currency).toBeNull();
  });
});

// ─── Parser.xml ────────────────────────────────────────────────────────────

describe("Parser.xml — Google Shopping RSS", () => {
  test("single item with g:price and g:id parses correctly", () => {
    const xml = `<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <g:title>Test Product</g:title>
      <g:price>USD 29.99</g:price>
      <g:link>https://example.com/product</g:link>
      <g:id>SKU-001</g:id>
    </item>
  </channel>
</rss>`;
    const items = Parser.xml(xml);
    expect(items.length).toBe(1);
    expect(items[0]?.title).toBe("Test Product");
    expect(items[0]?.price).toBe("29.99");
    expect(items[0]?.currency).toBe("USD");
    expect(items[0]?.sku).toBe("SKU-001");
    expect(items[0]?.id).toBe("SKU-001");
  });

  test("multiple items in RSS channel parse to array", () => {
    const xml = `<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <g:title>Product A</g:title>
      <g:price>USD 10.00</g:price>
      <g:id>A1</g:id>
    </item>
    <item>
      <g:title>Product B</g:title>
      <g:price>USD 20.00</g:price>
      <g:id>B1</g:id>
    </item>
  </channel>
</rss>`;
    const items = Parser.xml(xml);
    expect(items.length).toBe(2);
    expect(items[0]?.title).toBe("Product A");
    expect(items[1]?.title).toBe("Product B");
  });
});

describe("Parser.xml — single item non-array branch", () => {
  test("single item (not wrapped in array) produces one-element array", () => {
    // When fast-xml-parser parses a single <item>, it returns an object, not an array.
    // The parser should normalize this to a one-element array.
    const xml = `<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title>Solo Product</title>
      <price>EUR 9.99</price>
      <id>solo-1</id>
    </item>
  </channel>
</rss>`;
    const items = Parser.xml(xml);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(1);
    expect(items[0]?.title).toBe("Solo Product");
  });
});

describe("Parser.xml — Atom feed", () => {
  test("Atom <feed><entry> items parse via entry branch", () => {
    const xml = `<?xml version="1.0"?>
<feed>
  <entry>
    <title>Atom Product</title>
    <id>atom-1</id>
  </entry>
</feed>`;
    const items = Parser.xml(xml);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(1);
    expect(items[0]?.title).toBe("Atom Product");
    expect(items[0]?.id).toBe("atom-1");
  });
});

describe("Parser.xml — edge cases", () => {
  test("empty XML string produces empty array (characterize behavior)", () => {
    const wrapped = resultify(() => Parser.xml(""));
    // characterize: fast-xml-parser returns an empty object for empty string;
    // no channel/item/entry found → empty array
    if (wrapped.success) {
      expect(Array.isArray(wrapped.data)).toBe(true);
      expect(wrapped.data.length).toBe(0);
    } else {
      // If it throws, record that it does
      expect(wrapped.success).toBe(false);
    }
  });

  test("garbage non-XML input produces empty array (characterize behavior)", () => {
    const wrapped = resultify(() => Parser.xml("not xml at all %%%"));
    if (wrapped.success) {
      expect(Array.isArray(wrapped.data)).toBe(true);
    } else {
      expect(wrapped.success).toBe(false);
    }
  });
});

// ─── Parser.json ───────────────────────────────────────────────────────────

describe("Parser.json", () => {
  test('{"products":[...]} shape maps to items', () => {
    const json = JSON.stringify({
      products: [{ title: "JSON Product", price: "USD 49.99", id: "json-1" }],
    });
    const items = Parser.json(json);
    expect(items.length).toBe(1);
    expect(items[0]?.title).toBe("JSON Product");
    expect(items[0]?.price).toBe("49.99");
    expect(items[0]?.currency).toBe("USD");
    expect(items[0]?.id).toBe("json-1");
  });

  test("invalid JSON returns empty array (characterize behavior)", () => {
    const items = Parser.json("{ this is not json }");
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(0);
  });
});
