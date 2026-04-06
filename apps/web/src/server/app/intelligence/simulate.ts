"use server";

import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { withAuthentication } from "@/server/utils/authentication";
import { schema } from "../../database";
import * as AI from "../../utils/ai";
import { Environment } from "../../utils/environment";
import * as Competitor from "../competitor";
import * as Product from "../product";
import * as Scan from "../scan";
import * as Simulation from "../simulation";
import * as Formating from "./formating";

const STRICT_SCORING_RULES = `
STRICT SCORING RULES — apply these to BOTH products equally:

AUTOMATIC PENALTIES (subtract from the category score):
- Description is MISSING → –30 points overall
- Price is MISSING → –15 points overall
- 0 product images → –25 points overall
- 1 product image → –15 points overall
- 2-3 product images → –5 points overall
- 5+ product images → no penalty
- No brand name stated → –10 points overall
- No SKU or model number → –5 points overall
- Description under 100 characters → –10 points overall
- No URL provided → –5 points overall
- No structured data or specifications → –15 points overall

SCORING CALIBRATION:
- A score above 70 means the listing is genuinely excellent — comprehensive specs, multiple images, clear brand, detailed description, competitive pricing. Most listings should NOT score above 70.
- A mediocre listing with basic info and few images should score 35-50.
- A poor listing with missing critical fields should score 15-35.
- A listing with only a title and price should score under 20.
- Do NOT inflate scores. Real-world e-commerce listings are frequently mediocre.
- The absolute scores matter more than the relative gap. Two bad listings can both score under 40.

ANTI-BIAS RULES:
- Do NOT favor the product labeled "PRODUCT" over the one labeled "COMPETITOR" — labels are arbitrary.
- Do NOT assume missing information is positive. Missing = unknown = penalty.
- Do NOT reward marketing fluff. Superlatives without evidence ("best in class", "premium quality") add zero points.
- Shorter descriptions are NOT "concise and effective" — they are incomplete unless every key spec is covered.
`;

const perspectives = [
  {
    id: "gpt4",
    label: "GPT-4",
    model: "gpt-4o" as AI.ModelId,
    system: `You are a rigorous AI shopping agent performing a technical listing audit. You compare two product listings and recommend the one with stronger verifiable evidence. You are deliberately harsh — you represent a skeptical buyer who trusts data, not marketing.

Your evaluation methodology:

1. SPECIFICATION COMPLETENESS (30% weight):
   Count explicit specs stated in each listing. Check for: dimensions, weight, materials, color options, compatibility, battery life, connectivity, capacity, certifications (UL/CE/FDA/FCC), warranty duration. Each missing spec that a reasonable buyer would want = –3 points in this category. A listing with fewer than 3 concrete specs scores under 30 in this category.

2. MEDIA & VISUAL EVIDENCE (25% weight):
   Product images are critical for purchase confidence. Score based on image count:
   - 0 images: 0/25
   - 1 image: 5/25
   - 2-3 images: 10/25
   - 4-5 images: 18/25
   - 6+ images: 22-25/25
   Also check: is structured data present? Does the listing reference product videos, 360° views, or size charts?

3. SOCIAL PROOF & TRUST (25% weight):
   Look for: review count, average rating, "verified purchase" signals, awards, bestseller status, number of units sold, brand recognition. A listing with NO social proof data scores 0/25 in this category — do not assume reviews exist if none are mentioned.

4. PURCHASE READINESS (20% weight):
   Can a buyer make an informed decision from this listing alone? Check for: clear pricing, shipping information, return policy, stock availability, size/variant options, bundle contents. Missing price = 0/20 in this category.

${STRICT_SCORING_RULES}`,
  },
  {
    id: "claude",
    label: "Claude",
    model: "claude-sonnet-4-20250514" as AI.ModelId,
    system: `You are a critical AI shopping analyst evaluating product listings for recommendation quality. You assess how well a listing enables an informed purchase decision. You are deliberately skeptical — vague claims and missing data are failures, not neutral.

Your evaluation methodology:

1. INFORMATION COMPLETENESS (30% weight):
   Audit the listing for these critical fields and score per-field:
   - Title clarity (is the product identifiable?) → 0-3 points
   - Description depth (does it explain features, use cases, materials?) → 0-8 points. Under 100 chars = max 2 points.
   - Price stated → 0 or 4 points (binary)
   - Brand identified → 0 or 3 points (binary)
   - Product images (0 imgs = 0pts, 1 = 2pts, 2-3 = 4pts, 4-5 = 6pts, 6+ = 8pts)
   - SKU/model number → 0 or 2 points (binary)
   - Structured data present → 0 or 2 points (binary)
   Total: /30

2. BUYER CONFIDENCE SIGNALS (25% weight):
   - Review count and rating mentioned → 0-8 points (0 if no reviews referenced at all)
   - Brand reputation indicators (known brand, years in business, customer count) → 0-5 points
   - Return/warranty policy → 0-4 points
   - Certifications or third-party validation → 0-4 points
   - Professional listing quality (structured, scannable, no typos) → 0-4 points
   Total: /25

3. COMPETITIVE POSITIONING (25% weight):
   - Price competitiveness for the product category → 0-8 points
   - Unique selling proposition clearly stated → 0-5 points
   - Feature comparison readiness (would this listing win in a side-by-side?) → 0-7 points
   - Value justification if premium-priced → 0-5 points
   Total: /25

4. PURCHASE FRICTION (20% weight):
   - Unanswered questions a buyer would have → start at 20, subtract 3 per major gap
   - Common gaps: shipping cost/speed, compatibility, sizing, durability, what's in the box
   - Missing price = automatic 0/20
   Total: /20

${STRICT_SCORING_RULES}`,
  },
  {
    id: "gemini",
    label: "Gemini",
    model: "gemini-2.5-flash" as AI.ModelId,
    system: `You are a value-optimization AI agent that evaluates product listings with extreme rigor. You determine which listing delivers more verifiable value per dollar. You punish vagueness and reward concrete, measurable data.

Your evaluation methodology:

1. EVIDENCE-BASED VALUE (30% weight):
   List every concrete, verifiable claim in each listing (specific measurements, materials, certifications, test results, capacity numbers). Count them.
   - 0-2 concrete claims: 0-8/30
   - 3-5 concrete claims: 9-15/30
   - 6-8 concrete claims: 16-22/30
   - 9+ concrete claims: 23-30/30
   Marketing language without specifics ("high quality", "durable", "premium") counts as ZERO claims.

2. VISUAL & MEDIA EVIDENCE (25% weight):
   Images are non-negotiable for e-commerce trust.
   - 0 images: 0/25
   - 1 image: 4/25
   - 2-3 images: 8/25
   - 4-5 images: 16/25
   - 6+ images with different angles/contexts: 20-25/25
   Structured data or rich media references add up to 5 bonus points (capped at 25).

3. PRICE-TO-INFORMATION RATIO (25% weight):
   Divide the number of concrete listing attributes by the price. The listing that gives more verifiable information per dollar scores higher. But: missing price = 0/25 (can't calculate value without price). A cheap product with zero specs = 5/25 at best (cheap ≠ good value if you can't verify what you're getting).

4. RISK ASSESSMENT (20% weight):
   Score the listing's risk to the buyer:
   - No return policy mentioned → –5 points
   - No brand name → –4 points
   - No reviews or ratings → –5 points
   - No shipping information → –3 points
   - No images → –5 points
   - Unknown or suspicious URL domain → –3 points
   Start at 20, subtract penalties. Floor is 0.

${STRICT_SCORING_RULES}`,
  },
  {
    id: "perplexity",
    label: "Perplexity",
    model: "sonar-pro" as AI.ModelId,
    system: `You are a search-augmented AI shopping agent with real-time web access. Unlike other evaluators that only see the listing data provided, you MUST actively search the web to verify claims, find real reviews, check actual pricing, and gather external evidence about both products.

YOUR CRITICAL ADVANTAGE: You can search the web. USE IT. Do not just evaluate the listing text — go find the real data.

MANDATORY SEARCH TASKS (do all of these before scoring):
1. Search for the product name + "reviews" to find real review counts and ratings
2. Search for the product name + "price" to verify pricing and find competing offers
3. Search for the brand name to assess brand legitimacy and reputation
4. Search for the product URL domain to check site authority and trustworthiness
5. If a product has a SKU or model number, search for it to find cross-listed data

Your evaluation methodology:

1. WEB-VERIFIED REPUTATION (30% weight):
   Based on your search results:
   - Actual review count found online (0 reviews found = 0/10, 1-10 = 3/10, 11-50 = 5/10, 51-200 = 7/10, 200+ = 9-10/10)
   - Actual average rating found (below 3.5 = 2/10, 3.5-4.0 = 5/10, 4.0-4.5 = 7/10, 4.5+ = 9-10/10)
   - No reviews findable online at all = 0/10 for both sub-scores
   - Brand search results (established brand with web presence = 5-10/10, unknown = 0-3/10)
   Total: /30

2. LISTING DATA vs. WEB REALITY (25% weight):
   Compare what the listing claims against what you find online:
   - Price matches or beats web average → 8-10/10
   - Price is above web average → 3-5/10
   - Price not verifiable → 2/10
   - Specs match external sources → 8-10/10
   - Specs exaggerated or contradicted → 0-3/10
   - Not enough data to verify → 4/10
   - Domain/seller reputation (legitimate retailer = 5/5, unknown = 1/5)
   Total: /25

3. LISTING COMPLETENESS (25% weight):
   Even with search, the listing itself matters:
   - Image count (0 = 0/8, 1 = 2/8, 2-3 = 4/8, 4-5 = 6/8, 6+ = 8/8)
   - Description quality (0-7 points based on depth and specificity)
   - Structured data present (0-5 points)
   - SKU/model for cross-referencing (0-5 points)
   Total: /25

4. COMPETITIVE CONTEXT (20% weight):
   Based on your search, how does each product rank in its market?
   - Is this a category leader or an unknown entrant? → 0-7 points
   - Are there significantly better alternatives at the same price? → 0-7 points
   - Would a search-based recommendation engine surface this product? → 0-6 points
   Total: /20

${STRICT_SCORING_RULES}`,
  },
] as const;

export type SimulationResult = {
  product: Product.Type & { score: number };
  competitor: Competitor.Type & { score: number };
  winner: "product" | "competitor";
  reasoning: string;
  keyFactors?: string[];
  model: string;
  modelLabel: string;
};

export type ScanEvent =
  | { kind: "log"; model: string; message: string }
  | { kind: "chunk"; model: string; text: string }
  | {
      kind: "progress";
      completed: number;
      total: number;
      wins: number;
      losses: number;
      modelWins: Record<string, { wins: number; losses: number }>;
    }
  | { kind: "model_status"; model: string; status: "running" | "complete" }
  | { kind: "error"; text: string }
  | {
      kind: "done";
      scanId: string;
      wins: number;
      losses: number;
      modelWinRates: Record<
        string,
        { wins: number; losses: number; rate: number }
      >;
      topFinding: TopFinding | null;
      productCount: number;
      results: SimulationResult[];
    };
export const runScan = withAuthentication(async (context) => {
  const [products, competitors] = await Promise.all([
    Product.find(Environment.SERVER, {
      where: eq(schema.product.userId, context.session.user.id),
    }),
    Competitor.find(Environment.SERVER, {
      where: eq(schema.competitor.userId, context.session.user.id),
    }),
  ]);

  if (!products.success) {
    return {
      success: false,
      error: products.error,
    };
  }

  if (!competitors.success) {
    return {
      success: false,
      error: competitors.error,
    };
  }

  const stream = AI.stream<ScanEvent>(async (update) => {
    const selected = competitors.data.filter((record) => record.selected);

    if (products.data.length === 0) {
      update({ kind: "error", text: "No products found" });
      return;
    }

    if (selected.length === 0) {
      update({ kind: "error", text: "No competitors found" });
      return;
    }

    const totalSimulations =
      products.data.length * selected.length * perspectives.length;

    const scan = await Scan.create(Environment.SERVER, {
      userId: context.session.user.id,
      status: "running",
      totalSimulations,
      completedSimulations: 0,
      wins: 0,
      losses: 0,
    });

    if (!scan.success) {
      update({ kind: "error", text: "Failed to create scan" });
      return;
    }

    context.span.addBreadcrumb({
      category: "scan.start",
      data: {
        "scan.id": scan.data.id,
        "products.count": products.data.length,
        "competitors.count": selected.length,
        "simulations.total": totalSimulations,
      },
    });

    update({
      kind: "log",
      model: "System",
      message: "Initializing simulation engine...",
    });

    for (const perspective of perspectives) {
      update({
        kind: "model_status",
        model: perspective.label,
        status: "running",
      });
    }

    update({
      kind: "progress",
      completed: 0,
      total: totalSimulations,
      wins: 0,
      losses: 0,
      modelWins: Object.fromEntries(
        perspectives.map((p) => [p.label, { wins: 0, losses: 0 }]),
      ),
    });

    const tasks = products.data.flatMap((product) =>
      selected.flatMap((competitor) =>
        perspectives.map(
          (perspective) => async (): Promise<SimulationResult> => {
            const { output, textStream } = AI.generate({
              model: perspective.model,
              system: perspective.system,
              prompt: `A consumer is choosing between these two products. Perform a strict, evidence-based audit of each listing.

--- PRODUCT ---
${Formating.formatProduct(product)}

--- COMPETITOR ---
${Formating.formatCompetitor(competitor)}

INSTRUCTIONS:
1. Score each product 0-100 using your evaluation methodology. Apply all penalties for missing data — do NOT skip them.
2. Be harsh. Most real-world listings score 30-55. A score above 70 requires exceptional completeness (6+ images, reviews, full specs, clear brand, structured data).
3. Missing data is a FAILURE, not neutral. Every "MISSING" field in the listing above should trigger the corresponding penalty from your scoring rubric.
4. Do NOT favor either listing based on its label ("PRODUCT" vs "COMPETITOR"). Evaluate purely on evidence.
5. Pick a winner: use "product" if the PRODUCT listing wins, or "competitor" if the COMPETITOR listing wins.
6. In your reasoning, cite the specific data points (or missing data points) that drove the decision. Be concrete — reference actual field values or their absence.
7. In keyFactors, list the top 3-5 specific attributes or gaps that determined the outcome (e.g., "PRODUCT has 0 images vs COMPETITOR has 5", "COMPETITOR missing price", "Neither listing has reviews").`,
              schema: z.object({
                winner: z.enum(["product", "competitor"]),
                productScore: z.number().min(0).max(100),
                competitorScore: z.number().min(0).max(100),
                reasoning: z.string(),
                keyFactors: z.array(z.string()),
              }),
              stream: true,
            });

            const [, parseResult] = await Promise.all([
              (async () => {
                for await (const chunk of textStream) {
                  update({
                    kind: "chunk",
                    model: perspective.label,
                    text: chunk,
                  });
                }
              })(),
              resultify(() => output),
            ]);

            const productScore = parseResult.success
              ? Math.round(parseResult.data.productScore)
              : 0;
            const competitorScore = parseResult.success
              ? Math.round(parseResult.data.competitorScore)
              : 50;

            return (() => {
              switch (true) {
                case parseResult.success:
                  return {
                    product: { ...product, score: productScore },
                    competitor: { ...competitor, score: competitorScore },
                    winner: parseResult.data.winner,
                    reasoning: parseResult.data.reasoning,
                    keyFactors: parseResult.data.keyFactors,
                    model: perspective.id,
                    modelLabel: perspective.label,
                  };
                default:
                  return {
                    product: { ...product, score: 0 },
                    competitor: { ...competitor, score: 50 },
                    winner: "competitor" as const,
                    reasoning: "Evaluation failed — defaulting to competitor",
                    model: perspective.id,
                    modelLabel: perspective.label,
                  };
              }
            })();
          },
        ),
      ),
    );

    const batchSize = 5;
    const batches = Array.from(
      { length: Math.ceil(tasks.length / batchSize) },
      (_value, index) =>
        tasks.slice(index * batchSize, index * batchSize + batchSize),
    );

    const results: SimulationResult[] = [];

    for (const batch of batches) {
      const batches = await Promise.all(batch.map((task) => task()));
      results.push(...batches);

      for (const record of batches) {
        const winner =
          record.winner === "product"
            ? record.product.title
            : record.competitor.title;

        update({
          kind: "log",
          model: record.modelLabel,
          message: `DECISION: Selected ${winner} (${record.reasoning.slice(0, 80)})`,
        });
      }

      const wins = results.filter(
        (record) => record.winner === "product",
      ).length;

      const modelWins = Object.fromEntries(
        perspectives.map((perspective) => {
          const modelResults = results.filter(
            (record) => record.model === perspective.id,
          );
          const modelWinsCount = modelResults.filter(
            (record) => record.winner === "product",
          ).length;
          return [
            perspective.label,
            {
              wins: modelWinsCount,
              losses: modelResults.length - modelWinsCount,
            },
          ];
        }),
      );

      update({
        kind: "progress",
        completed: results.length,
        total: totalSimulations,
        wins,
        losses: results.length - wins,
        modelWins,
      });
    }

    const wins = results.filter((record) => record.winner === "product").length;
    const losses = results.length - wins;

    await Promise.all(
      results.map((record) =>
        Simulation.create(Environment.SERVER, {
          scanId: scan.data.id,
          productId: record.product.id,
          competitorId: record.competitor.id,
          model: record.model,
          winner: record.winner,
          reasoning: record.reasoning,
          productScore: record.product.score,
          competitorScore: record.competitor.score,
        }),
      ),
    );

    const modelWinRates = Object.fromEntries(
      perspectives.map((perspective) => {
        const model = results.filter(
          (record) => record.model === perspective.id,
        );
        const modelWins = model.filter(
          (record) => record.winner === "product",
        ).length;

        return [
          perspective.id,
          {
            wins: modelWins,
            losses: model.length - modelWins,
            rate:
              model.length > 0
                ? Math.round((modelWins / model.length) * 100)
                : 0,
          },
        ];
      }),
    );

    for (const perspective of perspectives) {
      update({
        kind: "model_status",
        model: perspective.label,
        status: "complete",
      });
    }

    const topFinding = await resultify(async () => {
      const misses = results.filter((record) => record.winner === "competitor");

      if (misses.length === 0) return null;

      const lossesByProduct = new Map<
        string,
        { count: number; title: string; reasons: string[] }
      >();

      for (const record of misses) {
        const existing = lossesByProduct.get(record.product.id) ?? {
          count: 0,
          title: record.product.title,
          reasons: [],
        };
        existing.count += 1;
        existing.reasons.push(record.reasoning);
        lossesByProduct.set(record.product.id, existing);
      }

      const worst = [...lossesByProduct.entries()].sort(
        (a, b) => b[1].count - a[1].count,
      )[0];

      if (!worst) return null;

      return AI.generate({
        system:
          "You are an e-commerce optimization analyst. Given the reasons a product lost in AI shopping simulations, identify the specific missing attributes or weaknesses that caused the most losses. Be concise and actionable.",
        prompt: `Product "${worst[1].title}" lost ${worst[1].count} out of ${results.length} total simulations.\n\nHere are the reasons it lost:\n${worst[1].reasons.slice(0, 10).join("\n---\n")}\n\nIdentify the top missing attributes and estimate what percentage of simulations these gaps cost.`,
        schema: z.object({
          name: z.string(),
          missingAttributes: z.array(z.string()),
          impactDescription: z.string(),
          lossPercentage: z.number(),
        }),
      });
    });

    const finding = topFinding.success ? topFinding.data : null;

    await Scan.update(Environment.SERVER, scan.data.id, {
      status: "complete",
      completedSimulations: totalSimulations,
      wins,
      losses,
      topFinding: finding,
    });

    context.span.addBreadcrumb({
      category: "scan.complete",
      data: {
        "scan.id": scan.data.id,
        wins,
        losses,
        "simulations.total": totalSimulations,
      },
    });

    update({
      kind: "done",
      scanId: scan.data.id,
      wins,
      losses,
      modelWinRates,
      topFinding: finding,
      productCount: new Set(results.map((record) => record.product.id)).size,
      results,
    });
  });

  return {
    success: true,
    data: {
      output: stream.output,
    },
  };
}, "Simulation.runScan");

export type TopFinding = {
  name: string;
  missingAttributes: string[];
  impactDescription: string;
  lossPercentage: number;
};
