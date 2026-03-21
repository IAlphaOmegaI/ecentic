"use server";

import { z } from "zod";
import { schema } from "../database";
import type { GenericContext } from "../utils/context";
import { withContext } from "../utils/context";
import { Environment } from "../utils/environment";
import { repository } from "../utils/repository";
import {
  isOriginAllowedForStore,
  resolveProductFromPageUrl,
} from "../utils/tracking";
import type { UnwrapResult } from "@zenncore/utils";
import * as Store from "../app/store";

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

const isRateLimited = async (
  redis: GenericContext["durable"]["redis"],
  storeId: string,
): Promise<boolean> => {
  const key = `rate_limit:agent_visit:${storeId}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, RATE_LIMIT_WINDOW);
  }

  return count > RATE_LIMIT_MAX;
};

export type AgentTrafficSummary = {
  total30d: number;
  byAgentType: Array<{
    agentType: string;
    label: string;
    count: number;
  }>;
};

const { create } = repository(schema.agentVisit);

export const recordAgentVisit = withContext(
  async (
    context,
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
    const store = await Store.get(Environment.SERVER, payload.storeId);

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

    if (await isRateLimited(context.durable.redis, payload.storeId))
      return { success: false, error: new Error("Rate limited") };

    const resolved = await resolveProductFromPageUrl(Environment.SERVER, {
      storeId: store.data.id,
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
