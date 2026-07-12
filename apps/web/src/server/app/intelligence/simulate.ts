"use server";

import { resultify } from "@zenncore/utils";
import { and, eq, inArray } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";
import { withAuthentication } from "@/server/utils/authentication";
import { schema } from "../../database";
import * as AI from "../../utils/ai";
import { Environment } from "../../utils/environment";
import { RequestError, ValidationError } from "../../utils/error";
import * as Competitor from "../competitor";
import * as Product from "../product";
import * as Scan from "../scan";
import * as Simulation from "../simulation";
import * as Judge from "./judge";

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

AGENT-READABILITY (UCP):
- AI shopping agents parse and trust listings through structured data (schema.org JSON-LD / UCP). The PRODUCT shows a "UCP / Agent-Readability Score" (0-100).
- Treat it as a penalty floor, NOT a bonus: a low score (weak or missing structured data) is a real failure that makes the listing hard for an agent to surface — penalize it. Assume major-retailer competitors are already agent-readable. A high score only means the listing meets the bar; do not award extra credit beyond it.
`;

const perspectives = [
  {
    id: "gpt4",
    label: "GPT-4",
    model: "gpt-4o" as AI.ModelId,
    instructions: `You are a rigorous AI shopping agent performing a technical listing audit. You compare two product listings and recommend the one with stronger verifiable evidence. You are deliberately harsh — you represent a skeptical buyer who trusts data, not marketing.

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
    instructions: `You are a critical AI shopping analyst evaluating product listings for recommendation quality. You assess how well a listing enables an informed purchase decision. You are deliberately skeptical — vague claims and missing data are failures, not neutral.

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
    model: "gemini-2.0-flash" as AI.ModelId,
    instructions: `You are a value-optimization AI agent that evaluates product listings with extreme rigor. You determine which listing delivers more verifiable value per dollar. You punish vagueness and reward concrete, measurable data.

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
  | { kind: "heartbeat" }
  | { kind: "log"; model: string; message: string }
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
            const parsing = await resultify(() =>
              AI.generate({
                model: perspective.model,
                instructions: Judge.JUDGE_SYSTEM,
                prompt: Judge.buildJudgePrompt(product, competitor),
                schema: z.object({
                  winner: z
                    .enum(["product", "competitor"])
                    .describe(
                      '"product" if the PRODUCT listing wins, "competitor" if the COMPETITOR listing wins',
                    ),
                  productScore: z
                    .number()
                    .min(0)
                    .max(100)
                    .describe(
                      "0-100 evidence-based score for the PRODUCT listing",
                    ),
                  competitorScore: z
                    .number()
                    .min(0)
                    .max(100)
                    .describe(
                      "0-100 evidence-based score for the COMPETITOR listing",
                    ),
                  reasoning: z
                    .string()
                    .describe(
                      "Concrete explanation citing the specific data points or missing fields that drove the decision",
                    ),
                  keyFactors: z
                    .array(z.string())
                    .describe(
                      "Top 3-5 specific attributes or gaps that determined the outcome",
                    ),
                }),
                schemaName: "ListingComparison",
                schemaDescription:
                  "Evidence-based audit comparing a product listing against a competitor listing",
              }),
            );

            const productScore = parsing.success
              ? Math.round(parsing.data.productScore)
              : 0;
            const competitorScore = parsing.success
              ? Math.round(parsing.data.competitorScore)
              : 50;

            return (() => {
              switch (true) {
                case parsing.success:
                  return {
                    product: { ...product, score: productScore },
                    competitor: { ...competitor, score: competitorScore },
                    winner: parsing.data.winner,
                    reasoning: parsing.data.reasoning,
                    keyFactors: parsing.data.keyFactors,
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

    const batchSize = 8;
    const batches = Array.from(
      { length: Math.ceil(tasks.length / batchSize) },
      (_value, index) =>
        tasks.slice(index * batchSize, index * batchSize + batchSize),
    );

    const results: SimulationResult[] = [];
    const heartbeat = setInterval(() => update({ kind: "heartbeat" }), 2000);

    try {
      for (const batch of batches) {
        const batchResults = await Promise.all(batch.map((task) => task()));
        results.push(...batchResults);

        await Promise.all(
          batchResults.map((record) =>
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

        for (const record of batchResults) {
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

      const wins = results.filter(
        (record) => record.winner === "product",
      ).length;
      const losses = results.length - wins;

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

      update({
        kind: "log",
        model: "System",
        message: "Analyzing results for top optimization opportunity...",
      });

      const topFinding = await resultify(async () => {
        const misses = results.filter(
          (record) => record.winner === "competitor",
        );

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
          instructions:
            "You are an e-commerce optimization analyst. Given the reasons a product lost in AI shopping simulations, identify the specific missing attributes or weaknesses that caused the most losses. Be concise and actionable. Respond only with the structured fields — no prose outside the object.",
          prompt: `Product "${worst[1].title}" lost ${worst[1].count} out of ${results.length} total simulations.\n\nHere are the reasons it lost:\n${worst[1].reasons.slice(0, 10).join("\n---\n")}\n\nIdentify the top missing attributes and estimate what percentage of simulations these gaps cost.`,
          schema: z.object({
            name: z.string().describe("The product name"),
            missingAttributes: z
              .array(z.string())
              .describe("Specific attributes or data the listing is missing"),
            impactDescription: z
              .string()
              .describe(
                "Concise, actionable summary of how these gaps cost wins",
              ),
            lossPercentage: z
              .number()
              .describe(
                "Estimated percentage (0-100) of simulations these gaps cost",
              ),
          }),
          schemaName: "TopFinding",
          schemaDescription:
            "The biggest optimization opportunity for the worst-performing product",
        });
      });

      const finding = topFinding.success ? topFinding.data : null;

      update({
        kind: "log",
        model: "System",
        message: "Finalizing scan...",
      });

      const completion = await Scan.update(Environment.SERVER, scan.data.id, {
        status: "complete",
        completedSimulations: totalSimulations,
        wins,
        losses,
        topFinding: finding,
      });
      if (!completion.success)
        update({
          kind: "log",
          model: "System",
          message: "Failed to persist scan results — please re-run the scan.",
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
    } finally {
      clearInterval(heartbeat);
    }
  });

  return {
    success: true,
    data: {
      output: stream.output,
    },
  };
}, "Simulation.runScan");

// Durable counterpart to runScan: enqueues a scan and lets the background drain
// (BackgroundScan.runPendingScans) run it to completion, so it finishes even if
// the user leaves the page. The client polls Scan.getProgress for live state.
export const enqueueScan = withAuthentication(async (context) => {
  const user = context.session.user.id;

  // idempotent — reuse an already in-flight scan instead of stacking duplicates.
  const existing = await Scan.find(Environment.SERVER, {
    where: and(
      eq(schema.scan.userId, user),
      inArray(schema.scan.status, ["pending", "running"]),
    ),
    orderBy: [{ column: schema.scan.createdAt, direction: "desc" }],
    limit: 1,
  });
  const inflight = existing.success ? existing.data[0] : null;

  // Self-heal a wedged scan instead of reusing it: a "running" whose worker died
  // mid-run, or a "pending" the drain never picked up, would otherwise block this
  // user's queue until a cron reaper fires — and locally (no cron) forever. Fail
  // it and fall through to enqueue a fresh one; reuse only a genuinely-live scan.
  const stale = (() => {
    if (!inflight) return false;
    switch (inflight.status) {
      case "running":
        return Date.now() - inflight.updatedAt.getTime() > 10 * 60 * 1000;
      case "pending":
        return Date.now() - inflight.createdAt.getTime() > 5 * 60 * 1000;
      default:
        return false;
    }
  })();

  if (inflight && !stale)
    return { success: true as const, data: { scanId: inflight.id } };

  if (inflight)
    await Scan.update(Environment.SERVER, inflight.id, {
      status: "failed",
      updatedAt: new Date(),
    });

  const [products, competitors] = await Promise.all([
    Product.find(Environment.SERVER, {
      where: eq(schema.product.userId, user),
    }),
    Competitor.find(Environment.SERVER, {
      where: eq(schema.competitor.userId, user),
    }),
  ]);
  if (!products.success) return products;
  if (!competitors.success) return competitors;

  const selected = competitors.data.filter((record) => record.selected);
  if (products.data.length === 0)
    return {
      success: false as const,
      error: new RequestError("No products found"),
    };
  if (selected.length === 0)
    return {
      success: false as const,
      error: new ValidationError("No competitors selected"),
    };

  const totalSimulations =
    products.data.length * selected.length * perspectives.length;

  const scan = await Scan.create(Environment.SERVER, {
    userId: user,
    status: "pending",
    totalSimulations,
    completedSimulations: 0,
    wins: 0,
    losses: 0,
  });
  if (!scan.success) return scan;

  // Kick the drain in a separate invocation so the scan starts right away
  // instead of waiting for the next cron tick. Best-effort: if it fails (or the
  // env is misconfigured), the every-minute cron is the backstop.
  after(async () => {
    await resultify(() =>
      fetch(`${process.env.BETTER_AUTH_BASE_URL ?? ""}/api/cron/drain`, {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
        cache: "no-store",
      }),
    );
  });

  return {
    success: true as const,
    data: { scanId: scan.data.id },
  };
}, "Simulation.enqueueScan");

export type TopFinding = {
  name: string;
  missingAttributes: string[];
  impactDescription: string;
  lossPercentage: number;
};
