import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@/server/database";
import {
  isOriginAllowedForStore,
  resolveProductFromPageUrl,
} from "@/server/utils/tracking";

export const dynamic = "force-dynamic";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const isRateLimited = (storeId: string): boolean => {
  const now = Date.now();
  const current = rateLimitMap.get(storeId);

  if (!current || now > current.resetAt) {
    rateLimitMap.set(storeId, { count: 1, resetAt: now + 3_600_000 });
    return false;
  }

  if (current.count >= 1000) return true;

  rateLimitMap.set(storeId, {
    count: current.count + 1,
    resetAt: current.resetAt,
  });
  return false;
};

const VALID_AGENT_TYPES = new Set([
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
]);

const VALID_CATEGORIES = new Set([
  "user-action",
  "agentic-browser",
  "training-crawler",
  "search-crawler",
  "referral",
]);

const VALID_PAGE_TYPES = new Set([
  "product",
  "collection",
  "search",
  "homepage",
  "other",
]);

const VALID_DETECTION_METHODS = new Set(["user-agent", "referrer", "both"]);

const corsHeaders = (allowOrigin: string | null): Record<string, string> => ({
  "Access-Control-Allow-Origin": allowOrigin ?? "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

export const OPTIONS = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin && origin !== "null" ? origin : "*"),
  });
};

export const POST = async (request: NextRequest) => {
  const requestOrigin = request.headers.get("origin");
  const allowCorsOrigin =
    requestOrigin && requestOrigin !== "null" ? requestOrigin : null;

  const noContent = (headers?: Record<string, string>) =>
    new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(allowCorsOrigin),
        ...headers,
      },
    });

  const apiKey =
    request.headers.get("authorization")?.replace("Bearer ", "") ?? null;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noContent();
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("storeId" in body) ||
    !("productUrl" in body) ||
    !("userAgent" in body) ||
    !("agentType" in body) ||
    !("agentCategory" in body) ||
    !("detectionMethod" in body) ||
    !("pageType" in body) ||
    !("timestamp" in body)
  ) {
    return noContent();
  }

  const {
    storeId,
    productUrl,
    userAgent,
    referrer,
    agentType,
    agentCategory,
    detectionMethod,
    pageType,
    productExternalId: bodyExternalProductId,
  } = body as Record<string, unknown>;

  if (
    typeof storeId !== "string" ||
    typeof productUrl !== "string" ||
    typeof userAgent !== "string" ||
    typeof agentType !== "string" ||
    typeof agentCategory !== "string" ||
    typeof detectionMethod !== "string" ||
    typeof pageType !== "string"
  ) {
    return noContent();
  }

  if (
    !VALID_AGENT_TYPES.has(agentType) ||
    !VALID_CATEGORIES.has(agentCategory) ||
    !VALID_PAGE_TYPES.has(pageType) ||
    !VALID_DETECTION_METHODS.has(detectionMethod)
  ) {
    return noContent();
  }

  const [store] = await db
    .select({
      id: schema.store.id,
      userId: schema.store.userId,
      domain: schema.store.domain,
      trackerApiKey: schema.store.trackerApiKey,
      storefrontHosts: schema.store.storefrontHosts,
    })
    .from(schema.store)
    .where(eq(schema.store.id, storeId))
    .limit(1);

  if (!store?.trackerApiKey) return noContent();

  if (apiKey !== store.trackerApiKey) return noContent();

  const origin = request.headers.get("origin");
  if (
    origin &&
    origin !== "null" &&
    !isOriginAllowedForStore({
      origin,
      storeDomain: store.domain,
      storefrontHosts: store.storefrontHosts,
    })
  ) {
    return noContent();
  }

  if (isRateLimited(storeId)) return noContent();

  const resolved = await resolveProductFromPageUrl({
    storeId: store.id,
    pageUrl: productUrl,
  });

  const externalProductId =
    resolved.externalProductId ??
    (typeof bodyExternalProductId === "string" ? bodyExternalProductId : null);

  await db.insert(schema.agentVisit).values({
    storeId: store.id,
    userId: store.userId,
    productId: resolved.productId,
    externalProductId,
    agentType,
    agentCategory,
    detectionMethod,
    detectionLayer: 1,
    pageUrl: productUrl,
    pageType,
    referrer: typeof referrer === "string" ? referrer : null,
    userAgent,
  });

  return noContent();
};
