"use server";

import { eq, inArray } from "drizzle-orm";
import { schema } from "../../database";
import type { ModelId } from "../../utils/ai";
import { type GenericContext, withContext } from "../../utils/context";
import { Environment } from "../../utils/environment";
import * as Competitor from "../competitor";
import * as Product from "../product";
import * as Scan from "../scan";
import * as Simulation from "../simulation";
import * as Store from "../store";
import * as User from "../user";
import { deriveDomain, runUcpAgent } from "./ucp-agent";

const perspectives = [
  {
    id: "gpt4",
    label: "GPT-4o",
    model: "gpt-4o" as ModelId,
    system:
      "You are an autonomous AI buyer-agent transacting via UCP. Probe each store's /.well-known/ucp manifest and REST shopping flow using the provided tools. Score what you observe; never invent capabilities.",
  },
  {
    id: "claude",
    label: "Claude Sonnet 4.6",
    model: "claude-sonnet-4-6" as ModelId,
    system:
      "You are an AI commerce agent assessing UCP readiness — manifest, catalog, cart, checkout. Be conservative: missing capabilities are missing.",
  },
  {
    id: "gemini",
    label: "Gemini 2.5",
    model: "gemini-2.5-flash" as ModelId,
    system:
      "You are an autonomous AI shopping agent. Use the tools to call each store's UCP endpoints and judge by what actually happened.",
  },
  {
    id: "perplexity",
    label: "Perplexity Sonar",
    model: "sonar-pro" as ModelId,
    system:
      "You are a search-augmented AI commerce agent. Walk the UCP flow where possible. A missing UCP profile is a critical signal.",
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
      data: { skipped: true, reason: "missing products or competitors" },
    };

  const storeIds = [
    ...new Set(products.data.map((product) => product.storeId)),
  ];
  const stores = await Store.find(Environment.SERVER, {
    where: inArray(schema.store.id, storeIds),
  });
  if (!stores.success) return stores;
  const storeDomainById = new Map(
    stores.data.map((store) => [store.id, store.domain]),
  );

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
        const storeDomain = storeDomainById.get(product.storeId) ?? null;
        const competitorDomain = deriveDomain(competitor.url);

        if (!storeDomain) {
          return {
            productId: product.id,
            competitorId: competitor.id,
            model: perspective.id,
            winner: "competitor",
            reasoning:
              "User store has no registered domain — cannot run UCP flow.",
            productScore: 0,
            competitorScore: 0,
          };
        }

        const agentResult = await runUcpAgent({
          model: perspective.model,
          modelLabel: perspective.label,
          system: perspective.system,
          productStoreDomain: storeDomain,
          competitorDomain,
          productTitle: product.title,
          productDescription: product.description,
          onLog: () => {},
          onText: () => {},
        });

        if (!agentResult.evaluation) {
          return {
            productId: product.id,
            competitorId: competitor.id,
            model: perspective.id,
            winner: "competitor",
            reasoning:
              agentResult.error ??
              "Agent did not return a structured evaluation.",
            productScore: 0,
            competitorScore: 0,
          };
        }

        return {
          productId: product.id,
          competitorId: competitor.id,
          model: perspective.id,
          winner: agentResult.evaluation.winner,
          reasoning: agentResult.evaluation.reasoning,
          productScore: Math.round(agentResult.evaluation.storeScore),
          competitorScore: Math.round(agentResult.evaluation.competitorScore),
        };
      }),
    ),
  );

  const batchSize = 3;
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

  await Promise.all(
    results.map((result) =>
      Simulation.create(Environment.SERVER, {
        scanId: scan.data.id,
        ...result,
      }),
    ),
  );

  const wins = results.filter((result) => result.winner === "product").length;
  const losses = results.length - wins;

  await Scan.update(Environment.SERVER, scan.data.id, {
    status: "complete",
    completedSimulations: totalSimulations,
    wins,
    losses,
  });

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

        await Scan.update(Environment.SERVER, scan.id, { status: "running" });
        const result = await runScanForUser(context, { user: scan.userId });

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
