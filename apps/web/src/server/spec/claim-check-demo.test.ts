import { describe, expect, test } from "bun:test";
import type { StoreApiProduct } from "@/server/app/integration/woocommerce/http";
import {
  loadDemoProduct,
  shopifyProductInput,
  wooProductInput,
} from "@/server/app/intelligence/claim-check-demo-source";
import { snapshotListing } from "@/server/app/intelligence/claim-check-rules";

describe("demo product sources", () => {
  test("a Shopify product maps like the import: first variant, barcode as GTIN", () => {
    const product = shopifyProductInput(
      {
        id: 7,
        title: "Pacific Jogger",
        body_html: "<p>Made with TENCEL.</p>",
        handle: "pacific-jogger",
        vendor: "tentree",
        variants: [
          {
            price: "88.00",
            compare_at_price: null,
            sku: "TCW-1",
            barcode: "4006381333931",
          },
          { price: "90.00", sku: "TCW-2", barcode: null },
        ],
      },
      "https://www.tentree.com",
      "CAD",
    );
    expect(product.url).toBe("https://www.tentree.com/products/pacific-jogger");
    expect(product.price).toBe("88.00");
    expect(product.currency).toBe("CAD");

    const listing = snapshotListing(product);
    expect(listing.gtin).toBe("4006381333931");
    expect(listing.brand).toBe("tentree");
    expect(listing.variants).toBe(2);
    // The public payload carries no inventory: stock stays unknown.
    expect(listing.availability).toBe("unknown");
  });

  test("a Store API product maps minor units, entities and stock", () => {
    const product = wooProductInput({
      id: 3,
      name: "Tee &#8211; Black",
      permalink: "https://shop.example/product/tee/",
      sku: "TEE",
      description: "<p>Long</p>",
      short_description: "<p>Short</p>",
      is_in_stock: false,
      prices: {
        price: "1999",
        regular_price: "2499",
        sale_price: "1999",
        currency_code: "EUR",
        currency_minor_unit: 2,
      },
      images: [],
      brands: [{ name: "Acme" }],
    } satisfies StoreApiProduct);
    expect(product.title).toBe("Tee – Black");
    expect(product.price).toBe("19.99");
    expect(product.compareAtPrice).toBe("24.99");
    expect(product.description).toBe("<p>Short</p>");

    const listing = snapshotListing(product);
    expect(listing.availability).toBe("out_of_stock");
    expect(listing.brand).toBe("Acme");
  });

  test("a URL that is not a product page is refused without fetching", async () => {
    const result = await loadDemoProduct(
      "https://shop.example/collections/all",
    );
    expect(result.success).toBe(false);
    const empty = await loadDemoProduct("   ");
    expect(empty.success).toBe(false);
  });
});
