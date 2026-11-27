import { expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { defaultPlaybook } from "@/lib/outbound";
import {
  resultBrandNames,
  resultBrandsProblem,
  shoppingResearchSchema,
  validateShoppingResearch,
} from "@/lib/outbound-shopping-research";
import { compatibleBrandSelection } from "./helpers/outbound-product-use-fixture";
import { buildSyntheticShoppingCapture } from "./helpers/outbound-shopping-fixture";

mock.module("server-only", () => ({}));
const Capture = await import("@/server/utils/outbound/live-shopping");
const Review = await import(
  "@/server/utils/outbound/shopping-discovery-review"
);
const Facts = await import("@/server/utils/outbound/shopping-fact-assessment");
const Assessment = await import("@/server/utils/outbound/shopping-assessment");
const Presence = await import("@/server/utils/outbound/shopping-presence");
type Evidence = import("@/server/utils/outbound/shopping-assessment").Evidence;

/** Labeled synthetic provider cards only: never fetched or treated as real research. */
const card = (index: number, title: string, seller = "Synthetic Marketplace") =>
  `<div html-index="${index}" style="display:flex;align-items:center;gap:12px;padding:10px"><img src="data:image/jpeg;base64,AA==" alt="${title}" width="120" height="auto" style="object-fit:cover; border-radius: 0.5rem;" /><div style="flex:1"><div style="font-weight:bold"><a href="https://example.test/item-${index}">${title}</a></div><div style="margin-top:4px;font-size:18px">$30<span style="text-decoration: line-through;">$40</span></div><div>${seller}</div><div> </div></div><div style="display: none">${index.toString(16).padStart(32, "0")}</div></div>`;
const synthetic = async (
  answerText = `#### Linen choices\n\n${card(1, "Alder Carry Bag")}\n\n${card(2, "Birch Shopper Bag")}`,
  pageText?: string,
) =>
  buildSyntheticShoppingCapture({
    prospect: {
      company: "Sample Goods",
      domain: "samplegoods.test",
      product: "Marlow Tote",
      productUrl: "https://samplegoods.test/products/marlow",
    },
    answerText,
    pageText:
      pageText ??
      "Marlow Tote is a large linen bag. This linen bag is washable.",
  });
const review = async (
  evidence: Evidence,
  status: "valid" | "invalid" = "valid",
) => {
  const query = evidence.answer.job.query;
  if (!query.merchant) throw new Error("Missing merchant");
  const result = await Capture.reviewShopperQuery(
    {
      product: query.product,
      category: query.category,
      merchant: query.merchant,
      browser: evidence.browser,
      query,
      deadline: Date.now() + 40000,
    },
    {
      review: async ({ prompt }) => ({
        status,
        reason:
          status === "valid"
            ? "Synthetic product is an obvious grounded query candidate."
            : "Synthetic query does not match this product.",
        checks: {
          naturalWordOrder: true,
          obviousProductCandidate: status === "valid",
          unbranded: true,
          productGrounding: true,
        },
        excerptIds: [JSON.parse(prompt).excerpts[0].id],
      }),
    },
  );
  if (!result.success) throw result.error;
  return { ...evidence, queryReview: result.data };
};
const brands = (
  evidence: Evidence,
  receipt: import("@/lib/outbound-shopping-research").ShoppingResearch,
  names = ["Alder", "Birch"],
) => {
  const catalog = Review.resultBrandCatalog(evidence);
  const projected = Review.projectResultBrands(evidence, receipt, {
    decision: "supported",
    reason: "Synthetic exact brands.",
    brands: names.map((name) => ({
      name,
      quoteId: catalog.find((quote) =>
        quote.quote.includes(name.replace(/ & more$/, "")),
      )?.id,
    })),
  });
  if (projected.status !== "researched") throw new Error(projected.reason);
  return projected.receipt;
};

test("brand projection binds exact card-title brands and preserves every original capture", async () => {
  const fixture = await synthetic();
  const evidence = await review(fixture.evidence);
  const before = JSON.stringify(evidence);
  const projected = Review.projectUnrankedDiscoveryAbsence(evidence);
  if (projected.status !== "researched") throw new Error(projected.reason);
  const receipt = brands(evidence, projected.receipt, [
    "Alder & more",
    "Birch",
  ]);
  expect(resultBrandNames(receipt)).toEqual(["Alder", "Birch"]);
  expect(receipt.discovery).toMatchObject({
    order: "unranked",
    merchantPosition: null,
    totalListed: null,
    listed: [],
  });
  expect(
    receipt.claims
      ?.filter((claim) => claim.kind === "brand")
      .map((claim) => claim.value),
  ).toEqual(["Alder", "Birch"]);
  expect(
    receipt.claims?.some((claim) =>
      ["name", "price", "count", "position"].includes(claim.kind),
    ),
  ).toBe(false);
  expect(resultBrandsProblem(receipt)).toBeNull();
  expect(
    receipt.discovery?.brandProjection?.brands.every(
      (entry) => !("corroboratingExcerptId" in entry),
    ),
  ).toBe(true);
  expect(JSON.stringify(shoppingResearchSchema.parse(receipt))).toBe(
    JSON.stringify(receipt),
  );
  expect(validateShoppingResearch(receipt, 7)).toBeNull();
  expect(Assessment.validateAutomaticResearch(evidence, receipt, 7)).toBeNull();
  expect(JSON.stringify(evidence)).toBe(before);
  const tampered = structuredClone(receipt);
  const proof = tampered.claimExcerpts?.find((quote) => quote.brand)?.brand;
  if (!proof) throw new Error("Missing brand proof");
  proof.rawHash = "0".repeat(64);
  expect(
    Assessment.validateAutomaticResearch(evidence, tampered, 7),
  ).not.toBeNull();
});

test("full listing titles, seller-only brands, URL-only brands and invented names hold", async () => {
  const fixture = await synthetic();
  const evidence = await review(fixture.evidence);
  const projected = Review.projectUnrankedDiscoveryAbsence(evidence);
  if (projected.status !== "researched") throw new Error(projected.reason);
  const catalog = Review.resultBrandCatalog(evidence);
  for (const name of [
    "Alder Carry Bag",
    "Synthetic Marketplace",
    "example",
    "Invented",
  ]) {
    const result = Review.projectResultBrands(evidence, projected.receipt, {
      decision: "supported",
      reason: "Synthetic invalid selection.",
      brands: [
        { name, quoteId: catalog[0]?.id },
        { name: "Birch", quoteId: catalog[1]?.id },
      ],
    });
    expect(result.status).toBe("held");
  }
});

test("generic gender qualifiers need an independent exact direct-prefix card brand", async () => {
  for (const prefix of ["Men's", "Women’s", "Unisex", "Men's Unisex"]) {
    const fixture = await synthetic(
      `${card(1, `${prefix} Alder Carry Bag`)}\n\n${card(2, "Alder Linen Bag")}\n\n${card(3, "Birch Shopper Bag")}`,
    );
    const evidence = await review(fixture.evidence);
    const original = JSON.stringify(evidence);
    const base = Review.projectUnrankedDiscoveryAbsence(evidence);
    if (base.status !== "researched") throw new Error(base.reason);
    const receipt = brands(evidence, base.receipt);
    expect(resultBrandNames(receipt)).toEqual(["Alder", "Birch"]);
    expect(receipt.claimExcerpts?.find((quote) => quote.brand)?.quote).toBe(
      `${prefix} Alder Carry Bag`,
    );
    expect(
      Assessment.validateAutomaticResearch(evidence, receipt, 7),
    ).toBeNull();
    expect(JSON.stringify(evidence)).toBe(original);

    const changed = structuredClone(receipt);
    const excerpt = changed.claimExcerpts?.find((quote) => quote.brand);
    if (!excerpt?.brand) throw new Error("Missing selected title proof");
    const originalHash = excerpt.brand.rawHash;
    excerpt.brand.rawHash = "0".repeat(64);
    expect(
      Assessment.validateAutomaticResearch(evidence, changed, 7),
    ).not.toBeNull();
    excerpt.brand.rawHash = originalHash;
    excerpt.quote = "Men's Invented Carry Bag";
    expect(
      Assessment.validateAutomaticResearch(evidence, changed, 7),
    ).not.toBeNull();
    const absentProof = structuredClone(receipt);
    const entry = absentProof.discovery?.brandProjection?.brands[0];
    if (!entry?.corroboratingExcerptId)
      throw new Error("Missing independent title proof");
    const corroboration = absentProof.claimExcerpts?.find(
      (quote) => quote.id === entry.corroboratingExcerptId,
    );
    if (!corroboration?.brand) throw new Error("Missing corroborating card");
    corroboration.brand.rawHash = "0".repeat(64);
    expect(
      Assessment.validateAutomaticResearch(evidence, absentProof, 7),
    ).not.toBeNull();
    absentProof.claimExcerpts = absentProof.claimExcerpts?.filter(
      (quote) => quote.id !== entry.corroboratingExcerptId,
    );
    expect(resultBrandsProblem(absentProof)).not.toBeNull();
    expect(
      Assessment.validateAutomaticResearch(evidence, absentProof, 7),
    ).not.toBeNull();
  }
});

test("corroboration is server-projected receipt proof, never an optional Azure selection field", () => {
  const wire = Review.resultBrandSelectionSchema.toJSONSchema();
  expect(wire).toMatchObject({
    required: ["decision", "reason", "brands"],
    additionalProperties: false,
    properties: {
      brands: {
        items: {
          required: ["name", "quoteId"],
          additionalProperties: false,
        },
      },
    },
  });
  expect(JSON.stringify(wire)).not.toContain("corroboratingExcerptId");
});

test("qualifier stripping cannot invent brand authority or accept arbitrary prefixes and substrings", async () => {
  for (const selection of [
    {
      title: "Men's Alder Carry Bag",
      name: "Alder",
      corroboration: "Unknown Carry Bag",
    },
    {
      title: "Men's Cotton Carry Bag",
      name: "Cotton",
      corroboration: "Alder Cotton Bag",
    },
    {
      title: "Unisex Carry Bag",
      name: "Carry",
      corroboration: "Alder Carry Bag",
    },
    {
      title: "Vintage Alder Carry Bag",
      name: "Alder",
      corroboration: "Alder Linen Bag",
    },
    {
      title: "Adult Alder Carry Bag",
      name: "Alder",
      corroboration: "Alder Linen Bag",
    },
    {
      title: "Men's Alderish Carry Bag",
      name: "Alder",
      corroboration: "Alder Linen Bag",
    },
    {
      title: "Men's Alder Carry Bag",
      name: "alder",
      corroboration: "Alder Linen Bag",
    },
  ]) {
    const fixture = await synthetic(
      `${card(1, selection.title)}\n\n${card(2, selection.corroboration)}\n\n${card(3, "Birch Shopper Bag")}`,
    );
    const evidence = await review(fixture.evidence);
    const base = Review.projectUnrankedDiscoveryAbsence(evidence);
    if (base.status !== "researched") throw new Error(base.reason);
    const catalog = Review.resultBrandCatalog(evidence);
    const projected = Review.projectResultBrands(evidence, base.receipt, {
      decision: "supported",
      reason: "Synthetic unsupported brand selection.",
      brands: [
        { name: selection.name, quoteId: catalog[0]?.id },
        { name: "Birch", quoteId: catalog[2]?.id },
      ],
    });
    expect(projected.status, JSON.stringify(selection)).toBe("held");
  }
});

test("brand holds retain both rejected selections as bounded audit-only diagnostics", async () => {
  const fixture = await synthetic();
  const evidence = await review(fixture.evidence);
  const base = Review.projectUnrankedDiscoveryAbsence(evidence);
  if (base.status !== "researched") throw new Error(base.reason);
  const catalog = Review.resultBrandCatalog(evidence);
  const selection = await compatibleBrandSelection(evidence, {
    decision: "supported" as const,
    reason: "Synthetic unsupported selection.",
    brands: [
      { name: "Invented", quoteId: catalog[0]!.id },
      { name: "Birch", quoteId: catalog[1]!.id },
    ],
  });
  const original = JSON.stringify({ evidence, receipt: base.receipt });
  const generate = mock(async () => selection);
  const result = await Review.assessResultBrands(
    { ...evidence, receipt: base.receipt, deadline: Date.now() + 40000 },
    { generate },
  );
  expect(generate).toHaveBeenCalledTimes(2);
  if (!result.success || result.data.status !== "held")
    throw new Error(JSON.stringify(result));
  expect("receipt" in result.data).toBe(false);
  const audit = result.data.brandSelectionDiagnostics;
  expect(audit).toMatchObject({
    version: "answer-brand-selection-audit-v1",
    auditOnly: true,
    sourceId: evidence.answer.source.id,
    answerHash: base.receipt.discovery?.answerHash,
    linksHash: base.receipt.discovery?.linksHash,
    attempts: [
      { attempt: 1, selection, reason: result.data.reason },
      { attempt: 2, selection, reason: result.data.reason },
    ],
  });
  expect(audit?.receiptHash).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify({ evidence, receipt: base.receipt })).toBe(original);
});

test("a repaired brand selection keeps rejected diagnostics outside the unchanged receipt", async () => {
  const fixture = await synthetic();
  const evidence = await review(fixture.evidence);
  const base = Review.projectUnrankedDiscoveryAbsence(evidence);
  if (base.status !== "researched") throw new Error(base.reason);
  const catalog = Review.resultBrandCatalog(evidence);
  const input = {
    ...evidence,
    receipt: base.receipt,
    deadline: Date.now() + 40000,
  };
  const valid = await compatibleBrandSelection(evidence, {
    decision: "supported" as const,
    reason: "Synthetic exact brands.",
    brands: ["Alder", "Birch"].map((name, index) => ({
      name,
      quoteId: catalog[index]!.id,
    })),
  });
  const direct = await Review.assessResultBrands(input, {
    now: () => fixture.now,
    generate: async () => valid,
  });
  const generate = mock(async ({ prompt }: { prompt: string }) =>
    JSON.parse(prompt).previous
      ? valid
      : {
          ...valid,
          brands: [
            { name: "Invented", quoteId: catalog[0]!.id },
            valid.brands[1]!,
          ],
        },
  );
  const repaired = await Review.assessResultBrands(input, {
    generate,
    now: () => fixture.now,
  });
  if (
    !direct.success ||
    direct.data.status !== "researched" ||
    !repaired.success ||
    repaired.data.status !== "researched"
  )
    throw new Error(JSON.stringify({ direct, repaired }));
  expect(direct.data.brandSelectionDiagnostics).toBeUndefined();
  expect(repaired.data.receipt).toEqual(direct.data.receipt);
  expect(repaired.data.brandSelectionDiagnostics?.attempts).toHaveLength(1);
  expect(generate).toHaveBeenCalledTimes(2);
});

test("an interrupted brand repair retains earlier rejection without retry or approval", async () => {
  const fixture = await synthetic();
  const evidence = await review(fixture.evidence);
  const base = Review.projectUnrankedDiscoveryAbsence(evidence);
  if (base.status !== "researched") throw new Error(base.reason);
  const catalog = Review.resultBrandCatalog(evidence);
  const generate = mock(async ({ prompt }: { prompt: string }) => {
    if (JSON.parse(prompt).previous)
      throw new Error("Synthetic interrupted repair");
    return compatibleBrandSelection(evidence, {
      decision: "supported" as const,
      reason: "Synthetic rejection",
      brands: [
        { name: "Invented", quoteId: catalog[0]!.id },
        { name: "Birch", quoteId: catalog[1]!.id },
      ],
    });
  });
  const result = await Review.assessResultBrands(
    { ...evidence, receipt: base.receipt, deadline: Date.now() + 40000 },
    { generate },
  );
  expect(generate).toHaveBeenCalledTimes(2);
  if (result.success)
    throw new Error("Interrupted repair must remain uncertain");
  expect(result.error).toMatchObject({
    name: "outbound-integration-error",
    code: "uncertain",
    receipt: {
      brandSelectionDiagnostics: {
        auditOnly: true,
        attempts: [
          {
            attempt: 1,
            selection: { brands: [{ name: "Invented" }, { name: "Birch" }] },
          },
        ],
      },
    },
  });
});

test("mixed headed plain lists support complete absence and exact brands, without global order", async () => {
  const fixture = await synthetic(
    "### Offers\n1. Alder linen bag\n2. Birch carry bag\n\n### Included contents\n1. Cotton strap\n2. Care card",
  );
  const evidence = await review(fixture.evidence);
  expect(
    Facts.orderedAnswerEntries(fixture.evidence.answer.source.content),
  ).toEqual([]);
  const assessed = await Facts.assessFacts(
    { ...evidence, playbook: defaultPlaybook, deadline: Date.now() + 40000 },
    {
      generate: async () => {
        throw new Error("Must not spend on fact extraction");
      },
    },
  );
  if (!assessed.success || assessed.data.status !== "researched")
    throw new Error(JSON.stringify(assessed));
  const receipt = brands(evidence, assessed.data.receipt);
  expect(receipt.discovery?.totalListed).toBeNull();
  expect(Assessment.validateAutomaticResearch(evidence, receipt, 7)).toBeNull();
  expect(
    Facts.orderedAnswerEntries("1. Alder\n2. Birch\n3. Sample Goods").map(
      (entry) => entry.position,
    ),
  ).toEqual([1, 2, 3]);
  expect(Facts.orderedAnswerEntries("- **Alder**\n- **Birch**")).toEqual([]);
});

const broader = async (evidence: Evidence, answerText: string) => {
  const old = evidence.answer.job.query;
  if (!old.merchant) throw new Error("Missing merchant");
  const generated = await Capture.generateShopperQuery(
    {
      product: old.product,
      category: old.category,
      merchant: old.merchant,
      country: old.country,
      browser: evidence.browser,
      intent: "unbranded-broad",
      deadline: Date.now() + 90000,
    },
    {
      generate: async ({ prompt }) => ({
        question: "washable linen bags",
        category: "linen bag",
        attribute: "washable",
        excerptIds: [JSON.parse(prompt).excerpts[0].id],
      }),
      review: async ({ prompt }) => ({
        status: "valid",
        reason: "Synthetic obvious product candidate.",
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
  if (!generated.success || generated.data.status !== "prepared")
    throw new Error(JSON.stringify(generated));
  const query = generated.data.query;
  const now = Date.now();
  const job = {
    id: randomUUID(),
    submittedAt: new Date(now).toISOString(),
    query,
  };
  const polled = await Capture.pollQuery(
    { apiKey: "synthetic", job },
    {
      now: () => now,
      request: async () => ({
        success: true,
        data: Response.json({
          job_id: job.id,
          status: "done",
          scraper: query.surface,
          prompt: query.prompt,
          country: query.country,
          completed_at: new Date(now).toISOString(),
          result: {
            scraper: query.surface,
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
    browser: evidence.browser,
    previous: [evidence],
  };
};

test("two valid grouped merchant matches yield no gap with two raw-bound captures and no invented first place", async () => {
  const fixture = await synthetic(
    `#### Alternatives\n\n${card(1, "Sample Goods Large Bag")}`,
  );
  const first = await review(fixture.evidence);
  const inspected = Review.inspectDiscoveryPresence(first);
  expect(inspected).toMatchObject({
    status: "verified",
    discovery: { merchantPresent: true },
    order: "unranked",
    merchantPosition: null,
    merchantCardPresent: true,
    canBroaden: true,
  });
  const evidence = await broader(first, card(1, "Sample Goods Washable Bag"));
  const before = JSON.stringify(evidence);
  const projected = Review.projectRepeatedPresence(evidence);
  if (projected.status !== "researched") throw new Error(projected.reason);
  expect(projected.receipt.discovery).toMatchObject({
    merchantPresent: true,
    merchantPosition: null,
    totalListed: null,
    correctness: "uncertain",
    order: "unranked",
    noGapProof: { version: "repeated-presence-v1" },
  });
  expect(projected.receipt.captureHistory).toHaveLength(1);
  expect(projected.receipt.captureHistory?.[0]?.auditOnly).toBe(true);
  expect(
    Assessment.validateAutomaticResearch(evidence, projected.receipt, 7),
  ).toBeNull();
  expect(JSON.stringify(evidence)).toBe(before);
  expect(
    Review.projectRepeatedPresence({ ...evidence, previous: [] }).status,
  ).toBe("held");
  const bad = structuredClone(projected.receipt);
  if (bad.discovery?.noGapProof)
    bad.discovery.noGapProof.previousAnswerHash = "0".repeat(64);
  expect(Assessment.validateAutomaticResearch(evidence, bad, 7)).not.toBeNull();
});

test("invalid prior query is audit only and cannot authorize repeated-presence no gap", async () => {
  const fixture = await synthetic(card(1, "Sample Goods Large Bag"));
  const invalid = await review(fixture.evidence, "invalid");
  const evidence = await broader(invalid, card(1, "Sample Goods Washable Bag"));
  expect(Review.projectRepeatedPresence(evidence).status).toBe("held");
  const absent = await broader(
    invalid,
    `${card(1, "Alder Washable Bag")}\n\n${card(2, "Birch Carry Bag")}`,
  );
  const projected = Review.projectUnrankedDiscoveryAbsence(absent);
  if (projected.status !== "researched") throw new Error(projected.reason);
  expect(projected.receipt.captureHistory?.[0]?.query).toBe(
    fixture.evidence.answer.job.query.prompt,
  );
  const receipt = brands(absent, projected.receipt);
  expect(Assessment.validateAutomaticResearch(absent, receipt, 7)).toBeNull();
  expect(
    receipt.claims?.every(
      (claim) => !claim.sourceIds.includes(invalid.answer.source.id),
    ),
  ).toBe(true);
});

test("brand assessment repairs once and provider uncertainty never makes another call", async () => {
  const fixture = await synthetic();
  const evidence = await review(fixture.evidence);
  const projected = Review.projectUnrankedDiscoveryAbsence(evidence);
  if (projected.status !== "researched") throw new Error(projected.reason);
  const catalog = Review.resultBrandCatalog(evidence);
  let calls = 0;
  const selected = await Review.assessResultBrands(
    { ...evidence, receipt: projected.receipt, deadline: Date.now() + 40000 },
    {
      generate: async () => {
        calls++;
        return compatibleBrandSelection(evidence, {
          decision: "supported",
          reason: "Synthetic selection",
          brands: [
            {
              name: calls === 1 ? "Alder Carry Bag" : "Alder",
              quoteId: catalog[0]?.id ?? "",
            },
            { name: "Birch", quoteId: catalog[1]?.id ?? "" },
          ],
        });
      },
    },
  );
  expect(selected.success && selected.data.status).toBe("researched");
  expect(calls).toBe(2);
  calls = 0;
  const uncertain = await Review.assessResultBrands(
    { ...evidence, receipt: projected.receipt, deadline: Date.now() + 40000 },
    {
      generate: async () => {
        calls++;
        throw new Error("Synthetic provider interruption");
      },
    },
  );
  expect(uncertain.success).toBe(false);
  expect(calls).toBe(1);
});

test("an own Product.brand plus matching category card proves a short alias only in the new contract", async () => {
  const make = async (answerText: string, ownBrand = true) => {
    const fixture = await buildSyntheticShoppingCapture({
      prospect: {
        company: "Pattern Beauty",
        domain: "pattern.example",
        product: "Marlow Tote",
        productUrl: "https://pattern.example/products/marlow",
      },
      answerText,
      pageText: "Marlow Tote is a large linen bag. Its fabric has a pattern.",
      structured: ownBrand
        ? [
            JSON.stringify({
              "@type": "Product",
              name: "Marlow Tote",
              brand: { name: "PATTERN" },
            }),
          ]
        : [],
    });
    return review(fixture.evidence);
  };
  const evidence = await make(card(1, "Pattern Linen Bag"));
  const original = JSON.stringify(evidence);
  expect(Presence.computeDiscoveryBase(evidence).merchantPresent).toBeNull();
  const present = Review.inspectDiscoveryPresence(evidence);
  expect(present).toMatchObject({
    status: "verified",
    discovery: {
      merchantPresent: true,
      matchedAliases: ["PATTERN"],
      presenceMethod: "server-v2",
    },
    order: "unranked",
  });
  expect(JSON.stringify(evidence)).toBe(original);
  expect(
    Review.inspectDiscoveryPresence(
      await make("Pattern is a common fabric design."),
    ),
  ).toMatchObject({ status: "held" });
  expect(
    Review.inspectDiscoveryPresence(
      await make(card(1, "Pattern Ceramic Bowl")),
    ),
  ).toMatchObject({ status: "held" });
  expect(
    Review.inspectDiscoveryPresence(
      await make("Pattern is a common fabric design.", false),
    ),
  ).toMatchObject({
    status: "verified",
    discovery: { merchantPresent: false },
  });
});

test("normal reviewed research returns brand-ready facts while a durable caller can defer brands", async () => {
  const fixture = await synthetic();
  const evidence = await review(fixture.evidence);
  let calls = 0;
  const generation = async ({ prompt }: { prompt: string }) => {
    calls++;
    const quotes = JSON.parse(prompt).evidence as {
      id: string;
      quote: string;
    }[];
    return compatibleBrandSelection(evidence, {
      decision: "supported" as const,
      reason: "Synthetic brand selection",
      brands: ["Alder", "Birch"].map((name) => ({
        name,
        quoteId: quotes.find((quote) => quote.quote.startsWith(name))?.id ?? "",
      })),
    });
  };
  const input = {
    ...evidence,
    playbook: defaultPlaybook,
    deadline: Date.now() + 40000,
  };
  const result = await Assessment.assess(input, {
    brands: { generate: generation },
  });
  if (!result.success || result.data.status !== "researched")
    throw new Error(JSON.stringify(result));
  expect(resultBrandNames(result.data.receipt)).toEqual(["Alder", "Birch"]);
  expect(
    Assessment.validateAutomaticResearch(evidence, result.data.receipt, 7),
  ).toBeNull();
  expect(calls).toBe(1);
  const deferred = await Assessment.assess(
    { ...input, deferBrands: true },
    { brands: { generate: generation } },
  );
  if (!deferred.success || deferred.data.status !== "researched")
    throw new Error(JSON.stringify(deferred));
  expect(deferred.data.receipt.discovery?.brandProjection).toBeUndefined();
  expect(calls).toBe(1);
});

test("an informational merchant mention prevents absence but cannot authorize a grouped-card broader purchase", async () => {
  const fixture = await synthetic(
    "For specifications, ask Sample Goods directly. This answer gives general bag-care instructions.",
  );
  const evidence = await review(fixture.evidence);
  expect(Review.inspectDiscoveryPresence(evidence)).toMatchObject({
    status: "verified",
    discovery: { merchantPresent: true },
    order: "unranked",
    merchantCardPresent: false,
    canBroaden: false,
  });
});

test("plain seller labels and Markdown-created names cannot become observed brands", async () => {
  for (const answerText of [
    "1. Carry Bag from Alder\n2. Shopper Bag from Birch",
    "1. **Al**der Carry Bag\n2. **Bi**rch Shopper Bag",
  ]) {
    const fixture = await synthetic(answerText);
    const evidence = await review(fixture.evidence);
    const projected = Review.projectUnrankedDiscoveryAbsence(evidence);
    if (projected.status !== "researched") throw new Error(projected.reason);
    const catalog = Review.resultBrandCatalog(evidence);
    const selected = Review.projectResultBrands(evidence, projected.receipt, {
      decision: "supported",
      reason: "Invalid synthetic attribution",
      brands: ["Alder", "Birch"].map((name) => ({
        name,
        quoteId: catalog.find((quote) => quote.quote.includes(name))?.id,
      })),
    });
    expect(selected.status).toBe("held");
  }
});
