import { mock } from "bun:test";
import assert from "node:assert/strict";

mock.module("server-only", () => ({}));
const { inspectPublishedProduct } = await import(
  "@/server/utils/outbound/automation-qualification"
);
const company = { name: "Sample Goods", domain: "samplegoods.test" };
const url = "https://samplegoods.test/products/daily-cleanser";
const product = {
  "@type": "Product",
  name: "Daily Cleanser",
  brand: { name: company.name },
  description: "A physical cleanser in a reusable glass bottle.",
  offers: { price: 24, priceCurrency: "USD" },
};
const data = (value: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
const inspect = (body: string, pageUrl = url) =>
  inspectPublishedProduct({ url: pageUrl, body }, company);

// Bounce Curl publishes an SEO name-only node before its complete product.
const duplicate = inspect(
  `<h1>Daily Cleanser</h1>${data({ "@type": "Product", name: product.name, "@id": "/products/daily-cleanser#product" })}${data(product)}`,
);
assert.equal(duplicate?.price, 24);
assert.equal(duplicate?.brand, company.name);
assert.equal(duplicate?.description, product.description);

// Bite uses different copy in its H1 and exact product name in its page title.
const alternateHeading = inspect(
  `<title>Daily Cleanser – Sample Goods</title><h1>Gentle cleansing bottle</h1>${data({ ...product, url })}`,
);
assert.equal(alternateHeading?.name, product.name);

// Graza has no H1; the named ProductGroup explicitly identifies this page.
const group = inspect(
  `<p>Daily Cleanser is made for daily washing.</p>${data({ ...product, "@type": "ProductGroup", url, offers: undefined, hasVariant: [{ "@type": "Product", offers: product.offers }] })}`,
);
assert.equal(group?.price, 24);
assert.equal(group?.name, product.name);

assert.equal(
  inspect(`<h1>Sample Goods</h1><h1>Daily Cleanser</h1>${data(product)}`)?.name,
  product.name,
);
const collectionUrl =
  "https://samplegoods.test/collections/cleansers/products/daily-cleanser";
assert.equal(
  inspect(
    `<p>Daily Cleanser</p>${data({ ...product, offers: { ...product.offers, url: "/products/daily-cleanser?variant=123" } })}`,
    collectionUrl,
  )?.url,
  collectionUrl,
);

// Never fill fields from separate partial records.
assert.equal(
  inspect(
    `<h1>Daily Cleanser</h1>${data({ ...product, offers: undefined })}${data({ ...product, brand: undefined })}`,
  ),
  null,
);
assert.equal(
  inspect(
    `<h1>Daily Cleanser</h1>${data(product)}${data({ ...product, offers: { price: 29, priceCurrency: "USD" } })}`,
  ),
  null,
);
assert.equal(
  inspect(
    `<h1>Daily Cleanser</h1>${data(product)}${data({ ...product, brand: { name: "Another Brand" } })}`,
  ),
  null,
);
assert.equal(
  inspect(
    `<h1>Daily Cleanser</h1>${data({ ...product, url: "https://samplegoods.test/products/another-cleanser" })}`,
  ),
  null,
);
assert.equal(
  inspect(
    `<p>Daily Cleanser</p>${data({ ...product, url: "https://unrelated.test/products/daily-cleanser" })}`,
  ),
  null,
);
assert.equal(
  inspect(`<p>Our product collection</p>${data({ ...product, url })}`),
  null,
);
assert.equal(
  inspect(
    `<p>Daily Cleanser</p>${data({ ...product, url: "https://user:pass@samplegoods.test/products/daily-cleanser" })}`,
  ),
  null,
);
assert.equal(
  inspect(
    `<h1>Daily Cleanser</h1>${data(product)}<script type="application/ld+json">{invalid</script>`,
  ),
  null,
);
assert.equal(
  inspect(
    `<h1>Daily Cleanser</h1>${data({ ...product, description: "A digital download" })}`,
  ),
  null,
);
console.log("Published product collection contracts passed");
