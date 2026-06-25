"use server";

import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "../../database";
import { generate, type ModelId } from "../../utils/ai";
import { type GenericContext, withContext } from "../../utils/context";
import { Environment } from "../../utils/environment";
import { NotFoundError } from "../../utils/error";
import * as Competitor from "../competitor";
import * as Product from "../product";
import * as Scan from "../scan";
import * as Simulation from "../simulation";
import * as User from "../user";
import * as Judge from "./judge";

// The 4 models form a panel; they share one rubric (Judge.JUDGE_SYSTEM) — the
// value is diversity of model, not divergence of instructions.
const perspectives = [
  { id: "gpt4", label: "GPT-4", model: "gpt-4o" as ModelId },
  {
    id: "claude",
    label: "Claude",
    model: "claude-sonnet-4-20250514" as ModelId,
  },
  { id: "gemini", label: "Gemini", model: "gemini-2.5-flash" as ModelId },
];

// Position-neutral verdict: the judge scores LISTING A and LISTING B without
// knowing which is the merchant's. The harness maps A/B back to
// product/competitor per ordering (see the swap below).
const comparisonSchema = z.object({
  winner: z
    .enum(["a", "b"])
    .describe('"a" if LISTING A wins, "b" if LISTING B wins'),
  scoreA: z.number().min(0).max(100).describe("0-100 score for LISTING A"),
  scoreB: z.number().min(0).max(100).describe("0-100 score for LISTING B"),
  reasoning: z.string().describe("Concise, evidence-first explanation"),
  keyFactors: z
    .array(z.string())
    .describe("Top attributes or gaps that determined the outcome"),
});

const runScanForUser = async (
  context: GenericContext,
  { user, scan: existing }: { user: string; scan?: string },
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

  // When draining an enqueued scan, complete that same record; otherwise
  // (e.g. the daily cron) create a fresh one.
  const scan = existing
    ? await Scan.update(Environment.SERVER, existing, {
        status: "running",
        totalSimulations,
        completedSimulations: 0,
        wins: 0,
        losses: 0,
        updatedAt: new Date(),
      })
    : await Scan.create(Environment.SERVER, {
        userId: user,
        status: "running",
        totalSimulations,
        completedSimulations: 0,
        wins: 0,
        losses: 0,
      });

  if (!scan.success) return scan;
  if (!scan.data)
    return { success: false as const, error: new NotFoundError("Scan") };

  const record = scan.data;

  context.span.addBreadcrumb({
    category: "scan.start",
    data: {
      "scan.id": record.id,
      "user.id": user,
      "products.count": products.data.length,
      "competitors.count": selected.length,
      "simulations.total": totalSimulations,
    },
  });

  const tasks = products.data.flatMap((product) =>
    selected.flatMap((competitor) =>
      perspectives.map((perspective) => async () => {
        // Position-swap: judge the same pair in both orderings (product as
        // LISTING A, then as LISTING B) and average, cancelling the judge's
        // primacy bias toward whichever listing it reads first.
        const orderings = [
          {
            productSlot: "a" as const,
            prompt: Judge.buildJudgePromptAB(
              { kind: "product", product },
              { kind: "competitor", competitor },
            ),
          },
          {
            productSlot: "b" as const,
            prompt: Judge.buildJudgePromptAB(
              { kind: "competitor", competitor },
              { kind: "product", product },
            ),
          },
        ];

        const passes = await Promise.all(
          orderings.map((ordering) =>
            resultify(() =>
              generate({
                model: perspective.model,
                system: Judge.JUDGE_SYSTEM_AB,
                prompt: ordering.prompt,
                schema: comparisonSchema,
                schemaName: "ListingComparison",
                schemaDescription:
                  "Evidence-based comparison of two product listings",
              }),
            ).then((generated) =>
              generated.success
                ? {
                    productScore:
                      ordering.productSlot === "a"
                        ? generated.data.scoreA
                        : generated.data.scoreB,
                    competitorScore:
                      ordering.productSlot === "a"
                        ? generated.data.scoreB
                        : generated.data.scoreA,
                    reasoning: generated.data.reasoning,
                  }
                : null,
            ),
          ),
        );

        // Drop orderings that errored — a single transient failure degrades to
        // the surviving pass rather than nuking the whole comparison.
        const scored = passes.filter((pass) => pass !== null);

        return (() => {
          const [first] = scored;
          if (!first)
            return {
              productId: product.id,
              competitorId: competitor.id,
              model: perspective.id,
              winner: "competitor",
              reasoning: "Evaluation failed — defaulting to competitor",
              productScore: 0,
              competitorScore: 50,
            };

          const productScore = Math.round(
            scored.reduce((sum, pass) => sum + pass.productScore, 0) /
              scored.length,
          );
          const competitorScore = Math.round(
            scored.reduce((sum, pass) => sum + pass.competitorScore, 0) /
              scored.length,
          );
          return {
            productId: product.id,
            competitorId: competitor.id,
            model: perspective.id,
            // Conservative tie-break: a dead-even averaged score counts as a
            // loss, consistent with the skeptical-auditor framing.
            winner: productScore > competitorScore ? "product" : "competitor",
            reasoning: first.reasoning,
            productScore,
            competitorScore,
          };
        })();
      }),
    ),
  );

  // Each task now fires two generate calls in parallel, so halve the batch to
  // keep peak concurrency (~6) close to the prior single-pass throughput (~5).
  const batchSize = 3;
  const batches = Array.from(
    { length: Math.ceil(tasks.length / batchSize) },
    (_value, index) =>
      tasks.slice(index * batchSize, index * batchSize + batchSize),
  );

  // Persist and tally each batch the moment it finishes (rather than all at the
  // end) so Scan.getProgress — which the client polls — reflects real live
  // progress instead of jumping 0 -> 100%. A mid-run timeout leaves the scan
  // "running" with the completed batches saved; the reaper/enqueue self-heal
  // cleans it up.
  const results: Awaited<ReturnType<(typeof tasks)[number]>>[] = [];

  for (const batch of batches) {
    const batchResults = await Promise.all(batch.map((task) => task()));

    const persisted = await Promise.all(
      batchResults.map((result) =>
        Simulation.create(Environment.SERVER, {
          scanId: record.id,
          ...result,
        }),
      ),
    );
    const failure = persisted.find((creation) => !creation.success);
    if (failure && !failure.success) {
      await Scan.update(Environment.SERVER, record.id, { status: "failed" });
      return failure;
    }

    results.push(...batchResults);

    const won = results.filter((result) => result.winner === "product").length;
    await Scan.update(Environment.SERVER, record.id, {
      completedSimulations: results.length,
      wins: won,
      losses: results.length - won,
      updatedAt: new Date(),
    });
  }

  const wins = results.filter((result) => result.winner === "product").length;
  const losses = results.length - wins;

  // Identify the biggest optimization opportunity, matching the streaming path
  // so durable scans still surface a "Top Finding".
  const topFinding = await resultify(async () => {
    const misses = results.filter((result) => result.winner === "competitor");
    if (misses.length === 0) return null;

    const lossesByProduct = new Map<
      string,
      { count: number; reasons: string[] }
    >();
    for (const record of misses) {
      const existing = lossesByProduct.get(record.productId) ?? {
        count: 0,
        reasons: [],
      };
      existing.count += 1;
      if (record.reasoning) existing.reasons.push(record.reasoning);
      lossesByProduct.set(record.productId, existing);
    }

    const worst = [...lossesByProduct.entries()].sort(
      (a, b) => b[1].count - a[1].count,
    )[0];
    if (!worst) return null;

    const product = products.data.find((item) => item.id === worst[0]);
    const title = product?.title ?? "Product";

    return generate({
      system:
        "You are an e-commerce optimization analyst. Given the reasons a product lost in AI shopping simulations, identify the specific missing attributes or weaknesses that caused the most losses. Be concise and actionable. Respond only with the structured fields — no prose outside the object.",
      prompt: `Product "${title}" lost ${worst[1].count} out of ${results.length} total simulations.\n\nHere are the reasons it lost:\n${worst[1].reasons.slice(0, 10).join("\n---\n")}\n\nIdentify the top missing attributes and estimate what percentage of simulations these gaps cost.`,
      schema: z.object({
        name: z.string().describe("The product name"),
        missingAttributes: z
          .array(z.string())
          .describe("Specific attributes or data the listing is missing"),
        impactDescription: z
          .string()
          .describe("Concise, actionable summary of how these gaps cost wins"),
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

  const completion = await Scan.update(Environment.SERVER, record.id, {
    status: "complete",
    completedSimulations: totalSimulations,
    wins,
    losses,
    topFinding: finding,
  });
  if (!completion.success) return completion;

  context.span.addBreadcrumb({
    category: "scan.complete",
    data: { "scan.id": record.id, "user.id": user, wins, losses },
  });

  return {
    success: true,
    data: { scanId: record.id, wins, losses },
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

// A scan that has been "running" longer than this is treated as abandoned
// (the worker that owned it died / timed out) and failed, so it can no longer
// block that user's queue. Kept well above the drain's max duration so it never
// reaps a scan that is genuinely mid-run.
const STALE_RUNNING_MS = 10 * 60 * 1000;

export const runPendingScans = withContext(
  async (context, { limit = 1 }: { limit?: number } = {}) => {
    // self-heal: fail abandoned "running" scans so the per-user guard below
    // can't permanently wedge a user's queue.
    const stale = await Scan.findStaleRunning(Environment.SERVER, {
      before: new Date(Date.now() - STALE_RUNNING_MS),
    });
    if (stale.success)
      await Promise.all(
        stale.data.map((scan) =>
          Scan.update(Environment.SERVER, scan.id, {
            status: "failed",
            updatedAt: new Date(),
          }),
        ),
      );

    const pending = await Scan.findPending(Environment.SERVER);
    if (!pending.success) return pending;

    const selected = pending.data.slice(0, limit);

    const results = await selected.reduce(
      async (previousPromise, scan) => {
        const previous = await previousPromise;

        const running = await Scan.findRunningForUser(Environment.SERVER, {
          user: scan.userId,
        });

        // another scan is already running for this user — leave this one
        // pending; the next drain will pick it up.
        if (!running.success || running.data.length > 0)
          return [...previous, { scanId: scan.id, success: false }];

        const result = await runScanForUser(context, {
          user: scan.userId,
          scan: scan.id,
        });

        const completed =
          result.success && !("skipped" in result.data && result.data.skipped);

        // failed outright, or the user removed their products/competitors after
        // enqueueing — either way don't leave the record stuck at "running".
        if (!completed)
          await Scan.update(Environment.SERVER, scan.id, {
            status: "failed",
            updatedAt: new Date(),
          });

        return [...previous, { scanId: scan.id, success: completed }];
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
