"use server";

import { resultify } from "@zenncore/utils";
import { z } from "zod";
import * as AI from "../../utils/ai";
import { withContext } from "../../utils/context";
import * as HTTP from "../../utils/http";

const SCORING_RULES = `
STRICT SCORING RULES — apply these to BOTH products equally:

AUTOMATIC PENALTIES (subtract from the category score):
- Description is MISSING → –30 points overall
- Price is MISSING → –15 points overall
- 0 product images → –25 points overall
- 1 product image → –15 points overall
- 2-3 product images → –5 points overall
- 5+ product images → no penalty
- No brand name stated → –10 points overall
- Description under 100 characters → –10 points overall
- No URL provided → –5 points overall
- No structured data or specifications → –15 points overall

SCORING CALIBRATION:
- A score above 70 means the listing is genuinely excellent. Most listings should NOT score above 70.
- A mediocre listing with basic info and few images should score 35-50.
- A poor listing with missing critical fields should score 15-35.
- Do NOT inflate scores.

ANTI-BIAS RULES:
- Do NOT favor either listing based on its label. Evaluate purely on evidence.
- Missing information = penalty, never neutral.
- Marketing fluff without evidence = zero points.
`;

const perspectives = [
  {
    id: "gpt4",
    label: "GPT-4",
    model: "gpt-4o" as AI.ModelId,
    instructions: `You are a rigorous AI shopping agent. You compare two product listings and recommend the one with stronger verifiable evidence. You are deliberately harsh — you represent a skeptical buyer who trusts data, not marketing.

Evaluate on: specification completeness (30%), media evidence (25%), trust signals (25%), purchase readiness (20%).

${SCORING_RULES}`,
  },
  {
    id: "claude",
    label: "Claude",
    model: "claude-sonnet-4-20250514" as AI.ModelId,
    instructions: `You are a critical AI shopping analyst. You assess how well a listing enables an informed purchase decision. You are deliberately skeptical — vague claims and missing data are failures.

Evaluate on: information completeness (30%), buyer confidence (25%), competitive positioning (25%), purchase friction (20%).

${SCORING_RULES}`,
  },
  {
    id: "gemini",
    label: "Gemini",
    model: "gemini-2.5-flash" as AI.ModelId,
    instructions: `You are a value-optimization AI agent that evaluates product listings with extreme rigor. You determine which listing delivers more verifiable value per dollar.

Evaluate on: evidence-based value (30%), visual evidence (25%), price-to-information ratio (25%), risk assessment (20%).

${SCORING_RULES}`,
  },
  {
    id: "perplexity",
    label: "Perplexity",
    model: "sonar-pro" as AI.ModelId,
    instructions: `You are a search-augmented AI shopping agent. You evaluate product listings by combining the provided data with your knowledge of brands, pricing, and market positioning.

Evaluate on: web-verified reputation (30%), listing vs reality (25%), listing completeness (25%), competitive context (20%).

${SCORING_RULES}`,
  },
] as const;

const truncateHtml = (html: string, limit = 12000): string => {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return stripped.slice(0, limit);
};

export type CompareEvent =
  | { kind: "log"; model: string; message: string }
  | { kind: "chunk"; model: string; text: string }
  | {
      kind: "scrape_done";
      productA: ScrapedProduct;
      productB: ScrapedProduct;
    }
  | {
      kind: "progress";
      completed: number;
      total: number;
    }
  | { kind: "error"; text: string }
  | {
      kind: "done";
      productA: ScrapedProduct;
      productB: ScrapedProduct;
      results: CompareResult[];
    };

export type ScrapedProduct = {
  url: string;
  title: string;
  brand: string | null;
  price: string | null;
  currency: string;
  description: string | null;
  image: string | null;
  favicon: string | null;
};

export type CompareResult = {
  model: string;
  modelLabel: string;
  winner: "a" | "b";
  scoreA: number;
  scoreB: number;
  reasoning: string;
  keyFactors: string[];
};

const scrapePage = async (url: string): Promise<ScrapedProduct | null> => {
  const response = await HTTP.request(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.success) return null;

  const text = await resultify(() => response.data.text());
  if (!text.success) return null;

  const html = truncateHtml(text.data);

  const extraction = await resultify(() =>
    AI.generate({
      instructions: `You are a product data extraction specialist. Given stripped text from an e-commerce product page, extract structured product information.

Rules:
- Only extract data explicitly present in the page text. Never fabricate values.
- For price: extract the current/sale price as a numeric string (e.g. "29.99" not "$29.99").
- For brand: look for "by [Brand]", "Brand: [Name]", or the first prominent brand mention.
- For title: use the main product title, not breadcrumbs or category names.
- For description: extract the primary product description, truncated to 300 characters.
- For image: extract the primary product image URL if present. Return null if not clearly identifiable.
- Output only the structured fields — no prose or markdown outside the object.`,
      prompt: `Extract the product from this page:\n\nURL: ${url}\nContent:\n${html}`,
      output: z.object({
        title: z.string().describe("The main product title"),
        brand: z
          .string()
          .nullable()
          .describe("Brand name, or null if not present"),
        price: z
          .string()
          .nullable()
          .describe(
            'Current price as a numeric string (e.g. "29.99"), or null',
          ),
        currency: z.string().describe("Currency code or symbol"),
        description: z
          .string()
          .nullable()
          .describe("Primary product description (max 300 chars), or null"),
        image: z
          .string()
          .nullable()
          .describe("Primary product image URL, or null if not identifiable"),
      }),
      schemaName: "ProductExtraction",
      schemaDescription:
        "Structured product data extracted from an e-commerce page",
    }),
  );

  if (!extraction.success) return null;

  const domain = (() => {
    const parsed = resultify(() => new URL(url));
    if (!parsed.success) return null;
    return parsed.data.hostname;
  })();

  const favicon = domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    : null;

  return {
    url,
    ...extraction.data,
    favicon,
  };
};

const formatScrapedProduct = (product: ScrapedProduct): string => {
  const lines = [`Title: ${product.title}`];
  lines.push(
    product.description
      ? `Description: ${product.description.slice(0, 800)}`
      : "Description: MISSING",
  );
  lines.push(
    product.price
      ? `Price: ${product.price} ${product.currency}`
      : "Price: MISSING",
  );
  lines.push(product.brand ? `Brand: ${product.brand}` : "Brand: MISSING");
  lines.push(
    product.image ? "Has product image: Yes" : "Has product image: No",
  );
  lines.push(product.url ? `URL: ${product.url}` : "URL: MISSING");
  return lines.join("\n");
};

export const runCompare = withContext(
  async (
    _context,
    { urlA, urlB, prompt }: { urlA: string; urlB: string; prompt: string },
  ) => {
    const stream = AI.streamable<CompareEvent>(async (update) => {
      update({
        kind: "log",
        model: "System",
        message: "Scraping product pages...",
      });

      const [productA, productB] = await Promise.all([
        scrapePage(urlA),
        scrapePage(urlB),
      ]);

      if (!productA) {
        update({ kind: "error", text: `Could not scrape product A: ${urlA}` });
        return;
      }

      if (!productB) {
        update({ kind: "error", text: `Could not scrape product B: ${urlB}` });
        return;
      }

      update({
        kind: "scrape_done",
        productA,
        productB,
      });

      update({
        kind: "log",
        model: "System",
        message: `Scraped "${productA.title}" and "${productB.title}". Running simulations across ${perspectives.length} AI models...`,
      });

      const total = perspectives.length;

      update({ kind: "progress", completed: 0, total });

      const tasks = perspectives.map(
        (perspective) => async (): Promise<CompareResult> => {
          update({
            kind: "log",
            model: perspective.label,
            message: "Evaluating listings...",
          });

          const { output, textStream } = AI.stream({
            model: perspective.model,
            instructions: perspective.instructions,
            prompt: `A consumer says: "${prompt}"

They are choosing between these two products. Perform a strict, evidence-based audit of each listing.

--- PRODUCT A ---
${formatScrapedProduct(productA)}

--- PRODUCT B ---
${formatScrapedProduct(productB)}

INSTRUCTIONS:
1. Score each product 0-100 using your evaluation methodology. Apply all penalties for missing data.
2. Be harsh. Most real-world listings score 30-55.
3. Pick a winner: use "a" if PRODUCT A wins, or "b" if PRODUCT B wins.
4. Consider the consumer's stated preference: "${prompt}" — weigh this as a tiebreaker or prioritization signal.
5. In your reasoning, cite the specific data points that drove the decision.
6. In keyFactors, list the top 3-5 specific attributes or gaps that determined the outcome.
7. Output ONLY the structured fields defined by the schema. Put all narrative analysis inside the "reasoning" field — do not emit any prose, markdown, or citations outside the object.`,
            output: z.object({
              winner: z
                .enum(["a", "b"])
                .describe('"a" if PRODUCT A wins, "b" if PRODUCT B wins'),
              scoreA: z
                .number()
                .min(0)
                .max(100)
                .describe("0-100 evidence-based score for PRODUCT A"),
              scoreB: z
                .number()
                .min(0)
                .max(100)
                .describe("0-100 evidence-based score for PRODUCT B"),
              reasoning: z
                .string()
                .describe(
                  "Concrete explanation citing the specific data points that drove the decision",
                ),
              keyFactors: z
                .array(z.string())
                .describe(
                  "Top 3-5 specific attributes or gaps that determined the outcome",
                ),
            }),
            schemaName: "ListingComparison",
            schemaDescription:
              "Evidence-based audit comparing two product listings against a consumer preference",
          });

          const [, parse] = await Promise.all([
            resultify(async () => {
              for await (const chunk of textStream) {
                update({
                  kind: "chunk",
                  model: perspective.label,
                  text: chunk,
                });
              }
            }),
            resultify(() => output),
          ]);

          if (!parse.success)
            return {
              model: perspective.id,
              modelLabel: perspective.label,
              winner: "b" as const,
              scoreA: 0,
              scoreB: 50,
              reasoning: "Evaluation failed — defaulting to Product B",
              keyFactors: [],
            };

          return {
            model: perspective.id,
            modelLabel: perspective.label,
            winner: parse.data.winner,
            scoreA: Math.round(parse.data.scoreA),
            scoreB: Math.round(parse.data.scoreB),
            reasoning: parse.data.reasoning,
            keyFactors: parse.data.keyFactors,
          };
        },
      );

      const batchSize = 2;
      const batches = Array.from(
        { length: Math.ceil(tasks.length / batchSize) },
        (_value, index) =>
          tasks.slice(index * batchSize, index * batchSize + batchSize),
      );

      const results: CompareResult[] = [];

      for (const batch of batches) {
        const completed = await Promise.all(batch.map((task) => task()));
        results.push(...completed);

        for (const record of completed) {
          const winner =
            record.winner === "a" ? productA.title : productB.title;
          update({
            kind: "log",
            model: record.modelLabel,
            message: `DECISION: Selected "${winner}" (score ${record.winner === "a" ? record.scoreA : record.scoreB} vs ${record.winner === "a" ? record.scoreB : record.scoreA})`,
          });
        }

        update({ kind: "progress", completed: results.length, total });
      }

      update({
        kind: "done",
        productA,
        productB,
        results,
      });
    });

    return {
      success: true as const,
      data: { output: stream.output },
    };
  },
  "Intelligence.runCompare",
);
