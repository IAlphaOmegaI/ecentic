import { describe, expect, mock, test } from "bun:test";
import {
  advertisedRestRoot,
  decodeEntities,
  isWooCommercePage,
  restUrl,
  toMajor,
} from "../app/integration/woocommerce/http";
import type { Page } from "../utils/http";

// `extractCatalogFacts` is pure, but its module also builds feeds from the
// product and store repositories — whose import graph reaches the AI SDK's
// client bundle, which does not load under the test runner. Stub both.
mock.module("../app/product", () => ({}));
mock.module("../app/store", () => ({}));
const { extractCatalogFacts } = await import("../app/feed-export");

const page = (over: Partial<Page> = {}): Page => ({
  status: 200,
  body: "",
  url: "https://acme.com/",
  headers: new Headers(),
  ...over,
});

describe("advertisedRestRoot", () => {
  test("reads the REST root from the Link header", () => {
    const home = page({
      headers: new Headers({
        link: '<https://acme.com/shop/wp-json/>; rel="https://api.w.org/", <https://acme.com/shop/wp-json/wp/v2/pages/5>; rel="alternate"',
      }),
    });

    expect(advertisedRestRoot(home)).toBe("https://acme.com/shop/wp-json/");
  });

  test("falls back to the <link> tag, in either attribute order", () => {
    expect(
      advertisedRestRoot(
        page({
          body: '<link rel="https://api.w.org/" href="https://acme.com/wp-json/" />',
        }),
      ),
    ).toBe("https://acme.com/wp-json/");

    expect(
      advertisedRestRoot(
        page({
          body: "<link href='https://acme.com/?rest_route=/' rel='https://api.w.org/'>",
        }),
      ),
    ).toBe("https://acme.com/?rest_route=/");
  });

  test("resolves a relative root against the page that answered", () => {
    expect(
      advertisedRestRoot(
        page({
          url: "https://www.acme.com/",
          body: '<link rel="https://api.w.org/" href="/wp-json/">',
        }),
      ),
    ).toBe("https://www.acme.com/wp-json/");
  });

  test("says nothing when the site advertises nothing", () => {
    expect(advertisedRestRoot(page({ body: "<html></html>" }))).toBeNull();
  });
});

describe("restUrl", () => {
  test("appends the route to a path-form root", () => {
    expect(
      restUrl("https://acme.com/shop/wp-json/", "wc/store/v1/products", {
        per_page: "100",
        page: "2",
      }),
    ).toBe(
      "https://acme.com/shop/wp-json/wc/store/v1/products?per_page=100&page=2",
    );
  });

  test("extends rest_route on a site without pretty permalinks", () => {
    const url = new URL(
      restUrl("https://acme.com/?rest_route=/", "wc/store/v1/products", {
        per_page: "1",
      }),
    );

    expect(url.searchParams.get("rest_route")).toBe("/wc/store/v1/products");
    expect(url.searchParams.get("per_page")).toBe("1");
  });
});

describe("toMajor", () => {
  test("converts minor units by string, not through a float", () => {
    expect(toMajor("1999", 2)).toBe("19.99");
    expect(toMajor("5", 2)).toBe("0.05");
    expect(toMajor("0199", 2)).toBe("1.99");
    expect(toMajor("123456789", 3)).toBe("123456.789");
  });

  test("honours a zero-decimal currency", () => {
    expect(toMajor("4500", 0)).toBe("4500");
  });

  test("returns null for anything that is not an amount", () => {
    expect(toMajor("", 2)).toBeNull();
    expect(toMajor(undefined, 2)).toBeNull();
    expect(toMajor("19.99", 2)).toBeNull();
  });
});

describe("decodeEntities", () => {
  test("decodes what the Store API escapes in product names", () => {
    expect(decodeEntities("Tee &#8211; Black &amp; White")).toBe(
      "Tee – Black & White",
    );
    expect(decodeEntities("Kid&#x2019;s &quot;Hero&quot; Cap")).toBe(
      'Kid’s "Hero" Cap',
    );
  });

  test("leaves unknown entities as they were", () => {
    expect(decodeEntities("R&amp;D &unknown;")).toBe("R&D &unknown;");
  });
});

describe("extractCatalogFacts — WooCommerce payloads", () => {
  test("a Store API product states stock, brand and SKU on itself", () => {
    const facts = extractCatalogFacts(
      JSON.stringify({
        id: 7,
        sku: "TEE-BLK",
        is_in_stock: false,
        brands: [{ name: "Acme" }],
        categories: [{ name: "Tees" }],
      }),
    );

    expect(facts.availability).toBe("out_of_stock");
    expect(facts.brand).toBe("Acme");
    expect(facts.mpn).toBe("TEE-BLK");
    expect(facts.productType).toBe("Tees");
  });

  test("a keyed REST product out of stock is no longer reported in stock", () => {
    const facts = extractCatalogFacts(
      JSON.stringify({ id: 7, stock_status: "outofstock" }),
    );

    expect(facts.availability).toBe("out_of_stock");
  });

  test("Shopify variant inventory still decides for Shopify payloads", () => {
    const facts = extractCatalogFacts(
      JSON.stringify({
        vendor: "Acme",
        variants: [
          { sku: "A1", inventory_quantity: 3, inventory_policy: "deny" },
        ],
      }),
    );

    expect(facts.availability).toBe("in_stock");
    expect(facts.brand).toBe("Acme");
    expect(facts.mpn).toBe("A1");
  });
});

describe("decodeEntities — hostile input", () => {
  test("never throws, and leaves undecodable entities as written", () => {
    expect(decodeEntities("A &#x110000; B")).toBe("A &#x110000; B");
    expect(decodeEntities("A &#99999999999; B")).toBe("A &#99999999999; B");
    expect(decodeEntities("A &#0; B")).toBe("A &#0; B");
    expect(decodeEntities("A &#xD800; B")).toBe("A &#xD800; B");
  });
});

describe("isWooCommercePage", () => {
  test("recognises WooCommerce's own footprint", () => {
    expect(
      isWooCommercePage(
        page({
          body: '<link href="/wp-content/plugins/woocommerce/assets/css/woocommerce.css">',
        }),
      ),
    ).toBe(true);
    expect(
      isWooCommercePage(page({ body: '<body class="home woocommerce-js">' })),
    ).toBe(true);
  });

  test("a page that only talks about WooCommerce is not a store", () => {
    expect(
      isWooCommercePage(
        page({ body: "<p>Ten WooCommerce plugins we love this year</p>" }),
      ),
    ).toBe(false);
  });
});
