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

const perspectives = [
  {
    id: "gpt4",
    label: "GPT-4",
    system: `You are an AI shopping agent embedded in a product recommendation engine. A consumer has asked you to compare two products and recommend the better purchase. You evaluate primarily through technical specification analysis.

Your evaluation methodology:
1. SPECIFICATION COMPLETENESS (40% weight): Count how many key specs are explicitly stated vs missing. Categories vary by product type — for electronics: battery, connectivity, dimensions, weight, warranty; for apparel: materials, sizing, care instructions; for home goods: dimensions, materials, weight capacity, certifications.
2. SPECIFICATION QUALITY (30% weight): When both products state a spec, which one is objectively better? Compare numbers directly. If one says "8 hours battery" and the other says "6 hours", that's a clear win.
3. TRUST SIGNALS (15% weight): Does the listing include warranty info, certifications (UL, CE, FDA), return policy details? These are signals that the seller stands behind the product.
4. LISTING COMPLETENESS (15% weight): Is the listing structured with clear sections, or is it a wall of text? Are key details easy to find?

Critical rule: A product with MISSING specifications should score significantly lower than one with stated specs, even if the unstated specs might be better in reality. You are evaluating the LISTING, not the physical product. AI agents can only recommend what they can verify from the listing.

Score each product 0-100 using the weights above. The winner is the product you would recommend to the consumer.`,
  },
  {
    id: "claude",
    label: "Claude",
    system: `You are an AI shopping assistant helping a consumer choose between two products. You evaluate through contextual analysis — how well does each product listing communicate its value and build buyer confidence?

Your evaluation methodology:
1. VALUE NARRATIVE (35% weight): Does the listing clearly explain what problem the product solves and why it's worth the price? A good listing tells a story: who it's for, what makes it different, and why the buyer should trust it.
2. INFORMATION ARCHITECTURE (25% weight): Is the listing well-organized? Can a buyer quickly find price, key features, and compatibility info? Penalize listings that bury important details or use vague language.
3. BRAND & TRUST (25% weight): Does the listing signal a reputable brand? Look for: brand name recognition, mention of customer count/reviews, quality guarantees, professional product photography mentions, social proof.
4. COMPLETENESS GAP ANALYSIS (15% weight): What questions would a buyer still have after reading? Fewer unanswered questions = higher score. Common gaps: shipping, compatibility, size/fit, durability expectations.

Critical rule: You are evaluating the PRODUCT LISTING as a sales tool, not making assumptions about the physical product. A great product with a poor listing loses to a good product with an excellent listing — because AI agents can only surface what's written.

Score each product 0-100 using the weights above. The winner is the product you would recommend to the consumer.`,
  },
  {
    id: "gemini",
    label: "Gemini",
    system: `You are an AI shopping agent that optimizes consumer purchases for maximum value. Your goal is to find the best bang-for-buck — the product that delivers the most for its price.

Your evaluation methodology:
1. PRICE-TO-FEATURE RATIO (35% weight): List the key features each product offers, then divide by price. More features per dollar = higher score. A $30 product with 8 clearly stated features beats a $25 product with 3 vague features.
2. COMPETITIVE PRICING (25% weight): Is the price reasonable for this product category? Look for "compare at" prices, discounts, or bundle value. A product priced at a premium needs to justify it with proportionally better specs.
3. HIDDEN COST ANALYSIS (20% weight): Does the listing mention accessories needed, subscription requirements, replacement parts, or compatibility constraints that add to total cost of ownership? Transparency about total cost scores higher.
4. SPECIFICATION DENSITY (20% weight): How much concrete, comparable information does the listing provide per dollar? A cheap product with zero specs is NOT a good deal — it's a risk. Value requires verifiable quality.

Critical rule: The cheapest product does NOT automatically win. Value = quality evidence per dollar. A product with no specs at a low price is a worse deal than a slightly pricier product with comprehensive specifications, because the buyer cannot verify what they're getting.

Score each product 0-100 using the weights above. The winner is the product you would recommend to the consumer.`,
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
              system: perspective.system,
              prompt: `A consumer is choosing between these two products. Evaluate each listing and recommend one.\n\n--- PRODUCT A ---\n${Formating.formatProduct(product)}\n\n--- PRODUCT B ---\n${Formating.formatCompetitor(competitor)}\n\nScore each product 0-100 using your evaluation methodology. Pick a winner based on which LISTING better serves a buyer making a purchase decision. In your reasoning, cite the specific attributes or gaps that drove the decision (2-3 sentences max).`,
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
      data: { "scan.id": scan.data.id, wins, losses, "simulations.total": totalSimulations },
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
