import { expect, mock, test } from "bun:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  buildSyntheticShoppingCapture,
  buildSyntheticShoppingEvidence,
} from "./helpers/outbound-shopping-fixture";
import { writerFixture } from "./helpers/outbound-writer-fixture";

mock.module("server-only", () => ({}));
const Listings = await import(
  "@/server/utils/outbound/shopping-product-listings"
);
const Assessment = await import("@/server/utils/outbound/shopping-assessment");
const Capture = await import("@/server/utils/outbound/live-shopping");
const prospect = {
  company: "Synthetic Shop",
  domain: "synthetic.test",
  product: "Marlow Tote",
  productUrl: "https://synthetic.test/products/tote",
};
const capture = (answerText: string) =>
  buildSyntheticShoppingCapture({ prospect, answerText });
const shopUrl =
  "https://www.google.com/search?ibp=oshop&prds=catalogid:123,productDocid:456&q=product";
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

test("plain product links qualify without product-brand attribution or global ranking", async () => {
  const text = `### Featured options\n- **[Mountain River Kit](${shopUrl})** from [Synthetic Seller](https://www.google.com/goto?url=opaque).\n### Kit contents\n- Canvas\n- Pen`;
  const saved = await capture(text);
  const result = Listings.inspectAnswerProductListings(saved.evidence.answer);
  expect(result.status).toBe("eligible");
  if (result.status !== "eligible") throw new Error(result.reason);
  expect(result.proof.entries).toHaveLength(1);
  const entry = result.proof.entries[0];
  assert.ok(entry);
  expect(entry.title).toBe("Mountain River Kit");
  expect(entry.url).toBe(shopUrl);
  expect(entry.rawHash).toBe(digest(text.slice(entry.start, entry.end)));
  expect(entry).not.toHaveProperty("rank");
  expect(entry).not.toHaveProperty("brand");
  expect(result.proof).not.toHaveProperty("totalListed");
});

test("recipes, citations, seller redirects and unlinked product names are No gap found", async () => {
  for (const text of [
    "### Homemade jam\n- Bacon\n- Jalapeños\nCook until thick.",
    "- [Recipe](https://recipes.example/recipes/bacon-jam)",
    "- [Synthetic Seller](https://www.google.com/goto?url=opaque)",
    "Canvas Works and Harbor Label sell bags.\nSources: [1](https://shop.example/products/bag)",
  ]) {
    const saved = await capture(text);
    expect(
      Listings.inspectAnswerProductListings(saved.evidence.answer),
    ).toEqual({ status: "no-gap", reason: Listings.NO_LINKED_PRODUCTS_REASON });
  }
});

test("strict product cards qualify, while a changed raw response remains held", async () => {
  const text = `<div html-index="1" style="display:flex;align-items:center;gap:12px;padding:10px">
<img src="data:image/jpeg;base64,AA==" alt="Synthetic Tote" width="120" height="auto" style="object-fit:cover;border-radius:0.5rem;" />
<div style="flex:1"><div style="font-weight:bold"><a href="https://shop.example/item?tote">Synthetic Tote</a></div>
<div style="margin-top:4px;font-size:18px">$30<span style="text-decoration:line-through;">$40</span></div>
<div>Synthetic Seller</div><div> </div></div><div style="display:none">00000000000000000000000000000001</div></div>`;
  const saved = await capture(text);
  expect(
    Listings.inspectAnswerProductListings(saved.evidence.answer).status,
  ).toBe("eligible");
  const changed = structuredClone(saved.evidence.answer);
  const raw = changed.raw[0];
  assert.ok(raw);
  raw.body += " ";
  expect(Listings.inspectAnswerProductListings(changed).status).toBe("held");
});

test("new additive proof replays exactly and never changes a historical receipt", async () => {
  const saved = await buildSyntheticShoppingEvidence({
    prospect,
    answerText: `1. Canvas Works — Large carry bag.\n2. Harbor Label — Cotton shopper.\n3. [Synthetic Tote](${shopUrl})`,
  });
  const original = JSON.stringify(saved.receipt);
  const projected = Listings.projectProductListingProof(
    saved.evidence,
    saved.receipt,
  );
  expect(projected.status).toBe("eligible");
  if (projected.status !== "eligible") throw new Error("Expected proof");
  expect(JSON.stringify(saved.receipt)).toBe(original);
  expect(
    Assessment.validateAutomaticResearch(saved.evidence, saved.receipt, 7),
  ).toBeNull();
  expect(
    Assessment.validateAutomaticResearch(saved.evidence, projected.receipt, 7),
  ).toBeNull();
  const entry = projected.receipt.discovery?.productListings?.entries[0];
  assert.ok(entry);
  entry.url = "https://other.example/products/unobserved";
  expect(
    Assessment.validateAutomaticResearch(saved.evidence, projected.receipt, 7),
  ).toContain("linked-product proof changed");
});

test("new assessment stops a recipe-only absence before a writer or brand selector", async () => {
  const saved = await capture(
    "A reusable bag carries groceries. Choose a bag with comfortable handles.",
  );
  const query = saved.evidence.answer.job.query;
  assert.ok(query.merchant);
  const reviewed = await Capture.reviewShopperQuery(
    {
      query,
      product: query.product,
      category: query.category,
      merchant: query.merchant,
      browser: saved.evidence.browser,
      deadline: Date.now() + 40000,
    },
    {
      review: async ({ prompt }) => ({
        status: "valid",
        reason: "Synthetic product fit.",
        checks: {
          naturalWordOrder: true,
          obviousProductCandidate: true,
          unbranded: true,
          productGrounding: true,
        },
        excerptIds: [JSON.parse(prompt).excerpts[0].id],
      }),
    },
  );
  if (!reviewed.success) throw reviewed.error;
  const result = await Assessment.assess(
    {
      ...saved.evidence,
      queryReview: reviewed.data,
      playbook: writerFixture().policy,
      deadline: Date.now() + 40000,
    },
    {
      generate: async () => {
        throw new Error("No fact call expected");
      },
      brands: {
        generate: async () => {
          throw new Error("No brand call expected");
        },
      },
    },
  );
  expect(result.success).toBe(true);
  if (result.success)
    expect(result.data).toMatchObject({
      status: "held",
      reason: Listings.NO_LINKED_PRODUCTS_REASON,
    });
});
