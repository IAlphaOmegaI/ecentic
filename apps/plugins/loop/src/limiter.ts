import { assertMerchant, LoopError } from "./guard";

/** Persist nextAt atomically under the store + bucket key before sleeping. No process-local fallback. */
export const reserveRequest = (
  store: string,
  bucket: "api" | "auth",
  nextAt: number | null,
  now: number,
) => {
  assertMerchant(store);
  if (
    !Number.isFinite(now) ||
    (nextAt !== null && !Number.isFinite(nextAt)) ||
    !["api", "auth"].includes(bucket)
  )
    throw new LoopError("Loop rate-limit reservation is invalid.");
  const reserved = Math.max(now, nextAt ?? now);
  return {
    nextAt: reserved + (bucket === "auth" ? 3000 : 200),
    waitMilliseconds: reserved - now,
  };
};

export const retryDelay = (
  store: string,
  attempt: number,
  retryAfter: string | null,
  {
    now = Date.now(),
    random = Math.random,
  }: { now?: number; random?: () => number } = {},
) => {
  assertMerchant(store);
  const seconds = retryAfter === null ? Number.NaN : Number(retryAfter);
  const date = retryAfter === null ? Number.NaN : Date.parse(retryAfter);
  const requested = Number.isFinite(seconds)
    ? seconds * 1000
    : Number.isFinite(date)
      ? date - now
      : 0;
  const delay = Math.max(1000 * 2 ** Math.min(attempt, 5), requested, 1000);
  // Long provider delays must be rescheduled by the job runner, never retried early.
  if (delay > 60_000)
    throw new LoopError("Loop rate limit requires a later retry.", 429);
  return delay + Math.floor(Math.min(1, Math.max(0, random())) * 500);
};
