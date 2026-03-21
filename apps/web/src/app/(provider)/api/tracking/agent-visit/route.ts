import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse as Response } from "next/server";
import { db, schema } from "@/server/database";

export const dynamic = "force-dynamic";

// Simple in-memory rate limiter: 1000 events/hour per store
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const isRateLimited = (storeId: string): boolean => {
  const now = Date.now();
  const limit = rateLimitMap.get(storeId);

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(storeId, { count: 1, resetAt: now + 3_600_000 });
    return false;
  }

  if (limit.count >= 1000) return true;

  limit.count++;
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

export const POST = async (request: NextRequest) => {
  // Beacon always returns 204 — the client ignores the body
  const noContent = () => new Response(null, { status: 204 });

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
    !VALID_PAGE_TYPES.has(pageType)
  ) {
    return noContent();
  }

  // Look up the store
  const [store] = await db
    .select({
      id: schema.store.id,
      userId: schema.store.userId,
      domain: schema.store.domain,
      trackerApiKey: schema.store.trackerApiKey,
    })
    .from(schema.store)
    .where(eq(schema.store.id, storeId))
    .limit(1);

  if (!store || !store.trackerApiKey) return noContent();

  // Validate API key
  if (apiKey !== store.trackerApiKey) return noContent();

  // Validate Origin header matches the store's domain
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).hostname;
      const storeHost = new URL(store.domain).hostname;
      if (originHost !== storeHost) return noContent();
    } catch {
      return noContent();
    }
  }

  // Rate limit
  if (isRateLimited(storeId)) return noContent();

  // Insert visit record
  await db.insert(schema.agentVisit).values({
    storeId: store.id,
    userId: store.userId,
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
