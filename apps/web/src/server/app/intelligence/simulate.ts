"use server";

import { resultify } from "@zenncore/utils";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { withAuthentication } from "@/server/utils/authentication";
import { schema } from "../../database";
import * as AI from "../../utils/ai";
import { Environment } from "../../utils/environment";
import * as Competitor from "../competitor";
import * as Product from "../product";
import * as Scan from "../scan";
import * as Simulation from "../simulation";
import * as Store from "../store";
import { deriveDomain, runUcpAgent, type UcpToolEvent } from "./ucp-agent";

const perspectives = [
  {
    id: "gpt4",
    label: "GPT-4o",
    model: "gpt-4o" as AI.ModelId,
    system:
      "You are an AI shopping agent that transacts via the Universal Commerce Protocol (UCP). You evaluate stores from the perspective of an autonomous buyer-agent: can you discover, search, cart, and checkout without human help? You use tools to probe each store's /.well-known/ucp manifest and the REST shopping flow. You are rigorous and grounded in actual HTTP responses — you never invent capabilities you did not observe.",
  },
  {
    id: "claude",
    label: "Claude Sonnet 4.6",
    model: "claude-sonnet-4-6" as AI.ModelId,
    system:
      "You are an AI commerce agent assessing UCP readiness. You walk the protocol end-to-end via tool calls — manifest discovery, catalog search, cart creation, checkout session — and judge each store on completeness, latency, error semantics, and AI-agent ergonomics. You are conservative: missing capabilities are scored as missing, not assumed present.",
  },
  {
    id: "gemini",
    label: "Gemini 2.5",
    model: "gemini-2.5-flash" as AI.ModelId,
    system:
      "You are an autonomous shopping agent measuring how well each store supports AI commerce via UCP. Use the provided tools to actually call each store's UCP endpoints. Score based on what you observed: which calls succeeded, which 5xx'd, what the manifest declared. Penalize stores that force you back to human-only UX.",
  },
  {
    id: "perplexity",
    label: "Perplexity Sonar",
    model: "sonar-pro" as AI.ModelId,
    system:
      "You are a search-augmented AI commerce agent. Where possible, walk each store's UCP flow via the provided tools. If a store has no UCP profile, that is a critical finding for AI-agent buyability. Be decisive and concrete in your reasoning.",
  },
] as const;

export type SimulationResult = {
  product: Product.Type & { score: number };
  competitor: Competitor.Type & { score: number };
  winner: "product" | "competitor";
  reasoning: string;
  keyFactors?: string[];
  ucpFindings?: UcpToolEvent[];
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

const describeFinding = (event: UcpToolEvent): string => {
  const latency = event.latencyMs !== null ? ` · ${event.latencyMs} ms` : "";
  const status = event.status !== null ? ` · HTTP ${event.status}` : "";
  return `${event.ok ? "PASS" : "FAIL"} ${event.toolName} @ ${event.domain}${status}${latency} — ${event.note}`;
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
    return { success: false, error: products.error };
  }

  if (!competitors.success) {
    return { success: false, error: competitors.error };
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

    const storeIds = [
      ...new Set(products.data.map((product) => product.storeId)),
    ];
    const stores = storeIds.length
      ? await Store.find(Environment.SERVER, {
          where: inArray(schema.store.id, storeIds),
        })
      : { success: true as const, data: [] };

    if (!stores.success) {
      update({ kind: "error", text: "Failed to load stores" });
      return;
    }

    const storeDomainById = new Map(
      stores.data.map((store) => [store.id, store.domain]),
    );

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
      message: "Initializing UCP commerce simulation...",
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
            const storeDomain = storeDomainById.get(product.storeId) ?? null;
            const competitorDomain = deriveDomain(competitor.url);

            if (!storeDomain) {
              return {
                product: { ...product, score: 0 },
                competitor: { ...competitor, score: 0 },
                winner: "competitor",
                reasoning:
                  "User store has no registered domain — cannot run UCP flow.",
                keyFactors: ["Missing store domain"],
                ucpFindings: [],
                model: perspective.id,
                modelLabel: perspective.label,
              };
            }

            update({
              kind: "log",
              model: perspective.label,
              message: `Walking UCP flow: ${storeDomain} vs ${competitorDomain ?? "(no competitor domain)"} for "${product.title}"`,
            });

            const agentResult = await runUcpAgent({
              model: perspective.model,
              modelLabel: perspective.label,
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
7. In keyFactors, list the top 3-5 specific attributes or gaps that determined the outcome (e.g., "PRODUCT has 0 images vs COMPETITOR has 5", "COMPETITOR missing price", "Neither listing has reviews").
8. Output ONLY the structured fields defined by the schema. Put all narrative analysis inside the "reasoning" field — do not emit any prose, markdown, or citations outside the object.`,
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
              stream: true,
            });

            const [, parsing] = await Promise.all([
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

    const batchSize = 3;
    const batches = Array.from(
      { length: Math.ceil(tasks.length / batchSize) },
      (_value, index) =>
        tasks.slice(index * batchSize, index * batchSize + batchSize),
    );

    const results: SimulationResult[] = [];

    for (const batch of batches) {
      const batchResults = await Promise.all(batch.map((task) => task()));
      results.push(...batchResults);

      for (const record of batchResults) {
        const winnerLabel =
          record.winner === "product"
            ? `${record.product.title} (user store)`
            : "competitor store";

        update({
          kind: "log",
          model: record.modelLabel,
          message: `DECISION: ${winnerLabel} — ${record.reasoning.slice(0, 100)}`,
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
        { count: number; title: string; reasons: string[]; findings: string[] }
      >();

      for (const record of misses) {
        const existing = lossesByProduct.get(record.product.id) ?? {
          count: 0,
          title: record.product.title,
          reasons: [],
          findings: [],
        };
        existing.count += 1;
        existing.reasons.push(record.reasoning);
        if (record.ucpFindings) {
          for (const finding of record.ucpFindings) {
            existing.findings.push(describeFinding(finding));
          }
        }
        lossesByProduct.set(record.product.id, existing);
      }

      const worst = [...lossesByProduct.entries()].sort(
        (a, b) => b[1].count - a[1].count,
      )[0];

      if (!worst) return null;

      return AI.generate({
        system:
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
