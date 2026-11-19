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
const { assembleResearch, validateAutomaticResearch } = await import(
  "@/server/utils/outbound/shopping-assessment"
);

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
