import { describe, expect, mock, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import type { ShoppingResearch } from "@/lib/outbound-shopping-research";
import type {
  AiCapture,
  BrowserResearch,
  RawCapture,
  Source,
} from "@/server/utils/outbound/live-shopping-contract";

mock.module("server-only", () => ({}));
const {
  assembleResearch,
  validateAutomaticResearch,
  createAssessmentCatalog,
  assessmentWireSchema,
  projectAssessment,
} = await import("@/server/utils/outbound/shopping-assessment");

const fixture = () => {
  const timestamp = new Date().toISOString();
  const product = {
    name: "Linen tote",
    url: "https://samplegoods.com/products/tote",
  };
  const raw = (url: string, body: string, status = 200): RawCapture => ({
    url,
    body,
    status,
    receivedAt: timestamp,
    sha256: createHash("sha256").update(body).digest("hex"),
  });
  const source = (
    id: string,
    kind: Source["kind"],
    capture: Source["capture"],
    captured: RawCapture,
  ): Source => ({
    id,
    kind,
    capture,
    url: captured.url,
    content: captured.body,
    checkedAt: timestamp,
    artifact: `sha256:${captured.sha256}`,
  });
  const answerRaw = raw(
    "https://www.google.com/search?q=large+linen+tote",
    "Sample Goods Linen tote costs $30 for the large variant.",
  );
  const productRaw = raw(
    product.url,
    "Linen tote Large $25.00. Small is a separate option.",
  );
  const ucpRaw = raw(
    "https://samplegoods.com/.well-known/ucp",
    "404 Not Found",
    404,
  );
  const answer: AiCapture = {
    job: {
      id: randomUUID(),
      submittedAt: timestamp,
      query: {
        product,
        category: "large linen tote",
        country: "US",
        surface: "google_ai_mode",
        prompt: "Where can I buy a large linen tote?",
      },
    },
    executedAt: timestamp,
    receivedAt: timestamp,
    answer: answerRaw.body,
    source: source("answer", "search", "provider", answerRaw),
    links: [],
    cached: false,
    raw: [answerRaw],
  };
  const browser: Extract<BrowserResearch, { status: "captured" }> = {
    status: "captured",
    sources: [
      source("product", "product", "browser", productRaw),
      source("ucp", "ucp", "http", ucpRaw),
    ],
    raw: [productRaw, ucpRaw],
    ucp: {
      url: ucpRaw.url,
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
    limitations: ["Market was not independently established."],
  };
  const evidence = { answer, browser };
  const assembled = assembleResearch(
    evidence,
    {
      decision: "supported",
      reason: "A variant-specific price difference was observed.",
      competitors: [],
      selected: {
        kind: "product-data-gap",
        observation:
          "The answer puts the large Linen tote at $30, while the product page shows $25.",
        consequence: "Should those two prices match for the large size?",
        askAbout: "the large Linen tote",
        scope:
          "One captured answer and rendered product page. The response market and checkout were not established.",
        sourceIds: ["answer", "product"],
        quotes: [
          {
            sourceId: "answer",
            quote: "Linen tote costs $30 for the large variant",
          },
          { sourceId: "product", quote: "Linen tote Large $25.00" },
        ],
      },
    },
    14,
  );
  if (!assembled.success) throw assembled.error;
  if (assembled.data.status !== "researched")
    throw new Error(assembled.data.reason);
  return { evidence, receipt: assembled.data.receipt };
};

describe("automatic shopping evidence binds its observed metadata", () => {
  test("assembles captured facts without inventing market, identity or checkout conditions", () => {
    const { evidence, receipt } = fixture();
    expect(validateAutomaticResearch(evidence, receipt, 14)).toBeNull();
    expect(receipt.queries[0]).toMatchObject({
      surface: "Google AI Mode",
      market: "unknown",
      interfaceLocale: "unknown",
      signedOut: null,
    });
    expect(receipt.ucp).toEqual(evidence.browser.ucp);
    expect(receipt.checkout).toEqual(evidence.browser.checkout);
  });

  const changes: {
    name: string;
    change: (receipt: ShoppingResearch) => void;
  }[] = [
    {
      name: "surface",
      change: (receipt) => {
        receipt.queries[0]!.surface = "ChatGPT";
      },
    },
    {
      name: "market",
      change: (receipt) => {
        receipt.queries[0]!.market = "US";
      },
    },
    {
      name: "locale",
      change: (receipt) => {
        receipt.queries[0]!.interfaceLocale = "en-US";
      },
    },
    {
      name: "signed-out state",
      change: (receipt) => {
        receipt.queries[0]!.signedOut = true;
      },
    },
    {
      name: "coverage",
      change: (receipt) => {
        receipt.queries[0]!.coverage = "A controlled United States test.";
      },
    },
    {
      name: "UCP result",
      change: (receipt) => {
        receipt.ucp.status = "unknown";
      },
    },
    {
      name: "checkout notes",
      change: (receipt) => {
        receipt.checkout.notes = "The checkout was inspected.";
      },
    },
  ];
  test.each(changes)(
    "rejects substituted $name even when source quotes are unchanged",
    ({ change }) => {
      const { evidence, receipt } = fixture();
      change(receipt);
      expect(validateAutomaticResearch(evidence, receipt, 14)).toBe(
        "The finding no longer matches the original captures.",
      );
    },
  );

  test("rejects edited original capture bytes", () => {
    const { evidence, receipt } = fixture();
    evidence.answer.raw[0]!.body = "A different answer.";
    expect(validateAutomaticResearch(evidence, receipt, 14)).toBe(
      "An original provider capture is missing or changed.",
    );
  });

  test("rejects source content that differs from the saved capture projection", () => {
    const { evidence, receipt } = fixture();
    receipt.sources[0]!.content += " The market was US.";
    expect(validateAutomaticResearch(evidence, receipt, 14)).toBe(
      "The finding no longer matches the original captures.",
    );
  });
});

const selectionFixture = () => {
  const { evidence, receipt } = fixture();
  const catalog = createAssessmentCatalog(evidence);
  const output = {
    decision: "supported",
    reason: "The captured answer and rendered merchant price differ.",
    selected: {
      kind: "product-data-gap",
      observation: receipt.selected.observation,
      consequence: receipt.selected.consequence,
      askAbout: receipt.selected.askAbout,
      quoteIds: catalog.quotes
        .filter((quote) => ["answer", "product"].includes(quote.sourceId))
        .map((quote) => quote.id),
    },
    competitors: [],
  };
  return { evidence, catalog, output };
};

describe("assessment selects exact captured excerpts", () => {
  test("projects quote IDs into unchanged source text and server-owned scope", () => {
    const { evidence, catalog, output } = selectionFixture();
    const projected = projectAssessment(catalog, output);
    expect(projected.decision).toBe("supported");
    expect(projected.selected?.quotes).toEqual(
      output.selected.quoteIds.map((id) => {
        const excerpt = catalog.quotes.find((quote) => quote.id === id)!;
        return { sourceId: excerpt.sourceId, quote: excerpt.quote };
      }),
    );
    expect(projected.selected?.sourceIds).toEqual(["answer", "product"]);
    expect(projected.selected?.scope).toBe(catalog.scope);
    expect(projected.selected?.scope).toContain(
      "sign-in state were not independently established",
    );
    expect(projected.selected?.scope).toContain("Checkout was not tested");
    expect(assembleResearch(evidence, projected, 14)).toMatchObject({
      success: true,
      data: { status: "researched" },
    });
  });

  test("a paraphrased quote or invented scope cannot enter the wire format", () => {
    const { catalog, output } = selectionFixture();
    const selected = {
      ...output.selected,
      quotes: [{ sourceId: "answer", quote: "The tote is thirty dollars." }],
      scope: "Signed out in the United States.",
    };
    expect(
      assessmentWireSchema(catalog).safeParse({ ...output, selected }).success,
    ).toBe(false);
  });

  test.each(["q_unknown", "The answer says thirty dollars"])(
    "unknown excerpt %s produces a hold",
    (id) => {
      const { catalog, output } = selectionFixture();
      output.selected.quoteIds[0] = id;
      expect(projectAssessment(catalog, output)).toMatchObject({
        decision: "hold",
        selected: null,
      });
    },
  );

  test("empty and duplicate selections produce a hold", () => {
    const { catalog, output } = selectionFixture();
    expect(
      projectAssessment(catalog, {
        ...output,
        selected: { ...output.selected, quoteIds: [] },
      }),
    ).toMatchObject({ decision: "hold" });
    expect(
      projectAssessment(catalog, {
        ...output,
        selected: {
          ...output.selected,
          quoteIds: [catalog.quotes[0]!.id, catalog.quotes[0]!.id],
        },
      }),
    ).toMatchObject({ decision: "hold" });
  });

  test("an answer plus unrelated source cannot substitute for a merchant excerpt", () => {
    const { evidence, catalog, output } = selectionFixture();
    output.selected.quoteIds = catalog.quotes
      .filter((quote) => ["answer", "ucp"].includes(quote.sourceId))
      .map((quote) => quote.id);
    const projected = projectAssessment(catalog, output);
    expect(assembleResearch(evidence, projected, 14)).toMatchObject({
      success: true,
      data: { status: "held" },
    });
  });

  test("without captured candidates the wire schema permits only a product-data gap and no competitors", () => {
    const { catalog, output } = selectionFixture();
    const schema = assessmentWireSchema(catalog);
    expect(schema.safeParse(output).success).toBe(true);
    expect(
      schema.safeParse({
        ...output,
        selected: { ...output.selected, kind: "query-comparison" },
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...output,
        competitors: [
          { candidateId: "unavailable", comparison: "A purported comparison" },
        ],
      }).success,
    ).toBe(false);
  });

  test("candidate IDs project only a captured competitor and still require its selected rendered quote", () => {
    const { evidence, output } = selectionFixture();
    const content = "Other Goods Carry tote. Large linen tote costs $35.00.";
    const url = "https://othergoods.com/products/carry-tote";
    const captured = {
      url,
      body: content,
      status: 200,
      receivedAt: evidence.answer.executedAt,
      sha256: createHash("sha256").update(content).digest("hex"),
    };
    evidence.browser.raw.push(captured);
    evidence.browser.sources.push({
      id: "competitor",
      kind: "competitor",
      capture: "browser",
      url,
      content,
      checkedAt: captured.receivedAt,
      artifact: `sha256:${captured.sha256}`,
    });
    evidence.browser.candidates.push({
      name: "Other Goods",
      product: "Carry tote",
      url,
      sourceIds: ["competitor"],
    });
    const catalog = createAssessmentCatalog(evidence);
    const comparison = {
      ...output,
      selected: { ...output.selected, kind: "query-comparison" },
      competitors: [
        {
          candidateId: catalog.candidates[0]!.id,
          comparison: "The captured pages describe large linen totes.",
        },
      ],
    };
    const withoutQuote = projectAssessment(catalog, comparison);
    expect(assembleResearch(evidence, withoutQuote, 14)).toMatchObject({
      success: true,
      data: { status: "held" },
    });
    comparison.selected.quoteIds.push(
      catalog.quotes.find((quote) => quote.sourceId === "competitor")!.id,
    );
    const projected = projectAssessment(catalog, comparison);
    expect(projected.competitors[0]?.url).toBe(url);
    expect(assembleResearch(evidence, projected, 14)).toMatchObject({
      success: true,
      data: { status: "researched" },
    });
    expect(
      projectAssessment(catalog, {
        ...comparison,
        competitors: [{ candidateId: "c_unknown", comparison: "Uncaptured" }],
      }),
    ).toMatchObject({ decision: "hold" });
  });

  test("catalog covers bounded captures with stable contiguous excerpts and no split surrogate pairs", () => {
    const { evidence } = fixture();
    const text = ("a".repeat(1999) + "😀" + " Long sentence.\n\n")
      .repeat(9)
      .slice(0, 18000);
    evidence.answer.source.content = text;
    evidence.browser.sources = Array.from({ length: 8 }, (_, index) => ({
      ...evidence.browser.sources[0]!,
      id: `source-${index}`,
      content: text,
    }));
    const catalog = createAssessmentCatalog(evidence);
    expect(catalog.quotes.length).toBeLessThanOrEqual(100);
    expect(createAssessmentCatalog(evidence)).toEqual(catalog);
    for (const source of [
      evidence.answer.source,
      ...evidence.browser.sources,
    ]) {
      const excerpts = catalog.quotes.filter(
        (quote) => quote.sourceId === source.id,
      );
      expect(excerpts.map((quote) => quote.quote).join("")).toBe(
        source.content,
      );
      for (const quote of excerpts) {
        expect(quote.quote).toBe(source.content.slice(quote.start, quote.end));
        expect(quote.quote.length).toBeLessThanOrEqual(2000);
        expect(/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/.test(quote.quote)).toBe(
          false,
        );
      }
    }
    evidence.answer.source.content = `Changed ${text.slice(8)}`;
    expect(createAssessmentCatalog(evidence).quotes[0]?.id).not.toBe(
      catalog.quotes[0]?.id,
    );
  });

  test("catalog rejects ambiguous source IDs", () => {
    const { evidence } = fixture();
    evidence.browser.sources[0]!.id = evidence.answer.source.id;
    expect(() => createAssessmentCatalog(evidence)).toThrow(
      "Captured source IDs must be unique",
    );
  });
});
