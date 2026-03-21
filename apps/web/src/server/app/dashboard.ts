"use server";

import { unique } from "@zenncore/utils";
import { and, count, eq, gte, inArray, sql } from "drizzle-orm";
import { cache as dedupe } from "react";
import { db, schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { Environment } from "../utils/environment";
import * as Competitor from "./competitor";
import * as Product from "./product";
import * as Scan from "./scan";
import * as Simulation from "./simulation";

export type ProductRow = {
  id: string;
  title: string;
  price: string | null;
  currency: string | null;
  winRate: number;
  gpt4: number;
  claude: number;
  gemini: number;
  quality: number;
  topCompetitor: { name: string; winRate: number } | null;
  updatedAt: Date;
};

export type ActivityEntry = {
  id: string;
  type: "simulation_complete" | "simulation_running";
  message: string;
  detail: string | null;
  timestamp: Date;
};

export type ModelRate = {
  model: string;
  label: string;
  rate: number;
};

export type TrendPoint = {
  date: Date;
  winRate: number;
};

export type AgentTrafficSummary = {
  total30d: number;
  byAgentType: { agentType: string; label: string; count: number }[];
};

export type DashboardData = {
  stats: {
    overallWinRate: number;
    winRateTrend: number;
    productsScanned: number;
    productLimit: number;
    topPerformer: {
      id: string;
      title: string;
      winRate: number;
    } | null;
    biggestOpportunity: {
      id: string;
      title: string;
      winRate: number;
    } | null;
    aiSiteVisits30d: number;
  };
  agentTraffic: AgentTrafficSummary;
  models: ModelRate[];
  trend: TrendPoint[];
  products: ProductRow[];
  activity: ActivityEntry[];
  lastUpdated: Date | null;
};

const QUALITY_KEYS = [
  "title",
  "description",
  "price",
  "images",
  "sku",
  "structuredData",
] as const;

const computeDataQuality = (product: Product.Type): number => {
  const filled = QUALITY_KEYS.filter((field) => {
    const value = product[field];
    if (!value) return false;
    if (field === "images") return value !== "[]";
    return true;
  }).length;

  return Math.round((filled / QUALITY_KEYS.length) * 100);
};

const AGENT_TYPE_LABELS: Record<string, string> = {
  "chatgpt-user": "ChatGPT (browser)",
  "claude-user": "Claude (browser)",
  "perplexity-user": "Perplexity (browser)",
  "chatgpt-agent": "ChatGPT Agent",
  "perplexity-comet": "Perplexity Comet",
  gptbot: "GPTBot",
  claudebot: "ClaudeBot",
  "oai-searchbot": "OpenAI Search",
  perplexitybot: "PerplexityBot",
  "claude-searchbot": "Claude Search",
  bytespider: "Bytespider",
  "google-extended": "Google-Extended",
  amazonbot: "Amazonbot",
  googlebot: "Googlebot",
  "probe-ping": "Connectivity probe",
  "chatgpt-referral": "ChatGPT (referral)",
  "perplexity-referral": "Perplexity (referral)",
  "claude-referral": "Claude (referral)",
  "gemini-referral": "Gemini (referral)",
  "copilot-referral": "Copilot (referral)",
  "you-referral": "You.com (referral)",
};

const labelForAgentType = (agentType: string): string =>
  AGENT_TYPE_LABELS[agentType] ??
  agentType
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const loadAgentTrafficSummary = async (
  userId: string,
): Promise<AgentTrafficSummary> => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalRow] = await db
    .select({ value: count() })
    .from(schema.agentVisit)
    .where(
      and(
        eq(schema.agentVisit.userId, userId),
        gte(schema.agentVisit.createdAt, thirtyDaysAgo),
      ),
    );

  const total30d = totalRow?.value ?? 0;

  const breakdownRows = await db
    .select({
      agentType: schema.agentVisit.agentType,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.agentVisit)
    .where(
      and(
        eq(schema.agentVisit.userId, userId),
        gte(schema.agentVisit.createdAt, thirtyDaysAgo),
      ),
    )
    .groupBy(schema.agentVisit.agentType);

  const byAgentType = [...breakdownRows]
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map((row) => ({
      agentType: row.agentType,
      label: labelForAgentType(row.agentType),
      count: row.count,
    }));

  return { total30d, byAgentType };
};

const computeModelRate = (
  simulations: Simulation.Type[],
  model: string,
): number => {
  const filtered = simulations.filter(
    (simulation) => simulation.model === model,
  );
  if (filtered.length === 0) return 0;

  const wins = filtered.filter(
    (simulation) => simulation.winner === "product",
  ).length;

  return Math.round((wins / filtered.length) * 100);
};

export const gatherIntelligence = dedupe(
  withAuthentication(async (context) => {
    const [products, scans, agentTraffic] = await Promise.all([
      Product.getForCurrentUser(),
      Scan.getLatest(),
      loadAgentTrafficSummary(context.session.user.id),
    ]);

    if (!products.success) return products;
    if (!scans.success) return scans;

    const latestScan = scans.data[0];

    if (products.data.length === 0) {
      return {
        success: true as const,
        data: {
          stats: {
            overallWinRate: 0,
            winRateTrend: 0,
            productsScanned: 0,
            productLimit: 100,
            topPerformer: null,
            biggestOpportunity: null,
            aiSiteVisits30d: agentTraffic.total30d,
          },
          agentTraffic,
          models: [],
          trend: [],
          products: [],
          activity: deriveActivity(scans.data),
          lastUpdated: latestScan?.updatedAt ?? null,
        } satisfies DashboardData,
      };
    }

    const productIds = products.data.map((product) => product.id);

    const simulations = await Simulation.getForProducts({
      products: productIds,
    });

    if (!simulations.success) return simulations;

    const competitorIds = unique(
      simulations.data.map((simulation) => simulation.competitorId),
    );

    const competitors =
      competitorIds.length > 0
        ? await Competitor.find(Environment.SERVER, {
            where: inArray(schema.competitor.id, competitorIds),
          })
        : { success: true as const, data: [] as Competitor.Type[] };

    if (!competitors.success) return competitors;

    const competitorMap = new Map(
      competitors.data.map((competitor) => [competitor.id, competitor]),
    );

    const productRows: ProductRow[] = products.data.map((product) => {
      const productSimulations = simulations.data.filter(
        (simulation) => simulation.productId === product.id,
      );

      const wins = productSimulations.filter(
        (simulation) => simulation.winner === "product",
      ).length;

      const total = productSimulations.length;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

      const byCompetitor = new Map<string, { wins: number; total: number }>();

      for (const simulation of productSimulations) {
        const entry = byCompetitor.get(simulation.competitorId) ?? {
          wins: 0,
          total: 0,
        };
        entry.total++;
        if (simulation.winner === "competitor") entry.wins++;
        byCompetitor.set(simulation.competitorId, entry);
      }

      let topCompetitor: { name: string; winRate: number } | null = null;
      let highestRate = 0;

      for (const [competitorId, stats] of byCompetitor) {
        const rate =
          stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;
        if (rate > highestRate) {
          highestRate = rate;
          const competitor = competitorMap.get(competitorId);
          topCompetitor = {
            name: competitor?.brand ?? competitor?.title ?? "Unknown",
            winRate: rate,
          };
        }
      }

      return {
        id: product.id,
        title: product.title,
        price: product.price,
        currency: product.currency,
        winRate,
        gpt4: computeModelRate(productSimulations, "gpt4"),
        claude: computeModelRate(productSimulations, "claude"),
        gemini: computeModelRate(productSimulations, "gemini"),
        quality: computeDataQuality(product),
        topCompetitor,
        updatedAt: product.updatedAt,
      };
    });

    const sorted = [...productRows].sort((a, b) => b.winRate - a.winRate);

    const topPerformer = sorted[0] ?? null;
    const biggestOpportunity =
      sorted.length > 0 ? sorted[sorted.length - 1] : null;

    const overallWinRate =
      productRows.length > 0
        ? Math.round(
            productRows.reduce((sum, product) => sum + product.winRate, 0) /
              productRows.length,
          )
        : 0;

    const completedScans = scans.data.filter(
      (scan) => scan.status === "completed",
    );

    const winRateTrend = (() => {
      if (completedScans.length < 2) return 0;
      const current = completedScans[0];
      const previous = completedScans[1];

      const currentTotal = current.wins + current.losses;
      const previousTotal = previous.wins + previous.losses;

      const currentRate =
        currentTotal > 0 ? Math.round((current.wins / currentTotal) * 100) : 0;
      const previousRate =
        previousTotal > 0
          ? Math.round((previous.wins / previousTotal) * 100)
          : 0;

      return currentRate - previousRate;
    })();

    const models: ModelRate[] = [
      {
        model: "gpt4",
        label: "GPT-4",
        rate: computeModelRate(simulations.data, "gpt4"),
      },
      {
        model: "claude",
        label: "Claude",
        rate: computeModelRate(simulations.data, "claude"),
      },
      {
        model: "gemini",
        label: "Gemini",
        rate: computeModelRate(simulations.data, "gemini"),
      },
    ];

    const trend: TrendPoint[] = completedScans
      .slice(0, 30)
      .reverse()
      .map((scan) => {
        const total = scan.wins + scan.losses;
        return {
          date: scan.createdAt,
          winRate: total > 0 ? Math.round((scan.wins / total) * 100) : 0,
        };
      });

    return {
      success: true as const,
      data: {
        stats: {
          overallWinRate,
          winRateTrend,
          productsScanned: products.data.length,
          productLimit: 100,
          topPerformer: topPerformer
            ? {
                id: topPerformer.id,
                title: topPerformer.title,
                winRate: topPerformer.winRate,
              }
            : null,
          biggestOpportunity: biggestOpportunity
            ? {
                id: biggestOpportunity.id,
                title: biggestOpportunity.title,
                winRate: biggestOpportunity.winRate,
              }
            : null,
          aiSiteVisits30d: agentTraffic.total30d,
        },
        agentTraffic,
        models,
        trend,
        products: sorted.slice(0, 10),
        activity: deriveActivity(scans.data),
        lastUpdated: latestScan?.updatedAt ?? null,
      } satisfies DashboardData,
    };
  }, "Dashboard.gatherIntelligence"),
);

const deriveActivity = (scans: Scan.Type[]): ActivityEntry[] =>
  scans.slice(0, 5).map((scan) => ({
    id: scan.id,
    type:
      scan.status === "completed"
        ? ("simulation_complete" as const)
        : ("simulation_running" as const),
    message:
      scan.status === "completed"
        ? `Simulation completed — ${scan.wins} wins, ${scan.losses} losses`
        : `Simulation in progress — ${scan.completedSimulations}/${scan.totalSimulations}`,
    detail: scan.topFinding,
    timestamp: scan.createdAt,
  }));
