import { expect, mock, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import type { Evidence } from "@/server/utils/outbound/shopping-assessment";
import { buildSyntheticShoppingCapture } from "./helpers/outbound-shopping-fixture";

mock.module("server-only", () => ({}));
const Capture = await import("@/server/utils/outbound/live-shopping");
const Review = await import(
  "@/server/utils/outbound/shopping-discovery-review"
);
const Assessment = await import("@/server/utils/outbound/shopping-assessment");
const { heldBrowser } = await import("./helpers/outbound-held-review-fixture");
const version = Capture.SHOPPER_QUERY_ROUND3_VERSION;
const decision = (prompt: string) => ({
  status: "valid" as const,
  reason: "Synthetic exact product is an obvious grounded candidate.",
  checks: {
    naturalWordOrder: true,
    obviousProductCandidate: true,
    unbranded: true,
    productGrounding: true,
  },
  excerptIds: [JSON.parse(prompt).excerpts[0].id],
});
const context = (category: string, name: string, text: string) => {
  const product = { name, url: "https://samplegoods.test/products/item" };
  return {
    product,
    category,
    merchant: { name: "Sample Goods", domain: "samplegoods.test", aliases: [] },
    browser: heldBrowser(product, text),
    country: "US",
    contractVersion: "shopper-query-v3" as const,
    deadline: Date.now() + 90000,
  };
};
const correctingSelection = (prompt: string) => ({
  ...decision(prompt),
  category: "concealer",
  attribute: "color correcting",
});

test("v3 grounds the exact correcting query in saved product-body corrects without rewriting evidence", async () => {
  const input = {
    ...context(
      "concealer",
      "Synthetic HD Corrector",
      [
        "Synthetic HD Corrector",
        "A lightweight, creamy formula that color corrects, conceals, contours, and highlights.",
        "These concealers provide buildable coverage.",
        "Details",
        "Twelve targeted correcting shades and a built-in brush applicator.",
      ].join("\n"),
    ),
    question: "color correcting concealer",
  };
  const before = JSON.stringify(input);
  const excerpts = Capture.shopperQueryExcerpts(input);
  if (!excerpts)
    throw new Error("The synthetic rendered product must have excerpts.");
  const review = mock(async ({ prompt }: { prompt: string }) =>
    correctingSelection(prompt),
  );
  const result = await Capture.prepareShopperQuery(input, { review });
  if (!result.success || result.data.status !== "prepared")
    throw new Error(JSON.stringify(result));
  expect(result.data.query.prompt).toBe(input.question);
  expect(result.data.query.basis?.excerpts).toEqual(excerpts);
  expect(result.data.generation.attempts).toBe(0);
  expect(
    Capture.validateShopperQuery({ ...input, query: result.data.query }),
  ).toBeNull();
  expect(review).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(input)).toBe(before);

  // A legacy caller cannot acquire the new grammatical equivalence through an injected review.
  const legacyContext = { ...input, contractVersion: undefined };
  const generate = mock(async ({ prompt }: { prompt: string }) => ({
    question: input.question,
    category: "concealer",
    attribute: "color correcting",
    excerptIds: decision(prompt).excerptIds,
  }));
  const legacyReview = mock(async ({ prompt }: { prompt: string }) =>
    decision(prompt),
  );
  for (const prepare of [
    Capture.generateLegacyShopperQuery,
    Capture.generateShopperQuery,
  ]) {
    const legacy = await prepare(legacyContext, {
      generate,
      review: legacyReview,
    });
    expect(legacy.success && legacy.data.status).toBe("held");
  }
  expect(legacyReview).toHaveBeenCalledTimes(0);
  expect(JSON.stringify(input)).toBe(before);
});

for (const sample of [
  {
    label: "navigation beside a campaign",
    text: "Color corrects\nBLACK FRIDAY\nShop sale\nSynthetic HD Corrector\nA creamy concealer blends smoothly.",
  },
  {
    label: "unsupported correcting attribute",
    text: "This creamy concealer has color options and blends smoothly.",
  },
  {
    label: "a reversed phrase",
    text: "This concealer corrects color before makeup.",
  },
  {
    label: "a different category",
    text: "This serum color corrects and blends smoothly.",
  },
  {
    label: "a noun outside the two verb forms",
    text: "This concealer offers color correction.",
  },
])
  test(`v3 inflection does not admit ${sample.label}`, async () => {
    const input = {
      ...context("concealer", "Synthetic HD Corrector", sample.text),
      question: "color correcting concealer",
    };
    const review = mock(async ({ prompt }: { prompt: string }) =>
      correctingSelection(prompt),
    );
    const result = await Capture.prepareShopperQuery(input, { review });
    expect(result.success && result.data.status).toBe("held");
    expect(review).toHaveBeenCalledTimes(1);
  });

test("v3 inflection preserves semantic rejection of an unrelated product and merchant-name exclusions", async () => {
  const input = {
    ...context(
      "concealer",
      "Synthetic HD Corrector",
      "This concealer blends smoothly. A related serum color corrects.",
    ),
    question: "color correcting concealer",
  };
  const result = await Capture.prepareShopperQuery(input, {
    review: async ({ prompt }) => ({
      ...correctingSelection(prompt),
      status: "invalid",
      reason: "Only the related serum has the correcting property.",
      checks: { ...decision(prompt).checks, productGrounding: false },
    }),
  });
  expect(result.success && result.data.status).toBe("held");
  expect(
    result.success && result.data.status === "held" && result.data.reason,
  ).toContain("related serum");
  const branded = {
    ...context(
      "concealer",
      "Synthetic HD Corrector",
      "This concealer color corrects.",
    ),
    question: input.question,
    merchant: { ...input.merchant, name: "Correcting Co" },
  };
  const rejected = await Capture.prepareShopperQuery(branded, {
    review: async ({ prompt }) => correctingSelection(prompt),
  });
  expect(
    rejected.success && rejected.data.status === "held" && rejected.data.reason,
  ).toContain("brand");
});

for (const selected of [
  {
    question: "color correcting concealer",
    category: "concealer",
    attribute: "color correcting",
    text: "This color correcting concealer blends smoothly.",
    intent: "unbranded-specific" as const,
  },
  {
    question: "beef jerky",
    category: "beef jerky",
    attribute: "",
    text: "This beef jerky is slow-smoked.",
    intent: "unbranded-broad" as const,
  },
  {
    question: "small hair ties",
    category: "hair ties",
    attribute: "small",
    text: "These small hair ties are washable.",
    intent: "unbranded-specific" as const,
  },
  {
    question: "skis",
    category: "skis",
    attribute: "",
    text: "These skis are made for all-mountain use.",
    intent: "unbranded-broad" as const,
  },
])
  test(`round3 exact phrase remains unchanged: ${selected.question}`, async () => {
    const input = {
      ...context(
        selected.category,
        `Synthetic ${selected.category}`,
        selected.text,
      ),
      question: selected.question,
      intent: selected.intent,
    };
    const before = JSON.stringify(input);
    const reviewed = mock(async ({ prompt }: { prompt: string }) => ({
      ...decision(prompt),
      category: selected.category,
      attribute: selected.attribute,
    }));
    const prepared = await Capture.prepareShopperQuery(input, {
      review: reviewed,
    });
    if (!prepared.success || prepared.data.status !== "prepared")
      throw new Error(JSON.stringify(prepared));
    expect(prepared.data.generation.attempts).toBe(0);
    expect(prepared.data.query.prompt).toBe(selected.question);
    expect(prepared.data.query.contractVersion).toBe(version);
    expect(prepared.data.query.review?.version).toBe(version);
    expect(
      Capture.validateShopperQuery({ ...input, query: prepared.data.query }),
    ).toBeNull();
    expect(reviewed).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(input)).toBe(before);
  });

test("round3 category-alone generation is explicit; v2 still requires one attribute", async () => {
  const input = {
    ...context("beef jerky", "Beef Jerky", "This beef jerky is smoked."),
    intent: "unbranded-broad" as const,
  };
  const generate = mock(async ({ prompt }: { prompt: string }) => ({
    question: "beef jerky",
    category: "beef jerky",
    attribute: "",
    excerptIds: decision(prompt).excerptIds,
  }));
  const review = mock(async ({ prompt }: { prompt: string }) =>
    decision(prompt),
  );
  const prepared = await Capture.generateShopperQuery(input, {
    generate,
    review,
  });
  if (!prepared.success || prepared.data.status !== "prepared")
    throw new Error(JSON.stringify(prepared));
  expect(generate).toHaveBeenCalledTimes(1);
  expect(review).toHaveBeenCalledTimes(1);
  const legacy = await Capture.generateShopperQuery(
    { ...input, contractVersion: undefined },
    { generate, review },
  );
  expect(legacy.success && legacy.data.status).toBe("held");
  expect(review).toHaveBeenCalledTimes(1);
  expect(
    Capture.validateShopperQuery({
      ...input,
      contractVersion: undefined,
      query: {
        ...prepared.data.query,
        contractVersion: "shopper-query-v2",
        review: undefined,
      },
    }),
  ).not.toBeNull();
});

test("exact-query rejection and interruption never regenerate or repair", async () => {
  const input = {
    ...context(
      "perfume",
      "Mini Perfume",
      "Mini perfume is carried in a dance bag.",
    ),
    question: "mini perfume dance bag",
  };
  const rejected = mock(async ({ prompt }: { prompt: string }) => ({
    ...decision(prompt),
    category: "perfume",
    attribute: "dance bag",
    status: "invalid",
    checks: { ...decision(prompt).checks, obviousProductCandidate: false },
    reason: "This exact phrase searches accessories rather than perfume.",
  }));
  const result = await Capture.prepareShopperQuery(input, { review: rejected });
  expect(result.success && result.data.status).toBe("held");
  expect(result.success && result.data.generation.attempts).toBe(0);
  expect(rejected).toHaveBeenCalledTimes(1);
  const interrupted = mock(async () => {
    throw new Error("Synthetic interrupted review");
  });
  expect(
    (await Capture.prepareShopperQuery(input, { review: interrupted })).success,
  ).toBe(false);
  expect(interrupted).toHaveBeenCalledTimes(1);
});

const fixture = async (answerText: string, product = "Marlow Tote") => {
  const captured = await buildSyntheticShoppingCapture({
    prospect: {
      company: "Sample Goods",
      domain: "samplegoods.test",
      product,
      productUrl: `https://samplegoods.test/products/${product.replaceAll(" ", "-").toLowerCase()}`,
    },
    pageText: `${product} is a large linen bag. This linen bag is washable.`,
    answerText,
  });
  const query = captured.evidence.answer.job.query;
  if (!query.merchant) throw new Error("Missing synthetic merchant");
  const reviewed = await Capture.reviewShopperQuery(
    {
      product: query.product,
      category: query.category,
      merchant: query.merchant,
      query,
      browser: captured.evidence.browser,
      deadline: Date.now() + 40000,
    },
    { review: async ({ prompt }) => decision(prompt) },
  );
  if (!reviewed.success) throw reviewed.error;
  return { ...captured.evidence, queryReview: reviewed.data };
};
const broad = async (previous: Evidence, answerText: string) => {
  const old = previous.answer.job.query;
  if (!old.merchant) throw new Error("Missing merchant");
  const prepared = await Capture.prepareShopperQuery(
    {
      product: old.product,
      category: old.category,
      merchant: old.merchant,
      browser: previous.browser,
      country: old.country,
      question: "linen bags",
      intent: "unbranded-broad",
      contractVersion: version,
      deadline: Date.now() + 40000,
    },
    {
      review: async ({ prompt }) => ({
        ...decision(prompt),
        category: "linen bags",
        attribute: "",
      }),
    },
  );
  if (!prepared.success || prepared.data.status !== "prepared")
    throw new Error(JSON.stringify(prepared));
  const job = {
    id: randomUUID(),
    query: prepared.data.query,
    submittedAt: new Date().toISOString(),
  };
  const polled = await Capture.pollQuery(
    { apiKey: "synthetic", job },
    {
      request: async () => ({
        success: true,
        data: Response.json({
          job_id: job.id,
          status: "done",
          scraper: job.query.surface,
          prompt: job.query.prompt,
          country: job.query.country,
          completed_at: new Date().toISOString(),
          result: {
            scraper: job.query.surface,
            status: "done",
            cached: false,
            result_markdown: answerText,
            citations: [],
          },
        }),
      }),
    },
  );
  if (!polled.success || polled.data.status !== "captured")
    throw new Error(JSON.stringify(polled));
  return {
    answer: polled.data.capture,
    browser: previous.browser,
    previous: [previous],
  };
};

test("a separate v3 review never rewrites an old query or its v2 review hashes", async () => {
  const old = await fixture("Alder and Birch offer bags.");
  const query = old.answer.job.query;
  if (!query.merchant) throw new Error("Missing merchant");
  const frozen = JSON.stringify(old);
  const context = {
    product: query.product,
    category: query.category,
    merchant: query.merchant,
    browser: old.browser,
    query,
  };
  const reviewed = await Capture.reviewShopperQuery(
    { ...context, contractVersion: version, deadline: Date.now() + 30000 },
    { review: async ({ prompt }) => decision(prompt) },
  );
  if (!reviewed.success) throw reviewed.error;
  expect(reviewed.data.version).toBe(version);
  expect(reviewed.data.queryHash).toBe(old.queryReview.queryHash);
  expect(reviewed.data.contextHash).not.toBe(old.queryReview.contextHash);
  expect(
    Capture.validateShopperQueryReview({ ...context, review: reviewed.data }),
  ).toBeNull();
  expect(
    Capture.validateShopperQueryReview({ ...context, review: old.queryReview }),
  ).toBeNull();
  expect(
    Capture.validateShopperQueryReview({
      ...context,
      review: { ...reviewed.data, version: "shopper-query-v2" },
    }),
  ).not.toBeNull();
  expect(JSON.stringify(old)).toBe(frozen);
});

test("v3 broad whole-answer presence repeats an informational mention without rank", async () => {
  const first = await fixture(
    "Sample Goods also makes linen bags. This is an informational overview without ranked recommendations.",
  );
  expect(Review.inspectDiscoveryPresence(first)).toMatchObject({
    status: "verified",
    canBroaden: false,
    merchantCardPresent: false,
  });
  const second = await broad(
    first,
    "Sample Goods offers linen bags. Alternatives include Alder and Birch.",
  );
  const frozen = JSON.stringify(second);
  const projected = Review.projectRepeatedPresence(second);
  if (projected.status !== "researched") throw new Error(projected.reason);
  expect(projected.receipt.discovery).toMatchObject({
    merchantPresent: true,
    merchantPosition: null,
    totalListed: null,
    order: "unranked",
    noGapProof: { version: "repeated-presence-v2" },
  });
  expect(
    Assessment.validateAutomaticResearch(second, projected.receipt, 7),
  ).toBeNull();
  expect(
    projected.receipt.claims?.some((claim) =>
      ["position", "count"].includes(claim.kind),
    ),
  ).toBe(false);
  expect(JSON.stringify(second)).toBe(frozen);
  const tampered = structuredClone(projected.receipt);
  if (!tampered.discovery?.noGapProof)
    throw new Error("Missing repeated proof");
  tampered.discovery.noGapProof.version = "repeated-presence-v1";
  expect(
    Assessment.validateAutomaticResearch(second, tampered, 7),
  ).not.toBeNull();
  const unrelated = await fixture(
    "Sample Goods appears here.",
    "Different Product",
  );
  expect(
    Review.projectRepeatedPresence({ ...second, previous: [unrelated] }).status,
  ).toBe("held");
});

test("two old products and a failed purchase stay audit-only, with no invented answer", async () => {
  const prior = await fixture("Sample Goods is present.", "Old Tote");
  const other = await fixture("Sample Goods is present.", "Older Tote");
  const current = await fixture(
    "Alder and Birch offer linen bags.",
    "New Tote",
  );
  const failedJob = { ...prior.answer.job, id: randomUUID() };
  const body = JSON.stringify({ job_id: failedJob.id, status: "failed" });
  const raw = {
    url: `https://app.scrapellm.com/api/v1/scrape/${failedJob.id}`,
    status: 200,
    body,
    sha256: createHash("sha256").update(body).digest("hex"),
    receivedAt: new Date().toISOString(),
  };
  const evidence: Evidence = {
    ...current,
    previous: [prior, other],
    priorPurchases: [
      {
        job: failedJob,
        status: "failed",
        reason: "Synthetic failed provider response.",
        raw: [raw],
      },
    ],
  };
  const frozen = JSON.stringify(evidence);
  const projected = Review.projectUnrankedDiscoveryAbsence(evidence);
  if (projected.status !== "researched") throw new Error(projected.reason);
  expect(projected.receipt.captureHistory).toHaveLength(2);
  expect(projected.receipt.purchaseHistory).toHaveLength(1);
  expect(projected.receipt.purchaseHistory?.[0]).toMatchObject({
    auditOnly: true,
    jobId: failedJob.id,
    status: "failed",
  });
  expect(projected.receipt.sources).toEqual([
    current.answer.source,
    ...current.browser.sources,
  ]);
  expect(projected.receipt.captureHistory?.[0]?.sources).toEqual([
    prior.answer.source,
    ...prior.browser.sources,
  ]);
  expect(
    Assessment.validateAutomaticResearch(evidence, projected.receipt, 7),
  ).toBeNull();
  const tampered = structuredClone(projected.receipt);
  const purchase = tampered.purchaseHistory?.[0];
  if (!purchase) throw new Error("Missing prior purchase audit");
  purchase.reason = "Changed failure";
  expect(
    Assessment.validateAutomaticResearch(evidence, tampered, 7),
  ).not.toBeNull();
  expect(() =>
    Review.appendCaptureHistory(
      projected.receipt,
      evidence.previous,
      Date.now(),
      [
        {
          job: current.answer.job,
          status: "failed",
          reason:
            "Contradictory synthetic failure of the current completed job.",
          raw: current.answer.raw,
        },
      ],
    ),
  ).toThrow("Prior purchases must be distinct from completed captures.");
  expect(JSON.stringify(evidence)).toBe(frozen);
});
