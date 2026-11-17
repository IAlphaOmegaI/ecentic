import { describe, expect, test } from "bun:test";
import {
  extractProducts,
  jsonLdBlocks,
} from "@/server/utils/outbound/evidence/product-schema";

const page = (jsonLd: unknown) =>
  `<html><head><script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head><body></body></html>`;
const URL_A = "https://example.com/products/a";

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
