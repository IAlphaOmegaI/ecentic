import { mock, spyOn } from "bun:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sequenceRefreshInputSchema } from "@/lib/outbound-sequence-refresh";

mock.module("server-only", () => ({}));
const product = {
  name: "Ceramic Mug",
  brand: "Example Goods",
  url: "https://example.test/products/mug",
  description: "A ceramic mug",
  price: 24,
  currency: "USD",
};
const input = sequenceRefreshInputSchema.parse({
  operation: "sequenceRefresh",
  prospectId: randomUUID(),
  campaignId: randomUUID(),
  campaignRevision: 1,
  prospectRevision: 1,
  playbookRevision: 1,
  approvalHash: "hash",
  recipient: "alex@example.test",
  sentStep: 1,
  sourceEvidenceId: randomUUID(),
  actor: "test",
  needEmail: true,
  product,
});
const state = {
  denied: false,
  redirect: false,
  price: 24,
  brand: "Example Goods",
  blocked: false,
};
const reads: string[] = [];
const HTTP = await import("@/server/utils/http");
mock.module("@/server/utils/http", () => ({
  ...HTTP,
  page: async (
    url: string,
    options: { strictGuard?: boolean; limit?: number },
  ) => {
    assert.equal(options.strictGuard, true);
    assert.ok((options.limit ?? 0) <= 8 * 1024 * 1024);
    reads.push(url);
    const robots = url.endsWith("robots.txt");
    return {
      success: true,
      data: {
        url:
          state.redirect && !robots
            ? "https://example.test/products/other"
            : url,
        status: state.blocked && !robots ? 403 : 200,
        headers: new Headers(),
        body: robots
          ? `User-agent: *\n${state.denied ? "Disallow: /products/" : "Allow: /"}`
          : `<html><body><h1>Ceramic Mug</h1><p>A ceramic mug</p><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name: product.name, brand: state.brand, description: product.description, offers: { "@type": "Offer", price: state.price, priceCurrency: product.currency } })}</script></body></html>`,
      },
    };
  },
}));
spyOn(globalThis, "fetch").mockImplementation(
  Object.assign(
    async () => {
      throw new Error("Unexpected live network call");
    },
    { preconnect: () => {} },
  ),
);
const Product = await import(
  "@/server/utils/outbound/sequence-refresh-product"
);
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const same = value(await Product.check(input));
assert.equal(same.status, "same");
assert.deepEqual(same.observed, product);
assert.equal(same.receipt?.mode, "raw-html-positive-observation");
assert.match(same.receipt?.sha256 ?? "", /^[0-9a-f]{64}$/);
assert.deepEqual(reads, ["https://example.test/robots.txt", product.url]);
state.price = 25;
assert.equal(value(await Product.check(input)).status, "changed");
state.price = 24;
state.brand = "Other Brand";
assert.notEqual(value(await Product.check(input)).status, "same");
state.brand = product.brand;
state.redirect = true;
assert.equal(value(await Product.check(input)).status, "unavailable");
state.redirect = false;
state.denied = true;
const before = reads.length;
assert.equal(value(await Product.check(input)).status, "unavailable");
assert.equal(reads.length, before + 1);
state.denied = false;
state.blocked = true;
assert.equal(value(await Product.check(input)).status, "unavailable");
console.log("Sequence product refresh contracts passed");
