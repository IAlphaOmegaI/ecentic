import { describe, expect, test } from "bun:test";
import {
  buildFindings,
  type CrawlerStatus,
  type ExtractedProduct,
  extractProducts,
  jsonLdBlocks,
  normalizeOrigin,
  toListing,
} from "@/server/app/intelligence/prospect";

const page = (jsonLd: unknown) =>
  `<html><head><script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head><body></body></html>`;

const URL_A = "https://example.com/products/a";

const product = (over: Partial<ExtractedProduct> = {}): ExtractedProduct => ({
  url: URL_A,
  isVariantGroup: false,
  hasVariants: false,
  name: "Thing",
  brand: "Brand",
  description: "A thing",
  image: "https://example.com/a.jpg",
  sku: "SKU1",
  mpn: null,
  gtin: "00012345678905",
  price: 10,
  currency: "USD",
  hasShipping: true,
  hasReturnPolicy: true,
  hasRating: true,
  snippet: "{}",
  ...over,
});

const crawlers = (access: CrawlerStatus["access"]): CrawlerStatus[] => [
  { id: "GPTBot", label: "GPTBot", operator: "OpenAI", access },
];

describe("normalizeOrigin", () => {
  test("accepts what a rep actually pastes", () => {
    expect(normalizeOrigin("example.com")).toBe("https://example.com");
    expect(normalizeOrigin("  https://www.example.com/  ")).toBe(
      "https://www.example.com",
    );
    expect(normalizeOrigin("https://example.com/products/x")).toBe(
      "https://example.com",
    );
  });

  test("rejects anything without a host", () => {
    expect(normalizeOrigin("")).toBeNull();
    expect(normalizeOrigin("not a url")).toBeNull();
    expect(normalizeOrigin("localhost")).toBeNull();
  });
});

describe("extractProducts", () => {
  test("reads a plain Product node", () => {
    const [found] = extractProducts(
      page({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Wool Runner",
        brand: { "@type": "Brand", name: "Allbirds" },
        gtin13: "0001234567890",
        offers: { "@type": "Offer", price: "98.00", priceCurrency: "USD" },
      }),
      URL_A,
    );

    expect(found?.name).toBe("Wool Runner");
    expect(found?.brand).toBe("Allbirds");
    expect(found?.gtin).toBe("0001234567890");
    expect(found?.price).toBe(98);
    expect(found?.currency).toBe("USD");
  });

  test("finds products inside an @graph envelope", () => {
    const found = extractProducts(
      page({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "BreadcrumbList" },
          { "@type": "Product", name: "Nested" },
        ],
      }),
      URL_A,
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.name).toBe("Nested");
  });

  test("counts a ProductGroup once, not once per variant", () => {
    // The regression this guards: flattening `hasVariant` reported 286
    // "products" across eight pages and inflated every coverage number.
    const found = extractProducts(
      page({
        "@type": "ProductGroup",
        name: "Shirt",
        hasVariant: [
          { "@type": "Product", name: "Shirt - S" },
          { "@type": "Product", name: "Shirt - M" },
          { "@type": "Product", name: "Shirt - L" },
        ],
      }),
      URL_A,
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.isVariantGroup).toBe(true);
    expect(found[0]?.hasVariants).toBe(true);
  });

  test("credits a field published on a variant rather than the group", () => {
    // Saying "there is no barcode anywhere" to a prospect whose variants
    // carry one is the exact claim that loses the call.
    const [found] = extractProducts(
      page({
        "@type": "ProductGroup",
        name: "Shirt",
        hasVariant: [
          {
            "@type": "Product",
            name: "Shirt - S",
            gtin12: "012345678905",
            offers: {
              price: "20",
              shippingDetails: { "@type": "OfferShippingDetails" },
            },
          },
        ],
      }),
      URL_A,
    );

    expect(found?.gtin).toBe("012345678905");
    expect(found?.hasShipping).toBe(true);
  });

  test("keeps the group when a page publishes Product and ProductGroup twice", () => {
    const found = extractProducts(
      `<script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "Shirt" })}</script>
       <script type="application/ld+json">${JSON.stringify({ "@type": "ProductGroup", name: "Shirt", hasVariant: [{ "@type": "Product" }] })}</script>`,
      URL_A,
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.isVariantGroup).toBe(true);
  });

  test("one malformed block never discards the others", () => {
    const html = `<script type="application/ld+json">{ not json </script>
      <script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "Survivor" })}</script>`;

    expect(jsonLdBlocks(html)).toHaveLength(2);
    expect(extractProducts(html, URL_A)[0]?.name).toBe("Survivor");
  });

  test("a page with no product markup yields nothing", () => {
    expect(
      extractProducts(page({ "@type": "WebPage", name: "Home" }), URL_A),
    ).toEqual([]);
    expect(extractProducts("<html><body>hi</body></html>", URL_A)).toEqual([]);
  });
});

describe("toListing", () => {
  test("maps onto the shared rule registry's shape", () => {
    const listing = toListing(product({ gtin: "012345678905" }));

    expect(listing.barcode).toBe("012345678905");
    expect(listing.title).toBe("Thing");
    expect(listing.link).toBe(URL_A);
  });
});

describe("buildFindings", () => {
  const clean = product();

  test("a store with nothing wrong produces no findings", () => {
    // The don't-call path. It must stay empty rather than degrade into a
    // weaker finding to give the rep something to say.
    expect(
      buildFindings({
        crawlers: crawlers("allowed"),
        crawlersEvidence: {
          url: "https://example.com/robots.txt",
          snippet: "",
        },
        pages: [{ url: URL_A, products: [clean], html: page({}) }],
        products: [clean],
      }),
    ).toEqual([]);
  });

  test("reports a blocked crawler and names it", () => {
    const [finding] = buildFindings({
      crawlers: crawlers("blocked"),
      crawlersEvidence: {
        url: "https://example.com/robots.txt",
        snippet: "User-agent: GPTBot\nDisallow: /",
      },
      pages: [{ url: URL_A, products: [clean], html: page({}) }],
      products: [clean],
    });

    expect(finding?.kind).toBe("crawlers-blocked");
    expect(finding?.plain).toContain("GPTBot");
    expect(finding?.evidence[0]?.url).toBe("https://example.com/robots.txt");
  });

  test("an unknown crawler state is never reported as a finding", () => {
    // robots.txt that could not be read must not become a claim in either
    // direction — `unknown` is silence, not "allowed" and not "blocked".
    expect(
      buildFindings({
        crawlers: crawlers("unknown"),
        crawlersEvidence: null,
        pages: [{ url: URL_A, products: [clean], html: page({}) }],
        products: [clean],
      }),
    ).toEqual([]);
  });

  test("only claims a missing field when it is missing everywhere", () => {
    // "Some of your products" invites "which ones?", and the rep cannot answer
    // that from a sample of eight.
    const partial = buildFindings({
      crawlers: crawlers("allowed"),
      crawlersEvidence: null,
      pages: [],
      products: [clean, product({ gtin: null, url: "https://example.com/b" })],
    });

    expect(partial.map((finding) => finding.kind)).not.toContain("no-gtin");

    const total = buildFindings({
      crawlers: crawlers("allowed"),
      crawlersEvidence: null,
      pages: [],
      products: [product({ gtin: null })],
    });

    expect(total.map((finding) => finding.kind)).toContain("no-gtin");
  });

  test("every finding carries the page it came from", () => {
    const findings = buildFindings({
      crawlers: crawlers("allowed"),
      crawlersEvidence: null,
      pages: [],
      products: [product({ gtin: null, hasShipping: false, snippet: "{...}" })],
    });

    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
      expect(finding.evidence.length).toBeGreaterThan(0);
      for (const entry of finding.evidence) expect(entry.url).toMatch(/^https/);
    }
  });

  test("ranks by what a prospect grasps fastest and caps at three", () => {
    const findings = buildFindings({
      crawlers: crawlers("blocked"),
      crawlersEvidence: { url: "https://example.com/robots.txt", snippet: "x" },
      pages: [{ url: URL_A, products: [], html: "<html></html>" }],
      products: [
        product({
          gtin: null,
          hasShipping: false,
          hasReturnPolicy: false,
          hasRating: false,
          brand: null,
        }),
      ],
    });

    expect(findings).toHaveLength(3);
    expect(findings[0]?.kind).toBe("crawlers-blocked");
    expect(findings[1]?.kind).toBe("no-structured-data");
    expect(findings[2]?.kind).toBe("no-gtin");
  });

  test("spots the same product published under two URLs", () => {
    const findings = buildFindings({
      crawlers: crawlers("allowed"),
      crawlersEvidence: null,
      pages: [],
      products: [
        product({ name: "Merino Shirt - Small", url: "https://example.com/s" }),
        product({ name: "Merino Shirt - Large", url: "https://example.com/l" }),
      ],
    });

    expect(findings.map((finding) => finding.kind)).toContain("variants-split");
  });

  test("carries the platform's own documentation for a rule-backed finding", () => {
    const [finding] = buildFindings({
      crawlers: crawlers("allowed"),
      crawlersEvidence: null,
      pages: [],
      products: [product({ gtin: null })],
    });

    expect(finding?.reference).toContain("support.google.com");
  });
});

describe("fields published in less common shapes", () => {
  test("finds a barcode under productID", () => {
    const [found] = extractProducts(
      page({ "@type": "Product", name: "X", productID: "012345678905" }),
      URL_A,
    );

    expect(found?.gtin).toBe("012345678905");
  });

  test("finds a barcode in a PropertyValue identifier", () => {
    const [found] = extractProducts(
      page({
        "@type": "Product",
        name: "X",
        identifier: {
          "@type": "PropertyValue",
          propertyID: "gtin13",
          value: "0001234567890",
        },
      }),
      URL_A,
    );

    expect(found?.gtin).toBe("0001234567890");
  });

  test("ignores a productID that is not a barcode", () => {
    // A Shopify handle or internal id in productID must not be mistaken for a
    // GTIN — that would silence a real finding.
    const [found] = extractProducts(
      page({ "@type": "Product", name: "X", productID: "shopify-1234-abc" }),
      URL_A,
    );

    expect(found?.gtin).toBeNull();
  });

  test("credits shipping published on the second of several offers", () => {
    const [found] = extractProducts(
      page({
        "@type": "Product",
        name: "X",
        offers: [
          { "@type": "Offer", price: "10" },
          {
            "@type": "Offer",
            price: "12",
            shippingDetails: { "@type": "OfferShippingDetails" },
            hasMerchantReturnPolicy: { "@type": "MerchantReturnPolicy" },
          },
        ],
      }),
      URL_A,
    );

    expect(found?.hasShipping).toBe(true);
    expect(found?.hasReturnPolicy).toBe(true);
  });
});
