import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { Catalog, Product } from "../app/storefront/catalog";
import { MAX_VARIANTS } from "../app/storefront/catalog";
import { addressOf, parsePage } from "../app/storefront/page";

const ADDRESS = "https://acme.com/products/tee";

const ld = (...values: unknown[]) =>
  values
    .map(
      (value) =>
        `<script type="application/ld+json">${JSON.stringify(value)}</script>`,
    )
    .join("");

const product = (over: Record<string, unknown> = {}) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Tee",
  ...over,
});

const facts = (html: string, url = ADDRESS) => {
  const parsed = parsePage(`<html><head>${html}</head></html>`, url).product;
  if (!parsed) throw new Error("no product parsed");
  return parsed;
};

describe("parsePage: JSON-LD shapes", () => {
  test("Product with a single Offer", () => {
    const parsed = facts(
      ld(
        product({
          description: "Soft cotton &amp; more",
          sku: "TEE-1",
          offers: {
            "@type": "Offer",
            price: "79.99",
            priceCurrency: "usd",
            availability: "https://schema.org/InStock",
          },
        }),
      ),
    );

    expect(parsed.source).toBe("json-ld");
    expect(parsed.title).toBe("Tee");
    expect(parsed.description).toBe("Soft cotton & more");
    expect(parsed.offers).toHaveLength(1);
    expect(parsed.offers[0]).toMatchObject({
      price: "79.99",
      currency: "USD",
      availability: "in_stock",
      // A product's own SKU belongs to its lone offer.
      sku: "TEE-1",
      from: false,
    });
  });

  test("a top-level array, skipping what is not a product", () => {
    const parsed = facts(
      ld([{ "@type": "BreadcrumbList" }, product({ name: "Array Tee" })]),
    );
    expect(parsed.title).toBe("Array Tee");
  });

  test("@graph, following @id references to brand and offers", () => {
    const parsed = facts(
      ld({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Brand", "@id": "#brand", name: "Acme" },
          {
            "@type": "Offer",
            "@id": "#offer",
            price: 12.5,
            priceCurrency: "EUR",
          },
          product({
            name: "Graph Tee",
            brand: { "@id": "#brand" },
            offers: { "@id": "#offer" },
          }),
        ],
      }),
    );

    expect(parsed.brand).toBe("Acme");
    expect(parsed.offers[0]).toMatchObject({ price: "12.5", currency: "EUR" });
  });

  test("ProductGroup with hasVariant keeps each variant's own facts", () => {
    const parsed = facts(
      ld({
        "@type": "ProductGroup",
        name: "Group Tee",
        hasVariant: [
          {
            "@type": "Product",
            sku: "A",
            gtin13: "0012345678905",
            color: "Black",
            size: "M",
            offers: {
              "@type": "Offer",
              url: "/products/tee?variant=111",
              price: "10.00",
              priceCurrency: "USD",
              availability: "https://schema.org/OutOfStock",
            },
          },
          {
            "@type": "Product",
            sku: "B",
            color: "White",
            size: "M",
            offers: {
              "@type": "Offer",
              url: "/products/tee?variant=222",
              price: "11.00",
              priceCurrency: "USD",
              availability: "https://schema.org/PreOrder",
            },
          },
        ],
      }),
    );

    expect(parsed.offers).toHaveLength(2);
    expect(parsed.offers[0]).toMatchObject({
      url: "https://acme.com/products/tee?variant=111",
      sku: "A",
      gtin: "0012345678905",
      options: { Color: "Black", Size: "M" },
      price: "10.00",
      availability: "out_of_stock",
    });
    expect(parsed.offers[1]).toMatchObject({
      sku: "B",
      price: "11.00",
      availability: "pre_order",
    });
  });

  test("a Product with hasVariant reads like a group", () => {
    const parsed = facts(
      ld(
        product({
          hasVariant: [
            {
              "@type": "Product",
              sku: "V1",
              offers: { "@type": "Offer", price: "5", priceCurrency: "USD" },
            },
          ],
        }),
      ),
    );
    expect(parsed.offers[0]).toMatchObject({ sku: "V1", price: "5" });
  });

  test("AggregateOffer's low price is a from-price, with a note", () => {
    const parsed = facts(
      ld(
        product({
          offers: {
            "@type": "AggregateOffer",
            lowPrice: "20.00",
            highPrice: "40.00",
            priceCurrency: "GBP",
            offerCount: 3,
          },
        }),
      ),
    );

    expect(parsed.offers[0]).toMatchObject({
      price: "20.00",
      currency: "GBP",
      from: true,
    });
    expect(parsed.notes[0]).toContain("starting price");
  });

  test("an exact offer beats an AggregateOffer on the same product", () => {
    const parsed = facts(
      ld(
        product({
          offers: [
            {
              "@type": "AggregateOffer",
              lowPrice: "1.00",
              priceCurrency: "USD",
            },
            { "@type": "Offer", price: "79.99", priceCurrency: "USD" },
          ],
        }),
      ),
    );

    expect(parsed.offers).toHaveLength(1);
    expect(parsed.offers[0]).toMatchObject({ price: "79.99", from: false });
    expect(parsed.notes).toEqual([]);
  });

  test("offers nested inside an AggregateOffer are exact", () => {
    const parsed = facts(
      ld(
        product({
          offers: {
            "@type": "AggregateOffer",
            lowPrice: "1.00",
            offers: [
              { "@type": "Offer", price: "2.00", priceCurrency: "USD" },
              { "@type": "Offer", price: "3.00", priceCurrency: "USD" },
            ],
          },
        }),
      ),
    );

    expect(parsed.offers.map((offer) => offer.price)).toEqual(["2.00", "3.00"]);
  });

  test("priceSpecification carries the price and the list price", () => {
    const parsed = facts(
      ld(
        product({
          offers: {
            "@type": "Offer",
            priceSpecification: [
              { price: "9.00", priceCurrency: "USD" },
              {
                price: "12.00",
                priceCurrency: "USD",
                priceType: "https://schema.org/ListPrice",
              },
            ],
          },
        }),
      ),
    );

    expect(parsed.offers[0]).toMatchObject({
      price: "9.00",
      compareAtPrice: "12.00",
      currency: "USD",
    });
  });

  test("availability URLs map to the union; anything else is unknown", () => {
    const of = (availability: unknown) =>
      facts(ld(product({ offers: { "@type": "Offer", availability } })))
        .offers[0]?.availability;

    expect(of("https://schema.org/InStock")).toBe("in_stock");
    expect(of("http://schema.org/InStock")).toBe("in_stock");
    expect(of("schema:InStock")).toBe("in_stock");
    expect(of("InStock")).toBe("in_stock");
    expect(of("https://schema.org/LimitedAvailability")).toBe("in_stock");
    expect(of("https://schema.org/OutOfStock")).toBe("out_of_stock");
    expect(of("https://schema.org/SoldOut")).toBe("out_of_stock");
    expect(of("https://schema.org/PreOrder")).toBe("pre_order");
    expect(of("https://schema.org/BackOrder")).toBe("backorder");
    expect(of("https://schema.org/InStoreOnly")).toBe("unknown");
    expect(of(undefined)).toBe("unknown");
  });

  test("nothing is defaulted: no currency or availability stated, none read", () => {
    const parsed = facts(
      ld(product({ offers: { "@type": "Offer", price: "5.00" } })),
    );
    expect(parsed.offers[0]).toMatchObject({
      price: "5.00",
      currency: null,
      availability: "unknown",
    });

    expect(
      facts(ld(product({ offers: { price: "5", priceCurrency: "$" } })))
        .offers[0]?.currency,
    ).toBeNull();
  });

  test("every GTIN spelling, read raw", () => {
    const gtin = (over: Record<string, unknown>) =>
      facts(ld(product(over))).gtin;

    expect(gtin({ gtin: "12345" })).toBe("12345");
    expect(gtin({ gtin8: "12345678" })).toBe("12345678");
    expect(gtin({ gtin12: "012345678905" })).toBe("012345678905");
    expect(gtin({ gtin13: 4006381333931 })).toBe("4006381333931");
    expect(gtin({ gtin14: "10012345678902" })).toBe("10012345678902");
  });

  test("brand as a string or an object", () => {
    expect(facts(ld(product({ brand: "Plain" }))).brand).toBe("Plain");
    expect(
      facts(ld(product({ brand: { "@type": "Brand", name: "Named" } }))).brand,
    ).toBe("Named");
    expect(facts(ld(product())).brand).toBeNull();
  });

  test("images as a string, object or array, relative URLs absolutised", () => {
    const images = (image: unknown) => facts(ld(product({ image }))).images;

    expect(images("/a.jpg")).toEqual(["https://acme.com/a.jpg"]);
    expect(images("//cdn.acme.com/a.jpg")).toEqual([
      "https://cdn.acme.com/a.jpg",
    ]);
    expect(images({ "@type": "ImageObject", url: "b.jpg" })).toEqual([
      "https://acme.com/products/b.jpg",
    ]);
    expect(
      images(["https://x.com/c.jpg", { contentUrl: "/d.jpg" }, "/d.jpg"]),
    ).toEqual(["https://x.com/c.jpg", "https://acme.com/d.jpg"]);
  });

  test("prices in the formats stores really write", () => {
    const price = (value: unknown) =>
      facts(ld(product({ offers: { "@type": "Offer", price: value } })))
        .offers[0]?.price;

    expect(price(80)).toBe("80");
    expect(price("79.99")).toBe("79.99");
    expect(price("$1,299.00")).toBe("1299.00");
    expect(price("1.299,00 €")).toBe("1299.00");
    expect(price("12,50")).toBe("12.50");
    expect(price("-5.00")).toBeNull();
    expect(price("Free")).toBeNull();
    expect(price("10.00 - 20.00")).toBeNull();
  });

  test("tolerates comments, CDATA, raw newlines and trailing commas", () => {
    const parsed = facts(
      `<script type="application/ld+json">
      //<![CDATA[
      {"@type":"Product","name":"Odd
      Tee","offers":{"price":"1.00",},}
      //]]>
      </script>`,
    );
    expect(parsed.title).toContain("Odd");
    expect(parsed.offers[0]?.price).toBe("1.00");
  });

  test("a broken block does not stop the good one beside it", () => {
    const parsed = facts(
      `<script type="application/ld+json">{ nope</script>${ld(product())}`,
    );
    expect(parsed.title).toBe("Tee");
  });
});

describe("parsePage: which product", () => {
  test("a listing is not a product page", () => {
    const html = ld(
      product({ name: "One" }),
      product({ name: "Two" }),
      product({ name: "Three" }),
    );
    expect(parsePage(html, ADDRESS).product).toBeNull();
  });

  test("an ItemList of products is not a product page", () => {
    const html = ld({
      "@type": "ItemList",
      itemListElement: [{ "@type": "ListItem", item: product() }],
    });
    expect(parsePage(html, ADDRESS).product).toBeNull();
  });

  test("the product whose URL is this page wins over related ones", () => {
    const parsed = facts(
      ld(
        product({ name: "Related", url: "https://acme.com/products/other" }),
        product({ name: "Mine", url: "https://www.acme.com/products/tee/" }),
      ),
    );
    expect(parsed.title).toBe("Mine");
  });

  test("a theme writing one Product per variant merges into one", () => {
    const parsed = facts(
      ld(
        product({ sku: "A", offers: { price: "1", priceCurrency: "USD" } }),
        product({ sku: "B", offers: { price: "2", priceCurrency: "USD" } }),
      ),
    );
    expect(parsed.offers.map((offer) => offer.sku)).toEqual(["A", "B"]);
  });

  test("a page with no product data parses to nothing", () => {
    expect(
      parsePage("<html><body>Hi</body></html>", ADDRESS).product,
    ).toBeNull();
    expect(parsePage("", ADDRESS).product).toBeNull();
    expect(
      parsePage('<meta property="og:title" content="Blog post">', ADDRESS)
        .product,
    ).toBeNull();
  });
});

describe("parsePage: fallbacks", () => {
  test("microdata reads like JSON-LD", () => {
    const parsed = facts(`
      <div itemscope itemtype="https://schema.org/Product">
        <h1 itemprop="name">  Micro Tee </h1>
        <img itemprop="image" src="/m.jpg">
        <meta itemprop="sku" content="M-1">
        <meta itemprop="gtin13" content="4006381333931">
        <div itemprop="brand" itemscope itemtype="https://schema.org/Brand">
          <meta itemprop="name" content="Acme">
        </div>
        <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
          <span itemprop="price" content="19.00">$19</span>
          <meta itemprop="priceCurrency" content="CAD">
          <link itemprop="availability" href="https://schema.org/BackOrder">
        </div>
      </div>`);

    expect(parsed.source).toBe("microdata");
    expect(parsed.title).toBe("Micro Tee");
    expect(parsed.brand).toBe("Acme");
    expect(parsed.images).toEqual(["https://acme.com/m.jpg"]);
    expect(parsed.offers[0]).toMatchObject({
      price: "19.00",
      currency: "CAD",
      availability: "backorder",
      sku: "M-1",
      gtin: "4006381333931",
    });
  });

  test("og meta when there is no structured data", () => {
    const parsed = facts(`
      <meta property="og:type" content="product">
      <meta property="og:title" content="Meta Tee">
      <meta property="og:description" content="From meta">
      <meta property="og:image" content="/og.jpg">
      <meta property="product:price:amount" content="1,250.00">
      <meta property="product:price:currency" content="usd">`);

    expect(parsed.source).toBe("meta");
    expect(parsed.title).toBe("Meta Tee");
    expect(parsed.images).toEqual(["https://acme.com/og.jpg"]);
    expect(parsed.offers[0]).toMatchObject({
      price: "1250.00",
      currency: "USD",
      availability: "unknown",
    });
  });

  test("og:price:amount also counts, and an og price needs no og:type", () => {
    const parsed = facts(`
      <meta property="og:title" content="Priced">
      <meta property="og:price:amount" content="9.50">`);

    expect(parsed.offers[0]).toMatchObject({ price: "9.50", currency: null });
  });

  test("JSON-LD with no price takes the price from meta, not a default", () => {
    const parsed = facts(`
      ${ld(product({ sku: "S" }))}
      <meta property="og:type" content="product">
      <meta property="og:title" content="Tee">
      <meta property="product:price:amount" content="4.00">
      <meta property="product:price:currency" content="USD">`);

    expect(parsed.source).toBe("json-ld");
    expect(parsed.sku).toBe("S");
    expect(parsed.offers[0]).toMatchObject({ price: "4.00", currency: "USD" });
  });
});

describe("parsePage: store facts", () => {
  test("name: og:site_name, then WebSite, then Organization", () => {
    expect(
      parsePage(
        `<meta property="og:site_name" content="Og Name">${ld({ "@type": "WebSite", name: "Web" })}`,
        ADDRESS,
      ).name,
    ).toBe("Og Name");
    expect(
      parsePage(
        ld(
          { "@type": "Organization", name: "Org" },
          { "@type": "WebSite", name: "Web" },
        ),
        ADDRESS,
      ).name,
    ).toBe("Web");
    expect(
      parsePage(ld({ "@type": "Organization", name: "Org" }), ADDRESS).name,
    ).toBe("Org");
    expect(parsePage("<title>Not a name</title>", ADDRESS).name).toBeNull();
  });

  test("return policy links: by href or text, policies first, never guessed", () => {
    const html = `
      <a href="/pages/shipping-and-returns">Help</a>
      <a href="/policies/refund-policy?utm_source=x">Refunds</a>
      <a href="/pages/x">Returns</a>
      <a href="/shop">Return to shop</a>
      <a href="/account/returns">My returns</a>
      <a href="https://other.com/returns">Returns elsewhere</a>
      <a href="/pages/about">About</a>`;
    const { returnPolicies } = parsePage(html, "https://acme.com/");

    expect(returnPolicies[0]).toBe("https://acme.com/policies/refund-policy");
    expect(returnPolicies).toContain(
      "https://acme.com/pages/shipping-and-returns",
    );
    expect(returnPolicies).toContain("https://acme.com/pages/x");
    expect(returnPolicies).not.toContain("https://acme.com/shop");
    expect(returnPolicies).not.toContain("https://acme.com/account/returns");
    expect(returnPolicies).not.toContain("https://other.com/returns");

    expect(
      parsePage("<a href='/about'>About</a>", ADDRESS).returnPolicies,
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// `read`, end to end over a stubbed network. The integration index modules and
// the row repositories pull the AI SDK's client bundle, which does not load
// under the test runner, so they are stubbed; everything else is the real code,
// including `HTTP.page`.
// ---------------------------------------------------------------------------

const state = {
  shopify: null as unknown,
  woo: null as unknown,
  probesThrow: false,
  stores: [] as unknown[],
  rows: [] as unknown[],
};

const probe = (key: "shopify" | "woo") => async () => {
  if (state.probesThrow) throw new Error("called outside a request scope");
  return { success: true, data: state[key] };
};

mock.module("../app/integration/shopify", () => ({ probe: probe("shopify") }));
mock.module("../app/integration/woocommerce", () => ({ probe: probe("woo") }));
mock.module("../app/store", () => ({
  find: async () => ({ success: true, data: state.stores }),
}));
mock.module("../app/product", () => ({
  find: async () => ({ success: true, data: state.rows }),
}));

const { read } = await import("../app/storefront/read");

type Reply = { status?: number; body?: unknown; headers?: HeadersInit };

const realFetch = globalThis.fetch;
const { AGENTS_DEMO_DOMAIN: realDemo, FIRECRAWL_API_KEY: realKey } =
  process.env;

const serve = (routes: Record<string, Reply>) => {
  const seen: string[] = [];

  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    seen.push(url);

    const reply = routes[url];
    if (!reply) return new Response("not found", { status: 404 });

    const response = new Response(
      typeof reply.body === "string"
        ? reply.body
        : JSON.stringify(reply.body ?? null),
      { status: reply.status ?? 200, headers: reply.headers },
    );
    // A real fetch fills this in, and `HTTP.page` reports it as the last hop.
    Object.defineProperty(response, "url", { value: url });
    return response;
  }) as typeof fetch;

  return seen;
};

const target = { origin: "https://acme.com", host: "acme.com" };

const success = (outcome: Awaited<ReturnType<typeof read>>): Catalog => {
  if (!outcome.success) throw outcome.error;
  return outcome.data;
};

const first = (catalog: Catalog): Product => {
  const [head] = catalog.products;
  if (!head) throw new Error("no products");
  return head;
};

const META = {
  id: 1,
  name: "Acme",
  currency: "USD",
  myshopify_domain: "acme.myshopify.com",
  published_products_count: 2,
};

const shopifyItem = (over: Record<string, unknown> = {}) => ({
  id: 10,
  title: "Tee",
  handle: "tee",
  body_html: "<p>Soft</p>",
  vendor: "Acme",
  product_type: "Shirts",
  images: [{ id: 5, src: "https://cdn.acme.com/tee.jpg" }],
  options: [{ name: "Size" }],
  variants: [
    {
      id: 101,
      option1: "M",
      sku: "T-M",
      price: "20.00",
      compare_at_price: "25.00",
      available: true,
    },
    {
      id: 102,
      option1: "L",
      sku: "T-L",
      price: "20.00",
      compare_at_price: null,
      available: false,
    },
  ],
  ...over,
});

beforeEach(() => {
  state.shopify = null;
  state.woo = null;
  state.probesThrow = false;
  state.stores = [];
  state.rows = [];
  Reflect.deleteProperty(process.env, "AGENTS_DEMO_DOMAIN");
  Reflect.deleteProperty(process.env, "FIRECRAWL_API_KEY");
});

afterEach(() => {
  globalThis.fetch = realFetch;
  if (realDemo) Reflect.set(process.env, "AGENTS_DEMO_DOMAIN", realDemo);
  if (realKey) Reflect.set(process.env, "FIRECRAWL_API_KEY", realKey);
});

describe("read: Shopify", () => {
  beforeEach(() => {
    state.shopify = { importable: true, name: "Acme", products: 2 };
  });

  const catalog = (over: Record<string, unknown> = {}) => ({
    "https://acme.com/products.json?limit=250&page=1": {
      body: { products: [shopifyItem(over)] },
    },
    "https://acme.com/products.json?limit=250&page=2": {
      body: { products: [] },
    },
  });

  test("maps stock, options and identity from the public catalog", async () => {
    serve({
      ...catalog(),
      "https://acme.com/meta.json": { body: META },
    });

    const result = success(await read(target));
    const head = first(result);

    expect(result.store).toMatchObject({ name: "Acme", platform: "shopify" });
    expect(head).toMatchObject({
      id: "10",
      origin: "shopify",
      url: "https://acme.com/products/tee",
      currency: "USD",
      brand: "Acme",
      productType: "Shirts",
    });
    expect(head.variants[0]).toMatchObject({
      id: "101",
      options: { Size: "M" },
      price: "20.00",
      compareAtPrice: "25.00",
      availability: "in_stock",
    });
    expect(head.variants[1]?.availability).toBe("out_of_stock");
  });

  test("no `available` key means unknown, never in stock", async () => {
    serve({
      ...catalog({ variants: [{ id: 101, price: "20.00", option1: "M" }] }),
      "https://acme.com/meta.json": { body: META },
    });

    expect(first(success(await read(target))).variants[0]?.availability).toBe(
      "unknown",
    );
  });

  test("no readable currency stays null, never USD", async () => {
    serve(catalog());

    expect(first(success(await read(target))).currency).toBeNull();
  });

  test("Shopify's Default Title is not an option", async () => {
    serve({
      ...catalog({
        options: [{ name: "Title" }],
        variants: [{ id: 101, option1: "Default Title", price: "1.00" }],
      }),
    });

    expect(first(success(await read(target))).variants[0]?.options).toEqual({});
  });

  test("variants are capped and the drop is reported", async () => {
    serve(
      catalog({
        variants: Array.from({ length: MAX_VARIANTS + 3 }, (_, index) => ({
          id: index + 1,
          price: "1.00",
        })),
      }),
    );

    const result = success(await read(target));
    expect(first(result).variants).toHaveLength(MAX_VARIANTS);
    expect(result.notes.join()).toContain(`first ${MAX_VARIANTS}`);
  });

  test("the product page adds identifiers per exact variant", async () => {
    serve({
      ...catalog(),
      "https://acme.com/meta.json": { body: META },
      "https://acme.com/products/tee": {
        body: `<html>${ld(
          product({
            mpn: "MPN-9",
            brand: "Acme Goods",
            offers: [
              {
                "@type": "Offer",
                url: "https://acme.com/products/tee?variant=101",
                gtin13: "4006381333931",
                price: "20.00",
                priceCurrency: "USD",
              },
              {
                "@type": "Offer",
                sku: "T-L",
                gtin13: "0012345678905",
                price: "20.00",
                priceCurrency: "USD",
              },
            ],
          }),
        )}</html>`,
      },
    });

    const head = first(success(await read(target)));

    expect(head.mpn).toBe("MPN-9");
    expect(head.brand).toBe("Acme Goods");
    expect(head.variants[0]?.barcode).toBe("4006381333931");
    expect(head.variants[1]?.barcode).toBe("0012345678905");
    // `20.00` on both sides: the string stays as the API stated it.
    expect(head.variants[0]?.price).toBe("20.00");
  });

  test("a page price for the exact variant beats the API, with a note", async () => {
    serve({
      ...catalog(),
      "https://acme.com/meta.json": { body: META },
      "https://acme.com/products/tee": {
        body: `<html>${ld(
          product({
            offers: {
              "@type": "Offer",
              url: "https://acme.com/products/tee?variant=101",
              price: "18.00",
              priceCurrency: "USD",
            },
          }),
        )}</html>`,
      },
    });

    const result = success(await read(target));
    const head = first(result);

    expect(head.variants[0]?.price).toBe("18.00");
    expect(head.variants[1]?.price).toBe("20.00");
    expect(result.notes.join()).toContain("We used the page");
    expect(result.notes.join()).toContain("18.00 USD on the page");
  });

  test("offers are never matched by position", async () => {
    serve({
      ...catalog(),
      "https://acme.com/meta.json": { body: META },
      "https://acme.com/products/tee": {
        body: `<html>${ld(
          product({
            offers: { "@type": "Offer", price: "99.00", priceCurrency: "USD" },
          }),
        )}</html>`,
      },
    });

    const head = first(success(await read(target)));
    expect(head.variants.map((variant) => variant.price)).toEqual([
      "20.00",
      "20.00",
    ]);
  });

  test("a price in minor units in the markup never overrides the API", async () => {
    serve({
      ...catalog({ variants: [{ id: 101, price: "20.00", option1: "M" }] }),
      "https://acme.com/meta.json": { body: META },
      "https://acme.com/products/tee": {
        body: `<html>${ld(
          product({
            offers: { "@type": "Offer", price: 2000, priceCurrency: "USD" },
          }),
        )}</html>`,
      },
    });

    expect(first(success(await read(target))).variants[0]?.price).toBe("20.00");
  });

  test("a page in another currency replaces the API only when complete", async () => {
    const page = (offers: unknown[]) => ({
      body: `<html>${ld(product({ offers }))}</html>`,
    });
    const euro = (id: number) => ({
      "@type": "Offer",
      url: `https://acme.com/products/tee?variant=${id}`,
      price: "17.00",
      priceCurrency: "EUR",
    });

    serve({
      ...catalog(),
      "https://acme.com/meta.json": { body: META },
      "https://acme.com/products/tee": page([euro(101)]),
    });
    const partial = success(await read(target));
    expect(first(partial).currency).toBe("USD");
    expect(first(partial).variants[0]?.price).toBe("20.00");
    expect(partial.notes.join()).toContain("rather than mix currencies");

    serve({
      ...catalog(),
      "https://acme.com/meta.json": { body: META },
      "https://acme.com/products/tee": page([euro(101), euro(102)]),
    });
    const whole = first(success(await read(target)));
    expect(whole.currency).toBe("EUR");
    expect(whole.variants.map((variant) => variant.price)).toEqual([
      "17.00",
      "17.00",
    ]);
  });

  test("ids are stable across runs", async () => {
    const routes = {
      ...catalog(),
      "https://acme.com/meta.json": { body: META },
    };

    serve(routes);
    const before = first(success(await read(target)));
    serve(routes);
    const after = first(success(await read(target)));

    expect(after.id).toBe(before.id);
    expect(after.variants.map(({ id }) => id)).toEqual(
      before.variants.map(({ id }) => id),
    );
  });

  test("a return policy link counts only when it answers 200", async () => {
    const home = `<html>
      <a href="/pages/returns">Returns</a>
      <a href="/policies/refund-policy">Refunds</a>
    </html>`;

    serve({
      ...catalog(),
      "https://acme.com": { body: home },
      "https://acme.com/policies/refund-policy": { status: 404 },
      "https://acme.com/pages/returns": { body: "<html>Returns</html>" },
    });
    expect(success(await read(target)).store.returnPolicy).toBe(
      "https://acme.com/pages/returns",
    );

    serve({
      ...catalog(),
      "https://acme.com": { body: home },
    });
    expect(success(await read(target)).store.returnPolicy).toBeNull();
  });
});

describe("read: WooCommerce", () => {
  beforeEach(() => {
    state.woo = { importable: true, name: null, products: 2 };
  });

  const listing = "https://acme.com/wp-json/wc/store/v1/products";

  const price = (price: string, regular: string, digits = 2) => ({
    price,
    regular_price: regular,
    sale_price: price,
    currency_code: "EUR",
    currency_minor_unit: digits,
  });

  test("converts minor units by string, for the store's own unit", async () => {
    serve({
      [`${listing}?per_page=100&page=1`]: {
        headers: { "x-wp-total": "7" },
        body: [
          {
            id: 1,
            name: "Tee &amp; Co",
            type: "simple",
            permalink: "https://acme.com/product/tee/",
            sku: "W1",
            description: "<p>Long</p>",
            short_description: "",
            is_in_stock: true,
            is_on_backorder: false,
            prices: price("1999", "2599"),
            images: [{ src: "https://acme.com/tee.jpg" }],
            categories: [{ name: "Shirts" }],
            brands: [{ name: "Acme" }],
          },
          {
            id: 2,
            name: "Yen",
            type: "simple",
            permalink: "https://acme.com/product/yen/",
            sku: "",
            description: "",
            short_description: "Short",
            is_in_stock: false,
            prices: price("1500", "1500", 0),
            images: [],
          },
          {
            id: 3,
            name: "Bare",
            type: "simple",
            permalink: "https://acme.com/product/bare/",
            sku: "",
            description: "",
            short_description: "",
            images: [],
          },
          {
            id: 4,
            name: "Later",
            type: "simple",
            permalink: "https://acme.com/product/later/",
            sku: "",
            description: "",
            short_description: "",
            is_in_stock: true,
            is_on_backorder: true,
            prices: price("100", "100"),
            images: [],
          },
        ],
      },
    });

    const result = success(await read(target));
    const [tee, yen, bare, later] = result.products;

    expect(result.store.platform).toBe("woocommerce");
    expect(result.discovered).toBe(7);
    expect(tee).toMatchObject({
      id: "1",
      origin: "woocommerce",
      title: "Tee & Co",
      currency: "EUR",
      brand: "Acme",
      productType: "Shirts",
    });
    expect(tee?.variants[0]).toMatchObject({
      price: "19.99",
      compareAtPrice: "25.99",
      availability: "in_stock",
      sku: "W1",
    });
    expect(yen?.variants[0]).toMatchObject({
      price: "1500",
      compareAtPrice: null,
      availability: "out_of_stock",
    });
    expect(later?.variants[0]).toMatchObject({
      price: "1.00",
      availability: "backorder",
    });
    // Nothing stated, nothing invented.
    expect(bare?.currency).toBeNull();
    expect(bare?.variants[0]).toMatchObject({
      price: null,
      availability: "unknown",
    });
  });

  test("variable products get each variation's real price and stock", async () => {
    const parent = {
      id: 9,
      name: "Hoodie",
      type: "variable",
      permalink: "https://acme.com/product/hoodie/",
      sku: "H",
      description: "",
      short_description: "",
      is_in_stock: true,
      prices: price("3000", "3000"),
      images: [],
      attributes: [
        { name: "Size", terms: [{ name: "Medium", slug: "medium" }] },
      ],
      variations: [
        { id: 91, attributes: [{ name: "Size", value: "medium" }] },
        { id: 92, attributes: [{ name: "Size", value: null }] },
      ],
    };
    const variation = (id: number, minor: string, stocked: boolean) => ({
      id,
      name: "Hoodie",
      type: "variation",
      sku: `H-${id}`,
      permalink: "https://acme.com/product/hoodie/",
      description: "",
      short_description: "",
      is_in_stock: stocked,
      prices: price(minor, minor),
      images: [],
    });

    serve({
      [`${listing}?per_page=100&page=1`]: { body: [parent] },
      [`${listing}?type=variation&include=91%2C92&per_page=100`]: {
        body: [variation(92, "3500", false), variation(91, "3000", true)],
      },
    });

    const head = first(success(await read(target)));

    expect(head.variants.map(({ id }) => id)).toEqual(["91", "92"]);
    expect(head.variants[0]).toMatchObject({
      price: "30.00",
      availability: "in_stock",
      options: { Size: "Medium" },
    });
    expect(head.variants[1]).toMatchObject({
      price: "35.00",
      availability: "out_of_stock",
      options: {},
    });
  });

  test("falls back to variations by id, then says when it could not", async () => {
    const parent = {
      id: 9,
      name: "Hoodie",
      type: "variable",
      permalink: "https://acme.com/product/hoodie/",
      sku: "H",
      description: "",
      short_description: "",
      is_in_stock: true,
      prices: price("3000", "3000"),
      images: [],
      variations: [{ id: 91, attributes: [] }],
    };

    serve({
      [`${listing}?per_page=100&page=1`]: { body: [parent] },
      [`${listing}/91`]: {
        body: {
          id: 91,
          name: "Hoodie",
          sku: "H-91",
          is_in_stock: true,
          prices: price("3100", "3100"),
          images: [],
        },
      },
    });
    expect(first(success(await read(target))).variants[0]).toMatchObject({
      id: "91",
      price: "31.00",
    });

    serve({ [`${listing}?per_page=100&page=1`]: { body: [parent] } });
    const unread = success(await read(target));
    expect(first(unread).variants[0]?.id).toBe("9");
    expect(unread.notes.join()).toContain("starting price");
  });

  test("uses the REST root the site advertises when /wp-json/ is shut", async () => {
    serve({
      "https://acme.com": {
        body: '<link rel="https://api.w.org/" href="https://acme.com/shop/wp-json/">',
      },
      "https://acme.com/shop/wp-json/wc/store/v1/products?per_page=100&page=1":
        {
          body: [
            {
              id: 1,
              name: "Tee",
              permalink: "https://acme.com/shop/tee/",
              sku: "",
              description: "",
              short_description: "",
              prices: price("100", "100"),
              images: [],
            },
          ],
        },
    });

    expect(first(success(await read(target))).variants[0]?.price).toBe("1.00");
  });
});

describe("read: any other store", () => {
  const page = (name: string, over: Record<string, unknown> = {}) => ({
    body: `<html><head>
      <meta property="og:site_name" content="Other Store">
      ${ld(
        product({
          name,
          offers: {
            "@type": "Offer",
            price: "5.00",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
          },
          ...over,
        }),
      )}</head></html>`,
  });

  test("reads the market the homepage opened in, not the sitemap's first", async () => {
    const location = (value: string) => ({
      status: 302,
      headers: { location: value },
    });
    const market = (code: string, name: string) => ({
      [`https://acme.com/${code}/sitemap.xml`]: {
        body: `<urlset><url><loc>https://acme.com/${code}/p/tee</loc></url></urlset>`,
      },
      [`https://acme.com/${code}/p/tee`]: page(name),
    });

    serve({
      "https://acme.com": location("https://acme.com/en-us/"),
      "https://acme.com/": location("https://acme.com/en-us/"),
      "https://acme.com/en-us/": { body: "<html><head></head></html>" },
      "https://acme.com/sitemap.xml": {
        body: `<sitemapindex>${[
          "no-no",
          "de-at",
          "nl-be",
          "cs-cz",
          "fr-ch",
          "en-us",
        ]
          .map(
            (code) =>
              `<sitemap><loc>https://acme.com/${code}/sitemap.xml</loc></sitemap>`,
          )
          .join("")}</sitemapindex>`,
      },
      ...market("no-no", "Norsk"),
      ...market("en-us", "English"),
    });

    const result = success(await read(target));

    expect(result.products.map(({ title }) => title)).toEqual([
      "English",
      "Norsk",
    ]);
  });

  test("reads child sitemaps named for products first", async () => {
    const seen = serve({
      "https://acme.com/robots.txt": {
        body: "User-agent: *\nSitemap: https://acme.com/map.xml\n",
      },
      "https://acme.com/map.xml": {
        body: `<sitemapindex>
          <sitemap><loc>https://acme.com/pages.xml</loc></sitemap>
          <sitemap><loc>https://acme.com/products-1.xml</loc></sitemap>
        </sitemapindex>`,
      },
      "https://acme.com/products-1.xml": {
        body: `<urlset>
          <url><loc>https://acme.com/widget</loc></url>
          <url><loc>https://other.com/stolen</loc></url>
        </urlset>`,
      },
      "https://acme.com/pages.xml": {
        body: `<urlset>
          <url><loc>https://acme.com/about</loc></url>
          <url><loc>https://acme.com/product/gadget</loc></url>
        </urlset>`,
      },
      "https://acme.com/widget": page("Widget"),
      "https://acme.com/product/gadget": page("Gadget"),
      "https://acme.com/about": { body: "<html>About</html>" },
    });

    const result = success(await read(target));

    expect(result.store).toMatchObject({
      platform: "other",
      name: "Other Store",
    });
    expect(result.products.map(({ title }) => title)).toEqual([
      "Widget",
      "Gadget",
    ]);
    expect(first(result)).toMatchObject({ origin: "page", currency: "USD" });
    expect(first(result).variants[0]).toMatchObject({
      price: "5.00",
      availability: "in_stock",
    });
    // Nothing off the store is fetched, and nothing merely on the site map.
    expect(seen).not.toContain("https://other.com/stolen");
    expect(seen).not.toContain("https://acme.com/about");
  });

  test("falls back to one level of homepage links", async () => {
    serve({
      "https://acme.com": {
        body: `<a href="/product/one">One</a><a href="https://other.com/product/x">X</a>`,
      },
      "https://acme.com/product/one": page("One"),
    });

    expect(first(success(await read(target))).title).toBe("One");
  });

  test("ids: SKU, else a hash of the URL, and stable across runs", async () => {
    const routes = {
      "https://acme.com": {
        body: `<a href="/product/one">1</a><a href="/product/two">2</a>`,
      },
      "https://acme.com/product/one": page("One", {
        offers: {
          "@type": "Offer",
          sku: "SKU-1",
          price: "1",
          priceCurrency: "USD",
        },
      }),
      "https://acme.com/product/two": page("Two"),
    };

    serve(routes);
    const before = success(await read(target));
    serve(routes);
    const after = success(await read(target));

    expect(before.products[0]?.id).toBe("SKU-1");
    expect(before.products[0]?.variants[0]?.id).toBe("SKU-1");
    expect(before.products[1]?.id).toMatch(/^[0-9a-f]{12}$/);
    expect(before.products[1]?.variants[0]?.id).toMatch(/^[0-9a-f]{12}$/);
    expect(after.products.map(({ id }) => id)).toEqual(
      before.products.map(({ id }) => id),
    );
    expect(after.products[1]?.variants[0]?.id).toBe(
      before.products[1]?.variants[0]?.id,
    );
  });

  test("a SKU repeated across pages does not collide", async () => {
    const shared = {
      offers: {
        "@type": "Offer",
        sku: "SAME",
        price: "1",
        priceCurrency: "USD",
      },
    };

    serve({
      "https://acme.com": {
        body: `<a href="/product/one">1</a><a href="/product/two">2</a>`,
      },
      "https://acme.com/product/one": page("One", shared),
      "https://acme.com/product/two": page("Two", shared),
    });

    const { products } = success(await read(target));
    const ids = products.flatMap(({ variants }) =>
      variants.map(({ id }) => id),
    );
    expect(new Set(ids).size).toBe(2);
    expect(new Set(products.map(({ id }) => id)).size).toBe(2);
  });

  test("one page pricing two currencies keeps one", async () => {
    serve({
      "https://acme.com": { body: `<a href="/product/one">1</a>` },
      "https://acme.com/product/one": page("One", {
        offers: [
          { "@type": "Offer", sku: "A", price: "1", priceCurrency: "USD" },
          { "@type": "Offer", sku: "B", price: "1", priceCurrency: "EUR" },
        ],
      }),
    });

    const head = first(success(await read(target)));
    expect(head.currency).toBe("USD");
    expect(head.variants.map(({ sku }) => sku)).toEqual(["A"]);
  });

  test("blocked pages are reported, not silently dropped", async () => {
    serve({
      "https://acme.com": {
        body: `<a href="/product/one">1</a><a href="/product/two">2</a>`,
      },
      "https://acme.com/product/one": page("One"),
      "https://acme.com/product/two": {
        status: 403,
        headers: { "cf-mitigated": "challenge" },
        body: "<title>Just a moment...</title>",
      },
    });

    const result = success(await read(target));
    expect(result.products).toHaveLength(1);
    expect(result.notes.join()).toContain("1 of 2 pages were blocked");
    expect(result.notes.join()).toContain("Cloudflare");
  });

  test("reads Firecrawl's raw HTML through the same parser when keyed", async () => {
    Reflect.set(process.env, "FIRECRAWL_API_KEY", "test-key");

    serve({
      "https://api.firecrawl.dev/v2/map": {
        body: {
          success: true,
          links: [
            { url: "https://acme.com/product/fire" },
            { url: "https://other.com/product/off" },
          ],
        },
      },
      "https://api.firecrawl.dev/v2/batch/scrape": {
        body: { success: true, id: "job-1" },
      },
      "https://api.firecrawl.dev/v2/batch/scrape/job-1": {
        body: {
          status: "completed",
          data: [
            {
              rawHtml: page("Fire").body,
              metadata: {
                sourceURL: "https://acme.com/product/fire",
                statusCode: 200,
              },
            },
            {
              rawHtml: page("Off").body,
              metadata: {
                sourceURL: "https://other.com/product/off",
                statusCode: 200,
              },
            },
          ],
        },
      },
    });

    const result = success(await read(target));
    expect(result.products.map(({ title }) => title)).toEqual(["Fire"]);
    expect(first(result).origin).toBe("page");
  });

  test("a failing Firecrawl falls back to the sitemap walk", async () => {
    Reflect.set(process.env, "FIRECRAWL_API_KEY", "test-key");

    serve({
      "https://acme.com": { body: `<a href="/product/one">1</a>` },
      "https://acme.com/product/one": page("One"),
      "https://api.firecrawl.dev/v2/map": {
        status: 500,
        body: { error: "down" },
      },
    });

    expect(first(success(await read(target))).title).toBe("One");
  });
});

describe("read: probes", () => {
  test("off a request the probes throw, and the readers still find the store", async () => {
    state.probesThrow = true;

    serve({
      "https://acme.com/products.json?limit=250&page=1": {
        body: { products: [shopifyItem()] },
      },
      "https://acme.com/meta.json": { body: META },
    });

    const result = success(await read(target));
    expect(result.store.platform).toBe("shopify");
    expect(first(result).id).toBe("10");
  });
});

describe("read: the demo store's importer path", () => {
  const STORE = {
    id: "store-1",
    name: "Demo",
    platform: "shopify",
    domain: "https://demo-store.myshopify.com",
    storefrontHosts: ["demo-store.myshopify.com", "demo.example.com"],
  };

  const row = (variants: unknown[], over: Record<string, unknown> = {}) => ({
    id: "row-1",
    externalId: "777",
    title: "Row Tee",
    description: "<p>Row</p>",
    url: "https://demo-store.myshopify.com/products/row",
    price: "9.00",
    compareAtPrice: null,
    currency: "EUR",
    images: JSON.stringify(["https://cdn.example.com/row.jpg"]),
    sku: "R",
    gtin: null,
    mpn: null,
    rawData: JSON.stringify({
      id: 777,
      title: "Row Tee",
      vendor: "Demo",
      product_type: "Shirts",
      images: [],
      options: [{ name: "Size" }],
      variants,
    }),
    ...over,
  });

  const locked = {
    origin: "https://demo.example.com",
    host: "demo.example.com",
  };

  test("reads rows when the public read fails, with inventory-based stock", async () => {
    Reflect.set(process.env, "AGENTS_DEMO_DOMAIN", "demo-store.myshopify.com");
    state.shopify = { importable: false, name: null, products: null };
    state.stores = [STORE];
    state.rows = [
      row([
        {
          id: 1,
          option1: "S",
          price: "9.00",
          barcode: "4006381333931",
          inventory_quantity: 3,
          inventory_policy: "deny",
          inventory_management: "shopify",
        },
        {
          id: 2,
          option1: "M",
          price: "9.00",
          inventory_quantity: 0,
          inventory_policy: "deny",
          inventory_management: "shopify",
        },
        {
          id: 3,
          option1: "L",
          price: "9.00",
          inventory_quantity: 0,
          inventory_policy: "continue",
          inventory_management: "shopify",
        },
        { id: 4, option1: "XL", price: "9.00", inventory_policy: "deny" },
        {
          id: 5,
          option1: "XS",
          price: "9.00",
          inventory_quantity: 0,
          inventory_policy: "deny",
          inventory_management: null,
        },
      ]),
    ];
    serve({
      "https://demo.example.com": {
        body: "<html>Enter password</html>",
      },
    });

    const result = success(await read(locked));
    const head = first(result);

    expect(result.store).toMatchObject({ name: "Demo", platform: "shopify" });
    expect(head).toMatchObject({
      id: "777",
      origin: "importer",
      currency: "EUR",
      brand: "Demo",
      images: ["https://cdn.example.com/row.jpg"],
    });
    expect(head.variants[0]).toMatchObject({
      availability: "in_stock",
      barcode: "4006381333931",
    });
    expect(head.variants.map(({ availability }) => availability)).toEqual([
      "in_stock",
      "out_of_stock",
      "backorder",
      "unknown",
      "unknown",
    ]);
    expect(result.notes.join()).toContain("password protected");
  });

  test("a row with no raw payload keeps its columns and an unknown stock", async () => {
    Reflect.set(process.env, "AGENTS_DEMO_DOMAIN", "demo-store.myshopify.com");
    state.stores = [STORE];
    state.rows = [row([], { rawData: null, gtin: "123" })];
    serve({});

    expect(first(success(await read(locked))).variants[0]).toMatchObject({
      id: "777",
      price: "9.00",
      barcode: "123",
      availability: "unknown",
    });
  });

  test("no demo domain configured, no importer", async () => {
    state.stores = [STORE];
    state.rows = [row([])];
    serve({});

    expect((await read(locked)).success).toBe(false);
  });

  test("another host never reads the demo store's rows", async () => {
    Reflect.set(process.env, "AGENTS_DEMO_DOMAIN", "demo-store.myshopify.com");
    state.stores = [STORE];
    state.rows = [row([])];
    serve({});

    expect((await read(target)).success).toBe(false);
  });

  test("a public row proves nothing and may carry a defaulted currency", async () => {
    Reflect.set(process.env, "AGENTS_DEMO_DOMAIN", "demo-store.myshopify.com");
    state.stores = [{ ...STORE, platform: "shopify-public" }];
    state.rows = [row([])];
    serve({});

    expect((await read(locked)).success).toBe(false);
  });

  test("the public read wins when it answers", async () => {
    Reflect.set(process.env, "AGENTS_DEMO_DOMAIN", "demo-store.myshopify.com");
    state.shopify = { importable: true, name: null, products: 1 };
    state.stores = [STORE];
    state.rows = [row([])];
    serve({
      "https://demo.example.com/products.json?limit=250&page=1": {
        body: { products: [shopifyItem()] },
      },
    });

    expect(first(success(await read(locked))).origin).toBe("shopify");
  });
});

describe("read: failures in plain English", () => {
  const message = async () => {
    const outcome = await read(target);
    if (outcome.success) throw new Error("expected a failure");
    return outcome.error.message;
  };

  test("unreachable", async () => {
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;

    expect(await message()).toBe(
      "We could not reach acme.com. Check the address and try again.",
    );
  });

  test("nothing that looks like a product", async () => {
    serve({ "https://acme.com": { body: "<html>Hello</html>" } });

    expect(await message()).toBe(
      "We could not find any product pages on acme.com.",
    );
  });

  test("pages, but none with product data", async () => {
    serve({
      "https://acme.com": { body: `<a href="/about">About</a>` },
      "https://acme.com/about": { body: "<html>About</html>" },
    });

    expect(await message()).toBe(
      "We checked 1 page on acme.com, but none of them has product data we can read.",
    );
  });

  test("a bot wall names itself", async () => {
    serve({
      "https://acme.com": {
        status: 403,
        headers: { "cf-mitigated": "challenge" },
        body: "<title>Just a moment...</title>",
      },
    });

    expect(await message()).toBe(
      "acme.com blocks automated visitors with Cloudflare, so we could not read its pages.",
    );
  });

  test("a password page says so", async () => {
    state.shopify = { importable: false, name: null, products: null };

    globalThis.fetch = (async (input: string | URL | Request) => {
      if (String(input) !== "https://acme.com")
        return new Response("not found", { status: 404 });

      const response = new Response("<html>Enter password</html>");
      Object.defineProperty(response, "url", {
        value: "https://acme.com/password",
      });
      return response;
    }) as typeof fetch;

    expect(await message()).toBe(
      "acme.com is password protected, so its products are not public.",
    );
  });

  test("an address the guard refuses", async () => {
    Reflect.set(process.env, "NODE_ENV", "production");
    const outcome = await read({
      origin: "http://acme.com:8080",
      host: "acme.com",
    });
    Reflect.set(process.env, "NODE_ENV", "test");

    expect(outcome.success).toBe(false);
    if (!outcome.success)
      expect(outcome.error.message).toBe(
        "That address is not a public store we can read. Check it and try again.",
      );
  });

  test("a thrown progress callback never fails the read", async () => {
    serve({ "https://acme.com": { body: "<html>Hello</html>" } });

    const outcome = await read(target, {
      onProgress: () => {
        throw new Error("redis down");
      },
    });

    expect(outcome.success).toBe(false);
    if (!outcome.success) expect(outcome.error.message).toContain("product");
  });
});

describe("hard rules: what a page states", () => {
  const offered = (price: unknown) =>
    parsePage(
      ld(
        product({ offers: { "@type": "Offer", price, priceCurrency: "USD" } }),
      ),
      ADDRESS,
    ).product?.offers[0]?.price;

  test.each([
    ["10 - 20"],
    ["$10 to $20"],
    ["2 for 10"],
    ["5.99 / 100g"],
    ["10 20"],
  ])("%s states two numbers, so it is no price", (cell) => {
    expect(offered(cell)).toBeNull();
  });

  test.each([
    ["1.299", null],
    ["17.500", null],
    ["0.995", "0.995"],
    ["1.299,00", "1299.00"],
    ["1 299,00 kr", "1299.00"],
    ["$1,299.00", "1299.00"],
    ["12.5000", "12.5000"],
    ["12,50 €", "12.50"],
  ])("%s reads as %s", (cell, expected) => {
    expect(offered(cell)).toBe(expected);
  });

  test("a JSON number has one reading, whatever it looks like", () => {
    expect(offered(1.299)).toBe("1.299");
  });

  test("an AggregateOffer of one offer is that offer, not a starting price", () => {
    const parsed = parsePage(
      ld(
        product({
          offers: {
            "@type": "AggregateOffer",
            lowPrice: "9.00",
            offerCount: 1,
            priceCurrency: "USD",
          },
        }),
      ),
      ADDRESS,
    ).product?.offers[0];

    expect(parsed?.from).toBe(false);
  });

  test.each([
    ["product", true],
    ["product.item", true],
    ["og:product", true],
    ["product.group", false],
    ["website", false],
  ])("og:type %s declares a product: %s", (type, expected) => {
    const parsed = parsePage(
      `<meta property="og:type" content="${type}"><meta property="og:title" content="Tee">`,
      ADDRESS,
    );

    expect(parsed.product !== null).toBe(expected);
  });

  test.each([
    [{ itemCondition: "https://schema.org/UsedCondition" }, "used"],
    [{ itemCondition: "RefurbishedCondition" }, "refurbished"],
    [{ itemCondition: "https://schema.org/NewCondition" }, "new"],
    [
      {
        offers: [
          {
            "@type": "Offer",
            itemCondition: "https://schema.org/NewCondition",
          },
          {
            "@type": "Offer",
            itemCondition: "https://schema.org/UsedCondition",
          },
        ],
      },
      "used",
    ],
    [{}, null],
  ])("%j states a condition of %s", (over, expected) => {
    expect(parsePage(ld(product(over)), ADDRESS).product?.condition).toBe(
      expected as never,
    );
  });

  test("a return policy link is never a product, a collection or a blog post", () => {
    const parsed = parsePage(
      `<a href="/products/no-return-bag">No return bag</a>
       <a href="/collections/all">Free returns</a>
       <a href="/blogs/news/how-to-return">How to return</a>
       <a href="/pages/returns">Returns</a>`,
      "https://acme.com/",
    );

    expect(parsed.returnPolicies).toEqual(["https://acme.com/pages/returns"]);
  });

  test("a canonical only ever respells the page it is on", () => {
    expect(addressOf(ADDRESS, "https://www.acme.com/products/tee")).toBe(
      "https://www.acme.com/products/tee",
    );
    expect(
      addressOf(ADDRESS, "https://acme.com/products/buy-mugs-online"),
    ).toBe(ADDRESS);
    expect(addressOf(ADDRESS, "https://other.com/products/tee")).toBe(ADDRESS);
    expect(addressOf(ADDRESS, null)).toBe(ADDRESS);
  });
});

describe("hard rules: reading a store", () => {
  const shopify = (page: Reply, over: Record<string, Reply> = {}) => ({
    "https://acme.com": { body: "<html></html>" },
    "https://acme.com/meta.json": { body: META },
    "https://acme.com/products.json?limit=250&page=1": {
      body: {
        products: [
          shopifyItem({
            variants: [
              {
                id: 101,
                price: "20.00",
                compare_at_price: null,
                available: true,
              },
            ],
          }),
        ],
      },
    },
    "https://acme.com/products/tee": page,
    ...over,
  });

  beforeEach(() => {
    state.shopify = { importable: true, name: "Acme", products: 1 };
  });

  test("a canonical on another product's page does not move the link", async () => {
    serve(
      shopify({
        body: `<link rel="canonical" href="https://acme.com/products/seo-landing">
          ${ld(product({ offers: { "@type": "Offer", price: "20.00", priceCurrency: "USD" } }))}`,
      }),
    );

    expect(first(success(await read(target))).url).toBe(
      "https://acme.com/products/tee",
    );
  });

  test("a link redirected to another product keeps neither its page nor its price", async () => {
    serve(
      shopify(
        { status: 301, headers: { location: "https://acme.com/products/mug" } },
        {
          "https://acme.com/products/mug": {
            body: ld(
              product({
                name: "Mug",
                offers: {
                  "@type": "Offer",
                  price: "99.00",
                  priceCurrency: "USD",
                },
              }),
            ),
          },
        },
      ),
    );

    const result = success(await read(target));

    expect(first(result).url).toBeNull();
    expect(first(result).variants[0]?.price).toBe("20.00");
    expect(result.notes.join()).toContain("some other page");
  });

  test("a link redirected to the same product under a new address is followed", async () => {
    serve(
      shopify(
        {
          status: 301,
          headers: { location: "https://acme.com/products/classic-tee" },
        },
        {
          "https://acme.com/products/classic-tee": {
            body: ld(
              product({
                name: "Buy Tee Online | Acme",
                offers: {
                  "@type": "Offer",
                  price: "20.00",
                  priceCurrency: "USD",
                },
              }),
            ),
          },
        },
      ),
    );

    expect(first(success(await read(target))).url).toBe(
      "https://acme.com/products/classic-tee",
    );
  });

  test("a link that redirects to the homepage has no page to send a shopper to", async () => {
    serve(
      shopify(
        { status: 302, headers: { location: "https://acme.com/" } },
        { "https://acme.com/": { body: "<html></html>" } },
      ),
    );

    const result = success(await read(target));

    expect(first(result).url).toBeNull();
    expect(result.notes.join()).toContain("some other page");
  });

  test("a page that will not load keeps its link", async () => {
    serve(shopify({ status: 500, body: "down" }));

    expect(first(success(await read(target))).url).toBe(
      "https://acme.com/products/tee",
    );
  });

  test("a WooCommerce permalink on another host is neither fetched nor sent", async () => {
    state.shopify = null;
    state.woo = { importable: true };
    const seen = serve({
      "https://acme.com": { body: "<html></html>" },
      "https://acme.com/wp-json/wc/store/v1/products?per_page=100&page=1": {
        body: [
          {
            id: 7,
            name: "Tee",
            permalink: "https://victim.example/product/tee/",
            prices: {
              price: "2000",
              currency_code: "USD",
              currency_minor_unit: 2,
            },
            is_in_stock: true,
          },
        ],
      },
    });

    const result = success(await read(target));

    expect(first(result).url).toBeNull();
    expect(seen.filter((url) => url.includes("victim"))).toEqual([]);
  });

  test("a store with no stated currency gets none from one variant's offer", async () => {
    serve({
      "https://acme.com": { body: "<html></html>" },
      "https://acme.com/products.json?limit=250&page=1": {
        body: { products: [shopifyItem()] },
      },
      "https://acme.com/products/tee": {
        body: ld(
          product({
            offers: [
              {
                "@type": "Offer",
                url: "https://acme.com/products/tee?variant=101",
                price: "20.00",
                priceCurrency: "EUR",
              },
            ],
          }),
        ),
      },
    });

    expect(first(success(await read(target))).currency).toBeNull();
  });

  const pages = (html: string, over: Record<string, Reply> = {}) => ({
    "https://acme.com": { body: "<html></html>" },
    "https://acme.com/sitemap.xml": {
      body: "<urlset><url><loc>https://acme.com/product/a</loc></url></urlset>",
    },
    "https://acme.com/product/a": { body: html },
    ...over,
  });

  test("a category page's starting price is no item's price", async () => {
    state.shopify = null;
    serve(
      pages(
        ld(
          product({
            name: "Sport Bags",
            offers: {
              "@type": "AggregateOffer",
              lowPrice: "2.40",
              highPrice: "90.00",
              priceCurrency: "GBP",
            },
          }),
        ),
      ),
    );

    const result = success(await read(target));

    expect(first(result).variants[0]?.price).toBeNull();
    expect(result.notes.join()).toContain("starting price");
  });

  test("an offer stating no currency does not borrow its neighbour's", async () => {
    state.shopify = null;
    serve(
      pages(
        ld(
          product({
            offers: [
              {
                "@type": "Offer",
                sku: "A",
                price: "10.00",
                priceCurrency: "USD",
              },
              { "@type": "Offer", sku: "B", price: "20.00" },
            ],
          }),
        ),
      ),
    );

    const [priced, bare] = first(success(await read(target))).variants;

    expect(priced?.price).toBe("10.00");
    expect(bare?.price).toBeNull();
  });

  test("the stated condition reaches the product", async () => {
    state.shopify = null;
    serve(
      pages(
        ld(
          product({
            itemCondition: "https://schema.org/RefurbishedCondition",
            offers: { "@type": "Offer", price: "10.00", priceCurrency: "USD" },
          }),
        ),
      ),
    );

    expect(first(success(await read(target))).condition).toBe("refurbished");
  });

  test("sitemaps on another host are never fetched", async () => {
    state.shopify = null;
    const seen = serve(
      pages(
        ld(
          product({
            offers: { "@type": "Offer", price: "5.00", priceCurrency: "USD" },
          }),
        ),
        {
          "https://acme.com/robots.txt": {
            body: "Sitemap: https://victim.example/sitemap.xml\nSitemap: https://acme.com/index.xml",
          },
          "https://acme.com/index.xml": {
            body: "<sitemapindex><sitemap><loc>https://victim.example/child.xml</loc></sitemap></sitemapindex>",
          },
        },
      ),
    );

    await read(target);

    expect(seen.filter((url) => url.includes("victim"))).toEqual([]);
  });

  test("a hostile sitemap or robots file cannot hold the event loop", async () => {
    state.shopify = null;
    serve(
      pages(
        ld(
          product({
            offers: { "@type": "Offer", price: "5.00", priceCurrency: "USD" },
          }),
        ),
        {
          "https://acme.com/robots.txt": { body: "\n".repeat(500_000) },
          "https://acme.com/sitemap_index.xml": {
            body: `<urlset><loc>${" ".repeat(500_000)}`,
          },
        },
      ),
    );

    const started = performance.now();
    await read(target);

    expect(performance.now() - started).toBeLessThan(2000);
  });

  test("megabytes of stated text are cut down before any regex pays for them", async () => {
    state.shopify = null;
    serve(
      pages(
        ld(
          product({
            description: "<a".repeat(1_000_000),
            offers: { "@type": "Offer", price: "5.00", priceCurrency: "USD" },
          }),
        ),
      ),
    );

    const description = first(success(await read(target))).description ?? "";

    expect(description.length).toBeLessThanOrEqual(50_000);
  });

  test("a REST root on another host is not this store's catalog", async () => {
    state.shopify = null;
    state.woo = { importable: true };
    const seen = serve({
      "https://acme.com": {
        body: "<html></html>",
        headers: {
          link: '<https://victim.example/wp-json/>; rel="https://api.w.org/"',
        },
      },
    });

    await read(target);

    expect(seen.filter((url) => url.includes("victim"))).toEqual([]);
  });

  test("Firecrawl is only ever asked for this store, and its key only goes to Firecrawl", async () => {
    state.shopify = null;
    Reflect.set(process.env, "FIRECRAWL_API_KEY", "test-key");

    const calls: { url: string; body: string | null; bearer: string | null }[] =
      [];
    const replies: Record<string, unknown> = {
      "https://api.firecrawl.dev/v2/map": {
        links: [
          { url: "https://acme.com/product/a" },
          { url: "https://victim.example/product/b" },
          { url: "http://169.254.169.254/product/c" },
        ],
      },
      "https://api.firecrawl.dev/v2/batch/scrape": { id: "job" },
      "https://api.firecrawl.dev/v2/batch/scrape/job": {
        status: "completed",
        next: "https://victim.example/steal",
        data: [],
      },
    };
    globalThis.fetch = (async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      const url = String(input);
      calls.push({
        url,
        body: typeof init?.body === "string" ? init.body : null,
        bearer: new Headers(init?.headers).get("authorization"),
      });
      return new Response(JSON.stringify(replies[url] ?? {}), {
        status: replies[url] ? 200 : 404,
      });
    }) as typeof fetch;

    await read(target);

    const batch = calls.find(
      ({ url }) => url === "https://api.firecrawl.dev/v2/batch/scrape",
    );
    expect(JSON.parse(batch?.body ?? "{}").urls).toEqual([
      "https://acme.com/product/a",
    ]);
    expect(
      calls.filter(
        ({ url, bearer }) =>
          bearer !== null && !url.startsWith("https://api.firecrawl.dev/"),
      ),
    ).toEqual([]);
    expect(calls.filter(({ url }) => url.includes("victim"))).toEqual([]);
  });

  test("a redirect to a private address is never followed in production", async () => {
    Reflect.set(process.env, "NODE_ENV", "production");
    const HTTP = await import("../utils/http");
    const seen = serve({
      "https://acme.com/products/tee": {
        status: 302,
        headers: { location: "https://169.254.169.254/latest/meta-data/" },
      },
    });

    const page = await HTTP.page("https://acme.com/products/tee");
    Reflect.set(process.env, "NODE_ENV", "test");

    expect(page.success).toBe(false);
    expect(seen.filter((url) => url.includes("169.254"))).toEqual([]);
  });
});
