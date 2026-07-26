"use server";

import { resultify } from "@zenncore/utils";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { SCAN_CONCURRENCY } from "@/lib/scan-estimate";
import { schema } from "../../database";
import { generate, type ModelId } from "../../utils/ai";
import { type GenericContext, withContext } from "../../utils/context";
import { Environment } from "../../utils/environment";
import { NotFoundError } from "../../utils/error";
import * as Competitor from "../competitor";
import * as Product from "../product";
import * as Scan from "../scan";
import * as Simulation from "../simulation";
import * as Store from "../store";
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

// Peak parallel judge tasks (SCAN_CONCURRENCY, shared with the UI's time
// estimate). Each task fires 2 model calls (the position swap), and queue order
// interleaves the 3 models, so this keeps roughly 2 * SCAN_CONCURRENCY / 3
// in-flight calls per provider — high enough to saturate throughput, low
// enough to stay clear of per-provider rate limits.

// Write scan counters every N completed simulations, not every one. The polling
// client derives live progress from the persisted simulation rows anyway
// (Scan.getProgress); the scan row only needs a fresh-enough updatedAt to prove
// liveness to the stale reaper.
const PROGRESS_WRITE_EVERY = 5;

// A simulation row that won't persist is dropped, not fatal — one unusable
// value should cost that single comparison, not the whole run's model spend.
// A run of them is a different animal: that is the database itself failing, so
// bail out rather than judge every remaining pair into a void.
const MAX_ROW_FAILURES = 5;

// `store` scopes the run to one store's products — the drain passes it from the
// scan row, the daily cron passes each store in turn. Absent (legacy scans
// enqueued before store scoping) the run stays account-wide. `roster` narrows
// further to the products/competitors picked at enqueue time; an absent side
// falls back to everything (all store products / all selected competitors).
const runScanForUser = async (
  context: GenericContext,
  {
    user,
    scan: existing,
    store,
    roster,
  }: {
    user: string;
    scan?: string;
    store?: string;
    roster?: { products?: string[]; competitors?: string[] };
  },
) => {
  const [products, competitors] = await Promise.all([
    Product.find(Environment.SERVER, {
      where: and(
        eq(schema.product.userId, user),
        store ? eq(schema.product.storeId, store) : undefined,
        roster?.products?.length
          ? inArray(schema.product.id, roster.products)
          : undefined,
      ),
    }),
    Competitor.find(Environment.SERVER, {
      where: and(
        eq(schema.competitor.userId, user),
        roster?.competitors?.length
          ? inArray(schema.competitor.id, roster.competitors)
          : undefined,
      ),
    }),
  ]);

  if (!products.success) return products;
  if (!competitors.success) return competitors;

  // An explicit roster IS the selection — the account-level `selected` flag
  // only drives the fallback when no roster was picked.
  const selected = roster?.competitors?.length
    ? competitors.data
    : competitors.data.filter((competitor) => competitor.selected);

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

  // Resume support: results persist per-simulation as they finish, so when a
  // drain invocation dies mid-scan (deploy timeout, crash) and the scan comes
  // back through the queue, only the pairs that were never judged re-run.
  const persisted = existing
    ? await Simulation.find(Environment.SERVER, {
        where: eq(schema.simulation.scanId, existing),
      })
    : { success: true as const, data: [] as Simulation.Type[] };
  if (!persisted.success) return persisted;

  const judged = new Set(
    persisted.data.map(
      (simulation) =>
        `${simulation.productId}:${simulation.competitorId}:${simulation.model}`,
    ),
  );
  const seededWins = persisted.data.filter(
    (simulation) => simulation.winner === "product",
  ).length;

  // When draining an enqueued scan, complete that same record; otherwise
  // (e.g. the daily cron) create a fresh one.
  const scan = existing
    ? await Scan.update(Environment.SERVER, existing, {
        status: "running",
        totalSimulations,
        completedSimulations: judged.size,
        wins: seededWins,
        losses: judged.size - seededWins,
        updatedAt: new Date(),
      })
    : await Scan.create(Environment.SERVER, {
        userId: user,
        storeId: store ?? null,
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
      perspectives
        .filter(
          (perspective) =>
            !judged.has(`${product.id}:${competitor.id}:${perspective.id}`),
        )
        .map((perspective) => async () => {
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
                  instructions: Judge.JUDGE_SYSTEM_AB,
                  prompt: ordering.prompt,
                  output: comparisonSchema,
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

  // Sliding worker pool. The previous fixed batches of 3 gated every batch on
  // its slowest call, capping the engine at ~6 in-flight model calls with dead
  // air between batches; the pool keeps CONCURRENCY tasks running continuously.
  // Each result persists the moment it finishes so Scan.getProgress — which the
  // client polls — reflects real live progress, and so a killed invocation
  // loses at most the in-flight tasks (see the resume filter above).
  const queue = [...tasks];
  const results: Awaited<ReturnType<(typeof tasks)[number]>>[] = [];
  const state = {
    failure: null as Extract<
      Awaited<ReturnType<typeof Simulation.create>>,
      { success: false }
    > | null,
    failures: 0,
  };

  const worker = async () => {
    for (;;) {
      const task = queue.shift();
      if (!task || state.failure) return;

      const result = await task();

      const creation = await Simulation.create(Environment.SERVER, {
        scanId: record.id,
        ...result,
      });
      if (!creation.success) {
        state.failures += 1;
        if (state.failures >= MAX_ROW_FAILURES) {
          state.failure = creation;
          return;
        }

        // withContext already reported the error to Sentry; the breadcrumb is
        // what ties it back to the pair that produced it.
        context.span.addBreadcrumb({
          category: "scan.simulation.dropped",
          data: {
            "scan.id": record.id,
            "product.id": result.productId,
            "competitor.id": result.competitorId,
            "simulation.model": result.model,
          },
        });
        continue;
      }

      results.push(result);

      const completed = judged.size + results.length;
      if (completed % PROGRESS_WRITE_EVERY !== 0 && queue.length > 0) continue;

      const won =
        seededWins +
        results.filter((outcome) => outcome.winner === "product").length;
      await Scan.update(Environment.SERVER, record.id, {
        completedSimulations: completed,
        wins: won,
        losses: completed - won,
        updatedAt: new Date(),
      });
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(SCAN_CONCURRENCY, tasks.length) }, () =>
      worker(),
    ),
  );

  if (state.failure) {
    await Scan.update(Environment.SERVER, record.id, { status: "failed" });
    return state.failure;
  }

  // Tally over everything the scan judged — resumed runs include the rows
  // persisted by earlier invocations, not just this one's.
  const outcomes = [
    ...persisted.data.map((simulation) => ({
      productId: simulation.productId,
      winner: simulation.winner,
      reasoning: simulation.reasoning,
    })),
    ...results,
  ];

  const wins = outcomes.filter(
    (outcome) => outcome.winner === "product",
  ).length;
  const losses = outcomes.length - wins;

  // Report what actually landed in the database, not what was planned — a
  // dropped row leaves this short of `totalSimulations`. Clamped because a
  // shrunken roster can leave stale judged rows behind from an earlier run.
  const stored = Math.min(outcomes.length, totalSimulations);

  // Identify the biggest optimization opportunity, matching the streaming path
  // so durable scans still surface a "Top Finding".
  const topFinding = await resultify(async () => {
    const misses = outcomes.filter(
      (outcome) => outcome.winner === "competitor",
    );
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
      instructions:
        "You are an e-commerce optimization analyst. Given the reasons a product lost in AI shopping simulations, identify the specific missing attributes or weaknesses that caused the most losses. Be concise and actionable. Respond only with the structured fields — no prose outside the object.",
      prompt: `Product "${title}" lost ${worst[1].count} out of ${outcomes.length} total simulations.\n\nHere are the reasons it lost:\n${worst[1].reasons.slice(0, 10).join("\n---\n")}\n\nIdentify the top missing attributes and estimate what percentage of simulations these gaps cost.`,
      output: z.object({
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
    completedSimulations: stored,
    wins,
    losses,
    topFinding: finding,
  });
  if (!completion.success) return completion;

  context.span.addBreadcrumb({
    category: "scan.complete",
    data: {
      "scan.id": record.id,
      "user.id": user,
      wins,
      losses,
      "simulations.dropped": state.failures,
    },
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

    // Scans are store-scoped, so each user gets one run per store, executed
    // sequentially to keep the per-provider load bounded by the pool size.
    const results = await selected.reduce(
      async (previousPromise, user) => {
        const previous = await previousPromise;

        const stores = await Store.find(Environment.SERVER, {
          where: eq(schema.store.userId, user.id),
        });
        if (!stores.success) return previous;

        return stores.data.reduce(async (userPromise, store) => {
          const accumulated = await userPromise;
          const result = await runScanForUser(context, {
            user: user.id,
            store: store.id,
          });
          return [...accumulated, { user: user.id, store: store.id, result }];
        }, Promise.resolve(previous));
      },
      Promise.resolve(
        [] as {
          user: string;
          store: string;
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
    // self-heal: an abandoned "running" scan (its worker died or hit the
    // platform timeout) goes back to "pending" rather than "failed" — its
    // finished simulations are persisted, so the next drain RESUMES it from
    // where it stopped instead of losing the progress. Every requeue makes
    // forward progress, so a repeatedly-killed scan still converges.
    const stale = await Scan.findStaleRunning(Environment.SERVER, {
      before: new Date(Date.now() - STALE_RUNNING_MS),
    });
    if (stale.success)
      await Promise.all(
        stale.data.map((scan) =>
          Scan.update(Environment.SERVER, scan.id, {
            status: "pending",
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
          store: scan.storeId ?? undefined,
          roster: {
            products: scan.productIds ?? undefined,
            competitors: scan.competitorIds ?? undefined,
          },
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
