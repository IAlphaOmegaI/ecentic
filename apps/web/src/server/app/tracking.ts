"use server";

import { resultify, type UnwrapResult } from "@zenncore/utils";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import {
  withContext,
  withDurable,
  withInstrumentation,
} from "../utils/context";
import { Environment } from "../utils/environment";
import { DatabaseError } from "../utils/error";
import { repository } from "../utils/repository";
import {
  isOriginAllowedForStore,
  resolveProductFromPageUrl,
} from "../utils/tracking";

export const parse = withContext(
  async (_, { payload }: { payload: unknown }) => {
    return z
      .object({
        storeId: z.string(),
        productUrl: z.string(),
        userAgent: z.string(),
        referrer: z.string().nullable().catch(null),
        agentType: z.enum([
          "chatgpt-user",
          "claude-user",
          "perplexity-user",
          "chatgpt-agent",
          "perplexity-comet",
          "gptbot",
          "claudebot",
          "oai-searchbot",
          "perplexitybot",
          "claude-searchbot",
          "bytespider",
          "google-extended",
          "amazonbot",
          "googlebot",
          "probe-ping",
          "chatgpt-referral",
          "perplexity-referral",
          "claude-referral",
          "gemini-referral",
          "copilot-referral",
          "you-referral",
        ]),
        agentCategory: z.enum([
          "user-action",
          "agentic-browser",
          "training-crawler",
          "search-crawler",
          "referral",
        ]),
        detectionMethod: z.enum(["user-agent", "referrer", "both"]),
        pageType: z.enum([
          "product",
          "collection",
          "search",
          "homepage",
          "other",
        ]),
        productExternalId: z.string().nullable().catch(null),
        timestamp: z.unknown(),
      })
      .safeParse(payload);
  },
  "Tracking.parseAgentVisit",
);

const RATE_LIMIT_WINDOW = 3600;
const RATE_LIMIT_MAX = 1000;

const isRateLimited = withContext.append(withDurable)(
  async (ctx, { store }: { store: string }) => {
    const key = `rate_limit:agent_visit:${store}`;
    const count = await ctx.durable.redis.incr(key);

    if (count === 1) await ctx.durable.redis.expire(key, RATE_LIMIT_WINDOW);

    return { success: true, data: count > RATE_LIMIT_MAX };
  },
);

const AGENT_LABELS: Record<string, string> = {
  "chatgpt-user": "ChatGPT (user)",
  "claude-user": "Claude (user)",
  "perplexity-user": "Perplexity (user)",
  "chatgpt-agent": "ChatGPT Agent",
  "perplexity-comet": "Perplexity Comet",
  gptbot: "GPTBot",
  claudebot: "ClaudeBot",
  "oai-searchbot": "OAI SearchBot",
  perplexitybot: "PerplexityBot",
  "claude-searchbot": "Claude SearchBot",
  bytespider: "ByteSpider",
  "google-extended": "Google Extended",
  amazonbot: "AmazonBot",
  googlebot: "GoogleBot",
  "probe-ping": "Probe Ping",
  "chatgpt-referral": "ChatGPT Referral",
  "perplexity-referral": "Perplexity Referral",
  "claude-referral": "Claude Referral",
  "gemini-referral": "Gemini Referral",
  "copilot-referral": "Copilot Referral",
  "you-referral": "You.com Referral",
};

export type TrafficTimeSeriesPoint = {
  date: string;
  chatgpt: number;
  claude: number;
  gemini: number;
};

/**
 * Agent visit counts grouped by store for one user since a cutoff — hub cards
 * show 30-day traffic without loading visit rows.
 */
export const countByStoreForUser = withInstrumentation(
  async (_, { user, since }: { user: string; since: Date }) => {
    const rows = await resultify(async () =>
      db
        .select({
          storeId: schema.agentVisit.storeId,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.agentVisit)
        .where(
          and(
            eq(schema.agentVisit.userId, user),
            gte(schema.agentVisit.createdAt, since),
          ),
        )
        .groupBy(schema.agentVisit.storeId),
    );

    if (!rows.success)
      return {
        success: false as const,
        error: new DatabaseError("Failed to count agent visits by store", {
          cause: rows.error,
        }),
      };

    return { success: true as const, data: rows.data };
  },
  "Tracking.countByStoreForUser",
);

export const getAgentTrafficTimeSeries = withAuthentication(
  async (context, { store }: { store?: string } = {}) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const modelFamily = sql<string>`
      CASE
        WHEN ${schema.agentVisit.agentType} IN ('chatgpt-user','chatgpt-agent','gptbot','oai-searchbot','chatgpt-referral') THEN 'ChatGPT'
        WHEN ${schema.agentVisit.agentType} IN ('claude-user','claudebot','claude-searchbot','claude-referral') THEN 'Claude'
        WHEN ${schema.agentVisit.agentType} IN ('gemini-referral','google-extended','googlebot') THEN 'Gemini'
        ELSE 'Other'
      END
    `.as("model_family");

    const day =
      sql<string>`date_trunc('day', ${schema.agentVisit.createdAt})::date`.as(
        "day",
      );

    const result = await resultify(async () =>
      db
        .select({
          day,
          modelFamily,
          count: count(),
        })
        .from(schema.agentVisit)
        .where(
          and(
            eq(schema.agentVisit.userId, context.session.user.id),
            gte(schema.agentVisit.createdAt, thirtyDaysAgo),
            ...(store ? [eq(schema.agentVisit.storeId, store)] : []),
          ),
        )
        .groupBy(day, modelFamily)
        .orderBy(day),
    );

    if (!result.success)
      return {
        success: false as const,
        error: new DatabaseError("Failed to load agent traffic time series", {
          cause: result.error,
        }),
      };

    const dates = Array.from({ length: 30 }, (_value, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - index));
      return date.toISOString().split("T")[0] as string;
    });

    const countFor = (date: string, family: string) =>
      result.data.find((row) => row.day === date && row.modelFamily === family)
        ?.count ?? 0;

    const timeSeries: TrafficTimeSeriesPoint[] = dates.map((date) => ({
      date,
      chatgpt: countFor(date, "ChatGPT"),
      claude: countFor(date, "Claude"),
      gemini: countFor(date, "Gemini"),
    }));

    return { success: true as const, data: timeSeries };
  },
  "Tracking.getAgentTrafficTimeSeries",
);

export const getAgentTrafficSummary = withAuthentication(
  async (context, { store }: { store?: string } = {}) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await resultify(async () =>
      db
        .select({
          agentType: schema.agentVisit.agentType,
          count: count(),
        })
        .from(schema.agentVisit)
        .where(
          and(
            eq(schema.agentVisit.userId, context.session.user.id),
            gte(schema.agentVisit.createdAt, thirtyDaysAgo),
            ...(store ? [eq(schema.agentVisit.storeId, store)] : []),
          ),
        )
        .groupBy(schema.agentVisit.agentType)
        .orderBy(sql`count(*) desc`),
    );

    if (!result.success)
      return {
        success: false as const,
        error: new DatabaseError("Failed to load agent traffic summary", {
          cause: result.error,
        }),
      };

    const byAgentType = result.data.map((row) => ({
      agentType: row.agentType,
      label: AGENT_LABELS[row.agentType] ?? row.agentType,
      count: row.count,
    }));

    const total30d = byAgentType.reduce((sum, entry) => sum + entry.count, 0);

    return { success: true as const, data: { total30d, byAgentType } };
  },
  "Tracking.getAgentTrafficSummary",
);

const { create, find } = repository(schema.agentVisit);
const stores = repository(schema.store);

/**
 * The most recent `*-referral` visit for a store inside the attribution window
 * — a human who arrived from an AI answer. Used by the performance-fee
 * attribution pipeline as the fallback signal when an order carries no explicit
 * `_ecentic_ai_ref` cart attribute. Returns null when no such visit exists.
 */
export const findRecentReferralVisit = withContext(
  async (_, { store, since }: { store: string; since: Date }) => {
    const rows = await find(Environment.SERVER, {
      where: and(
        eq(schema.agentVisit.storeId, store),
        eq(schema.agentVisit.agentCategory, "referral"),
        gte(schema.agentVisit.createdAt, since),
      ),
      orderBy: [{ column: schema.agentVisit.createdAt, direction: "desc" }],
      limit: 1,
    });

    if (!rows.success) return rows;
    return { success: true as const, data: rows.data[0] ?? null };
  },
  "Tracking.findRecentReferralVisit",
);

export const recordAgentVisit = withContext(
  async (
    _,
    {
      payload,
      apiKey,
      origin,
    }: {
      payload: UnwrapResult<Awaited<ReturnType<typeof parse>>>;
      apiKey: string | null;
      origin: string | null;
    },
  ) => {
    const store = await stores.get(Environment.SERVER, payload.storeId);

    if (!store.success) return store;

    if (!store.data?.trackerApiKey)
      return { success: false, error: new Error("Store not found") };

    if (apiKey !== store.data.trackerApiKey)
      return { success: false, error: new Error("Invalid API key") };

    if (
      origin &&
      origin !== "null" &&
      !isOriginAllowedForStore({
        origin,
        storeDomain: store.data.domain,
        storefrontHosts: store.data.storefrontHosts,
      })
    )
      return { success: false, error: new Error("Origin not allowed") };

    const rateLimited = await isRateLimited(Environment.SERVER, {
      store: payload.storeId,
    });

    if (!rateLimited.success) return rateLimited;

    if (rateLimited.data)
      return { success: false, error: new Error("Rate limited") };

    const resolved = await resolveProductFromPageUrl(Environment.SERVER, {
      store: store.data.id,
      pageUrl: payload.productUrl,
    });

    if (!resolved.success) return resolved;

    const externalProductId =
      resolved.data.externalProductId ?? payload.productExternalId;

    const insertion = await create(Environment.SERVER, {
      ...payload,
      storeId: store.data.id,
      userId: store.data.userId,
      productId: resolved.data.productId,
      externalProductId,
      detectionLayer: 1,
      pageUrl: payload.productUrl,
    });

    if (!insertion.success) return insertion;

    return { success: true, data: true };
  },
  "Tracking.recordAgentVisit",
);
