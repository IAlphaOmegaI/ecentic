"use server";

import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "../../database";
import { generate, type ModelId } from "../../utils/ai";
import { type GenericContext, withContext } from "../../utils/context";
import { Environment } from "../../utils/environment";
import * as Competitor from "../competitor";
import * as Product from "../product";
import * as Scan from "../scan";
import * as Simulation from "../simulation";
import * as User from "../user";
import * as Formating from "./formating";

const perspectives = [
  {
    id: "gpt4",
    label: "GPT-4",
    model: "gpt-4o" as ModelId,
    system:
      "You are an AI shopping agent embedded in a product recommendation engine. A consumer has asked you to compare two products and recommend the better purchase. Focus heavily on concrete specifications and missing details. Score each product 0-100 and pick a winner.",
  },
  {
    id: "claude",
    label: "Claude",
    model: "claude-sonnet-4-20250514" as ModelId,
    system:
      "You are an AI shopping assistant comparing two product listings for buyer confidence and clarity. Evaluate information architecture, trust signals, and completeness. Score each product 0-100 and pick a winner.",
  },
  {
    id: "gemini",
    label: "Gemini",
    model: "gemini-2.5-flash" as ModelId,
    system:
      "You are an AI shopping agent optimizing for value. Compare two listings by price-to-feature ratio, hidden costs, and specification density. Score each product 0-100 and pick a winner.",
  },
  {
    id: "perplexity",
    label: "Perplexity",
    model: "sonar-pro" as ModelId,
    system:
      "You are a search-augmented AI shopping agent. Compare two product listings by information depth, external validation signals, freshness, and comparison readiness. Score each product 0-100 and pick a winner.",
  },
];

const runScanForUser = async (
  context: GenericContext,
  { user }: { user: string },
) => {
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

  const selected = competitors.data.filter((competitor) => competitor.selected);

  if (products.data.length === 0 || selected.length === 0)
    return {
      success: true,
      data: {
        skipped: true,
        reason: "missing products or competitors",
      },
    };

  const totalSimulations =
    products.data.length * selected.length * perspectives.length;

  const scan = await Scan.create(Environment.SERVER, {
    userId: user,
    status: "running",
    totalSimulations,
    completedSimulations: 0,
    wins: 0,
    losses: 0,
  });

  if (!scan.success) return scan;

  context.span.addBreadcrumb({
    category: "scan.start",
    data: {
      "scan.id": scan.data.id,
      "user.id": user,
      "products.count": products.data.length,
      "competitors.count": selected.length,
      "simulations.total": totalSimulations,
    },
  });

  const tasks = products.data.flatMap((product) =>
    selected.flatMap((competitor) =>
      perspectives.map((perspective) => async () => {
        const generated = await resultify(() =>
          generate({
            model: perspective.model,
            system: perspective.system,
            prompt: `A consumer is choosing between these two products.\n\n--- PRODUCT A ---\n${Formating.formatProduct(product)}\n\n--- PRODUCT B ---\n${Formating.formatCompetitor(competitor)}\n\nScore each product 0-100, pick a winner, and give concise reasoning. Output only the structured fields — put all analysis in "reasoning", no prose or markdown outside the object.`,
            schema: z.object({
              winner: z
                .enum(["product", "competitor"])
                .describe(
                  '"product" if PRODUCT A wins, "competitor" if PRODUCT B wins',
                ),
              productScore: z
                .number()
                .min(0)
                .max(100)
                .describe("0-100 score for PRODUCT A"),
              competitorScore: z
                .number()
                .min(0)
                .max(100)
                .describe("0-100 score for PRODUCT B"),
              reasoning: z
                .string()
                .describe("Concise explanation of the decision"),
              keyFactors: z
                .array(z.string())
                .describe("Top attributes or gaps that determined the outcome"),
            }),
            schemaName: "ListingComparison",
            schemaDescription:
              "Evidence-based comparison of two product listings",
          }),
        );

        return (() => {
          switch (true) {
            case !generated.success:
              return {
                productId: product.id,
                competitorId: competitor.id,
                model: perspective.id,
                winner: "competitor",
                reasoning: "Evaluation failed — defaulting to competitor",
                productScore: 0,
                competitorScore: 50,
              };
            default:
              return {
                productId: product.id,
                competitorId: competitor.id,
                model: perspective.id,
                winner: generated.data.winner,
                reasoning: generated.data.reasoning,
                productScore: Math.round(generated.data.productScore),
                competitorScore: Math.round(generated.data.competitorScore),
              };
          }
        })();
      }),
    ),
  );

  const batchSize = 5;
  const batches = Array.from(
    { length: Math.ceil(tasks.length / batchSize) },
    (_value, index) =>
      tasks.slice(index * batchSize, index * batchSize + batchSize),
  );

  const results: Awaited<ReturnType<(typeof tasks)[number]>>[] = [];

  for (const batch of batches) {
    const batchResults = await Promise.all(batch.map((task) => task()));
    results.push(...batchResults);
  }

  const persisted = await Promise.all(
    results.map((result) =>
      Simulation.create(Environment.SERVER, {
        scanId: scan.data.id,
        ...result,
      }),
    ),
  );

  const failure = persisted.find((creation) => !creation.success);
  if (failure && !failure.success) {
    await Scan.update(Environment.SERVER, scan.data.id, { status: "failed" });
    return failure;
  }

  const wins = results.filter((result) => result.winner === "product").length;
  const losses = results.length - wins;

  const completion = await Scan.update(Environment.SERVER, scan.data.id, {
    status: "complete",
    completedSimulations: totalSimulations,
    wins,
    losses,
  });
  if (!completion.success) return completion;

  context.span.addBreadcrumb({
    category: "scan.complete",
    data: { "scan.id": scan.data.id, "user.id": user, wins, losses },
  });

  return {
    success: true,
    data: { scanId: scan.data.id, wins, losses },
  };
};

export const runScanDaily = withContext(
  async (context, { limit = 20 }: { limit?: number } = {}) => {
    const users = await User.find(Environment.SERVER);
    if (!users.success) return users;

    const selected = users.data.slice(0, limit);

    context.span.addBreadcrumb({
      category: "scan.daily.start",
      data: { "users.count": selected.length },
    });

    const results = await selected.reduce(
      async (previousPromise, user) => {
        const previous = await previousPromise;
        const result = await runScanForUser(context, { user: user.id });
        return [...previous, { user: user.id, result }];
      },
      Promise.resolve(
        [] as {
          user: string;
          result: Awaited<ReturnType<typeof runScanForUser>>;
        }[],
      ),
    );

    return {
      success: true,
      data: {
        users: selected.length,
        completed: results.filter((item) => item.result.success).length,
        failed: results.filter((item) => !item.result.success).length,
        results,
      },
    };
  },
  "BackgroundScan.runScanDaily",
);

export const runPendingScans = withContext(
  async (context, { limit = 1 }: { limit?: number } = {}) => {
    const pending = await Scan.findPending(Environment.SERVER);
    if (!pending.success) return pending;

    const selected = pending.data.slice(0, limit);

    const results = await selected.reduce(
      async (previousPromise, scan) => {
        const previous = await previousPromise;

        const running = await Scan.findRunningForUser(Environment.SERVER, {
          user: scan.userId,
        });

        if (!running.success || running.data.length > 0)
          return [...previous, { scanId: scan.id, success: false }];

        const transition = await Scan.update(Environment.SERVER, scan.id, {
          status: "running",
        });
        if (!transition.success)
          return [...previous, { scanId: scan.id, success: false }];
        const result = await runScanForUser(context, { user: scan.userId });

        // best-effort: the scan failure below is already reported
        if (!result.success)
          await Scan.update(Environment.SERVER, scan.id, { status: "failed" });

        return [...previous, { scanId: scan.id, success: result.success }];
      },
      Promise.resolve([] as { scanId: string; success: boolean }[]),
    );

    return {
      success: true,
      data: {
        selected: selected.length,
        completed: results.filter((result) => result.success).length,
        failed: results.filter((result) => !result.success).length,
        results,
      },
    };
  },
  "BackgroundScan.runPendingScans",
);
