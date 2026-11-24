export type Bucket = { used: number; updatedAt: number };

/** Pure policy for a persisted per-shop bucket. Store the returned state atomically. */
export const reserveRequest = (bucket: Bucket | null, now: number) => {
  const elapsed = bucket ? Math.max(0, now - bucket.updatedAt) : 0;
  const used = Math.max(0, (bucket?.used ?? 0) - (elapsed / 1000) * 2);
  if (used + 1 > 40)
    return {
      bucket: { used, updatedAt: now },
      waitMilliseconds: Math.ceil(((used + 1 - 40) / 2) * 1000),
    };
  return { bucket: { used: used + 1, updatedAt: now }, waitMilliseconds: 0 };
};

export const retryDelay = (
  attempt: number,
  retryAfter: string | null,
  {
    now = Date.now(),
    random = Math.random,
  }: { now?: number; random?: () => number } = {},
) => {
  const seconds = retryAfter === null ? Number.NaN : Number(retryAfter);
  const date = retryAfter === null ? Number.NaN : Date.parse(retryAfter);
  const requested = Number.isFinite(seconds)
    ? seconds * 1000
    : Number.isFinite(date)
      ? date - now
      : 0;
  return (
    Math.max(2000 * 2 ** Math.min(attempt, 5), requested, 2000) +
    Math.floor(Math.min(1, Math.max(0, random())) * 500)
  );
};
