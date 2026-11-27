import { describe, expect, mock, test } from "bun:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { defaultPlaybook } from "@/lib/outbound";
import type {
  BrowserResearch,
  RawCapture,
} from "@/server/utils/outbound/live-shopping-contract";

mock.module("server-only", () => ({}));
const Capture = await import("@/server/utils/outbound/live-shopping");
const { projectBrowserExecution } = await import(
  "@/server/utils/outbound/live-shopping-browser"
);
const { createAssessmentCatalog, assess, validateAutomaticResearch } =
  await import("@/server/utils/outbound/shopping-assessment");
const {
  projectFactAssessment,
  validateFactResearch,
  orderedAnswerEntries,
  createFactAssessmentCatalog,
} = await import("@/server/utils/outbound/shopping-fact-assessment");
const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
const defined = <T>(value: T | null | undefined): T => {
  assert.ok(value !== null && value !== undefined);
  return value;
};
const digest = (body: string) =>
  createHash("sha256").update(body).digest("hex");
const product = {
  name: "Marlow Tote",
  url: "https://astergoods.com/products/marlow",
};
const merchant = { name: "Aster Goods", domain: "astergoods.com", aliases: [] };
const fixture = async (
  answerText: string,
  pageText = "Marlow Tote large linen bag.",
  structured: string[] = [],
) => {
  const now = Date.now();
  const timestamp = new Date(now).toISOString();
  const job = {
    id: "ce1da6e5-1249-4bd4-8463-1937688c63d3",
    submittedAt: timestamp,
    query: {
      product,
      merchant,
      category: "linen bags",
      country: "US",
      surface: "google_ai_mode" as const,
      prompt: "large linen bags",
      intent: "unbranded-specific" as const,
    },
  };
  const body = JSON.stringify({
    success: true,
    stdout: JSON.stringify({
      url: product.url,
      status: 200,
      checkedAt: timestamp,
      title: product.name,
      headings: [product.name],
      text: pageText,
      structured,
      selected: [],
      locale: "en-US",
      screenshot: "c3ludGhldGlj",
    }),
    exitCode: 0,
  });
  const raw: RawCapture = {
    url: "https://api.firecrawl.dev/v2/interact/cce23dc1-ff37-49c3-a2a0-3c2c8c8a6ad0/execute",
    status: 200,
    body,
    sha256: digest(body),
    receivedAt: timestamp,
  };
  const projected = projectBrowserExecution({
    capture: raw,
    url: product.url,
    id: "product-browser",
    productName: product.name,
    startedAt: timestamp,
    now,
  });
  if (!projected) throw new Error("Expected rendered synthetic product.");
  const profile: RawCapture = {
    url: "https://astergoods.com/.well-known/ucp",
    status: 404,
    body: "Not Found",
    sha256: digest("Not Found"),
    receivedAt: timestamp,
  };
  const browser: Extract<BrowserResearch, { status: "captured" }> = {
    status: "captured",
    sources: [
      projected.source,
      {
        id: "ucp",
        kind: "ucp",
        capture: "http",
        url: profile.url,
        checkedAt: timestamp,
        content: "HTTP 404\nNot Found",
        artifact: `sha256:${profile.sha256}`,
      },
    ],
    raw: [raw, profile],
    ucp: {
      url: profile.url,
      status: "notObserved",
      httpStatus: 404,
      capabilities: [],
      sourceIds: ["ucp"],
    },
    checkout: {
      status: "notTested",
      sourceIds: [],
      notes: "No checkout interaction.",
    },
    candidates: [],
    limitations: [],
  };
  const generated = value(
    await Capture.generateShopperQuery(
      {
        product,
        merchant,
        category: "linen bags",
        country: "US",
        browser,
        deadline: now + 40000,
      },
      {
        now: () => now,
        generate: async ({ prompt }) => ({
          question: "large linen bags",
          category: "bag",
          attribute: "large",
          excerptIds: [JSON.parse(prompt).excerpts[0].id],
        }),
      },
    ),
  );
  if (generated.status !== "prepared") throw new Error(generated.reason);
  const polled = value(
    await Capture.pollQuery(
      { apiKey: "synthetic", job: { ...job, query: generated.query } },
      {
        now: () => now,
        request: async () => ({
          success: true,
          data: Response.json({
            job_id: job.id,
            status: "done",
            scraper: job.query.surface,
            prompt: job.query.prompt,
            country: "US",
            completed_at: timestamp,
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
    ),
  );
  if (polled.status !== "captured")
    throw new Error("Expected captured synthetic answer.");
  const evidence = { answer: polled.capture, browser };
  const catalog = createAssessmentCatalog(evidence);
  const answerQuoteId = catalog.quotes.find(
    (quote) => quote.sourceId === catalog.answerSourceId,
  )?.id;
  const productQuoteId = catalog.quotes.find(
    (quote) => quote.sourceId === catalog.productSourceId,
  )?.id;
  assert.ok(answerQuoteId && productQuoteId);
  const selection = {
    decision: "supported" as const,
    reason: "Exact fixture facts.",
    listed: [] as {
      name: string;
      kind: "brand";
      quoteId: string;
      price: string | null;
    }[],
    description: null,
    productAttributes: [],
    priceComparison: null,
    correctness: null as null | {
      answerQuoteId: string;
      productQuoteId: string;
      answerText: string;
      pageText: string;
    },
    pageDataIssue: null as null | {
      field: "gtin13";
      value: string;
      quoteId: string;
    },
  };
  return { evidence, selection, answerQuoteId, productQuoteId, now };
};
const alternate =
  "1. Canvas Works — Large carry bag.\n2. Harbor Label — Cotton shopper.";

// Synthetic provider-shaped cards; none of these recommendations are real evidence.
const cardHtml = (
  index: number,
  title: string,
  seller: string,
) => `<div html-index="${index}" style="display:flex;align-items:center;gap:12px;padding:10px">
<img src="data:image/jpeg;base64,${"A".repeat(22000)}==" alt="${title}" width="120" height="auto" style="object-fit:cover;border-radius:0.5rem" />
<div style="flex:1"><div style="font-weight:bold"><a href="https://example.test/item-${index}">${title}</a></div>
<div style="margin-top:4px;font-size:18px">from $39.99<span style="text-decoration:line-through">$50</span></div>
<div>${seller}</div><div> </div></div><div style="display:none">${index.toString(16).padStart(32, "0")}</div></div>`;
const cardFixture = async (suffix = "") => {
  const input = await fixture(
    `## Everyday bags\n${cardHtml(1, "Canvas Works&#39; Linen Tote", "Harbor &amp; Co")}\n\n## Travel bags\n${cardHtml(2, "Drift Canvas Shopper", "Bay Store")}\n${suffix}`,
  );
  const catalog = createFactAssessmentCatalog(input.evidence, input.now);
  const selection = {
    ...input.selection,
    listed: catalog.quotes
      .filter((quote) => quote.card)
      .map((quote) => ({
        name: defined(quote.card).title,
        kind: "product" as const,
        quoteId: quote.id,
        price: null,
      })),
  };
  return { ...input, selection, catalog };
};

describe("fact-only shopping assessment", () => {
  test("binds unranked card alternatives to exact full raw product and seller proof", async () => {
    const input = await cardFixture();
    const original = structuredClone(input.evidence.answer);
    const result = projectFactAssessment(
      input.evidence,
      input.selection,
      input.now,
    );
    expect(result.status).toBe("researched");
    if (result.status !== "researched") throw new Error(result.reason);
    expect(result.receipt.discovery).toMatchObject({
      order: "unranked",
      merchantPresent: false,
      merchantPosition: null,
      totalListed: null,
      listed: [
        {
          name: "Canvas Works' Linen Tote",
          seller: "Harbor & Co",
          kind: "product",
          position: null,
          price: null,
        },
        {
          name: "Drift Canvas Shopper",
          seller: "Bay Store",
          kind: "product",
          position: null,
          price: null,
        },
      ],
    });
    expect(
      result.receipt.claims?.some((claim) =>
        ["position", "count", "price"].includes(claim.kind),
      ),
    ).toBe(false);
    expect(
      result.receipt.claims?.find(
        (claim) => claim.value === "Canvas Works' Linen Tote",
      )?.qualifiers,
    ).toEqual(["Harbor & Co"]);
    expect(
      result.receipt.claimExcerpts?.filter((quote) => quote.card).length,
    ).toBe(2);
    expect(
      result.receipt.claimExcerpts
        ?.filter((quote) => quote.card)
        .every(
          (quote) =>
            !input.evidence.answer.source.content.includes(quote.quote),
        ),
    ).toBe(true);
    expect(
      validateAutomaticResearch(input.evidence, result.receipt, 7),
    ).toBeNull();
    expect(input.evidence.answer).toEqual(original);
    const generate = mock(async ({ prompt }: { prompt: string }) => {
      const prepared = JSON.parse(prompt);
      expect(
        prepared.quoteCatalog.filter((quote: { card?: unknown }) => quote.card)
          .length,
      ).toBe(2);
      return input.selection;
    });
    const assessed = value(
      await assess(
        {
          ...input.evidence,
          playbook: defaultPlaybook,
          deadline: input.now + 45_000,
        },
        { now: () => input.now, generate },
      ),
    );
    expect(assessed.status).toBe("researched");
    expect(generate).toHaveBeenCalledTimes(1);
  });

  test("rejects changed card provenance, attribution, rank markers and prices on replay", async () => {
    const input = await cardFixture();
    const result = projectFactAssessment(
      input.evidence,
      input.selection,
      input.now,
    );
    if (result.status !== "researched") throw new Error(result.reason);
    const mutations = [
      (receipt: typeof result.receipt) => {
        delete defined(receipt.discovery).order;
      },
      (receipt: typeof result.receipt) => {
        defined(receipt.discovery).order = "ranked";
      },
      (receipt: typeof result.receipt) => {
        defined(receipt.discovery).totalListed = 2;
      },
      (receipt: typeof result.receipt) => {
        defined(defined(receipt.discovery).listed[0]).position = 1;
      },
      (receipt: typeof result.receipt) => {
        defined(defined(receipt.discovery).listed[0]).seller = "Bay Store";
      },
      (receipt: typeof result.receipt) => {
        defined(defined(receipt.discovery).listed[0]).price = "from $39.99";
      },
      (receipt: typeof result.receipt) => {
        defined(
          defined(receipt.claimExcerpts?.find((quote) => quote.card)).card,
        ).start += 1;
      },
      (receipt: typeof result.receipt) => {
        defined(
          defined(receipt.claimExcerpts?.find((quote) => quote.card)).card,
        ).rawHash = "f".repeat(64);
      },
      (receipt: typeof result.receipt) => {
        receipt.selected.kind = "discovery-outranked";
      },
      (receipt: typeof result.receipt) => {
        receipt.selected.kind = "no-gap";
      },
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(result.receipt);
      mutate(changed);
      expect(
        validateAutomaticResearch(input.evidence, changed, 7),
      ).not.toBeNull();
    }
  });

  test("present card answers cannot acquire rank from a separate numbered footer or spend an assessment", async () => {
    const input = await cardFixture(
      "1. Canvas Works\n2. Bay Store\n3. Aster Goods",
    );
    expect(
      projectFactAssessment(input.evidence, input.selection, input.now).status,
    ).toBe("held");
    const generate = mock(async () => input.selection);
    const result = value(
      await assess(
        {
          ...input.evidence,
          playbook: defaultPlaybook,
          deadline: input.now + 45_000,
        },
        { now: () => input.now, generate },
      ),
    );
    expect(result.status).toBe("held");
    expect(generate).not.toHaveBeenCalled();
  });

  test("unknown completeness and altered card selections never establish absence", async () => {
    const input = await cardFixture();
    for (const item of [
      { ...defined(input.selection.listed[0]), name: "Invented Store" },
      { ...defined(input.selection.listed[0]), kind: "brand" },
      { ...defined(input.selection.listed[0]), price: "from $39.99" },
    ])
      expect(
        projectFactAssessment(
          input.evidence,
          { ...input.selection, listed: [item] },
          input.now,
        ).status,
      ).toBe("held");
    delete input.evidence.answer.completeness;
    expect(
      projectFactAssessment(input.evidence, input.selection, input.now).status,
    ).toBe("held");
  });

  test("legacy exact-name captures still need the first discovery query, even with a page defect", async () => {
    const input = await fixture(
      "Aster Goods Marlow Tote.",
      "Marlow Tote large linen bag.",
      ['{"@type":"Product","name":"Marlow Tote","gtin13":"1234567890123"}'],
    );
    delete input.evidence.answer.job.query.intent;
    const generated = mock(async () => {
      throw new Error("No provider call expected.");
    });
    const result = value(
      await assess(
        {
          ...input.evidence,
          playbook: defaultPlaybook,
          deadline: input.now + 45_000,
        },
        { now: () => input.now, generate: generated },
      ),
    );
    expect(result.status).toBe("held");
    if (result.status === "held")
      expect(result.reason).toBe("needs-unbranded-search");
    expect(generated).not.toHaveBeenCalled();
  });
  test("builds an absence ledger from exact names and revalidates every field", async () => {
    const input = await fixture(alternate);
    input.selection.listed = ["Canvas Works", "Harbor Label"].map((name) => ({
      name,
      kind: "brand",
      quoteId: input.answerQuoteId,
      price: null,
    }));
    const result = projectFactAssessment(
      input.evidence,
      input.selection,
      input.now,
    );
    expect(result.status).toBe("researched");
    if (result.status !== "researched") return;
    expect(result.receipt.selected.kind).toBe("discovery-absence");
    expect(result.receipt.discovery?.merchantPresent).toBe(false);
    expect(result.receipt.discovery?.totalListed).toBe(2);
    expect(
      result.receipt.claims?.find((claim) => claim.kind === "query")?.value,
    ).toBe("large linen bags");
    expect(
      validateFactResearch(input.evidence, result.receipt, input.now),
    ).toBeNull();
    expect(
      validateAutomaticResearch(input.evidence, result.receipt, 14, {
        allowStaleEvidence: true,
      }),
    ).toBeNull();
    const changed = structuredClone(result.receipt);
    assert.ok(changed.discovery && changed.claims?.[0]);
    changed.discovery.merchantPresent = true;
    expect(
      validateFactResearch(input.evidence, changed, input.now),
    ).not.toBeNull();
    changed.claims[0].value = "best holiday tote";
    expect(
      validateFactResearch(input.evidence, changed, input.now),
    ).not.toBeNull();
  });

  test("requires two actually ordered alternatives ahead of the merchant", async () => {
    const input = await fixture(`${alternate}\n3. Aster Goods — Marlow Tote.`);
    input.selection.listed = [
      "Canvas Works",
      "Harbor Label",
      "Aster Goods",
    ].map((name) => ({
      name,
      kind: "brand",
      quoteId: input.answerQuoteId,
      price: null,
    }));
    const result = projectFactAssessment(
      input.evidence,
      input.selection,
      input.now,
    );
    expect(result.status === "researched" && result.receipt.selected.kind).toBe(
      "discovery-outranked",
    );
    expect(orderedAnswerEntries("1. First.\n1. Second.")).toEqual([]);
    input.selection.listed = input.selection.listed.slice(1);
    expect(
      projectFactAssessment(input.evidence, input.selection, input.now).status,
    ).toBe("held");
  });

  test("a merchant mentioned after or within another recommendation is not its listed identity", async () => {
    for (const answer of [
      `${alternate}\n3. Cedar — Cotton shopper.\n\nOther stores like Aster Goods were not included.`,
      `${alternate}\n3. Cedar — Similar bags to Aster Goods.`,
    ]) {
      const input = await fixture(answer);
      input.selection.listed = [
        "Canvas Works",
        "Harbor Label",
        "Aster Goods",
      ].map((name) => ({
        name,
        kind: "brand",
        quoteId: input.answerQuoteId,
        price: null,
      }));
      const result = projectFactAssessment(
        input.evidence,
        input.selection,
        input.now,
      );
      expect(result.status).toBe("held");
      if (result.status === "held")
        expect(result.reason).toContain("ordered answer entry");
    }
  });

  test("no-gap needs the full first merchant entry supported by the page", async () => {
    const text = "Marlow Tote large linen bag.";
    const input = await fixture(`1. Aster Goods — ${text}`, text);
    input.selection.listed = [
      {
        name: "Aster Goods",
        kind: "brand",
        quoteId: input.answerQuoteId,
        price: null,
      },
    ];
    input.selection.correctness = {
      answerQuoteId: input.answerQuoteId,
      productQuoteId: input.productQuoteId,
      answerText: text,
      pageText: text,
    };
    const result = projectFactAssessment(
      input.evidence,
      input.selection,
      input.now,
    );
    expect(result.status === "researched" && result.receipt.selected.kind).toBe(
      "no-gap",
    );
    if (result.status === "researched")
      expect(
        validateFactResearch(input.evidence, result.receipt, input.now),
      ).toBeNull();
    input.selection.correctness.answerText = "Marlow Tote";
    input.selection.correctness.pageText = "Marlow Tote";
    expect(
      projectFactAssessment(input.evidence, input.selection, input.now).status,
    ).toBe("held");
  });

  test("a merchant name after projected answer text still prevents absence", async () => {
    const input = await fixture(
      `${alternate}\n${"Context. ".repeat(2300)}\nAster Goods also appears.`,
    );
    input.selection.listed = [
      {
        name: "Canvas Works",
        kind: "brand",
        quoteId: input.answerQuoteId,
        price: null,
      },
    ];
    expect(
      projectFactAssessment(input.evidence, input.selection, input.now).status,
    ).toBe("held");
  });

  test("qualifiers travel with a sourced price and invented names fail", async () => {
    const input = await fixture(
      "1. Canvas Works — Large carry bag at around $36.",
    );
    input.selection.listed = [
      {
        name: "Canvas Works",
        kind: "brand",
        quoteId: input.answerQuoteId,
        price: "$36",
      },
    ];
    expect(
      projectFactAssessment(input.evidence, input.selection, input.now).status,
    ).toBe("held");
    assert.ok(input.selection.listed[0]);
    input.selection.listed[0].price = "around $36";
    const result = projectFactAssessment(
      input.evidence,
      input.selection,
      input.now,
    );
    expect(
      result.status === "researched" &&
        result.receipt.claims?.find((claim) => claim.kind === "price")
          ?.qualifiers,
    ).toEqual(["around"]);
    input.selection.listed[0].name = "Imagined Brand";
    expect(
      projectFactAssessment(input.evidence, input.selection, input.now).status,
    ).toBe("held");
  });

  test("stale or uncertain captures never establish discovery", async () => {
    const input = await fixture(alternate);
    input.selection.listed = [
      {
        name: "Canvas Works",
        kind: "brand",
        quoteId: input.answerQuoteId,
        price: null,
      },
    ];
    expect(
      projectFactAssessment(
        input.evidence,
        input.selection,
        input.now + 8 * 86400000,
      ).status,
    ).toBe("held");
    input.evidence.answer.completeness = {
      status: "uncertain",
      reason: "Partial response.",
    };
    expect(
      projectFactAssessment(input.evidence, input.selection, input.now).status,
    ).toBe("held");
  });

  test("legacy exact neutral research holds without a model call or capture mutation", async () => {
    const input = await fixture(
      "Aster Goods Marlow Tote is a large linen bag.",
    );
    delete (input.evidence.answer.job.query as { intent?: string }).intent;
    delete input.evidence.answer.completeness;
    const before = JSON.stringify(input.evidence);
    const result = value(
      await assess(
        {
          ...input.evidence,
          playbook: defaultPlaybook,
          deadline: Date.now() + 40000,
        },
        {
          generate: async () => {
            throw new Error("No model should run.");
          },
        },
      ),
    );
    expect(result).toMatchObject({
      status: "held",
      reason: "needs-unbranded-search",
      attempts: 0,
    });
    expect(JSON.stringify(input.evidence)).toBe(before);
  });

  test("an explicit invalid GTIN is page-only; another valid block defeats that angle", async () => {
    const bad =
      '{"@type":"Product","name":"Marlow Tote","gtin13":"1234567890123"}';
    const input = await fixture(alternate, "Marlow Tote large linen bag.", [
      bad,
    ]);
    input.selection.pageDataIssue = {
      field: "gtin13",
      value: "1234567890123",
      quoteId: input.productQuoteId,
    };
    const result = projectFactAssessment(
      input.evidence,
      input.selection,
      input.now,
    );
    expect(result.status === "researched" && result.receipt.selected.kind).toBe(
      "product-data-gap",
    );
    if (result.status === "researched")
      expect(
        validateFactResearch(input.evidence, result.receipt, input.now),
      ).toBeNull();
    const valid = await fixture(alternate, "Marlow Tote large linen bag.", [
      bad,
      '{"@type":"Product","gtin13":"4006381333931"}',
    ]);
    valid.selection.pageDataIssue = {
      field: "gtin13",
      value: "1234567890123",
      quoteId: valid.productQuoteId,
    };
    expect(
      projectFactAssessment(valid.evidence, valid.selection, valid.now).status,
    ).toBe("held");
  });

  test("permits one completed fact repair and never falls back to neutral prose", async () => {
    const input = await fixture(alternate);
    const attempts: string[] = [];
    const result = value(
      await assess(
        {
          ...input.evidence,
          playbook: defaultPlaybook,
          deadline: Date.now() + 40000,
        },
        {
          generate: async ({ prompt }) => {
            attempts.push(prompt);
            return {
              ...input.selection,
              listed: [
                {
                  name:
                    attempts.length === 1 ? "Invented Store" : "Canvas Works",
                  kind: "brand",
                  quoteId: input.answerQuoteId,
                  price: null,
                },
              ],
            };
          },
        },
      ),
    );
    expect(attempts).toHaveLength(2);
    expect(result.status).toBe("researched");
    expect(result.neutralFallback).toBeUndefined();
  });

  test("flat markdown recommendations keep order without ranking nested feature bullets", async () => {
    const bullets =
      "- **Canvas Works** — Large carry bag.\n  - sturdy handles\n- **Harbor Label** — Cotton shopper.\n- **Aster Goods** — Marlow Tote.";
    expect(orderedAnswerEntries(bullets)).toHaveLength(3);
    const input = await fixture(bullets);
    input.selection.listed = [
      "Canvas Works",
      "Harbor Label",
      "Aster Goods",
    ].map((name) => ({
      name,
      kind: "brand",
      quoteId: input.answerQuoteId,
      price: null,
    }));
    const result = projectFactAssessment(
      input.evidence,
      input.selection,
      input.now,
    );
    expect(result.status === "researched" && result.receipt.selected.kind).toBe(
      "discovery-outranked",
    );
    if (result.status === "researched")
      expect(
        validateAutomaticResearch(input.evidence, result.receipt, 14),
      ).toBeNull();
    expect(
      orderedAnswerEntries(
        "### 1. **Canvas Works**\nBag.\n### 2. **Harbor Label**\nShopper.",
      ),
    ).toHaveLength(2);
    expect(orderedAnswerEntries("- linen material\n- sturdy handles")).toEqual(
      [],
    );
  });

  test("a same-product price comparison replays its offer proof, including saved exact queries", async () => {
    const answerOffer = `1. Aster Goods — Marlow Tote Large $30 USD one-time purchase ${product.url}`;
    const pageOffer = "Marlow Tote Large $25 USD one-time purchase";
    const input = await fixture(answerOffer, `${pageOffer}\nLarge linen bag.`);
    const offer = (quoteId: string, offer: string, price: string) => ({
      quoteId,
      offer,
      variant: "Large",
      price,
      currency: "USD" as const,
      currencyAnchor: "USD",
      condition: "one-time" as const,
      conditionAnchor: "one-time purchase",
      marketAnchor: null,
    });
    const selection = {
      ...input.selection,
      listed: [
        {
          name: "Aster Goods",
          kind: "brand",
          quoteId: input.answerQuoteId,
          price: "$30",
        },
      ],
      priceComparison: {
        answer: offer(input.answerQuoteId, answerOffer, "$30"),
        page: offer(input.productQuoteId, pageOffer, "$25"),
      },
    };
    const result = projectFactAssessment(input.evidence, selection, input.now);
    expect(result.status === "researched" && result.receipt.selected.kind).toBe(
      "query-comparison",
    );
    if (result.status === "researched") {
      expect(
        new Set(result.receipt.claims?.map((claim) => claim.id)).size,
      ).toBe(result.receipt.claims?.length ?? 0);
      expect(
        validateAutomaticResearch(input.evidence, result.receipt, 14),
      ).toBeNull();
      const changed = structuredClone(result.receipt);
      assert.ok(changed.priceComparison);
      changed.priceComparison.page.price = "$20";
      expect(
        validateFactResearch(input.evidence, changed, input.now),
      ).not.toBeNull();
    }
    input.evidence.answer.job.query.intent = "exact-product";
    const savedExact = projectFactAssessment(
      input.evidence,
      selection,
      input.now,
    );
    expect(
      savedExact.status === "researched" && savedExact.receipt.selected.kind,
    ).toBe("query-comparison");
    if (savedExact.status === "researched")
      expect(
        validateAutomaticResearch(input.evidence, savedExact.receipt, 14),
      ).toBeNull();
  });

  test("cart promotions and retailer offers cannot become a merchant price error", async () => {
    for (const detail of [
      "with cart discount",
      "https://retailer.example/products/marlow",
    ]) {
      const answerOffer = `1. Aster Goods — Marlow Tote Large $30 USD one-time purchase ${detail}`;
      const pageOffer = "Marlow Tote Large $25 USD one-time purchase";
      const input = await fixture(
        answerOffer,
        `${pageOffer}\nLarge linen bag.`,
      );
      const offer = (quoteId: string, offer: string, price: string) => ({
        quoteId,
        offer,
        variant: "Large",
        price,
        currency: "USD",
        currencyAnchor: "USD",
        condition: "one-time",
        conditionAnchor: "one-time purchase",
        marketAnchor: null,
      });
      const selection = {
        ...input.selection,
        priceComparison: {
          answer: offer(input.answerQuoteId, answerOffer, "$30"),
          page: offer(input.productQuoteId, pageOffer, "$25"),
        },
      };
      expect(
        projectFactAssessment(input.evidence, selection, input.now).status,
      ).toBe("held");
    }
  });
  test("a retailer heading cannot borrow the manufacturer's URL as its price proof", async () => {
    const answerOffer = `1. Retailer Shop — Aster Goods Marlow Tote Large $30 USD one-time purchase ${product.url}`;
    const pageOffer = "Marlow Tote Large $25 USD one-time purchase";
    const input = await fixture(answerOffer, `${pageOffer}\nLarge linen bag.`);
    const offer = (quoteId: string, offer: string, price: string) => ({
      quoteId,
      offer,
      variant: "Large",
      price,
      currency: "USD",
      currencyAnchor: "USD",
      condition: "one-time",
      conditionAnchor: "one-time purchase",
      marketAnchor: null,
    });
    const selection = {
      ...input.selection,
      priceComparison: {
        answer: offer(input.answerQuoteId, answerOffer, "$30"),
        page: offer(input.productQuoteId, pageOffer, "$25"),
      },
    };
    expect(
      projectFactAssessment(input.evidence, selection, input.now).status,
    ).toBe("held");
  });
});
