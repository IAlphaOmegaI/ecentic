/**
 * Business-layer replay protection for hosted UCP endpoints, keyed by the
 * `Idempotency-Key` header and scoped per store + operation (method + path).
 * Backed by redis: an in-flight reservation self-clears after 5 minutes, and a
 * completed response is replayed for 48 hours (spec: ≥24h, recommended 48h).
 */

import { createHash } from "node:crypto";
import { redis } from "@/server/utils/durable";

/** Pending-reservation lifetime for an in-flight idempotency key. */
const PENDING_TTL = 5 * 60;

/** How long a cached idempotent response is replayed. */
const RESULT_TTL = 2 * 24 * 60 * 60;

const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

type CachedResponse = { status: number; data: unknown };

/**
 * Storage key for a request's Idempotency-Key. Returns "" when idempotency
 * does not apply (no header, or a safe method).
 */
export const idempotencyStoreKey = ({
  store,
  method,
  path,
  headers,
}: {
  store: string;
  method: string;
  path: string;
  headers: Headers;
}): string => {
  const key = headers.get("idempotency-key") ?? "";
  if (key === "") return "";
  if (!MUTATING_METHODS.includes(method.toUpperCase())) return "";
  const digest = createHash("md5")
    .update(`${key}|${method.toUpperCase()} ${path}`)
    .digest("hex");
  return `ucp:idem:${store}:${digest}`;
};

export type IdempotencyPrecheck =
  | { outcome: "proceed" }
  | { outcome: "replay"; status: number; data: unknown }
  | { outcome: "conflict" }
  | { outcome: "unavailable" };

/**
 * On a duplicate Idempotency-Key, returns the cached response. On first
 * sight, reserves the key; per spec the caller fails closed (503) when
 * reservation storage is unavailable.
 */
export const idempotencyPrecheck = async (
  storeKey: string,
): Promise<IdempotencyPrecheck> => {
  if (storeKey === "") return { outcome: "proceed" };

  const attempt = await (async () => {
    try {
      const cached = await redis.get<CachedResponse | "pending">(storeKey);
      if (
        cached &&
        typeof cached === "object" &&
        "status" in cached &&
        "data" in cached
      ) {
        return {
          outcome: "replay",
          status: cached.status,
          data: cached.data,
        } satisfies IdempotencyPrecheck;
      }
      if (cached === "pending") {
        return { outcome: "conflict" } satisfies IdempotencyPrecheck;
      }

      // Reserve the key; NX loses the race to a concurrent duplicate.
      const reserved = await redis.set(storeKey, "pending", {
        nx: true,
        ex: PENDING_TTL,
      });
      if (reserved === null)
        return { outcome: "conflict" } satisfies IdempotencyPrecheck;
      return { outcome: "proceed" } satisfies IdempotencyPrecheck;
    } catch {
      return { outcome: "unavailable" } satisfies IdempotencyPrecheck;
    }
  })();

  return attempt;
};

/**
 * Caches a completed state-changing response under its Idempotency-Key so
 * duplicates replay it without re-executing. Server errors (5xx) release the
 * reservation so the client can retry.
 */
export const idempotencyStore = async (
  storeKey: string,
  status: number,
  data: unknown,
): Promise<void> => {
  if (storeKey === "") return;
  try {
    if (status >= 500) {
      await redis.del(storeKey);
      return;
    }
    await redis.set(storeKey, { status, data } satisfies CachedResponse, {
      ex: RESULT_TTL,
    });
  } catch {
    // Best-effort: a lost cache entry only costs a duplicate execution window.
  }
};
