"use server";

import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "../../database";
import { generate } from "../../utils/ai";
import { withAuthentication } from "../../utils/authentication";
import { Environment } from "../../utils/environment";
import * as Competitor from "../competitor";
import * as Product from "../product";
import * as Scan from "../scan";
import * as Simulation from "../simulation";

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

const Utils = {
  formatProduct: (product: Product.Type): string => {
    const lines = [`Title: ${product.title}`];
    if (product.description)
      lines.push(`Description: ${product.description.slice(0, 500)}`);
    if (product.price)
      lines.push(`Price: ${product.currency ?? "USD"} ${product.price}`);
    if (product.compareAtPrice)
      lines.push(
        `Compare at: ${product.currency ?? "USD"} ${product.compareAtPrice}`,
      );
    if (product.sku) lines.push(`SKU: ${product.sku}`);
    if (product.url) lines.push(`URL: ${product.url}`);
    return lines.join("\n");
  },

  formatCompetitor: (competitor: Competitor.Type): string => {
    const lines = [`Title: ${competitor.title}`];
    if (competitor.description)
      lines.push(`Description: ${competitor.description.slice(0, 500)}`);
    if (competitor.price)
      lines.push(`Price: ${competitor.currency ?? "USD"} ${competitor.price}`);
    if (competitor.brand) lines.push(`Brand: ${competitor.brand}`);
    if (competitor.source) lines.push(`Source: ${competitor.source}`);
    if (competitor.url) lines.push(`URL: ${competitor.url}`);
    return lines.join("\n");
  },
};

export const runScan = withAuthentication(async (ctx) => {
  const [products, competitors] = await Promise.all([
    Product.find(Environment.SERVER, {
      where: eq(schema.product.userId, ctx.session.user.id),
    }),
    Competitor.find(Environment.SERVER, {
      where: eq(schema.competitor.userId, ctx.session.user.id),
    }),
  ]);

  if (!products.success) return products;
  if (!competitors.success) return competitors;

  const selected = competitors.data.filter((record) => record.selected);

  if (products.data.length === 0)
    return { success: false, error: new Error("No products found") };

  if (selected.length === 0)
    return { success: false, error: new Error("No competitors found") };

  const totalSimulations =
    products.data.length * selected.length * perspectives.length;

  const scan = await Scan.create(Environment.SERVER, {
    userId: ctx.session.user.id,
    status: "running",
    totalSimulations,
    completedSimulations: 0,
    wins: 0,
    losses: 0,
  });

  if (!scan.success)
    return { success: false, error: new Error("Failed to create scan") };

  const tasks = products.data.flatMap((product) =>
    selected.flatMap((competitor) =>
      perspectives.map(
        (perspective) => async () => {
          const result = await resultify(() =>
            generate({
              system: perspective.system,
              prompt: `A consumer is choosing between these two products. Evaluate each listing and recommend one.\n\n--- PRODUCT A ---\n${Utils.formatProduct(product)}\n\n--- PRODUCT B ---\n${Utils.formatCompetitor(competitor)}\n\nScore each product 0-100 using your evaluation methodology. Pick a winner based on which LISTING better serves a buyer making a purchase decision. In your reasoning, cite the specific attributes or gaps that drove the decision (2-3 sentences max).`,
              schema: z.object({
                winner: z.enum(["product", "competitor"]),
                productScore: z.number().min(0).max(100),
                competitorScore: z.number().min(0).max(100),
                reasoning: z.string(),
                keyFactors: z.array(z.string()),
              }),
            }),
          );

          const entry = (() => {
            switch (true) {
              case result.success:
                return {
                  productId: product.id,
                  competitorId: competitor.id,
                  model: perspective.id,
                  modelLabel: perspective.label,
                  productTitle: product.title,
                  competitorTitle: competitor.title,
                  winner: result.data.winner,
                  productScore: Math.round(result.data.productScore),
                  competitorScore: Math.round(result.data.competitorScore),
                  reasoning: result.data.reasoning,
                  keyFactors: result.data.keyFactors,
                };
              default:
                return {
                  productId: product.id,
                  competitorId: competitor.id,
                  model: perspective.id,
                  modelLabel: perspective.label,
                  winner: "competitor" as const,
                  reasoning: "Evaluation failed — defaulting to competitor",
                  productScore: 0,
                  competitorScore: 50,
                  productTitle: product.title,
                  competitorTitle: competitor.title,
                };
            }
          })();

          return entry;
        },
      ),
    ),
  );

  const batchSize = 5;

  const batches = Array.from(
    { length: Math.ceil(tasks.length / batchSize) },
    (_value, index) => tasks.slice(index * batchSize, index * batchSize + batchSize),
  );

  const results = await batches.reduce(
    async (previousPromise, batch) => {
      const previous = await previousPromise;
      const current = await Promise.all(batch.map((task) => task()));
      return [...previous, ...current];
    },
    Promise.resolve([] as {
      productId: string;
      competitorId: string;
      model: string;
      modelLabel: string;
      productTitle: string;
      competitorTitle: string;
      winner: "product" | "competitor";
      productScore: number;
      competitorScore: number;
      reasoning: string;
      keyFactors?: string[];
    }[]),
  );

  const wins = results.filter((r) => r.winner === "product").length;
  const losses = results.length - wins;

  await Promise.all(
    results.map((record) =>
      Simulation.create(Environment.SERVER, {
        scanId: scan.data.id,
        ...record,
      }),
    ),
  );

  const modelWinRates = Object.fromEntries(
    perspectives.map((perspective) => {
      const model = results.filter((record) => record.model === perspective.id);
      const wins = model.filter((record) => record.winner === "product").length;

      return [
        perspective.id,
        {
          wins: wins,
          losses: model.length - wins,
          rate: model.length > 0 ? Math.round((wins / model.length) * 100) : 0,
        },
      ];
    }),
  );

  const topFinding = await resultify(async () => {
    const misses = results.filter((record) => record.winner === "competitor");

    if (misses.length === 0) return null;

    const lossesByProduct = new Map<
      string,
      { count: number; title: string; reasons: string[] }
    >();

    for (const record of misses) {
      const existing = lossesByProduct.get(record.productId) ?? {
        count: 0,
        title: record.productTitle,
        reasons: [],
      };
      existing.count += 1;
      existing.reasons.push(record.reasoning);
      lossesByProduct.set(record.productId, existing);
    }

    const worst = [...lossesByProduct.entries()].sort(
      (a, b) => b[1].count - a[1].count,
    )[0];

    if (!worst) return null;

    const finding = await generate({
      system:
        "You are an e-commerce optimization analyst. Given the reasons a product lost in AI shopping simulations, identify the specific missing attributes or weaknesses that caused the most losses. Be concise and actionable.",
      prompt: `Product "${worst[1].title}" lost ${worst[1].count} out of ${results.length} total simulations.\n\nHere are the reasons it lost:\n${worst[1].reasons.slice(0, 10).join("\n---\n")}\n\nIdentify the top missing attributes and estimate what percentage of simulations these gaps cost.`,
      schema: z.object({
        productName: z.string(),
        missingAttributes: z.array(z.string()),
        impactDescription: z.string(),
        lossPercentage: z.number(),
      }),
    });

    return finding;
  });

  const finding = topFinding.success ? topFinding.data : null;

  await Scan.update(Environment.SERVER, scan.data.id, {
    status: "complete",
    completedSimulations: totalSimulations,
    wins,
    losses,
    topFinding: finding ? JSON.stringify(finding) : null,
  });

  return {
    success: true,
    data: {
      scanId: scan.data.id,
      status: "complete" as const,
      totalSimulations,
      completedSimulations: totalSimulations,
      wins,
      losses,
      results,
      modelWinRates,
      topFinding: finding,
    },
  };
}, "Intelligence.runScan");
