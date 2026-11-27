import { expect, mock, test } from "bun:test";
import { createHash } from "node:crypto";
import { defaultPlaybook } from "@/lib/outbound";
import { assembleSequence } from "@/lib/outbound-composition";
import {
  automaticAbsenceUseProblem,
  resultBrandNames,
} from "@/lib/outbound-shopping-research";
import {
  compatibleBrandSelection,
  compatibleSelectionFromPrompt,
} from "./helpers/outbound-product-use-fixture";
import {
  buildSyntheticShoppingCapture,
  syntheticWriterParts,
  syntheticWritingPolicy,
} from "./helpers/outbound-shopping-fixture";
import {
  passingCopyJudge,
  writerFixture,
} from "./helpers/outbound-writer-fixture";

mock.module("server-only", () => ({}));
const Review = await import(
  "@/server/utils/outbound/shopping-discovery-review"
);
const Use = await import("@/server/utils/outbound/shopping-product-use");
const Browser = await import("@/server/utils/outbound/live-shopping-browser");
const Capture = await import("@/server/utils/outbound/live-shopping");
const Assessment = await import("@/server/utils/outbound/shopping-assessment");
const Judge = await import("@/server/utils/outbound/copy-quality");

const card = (index: number, title: string) =>
  `<div html-index="${index}" style="display:flex;align-items:center;gap:12px;padding:10px"><img src="data:image/jpeg;base64,AA==" alt="${title}" width="120" height="auto" style="object-fit:cover;border-radius:0.5rem" /><div style="flex:1"><div style="font-weight:bold"><a href="https://example.test/products/${index}">${title}</a></div><div style="margin-top:4px;font-size:18px">$10<span style="text-decoration:line-through">$12</span></div><div>Synthetic Shop</div><div> </div></div><div style="display:none">${index.toString(16).padStart(32, "0")}</div></div>`;
const fixture = async (kind: "paint" | "drinks" = "paint") => {
  const product = {
    name: "Studio Mixing Tools",
    url: "https://samplegoods.test/products/mixing-tools",
  };
  const captured = await buildSyntheticShoppingCapture({
    prospect: {
      company: "Sample Goods",
      domain: "samplegoods.test",
      product: product.name,
      productUrl: product.url,
    },
    shopper: {
      question: "reusable stir stick set",
      category: "stir stick set",
      attribute: "reusable",
    },
    pageText:
      "Studio Mixing Tools. A reusable stir stick set. Menu: Cocktails. Home. Cart. Description: reusable tools for mixing acrylic paint in jars.",
    structured: [
      JSON.stringify({
        "@type": "Product",
        name: product.name,
        url: product.url,
        description:
          "Keep acrylic paint well blended with these reusable stir sticks. Designed for mixing colors in paint jars.",
      }),
      JSON.stringify({
        "@type": "Product",
        name: "Unrelated Barware",
        url: "https://samplegoods.test/products/other",
        description: "Mix drinks and cocktails.",
      }),
    ],
    answerText:
      kind === "paint"
        ? `#### Paint mixing tools\n\n${card(1, "Alder Paint Stir Stick Set")}\n\nReusable stirrers for blending acrylic paint in jars.\n\n${card(2, "Birch Reusable Paint Mixing Set")}\n\nTools for mixing paint colors.`
        : `#### Drink & Cocktail Stirrers\n\n${card(1, "Alder Glass Cocktail Stir Sticks")}\n\nFor cocktails and mocktails.\n\n${card(2, "Birch Stainless Steel Drink Stirrers")}\n\nFor home bars and entertaining.\n\n#### Resin & Craft Stir Sticks\n\n${card(3, "Cedar Silicone Craft Mixing Kit")}\n\nFor resin crafts.`,
  });
  const query = captured.evidence.answer.job.query;
  if (!query.merchant) throw new Error("Synthetic merchant missing.");
  const reviewed = await Capture.reviewShopperQuery(
    {
      product: query.product,
      category: query.category,
      merchant: query.merchant,
      browser: captured.evidence.browser,
      query,
      deadline: Date.now() + 40000,
    },
    {
      review: async ({ prompt }) => ({
        status: "valid",
        reason:
          "The synthetic reusable paint tool is a candidate for this literal product query.",
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
  const evidence = { ...captured.evidence, queryReview: reviewed.data };
  const base = Review.projectUnrankedDiscoveryAbsence(evidence);
  if (base.status !== "researched") throw new Error(base.reason);
  const catalog = Review.resultBrandCatalog(evidence);
  const selection = {
    decision: "supported" as const,
    reason: "Exact synthetic brands.",
    brands: ["Alder", "Birch"].map((name, index) => {
      const quote = catalog[index];
      if (!quote) throw new Error("Synthetic brand quote missing.");
      return { name, quoteId: quote.id };
    }),
  };
  return { evidence, base: base.receipt, catalog, selection };
};

test("an ambiguous reusable-tool query cannot turn barware into a paint-shopping absence", async () => {
  const value = await fixture("drinks");
  const before = JSON.stringify(value.evidence);
  const generate = mock(async ({ prompt }: { prompt: string }) => {
    const input = JSON.parse(prompt);
    expect(input.productUseEvidence.productExcerpts).toHaveLength(1);
    expect(input.productUseEvidence.productExcerpts[0].text).toContain(
      "acrylic paint",
    );
    expect(input.productUseEvidence.productExcerpts[0].text).not.toContain(
      "Menu",
    );
    expect(input.productUseEvidence.answerContexts[0].excerpt.text).toContain(
      "Drink & Cocktail Stirrers",
    );
    expect(input.productUseEvidence.answerContexts[0].excerpt.text).toContain(
      "cocktails and mocktails",
    );
    return {
      ...value.selection,
      productUse: {
        decision: "incompatible" as const,
        reason:
          "The selected answer products stir drinks; the merchant product mixes paint.",
        matches: [],
      },
    };
  });
  const result = await Review.assessResultBrands(
    { ...value.evidence, receipt: value.base, deadline: Date.now() + 40000 },
    { generate },
  );
  expect(generate).toHaveBeenCalledTimes(1);
  expect(result.success && result.data.status).toBe("held");
  if (!result.success || result.data.status !== "held")
    throw new Error("Expected use hold.");
  expect(result.data.reason).toContain("incompatible");
  expect(
    result.data.brandSelectionDiagnostics?.attempts[0]?.selection,
  ).toMatchObject({ productUse: { decision: "incompatible" } });
  expect("receipt" in result.data).toBe(false);
  expect(JSON.stringify(value.evidence)).toBe(before);
});

test("compatible use is replayable exact evidence and leaves the historical projection unchanged", async () => {
  const value = await fixture();
  const historical = Review.projectResultBrands(
    value.evidence,
    value.base,
    value.selection,
  );
  if (historical.status !== "researched") throw new Error(historical.reason);
  const original = JSON.stringify(historical.receipt);
  expect(automaticAbsenceUseProblem(historical.receipt)).toContain(
    "product-use",
  );
  const result = await Review.assessResultBrands(
    { ...value.evidence, receipt: value.base, deadline: Date.now() + 40000 },
    {
      generate: async ({ prompt }) =>
        compatibleSelectionFromPrompt(prompt, value.selection),
    },
  );
  if (!result.success || result.data.status !== "researched")
    throw new Error(JSON.stringify(result));
  const receipt = result.data.receipt;
  expect(receipt.discovery?.brandProjection?.version).toBe("answer-brands-v2");
  expect(resultBrandNames(receipt)).toEqual(["Alder", "Birch"]);
  expect(automaticAbsenceUseProblem(receipt)).toBeNull();
  expect(
    Assessment.validateAutomaticResearch(value.evidence, receipt, 7),
  ).toBeNull();
  expect(
    Assessment.validateAutomaticResearch(value.evidence, historical.receipt, 7),
  ).toBeNull();
  expect(JSON.stringify(historical.receipt)).toBe(original);
  const useProof = (copy: typeof receipt) => {
    const proof = copy.discovery?.productUseCompatibility;
    const first = proof?.matches[0];
    if (!proof || !first) throw new Error("Synthetic use proof missing.");
    return { proof, first };
  };
  for (const mutate of [
    (copy: typeof receipt) => {
      useProof(copy).first.productQuote = "Invented use";
    },
    (copy: typeof receipt) => {
      useProof(copy).first.answer.text = "Paint tools";
    },
    (copy: typeof receipt) => {
      useProof(copy).proof.catalogHash = "0".repeat(64);
    },
    (copy: typeof receipt) => {
      useProof(copy).proof.matches.reverse();
    },
    (copy: typeof receipt) => {
      if (copy.discovery) delete copy.discovery.productUseCompatibility;
    },
  ]) {
    const changed = structuredClone(receipt);
    mutate(changed);
    expect(
      Assessment.validateAutomaticResearch(value.evidence, changed, 7),
    ).not.toBeNull();
  }
  const changedRaw = structuredClone(value.evidence);
  const firstRaw = changedRaw.browser.raw[0];
  if (!firstRaw) throw new Error("Synthetic raw capture missing.");
  firstRaw.body += " ";
  expect(
    Assessment.validateAutomaticResearch(changedRaw, receipt, 7),
  ).not.toBeNull();
  const noFit = { ...value.selection };
  expect(
    Review.projectCompatibleResultBrands(value.evidence, value.base, noFit)
      .status,
  ).toBe("held");
});

test("the semantic decision cannot predate the original product evidence it cites", async () => {
  const value = await fixture();
  const historical = Review.projectResultBrands(
    value.evidence,
    value.base,
    value.selection,
  );
  if (historical.status !== "researched") throw new Error(historical.reason);
  const evidence = structuredClone(value.evidence);
  const execution = evidence.browser.raw.find((raw) =>
    raw.url.endsWith("/execute"),
  );
  if (!execution) throw new Error("Synthetic execution missing.");
  const later = Date.now() + 2000;
  const timestamp = new Date(later).toISOString();
  const envelope = JSON.parse(execution.body);
  const rendered = JSON.parse(envelope.stdout);
  execution.body = JSON.stringify({
    ...envelope,
    stdout: JSON.stringify({ ...rendered, checkedAt: timestamp }),
  });
  execution.sha256 = createHash("sha256").update(execution.body).digest("hex");
  execution.receivedAt = timestamp;
  const projection = Browser.projectBrowserExecution({
    capture: execution,
    url: evidence.answer.job.query.product.url,
    id: "product-browser",
    productName: evidence.answer.job.query.product.name,
    startedAt: timestamp,
    now: later,
  });
  if (!projection)
    throw new Error("Later synthetic product could not be projected.");
  evidence.browser.sources = evidence.browser.sources.map((source) =>
    source.id === "product-browser" ? projection.source : source,
  );
  const selected = await compatibleBrandSelection(
    evidence,
    value.selection,
    later,
  );
  const catalog = Review.resultBrandCatalog(evidence, later);
  expect(() =>
    Use.projectProductUseCompatibility(
      evidence,
      historical.receipt,
      catalog,
      selected.productUse,
      later,
      new Date(later - 1).toISOString(),
    ),
  ).toThrow("invalid review time");
  expect(
    Use.projectProductUseCompatibility(
      evidence,
      historical.receipt,
      catalog,
      selected.productUse,
      later,
      timestamp,
    ).checkedAt,
  ).toBe(timestamp);
  expect(execution.receivedAt).toBe(timestamp);
});

test("uncertain or absent brands hold once without manufacturing compatible alternatives", async () => {
  const value = await fixture();
  const generate = mock(async () => ({
    decision: "hold" as const,
    reason: "No two compatible product brands established.",
    brands: [],
    productUse: {
      decision: "uncertain" as const,
      reason: "Use or brands remain unclear.",
      matches: [],
    },
  }));
  const result = await Review.assessResultBrands(
    { ...value.evidence, receipt: value.base, deadline: Date.now() + 40000 },
    { generate },
  );
  expect(result.success && result.data.status).toBe("held");
  expect(generate).toHaveBeenCalledTimes(1);
  const wire = Review.resultBrandUseSelectionSchema.toJSONSchema();
  const everyObjectRequired = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const value = node as Record<string, unknown>;
    if (value["properties"])
      expect([...(value["required"] as string[])].sort()).toEqual(
        Object.keys(value["properties"] as object).sort(),
      );
    Object.values(value).forEach(everyObjectRequired);
  };
  everyObjectRequired(wire);
});

test("the existing six-criterion judge receives the same exact product and answer use proof", async () => {
  const { buildSyntheticShoppingEvidence } = await import(
    "./helpers/outbound-shopping-fixture"
  );
  const fixture = await buildSyntheticShoppingEvidence({
    prospect: {
      company: "Sample Goods",
      domain: "samplegoods.test",
      product: "Linen tote",
      productUrl: "https://samplegoods.test/product",
    },
  });
  const base = writerFixture();
  const prospect = {
    ...base.prospect,
    product: fixture.receipt.product.name,
    productUrl: fixture.receipt.product.url,
    productCategory: "linen bags",
  };
  const policy = syntheticWritingPolicy(defaultPlaybook);
  const parts = syntheticWriterParts(prospect, fixture.receipt);
  const assembled = assembleSequence(prospect, fixture.receipt, policy, parts);
  if (assembled.status !== "ready") throw new Error(assembled.reason);
  const generate = mock(
    async ({
      prompt,
      instructions,
    }: {
      prompt: string;
      instructions: string;
    }) => {
      const input = JSON.parse(prompt);
      expect(input.productUseEvidence).toEqual(
        fixture.receipt.discovery?.productUseCompatibility,
      );
      expect(input.productUseEvidence.matches[0].product.text).toContain(
        "large linen bag",
      );
      expect(instructions).toContain(
        "independently check openingFits and reasonToCare",
      );
      return passingCopyJudge();
    },
  );
  const result = await Judge.judgeSequenceCopy(
    {
      prospect,
      receipt: fixture.receipt,
      playbook: policy,
      parts,
      messages: assembled.messages,
    },
    { generate },
  );
  expect(result.success && result.data.passed).toBe(true);
  expect(generate).toHaveBeenCalledTimes(1);
});
