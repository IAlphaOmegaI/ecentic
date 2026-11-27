import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import type { Playbook, ProspectInput } from "@/lib/outbound";
import type { WriterParts } from "@/lib/outbound-composition";
import { rebuildWritingProposal } from "@/lib/outbound-rebuild-policy";
import {
  resultBrandNames,
  type ShoppingResearch,
} from "@/lib/outbound-shopping-research";
import type {
  BrowserResearch,
  RawCapture,
} from "@/server/utils/outbound/live-shopping-contract";
import type { FactAssessmentDependencies } from "@/server/utils/outbound/shopping-fact-assessment";

const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
const digest = (body: string) =>
  createHash("sha256").update(body).digest("hex");
export type FactSelection = Awaited<
  ReturnType<NonNullable<FactAssessmentDependencies["generate"]>>
>;
export type SyntheticShoppingOptions = {
  prospect: Pick<
    ProspectInput,
    "company" | "domain" | "product" | "productUrl"
  >;
  now?: number;
  answerText?: string;
  pageText?: string;
  structured?: string[];
};

/** Synthetic provider-shaped data only. No source here describes a real merchant or search. */
export const buildSyntheticShoppingCapture = async (
  input: SyntheticShoppingOptions,
) => {
  const Capture = await import("@/server/utils/outbound/live-shopping");
  const { projectBrowserExecution } = await import(
    "@/server/utils/outbound/live-shopping-browser"
  );
  const { createAssessmentCatalog } = await import(
    "@/server/utils/outbound/shopping-assessment"
  );
  const now = input.now ?? Date.now();
  const product = {
    name: input.prospect.product,
    url: input.prospect.productUrl,
  };
  const merchant = {
    name: input.prospect.company,
    domain: input.prospect.domain,
    aliases: [],
  };
  const answerText =
    input.answerText ??
    "1. Canvas Works — Large carry bag.\n2. Harbor Label — Cotton shopper.";
  const pageText = input.pageText ?? `${product.name} is a large linen bag.`;
  const structured = input.structured ?? [];
  const timestamp = new Date(now).toISOString();
  const job = {
    id: randomUUID(),
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
    url: `${new URL(product.url).origin}/.well-known/ucp`,
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
    await Capture.generateLegacyShopperQuery(
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
  return {
    evidence,
    selection: selection as FactSelection,
    catalog,
    answerQuoteId,
    productQuoteId,
    now,
  };
};

/** Project and revalidate synthetic facts through the same raw evidence path as runtime. */
export const buildSyntheticShoppingEvidence = async (
  input: SyntheticShoppingOptions & {
    listed?: string[];
    select?: (
      base: FactSelection,
      capture: Awaited<ReturnType<typeof buildSyntheticShoppingCapture>>,
    ) => FactSelection;
  },
) => {
  const capture = await buildSyntheticShoppingCapture(input);
  const Assessment = await import(
    "@/server/utils/outbound/shopping-fact-assessment"
  );
  const base: FactSelection = {
    ...capture.selection,
    listed: (input.listed ?? ["Canvas Works", "Harbor Label"]).map((name) => ({
      name,
      kind: "brand",
      quoteId: capture.answerQuoteId,
      price: null,
    })),
    productAttributes: [{ quoteId: capture.productQuoteId, value: "large" }],
  };
  const selection = input.select?.(base, capture) ?? base;
  const result = Assessment.projectFactAssessment(
    capture.evidence,
    selection,
    capture.now,
  );
  if (result.status !== "researched") throw new Error(result.reason);
  const brandCatalog = Assessment.resultBrandCatalog(
    capture.evidence,
    capture.now,
  );
  const brandNames = selection.listed
    .filter((item) => item.kind === "brand")
    .map((item) => item.name)
    .slice(0, 3);
  const projected =
    ["discovery-absence", "discovery-outranked"].includes(
      result.receipt.selected.kind,
    ) && brandNames.length >= 2
      ? Assessment.projectResultBrands(
          capture.evidence,
          result.receipt,
          {
            decision: "supported",
            reason: "Synthetic brand strings only.",
            brands: brandNames.map((name) => ({
              name,
              quoteId: brandCatalog.find((quote) => quote.quote.includes(name))
                ?.id,
            })),
          },
          capture.now,
        )
      : result;
  if (projected.status !== "researched") throw new Error(projected.reason);
  const problem = Assessment.validateFactResearch(
    capture.evidence,
    projected.receipt,
    capture.now,
  );
  if (problem) throw new Error(problem);
  return { ...capture, selection, receipt: projected.receipt };
};

/** Valid new formula for fixtures, retaining every configured sender profile and identity. */
export const syntheticWritingPolicy = (settings: Playbook): Playbook =>
  rebuildWritingProposal(settings);

/** Deterministic injected words for synthetic discovery receipts; never calls a writer. */
export const syntheticWriterParts = (
  prospect: Pick<ProspectInput, "company">,
  receipt: ShoppingResearch,
  variant = 0,
): WriterParts => {
  const query = receipt.queries[receipt.discovery?.queryIndex ?? 0]?.query;
  if (!query) throw new Error("Synthetic copy requires an observed query.");
  const openings = [
    `I needed large bags, so I asked for "${query}".`,
    `While shopping for large bags, I searched for "${query}".`,
    `I wanted large bags and asked for "${query}".`,
    `Looking for large bags, I asked for "${query}".`,
    `For large bags, my search was "${query}".`,
    `I was choosing large bags when I asked for "${query}".`,
    `My search for large bags was "${query}".`,
    `To find large bags, I asked for "${query}".`,
    `I wanted help choosing large bags and searched for "${query}".`,
    `Shopping for large bags, I asked for "${query}".`,
  ];
  const names = resultBrandNames(receipt);
  const named =
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
      : names[0];
  if (!named) throw new Error("Synthetic copy requires observed listed names.");
  return {
    subject: "linen bags",
    opening: openings[Math.abs(variant) % openings.length] ?? openings[0] ?? "",
    result: `It named ${named}. ${prospect.company} didn't come up.`,
    relevance: "That's the kind of search a new customer starts with.",
  };
};
