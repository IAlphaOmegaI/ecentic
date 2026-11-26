import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { HeldReviewDependencies } from "@/server/app/outbound/held-discovery-review";
import * as Capture from "@/server/utils/outbound/live-shopping";
import { projectBrowserExecution } from "@/server/utils/outbound/live-shopping-browser";
import type {
  AiCapture,
  BrowserResearch,
  RawCapture,
} from "@/server/utils/outbound/live-shopping-contract";
import { createAssessmentCatalog } from "@/server/utils/outbound/shopping-assessment";
import { projectFactAssessment } from "@/server/utils/outbound/shopping-fact-assessment";

/** Synthetic provider wire captures for isolated lifecycle tests. Never real research. */
export const heldBrowser = (
  product: { name: string; url: string },
  text?: string,
) => {
  const now = Date.now();
  const timestamp = new Date(now).toISOString();
  const digest = (body: string) =>
    createHash("sha256").update(body).digest("hex");
  const body = JSON.stringify({
    success: true,
    stdout: JSON.stringify({
      url: product.url,
      status: 200,
      checkedAt: timestamp,
      title: product.name,
      headings: [product.name],
      text: text ?? `${product.name} large linen carry bag.`,
      structured: [],
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
  assert.ok(projected);
  const profile: RawCapture = {
    url: new URL("/.well-known/ucp", product.url).href,
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
      notes: "Synthetic fixture; no checkout interaction.",
    },
    candidates: [],
    limitations: [],
  };
  return browser;
};
export const heldQueryGenerator: NonNullable<
  HeldReviewDependencies["generateQuery"]
> = (input) =>
  Capture.generateShopperQuery(input, {
    generate: async ({ prompt }) => ({
      question:
        input.intent === "unbranded-broad"
          ? "linen carry bags"
          : "large linen bags",
      category: "bag",
      attribute: input.intent === "unbranded-broad" ? "linen" : "large",
      excerptIds: [JSON.parse(prompt).excerpts[0].id],
    }),
  });
export const heldPoll = async (job: AiCapture["job"], noGap: boolean) =>
  Capture.pollQuery(
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
            result_markdown: noGap
              ? `1. ${job.query.merchant?.name} — ${job.query.product.name} large linen carry bag.`
              : "1. Canvas Works — Large carry bag.\n2. Harbor Label — Cotton shopper.",
            citations: [],
          },
        }),
      }),
    },
  );
export const heldAssessment: NonNullable<
  HeldReviewDependencies["assess"]
> = async (input) => {
  const catalog = createAssessmentCatalog(input);
  const answerQuoteId = catalog.quotes.find(
    (quote) => quote.sourceId === catalog.answerSourceId,
  )?.id;
  const productQuoteId = catalog.quotes.find(
    (quote) => quote.sourceId === catalog.productSourceId,
  )?.id;
  assert.ok(answerQuoteId && productQuoteId);
  const merchant = input.answer.job.query.merchant;
  assert.ok(merchant);
  const noGap = input.answer.answer.includes(merchant.name);
  const text = `${input.answer.job.query.product.name} large linen carry bag.`;
  return {
    success: true,
    data: projectFactAssessment(
      input,
      {
        decision: "supported",
        reason: "Synthetic fixture facts only.",
        listed: (noGap
          ? [merchant.name]
          : ["Canvas Works", "Harbor Label"]
        ).map((name) => ({
          name,
          kind: "brand",
          quoteId: answerQuoteId,
          price: null,
        })),
        description: null,
        productAttributes: [],
        priceComparison: null,
        correctness: noGap
          ? { answerQuoteId, productQuoteId, answerText: text, pageText: text }
          : null,
        pageDataIssue: null,
      },
      Date.now(),
    ),
  };
};
