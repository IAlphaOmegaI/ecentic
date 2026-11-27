import { expect, mock, test } from "bun:test";
import type { ShopperQueryReviewDependencies } from "@/server/utils/outbound/shopper-query";

mock.module("server-only", () => ({}));
const Capture = await import("@/server/utils/outbound/live-shopping");
const { heldBrowser } = await import("./helpers/outbound-held-review-fixture");
const context = (category: string, name: string, text: string) => {
  const product = { name, url: "https://example-store.test/products/item" };
  return {
    product,
    category,
    merchant: {
      name: "Example Store",
      domain: "example-store.test",
      aliases: [],
    },
    country: "US",
    browser: heldBrowser(product, text),
    deadline: Date.now() + 95000,
  };
};
const decision = (prompt: string, changes: Record<string, unknown> = {}) => ({
  status: "valid",
  reason:
    "Synthetic product is an obvious grounded candidate for this natural query.",
  checks: {
    naturalWordOrder: true,
    obviousProductCandidate: true,
    unbranded: true,
    productGrounding: true,
  },
  excerptIds: [JSON.parse(prompt).excerpts[0].id],
  ...changes,
});
const generate = async (
  input: ReturnType<typeof context>,
  question: string,
  category: string,
  attribute: string,
  review?: ShopperQueryReviewDependencies["review"],
) => {
  const generation = mock(async ({ prompt }: { prompt: string }) => ({
    question,
    category,
    attribute,
    excerptIds: [JSON.parse(prompt).excerpts[0].id],
  }));
  const judgment = mock(review ?? (async ({ prompt }) => decision(prompt)));
  const result = await Capture.generateShopperQuery(input, {
    generate: generation,
    review: judgment,
  });
  return { result, generation, judgment };
};
for (const fixture of [
  {
    saved: "nightstand",
    name: "Bleached Walnut Nightstand",
    text: "This nightstand has a bleached walnut finish.",
    query: "bleached walnut nightstand",
    category: "nightstand",
    attribute: "bleached walnut",
  },
  {
    saved: "lip gloss",
    name: "Ultra Plumping Lip Gloss",
    text: "This plumping lip gloss moisturizes lips.",
    query: "plumping lip gloss",
    category: "lip gloss",
    attribute: "plumping",
  },
  {
    saved: "jeans",
    name: "Bootcut Jeans",
    text: "These bootcut jeans use stretch denim.",
    query: "bootcut jeans",
    category: "jeans",
    attribute: "bootcut",
  },
  {
    saved: "upper control arm kit",
    name: "Tubular Upper Control Arm Kit",
    text: "This upper control arm kit fits Tacoma vehicles.",
    query: "Tacoma upper control arm",
    category: "upper control arm",
    attribute: "Tacoma",
  },
  {
    saved: "upper control arm kit",
    name: "Upper Control Arm Kit",
    text: "This upper control arm kit fits 2005 to 2023 Tacoma vehicles.",
    query: "upper control arm for 2005 to 2023 Tacoma",
    category: "upper control arm",
    attribute: "2005 to 2023 Tacoma",
  },
])
  test(`revised query: ${fixture.query}`, async () => {
    const input = context(fixture.saved, fixture.name, fixture.text);
    const checked = await generate(
      input,
      fixture.query,
      fixture.category,
      fixture.attribute,
    );
    expect(checked.result.success).toBe(true);
    if (!checked.result.success || checked.result.data.status !== "prepared")
      throw new Error(JSON.stringify(checked.result));
    expect(checked.result.data.query.contractVersion).toBe("shopper-query-v2");
    expect(
      Capture.validateShopperQuery({
        ...input,
        query: checked.result.data.query,
      }),
    ).toBeNull();
    expect(checked.generation).toHaveBeenCalledTimes(1);
    expect(checked.judgment).toHaveBeenCalledTimes(1);
  });
test("semantic checks reject awkward accessory drift and own model names with one repair", async () => {
  for (const item of [
    {
      category: "perfume",
      title: "Mini Perfume",
      text: "Mini perfume for your dance bag.",
      query: "mini perfume dance bag",
      selected: "mini perfume",
      attribute: "dance bag",
      reason: "Ambiguous accessory query; perfume is not an obvious candidate.",
      checks: {
        naturalWordOrder: false,
        obviousProductCandidate: false,
        unbranded: true,
        productGrounding: true,
      },
    },
    {
      category: "tote",
      title: "Marlow Tote",
      text: "This Marlow tote is made from linen.",
      query: "Marlow tote",
      selected: "tote",
      attribute: "Marlow",
      reason: "Marlow is the selected product model name.",
      checks: {
        naturalWordOrder: true,
        obviousProductCandidate: true,
        unbranded: false,
        productGrounding: true,
      },
    },
  ]) {
    const input = context(item.category, item.title, item.text);
    const checked = await generate(
      input,
      item.query,
      item.selected,
      item.attribute,
      async ({ prompt }) =>
        decision(prompt, {
          status: "invalid",
          reason: item.reason,
          checks: item.checks,
        }),
    );
    expect(checked.result.success && checked.result.data.status).toBe("held");
    expect(checked.generation).toHaveBeenCalledTimes(2);
    expect(checked.judgment).toHaveBeenCalledTimes(2);
  }
});
test("brand, word bounds, extra attributes and navigation fail before semantic spend", async () => {
  for (const item of [
    {
      text: "Example Store makes a linen tote.",
      query: "Example Store tote",
      category: "tote",
      attribute: "Example Store",
    },
    {
      text: "This small very light soft warm comfortable packable wool winter hat is washable.",
      query: "small very light soft warm comfortable packable wool winter hat",
      category: "hat",
      attribute: "small very light soft warm comfortable packable wool winter",
    },
    {
      text: "This soft warm hat is wool.",
      query: "soft warm hat",
      category: "hat",
      attribute: "warm",
    },
    {
      text: "This treadmill folds.\nCardio\nBLACK FRIDAY IS HERE!\nSHOP NOW",
      query: "cardio treadmill",
      category: "treadmill",
      attribute: "cardio",
    },
  ]) {
    const checked = await generate(
      context(item.category, "Generic Product", item.text),
      item.query,
      item.category,
      item.attribute,
    );
    expect(checked.result.success && checked.result.data.status).toBe("held");
    expect(checked.judgment).toHaveBeenCalledTimes(0);
  }
});
test("old queries remain immutable and review fingerprints replay without a model", async () => {
  const input = context(
    "nightstand",
    "Bleached Walnut Nightstand",
    "A bleached walnut nightstand.",
  );
  const excerpts = Capture.shopperQueryExcerpts(input);
  if (!excerpts?.length) throw new Error("Missing synthetic source.");
  const query = Capture.preparedQuerySchema.parse({
    product: input.product,
    category: input.category,
    country: "US",
    surface: "google_ai_mode",
    prompt: "bleached walnut nightstand",
    intent: "unbranded-specific",
    merchant: input.merchant,
    basis: {
      category: "nightstand",
      attribute: "bleached walnut",
      excerpts: [excerpts[0]],
      promptHash: "a".repeat(64),
    },
  });
  const original = structuredClone(query);
  const checked = await Capture.reviewShopperQuery(
    { ...input, query },
    { review: async ({ prompt }) => decision(prompt) },
  );
  expect(checked.success).toBe(true);
  if (!checked.success) throw checked.error;
  expect(query).toEqual(original);
  expect(query.review).toBeUndefined();
  expect(
    Capture.validateShopperQueryReview({
      ...input,
      query,
      review: checked.data,
    }),
  ).toBeNull();
  expect(
    Capture.validateShopperQueryReview({
      ...input,
      query: { ...query, prompt: "walnut nightstand" },
      review: checked.data,
    }),
  ).not.toBeNull();
  expect(
    Capture.validateShopperQueryReview({
      ...input,
      query,
      review: { ...checked.data, captureHash: "0".repeat(64) },
    }),
  ).not.toBeNull();
  expect(
    Capture.validateShopperQueryReview({
      ...input,
      query,
      review: {
        ...checked.data,
        reviewedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      },
    }),
  ).not.toBeNull();
  expect(
    Capture.validateShopperQuery({
      ...input,
      query: { ...query, contractVersion: "shopper-query-v2" },
    }),
  ).toContain("semantic");
});
test("interrupted, uncertain and invented-proof reviews cannot silently regenerate", async () => {
  const input = context("jeans", "Bootcut Jeans", "Bootcut jeans in denim.");
  for (const review of [
    async () => {
      throw new Error("Synthetic interrupted query review");
    },
    async ({ prompt }: { prompt: string }) =>
      decision(prompt, { excerptIds: ["invented"] }),
  ]) {
    const checked = await generate(
      input,
      "bootcut jeans",
      "jeans",
      "bootcut",
      review,
    );
    expect(checked.result.success).toBe(false);
    expect(checked.generation).toHaveBeenCalledTimes(1);
    expect(checked.judgment).toHaveBeenCalledTimes(1);
  }
  const uncertain = await generate(
    input,
    "bootcut jeans",
    "jeans",
    "bootcut",
    async ({ prompt }) =>
      decision(prompt, {
        status: "uncertain",
        reason: "The selected product identity is unclear.",
        checks: {
          naturalWordOrder: true,
          obviousProductCandidate: false,
          unbranded: true,
          productGrounding: false,
        },
      }),
  );
  expect(uncertain.result.success && uncertain.result.data.status).toBe("held");
  expect(uncertain.generation).toHaveBeenCalledTimes(1);
  expect(uncertain.judgment).toHaveBeenCalledTimes(1);
});
test("invalid review bindings authorize only an intact correction audit, never reuse", async () => {
  const input = context(
    "perfume",
    "Mini Perfume",
    "Mini perfume for your dance bag.",
  );
  const excerpts = Capture.shopperQueryExcerpts(input);
  if (!excerpts?.length) throw new Error("Missing synthetic source.");
  const query = Capture.preparedQuerySchema.parse({
    product: input.product,
    category: input.category,
    country: "US",
    surface: "google_ai_mode",
    prompt: "mini perfume dance bag",
    intent: "unbranded-specific",
    merchant: input.merchant,
    basis: {
      category: "mini perfume",
      attribute: "dance bag",
      excerpts: [excerpts[0]],
      promptHash: "a".repeat(64),
    },
  });
  const checked = await Capture.reviewShopperQuery(
    { ...input, query },
    {
      review: async ({ prompt }) =>
        decision(prompt, {
          status: "invalid",
          reason: "Accessory intent makes the perfume an unclear candidate.",
          checks: {
            naturalWordOrder: false,
            obviousProductCandidate: false,
            unbranded: true,
            productGrounding: true,
          },
        }),
    },
  );
  if (!checked.success) throw checked.error;
  expect(
    Capture.validateShopperQueryReviewBinding({
      ...input,
      query,
      review: checked.data,
    }),
  ).toBeNull();
  expect(
    Capture.validateShopperQueryReview({
      ...input,
      query,
      review: checked.data,
    }),
  ).toBe(checked.data.reason);
  expect(
    Capture.validateShopperQueryReviewBinding({
      ...input,
      category: "atomizer",
      query,
      review: checked.data,
    }),
  ).not.toBeNull();
  expect(
    Capture.validateShopperQueryReviewBinding({
      ...input,
      query,
      review: { ...checked.data, status: "valid" },
    }),
  ).not.toBeNull();
  const malformed = structuredClone(input.browser);
  const originalRaw = malformed.raw[0];
  if (!originalRaw) throw new Error("Missing synthetic raw capture.");
  originalRaw.body += "tampered";
  expect(
    Capture.validateShopperQueryReviewBinding({
      ...input,
      browser: malformed,
      query,
      review: checked.data,
    }),
  ).not.toBeNull();

  const rejected = await Capture.reviewShopperQuery(
    { ...input, query: { ...query, prompt: "mini perfume dance bag?" } },
    {
      review: async () => {
        throw new Error("Must not call semantic reviewer");
      },
    },
  );
  if (!rejected.success) throw rejected.error;
  expect(rejected.data.method).toBe("deterministic");
  expect(
    Capture.validateShopperQueryReviewBinding({
      ...input,
      query: { ...query, prompt: "mini perfume dance bag?" },
      review: rejected.data,
    }),
  ).toBeNull();
  expect(
    Capture.validateShopperQueryReviewBinding({
      ...input,
      query: { ...query, prompt: "mini perfume dance bag?" },
      review: { ...rejected.data, reason: "Different rejection" },
    }),
  ).not.toBeNull();
});
test("review binds replayed product proof while later comparison pages remain independent", async () => {
  const input = context("jeans", "Bootcut Jeans", "Bootcut jeans in denim.");
  const checked = await generate(input, "bootcut jeans", "jeans", "bootcut");
  if (!checked.result.success || checked.result.data.status !== "prepared")
    throw new Error("Expected prepared fixture");
  const query = checked.result.data.query;
  const comparison = heldBrowser(
    { name: "Other Jeans", url: "https://another-store.test/jeans" },
    "Other jeans in denim.",
  );
  const comparisonSource = comparison.sources[0];
  const comparisonRaw = comparison.raw[0];
  if (!comparisonSource || !comparisonRaw)
    throw new Error("Missing comparison fixture.");
  const browser = {
    ...input.browser,
    sources: [
      ...input.browser.sources,
      { ...comparisonSource, id: "comparison-browser" },
    ],
    raw: [...input.browser.raw, comparisonRaw],
    candidates: [
      {
        name: "Another Store",
        product: "Other Jeans",
        url: "https://another-store.test/jeans",
        sourceIds: ["comparison-browser"],
      },
    ],
    limitations: ["Comparison page is separately captured."],
  };
  expect(Capture.validateShopperQuery({ ...input, browser, query })).toBeNull();
  expect(
    Capture.shopperQueryReviewBinding({ ...input, browser, query }),
  ).toEqual(Capture.shopperQueryReviewBinding({ ...input, query }));
  const changed = heldBrowser(
    input.product,
    "New bootcut jeans in denim with changed product evidence.",
  );
  expect(
    Capture.validateShopperQuery({ ...input, browser: changed, query }),
  ).not.toBeNull();
});

test("an old ordinary subtype remains eligible without rewriting its narrower historical basis", async () => {
  const input = context(
    "sweatshirt",
    "Yemi Unisex Sweatshirt Brown",
    "Yemi unisex sweatshirt in brown.",
  );
  const excerpts = Capture.shopperQueryExcerpts(input);
  if (!excerpts?.[0]) throw new Error("Missing source");
  const query = Capture.preparedQuerySchema.parse({
    product: input.product,
    category: input.category,
    country: "US",
    surface: "google_ai_mode",
    prompt: "brown unisex sweatshirt",
    intent: "unbranded-specific",
    merchant: input.merchant,
    basis: {
      category: "sweatshirt",
      attribute: "brown",
      excerpts: [excerpts[0]],
      promptHash: "a".repeat(64),
    },
  });
  const original = structuredClone(query);
  const reviewer = mock(async ({ prompt }: { prompt: string }) =>
    decision(prompt),
  );
  const reviewed = await Capture.reviewShopperQuery(
    { ...input, query },
    { review: reviewer },
  );
  if (!reviewed.success) throw reviewed.error;
  expect(reviewer).toHaveBeenCalledTimes(1);
  expect(
    Capture.validateShopperQueryReview({
      ...input,
      query,
      review: reviewed.data,
    }),
  ).toBeNull();
  expect(query).toEqual(original);
});

test("revised broader-query guidance permits a grounded attribute without forcing an occasion", async () => {
  const input = {
    ...context(
      "beef jerky",
      "Original Beef Jerky",
      "This beef jerky is slow-smoked. 0g sugar.",
    ),
    intent: "unbranded-broad" as const,
    previousQuestion: "0g sugar beef jerky",
  };
  const generation = mock(async ({ prompt }: { prompt: string }) => ({
    question: "smoked beef jerky",
    category: "beef jerky",
    attribute: "smoked",
    excerptIds: [JSON.parse(prompt).excerpts[0].id],
  }));
  const review = mock(async ({ prompt }: { prompt: string }) =>
    decision(prompt),
  );
  const revised = await Capture.generateShopperQuery(input, {
    generate: generation,
    review,
  });
  expect(revised.success && revised.data.status).toBe("prepared");
  expect(generation).toHaveBeenCalledTimes(1);
  expect(review).toHaveBeenCalledTimes(1);
  const revisedRequest = generation.mock.calls[0]?.[0];
  if (!revisedRequest) throw new Error("Missing generated-query prompt.");
  expect(JSON.parse(revisedRequest.prompt).broadSearchRule).toBe(
    "Use the product category plus one broader grounded attribute or use in natural word order. An occasion is optional; do not force a use or occasion when an attribute is sufficient. Keep the exact product an obvious candidate and do not repeat the previous question.",
  );
  await Capture.generateLegacyShopperQuery(input, { generate: generation });
  const legacyRequest = generation.mock.calls[1]?.[0];
  if (!legacyRequest) throw new Error("Missing historical-query prompt.");
  expect(JSON.parse(legacyRequest.prompt).broadSearchRule).toBe(
    "Use a broader supported use or occasion while retaining the product category and all unbranded checks. Do not repeat the previous question.",
  );
});
