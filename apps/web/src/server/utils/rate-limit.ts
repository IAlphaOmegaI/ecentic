import { resultify } from "@zenncore/utils";

/**
 * Fixed-window rate limiting for the public agent API, plus the response
 * headers that let an agent self-throttle instead of discovering the limit by
 * being rejected.
 *
 * Both header spellings are emitted on purpose. `RateLimit-Limit` /
 * `-Remaining` / `-Reset` are what almost every client in the wild reads; the
 * structured-field `RateLimit` and `RateLimit-Policy` are the current IETF
 * draft. They describe the same window, so a client may read either.
 *
 * @see https://www.ietf.org/archive/id/draft-ietf-httpapi-ratelimit-headers-09.html
 */

export type Policy = {
  /** Policy name, used as the structured-field key and the Redis key prefix. */
  name: string;
  /** Requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  window: number;
};

export const PUBLIC_API_POLICY: Policy = {
  name: "public",
  limit: 120,
  window: 60,
};

/**
 * `/api/v1/news` reads an upstream feed per request, so it is metered well
 * below the shared default.
 */
export const NEWS_POLICY: Policy = { name: "news", limit: 30, window: 60 };

/**
 * `?resolve=true` additionally makes the origin fetch one page per article.
 * Priced as what it is: the most expensive thing an unauthenticated caller can
 * ask this API to do.
 */
export const NEWS_RESOLVE_POLICY: Policy = {
  name: "news-resolve",
  limit: 6,
  window: 60,
};

/**
 * Every policy the public surface enforces, so the documentation renders what
 * the code applies instead of a number kept in sync by hand.
 */
export const POLICIES: readonly (Policy & { scope: string })[] = [
  { ...PUBLIC_API_POLICY, scope: "every /api/v1 endpoint" },
  { ...NEWS_POLICY, scope: "/api/v1/news" },
  { ...NEWS_RESOLVE_POLICY, scope: "/api/v1/news?resolve=true" },
] as const;

export type Verdict = {
  policy: Policy;
  /** `false` only when the window was actually counted and is exhausted. */
  allowed: boolean;
  /** `null` when the counter was unreachable, so no count is claimed. */
  remaining: number | null;
  /** Seconds until the current window resets. */
  reset: number;
};

/**
 * Resolved once, lazily. `Redis.fromEnv()` throws when the Upstash variables
 * are absent, which must not take a public discovery endpoint down with it —
 * an environment without Redis simply does not enforce, and says so by omitting
 * the count from the headers.
 */
const client = async () => {
  const module = await resultify(() => import("./durable"));
  if (!module.success) return null;

  const resolved = resultify(() => module.data.redis);
  return resolved.success ? resolved.data : null;
};

/**
 * The identity a window is counted against. An API key gets its own window so
 * one noisy agent cannot spend a shared IP's budget; everything else falls back
 * to the edge-provided client IP.
 */
export const identify = (request: Request) => {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer "))
    // The key itself is a secret and must not become a Redis key. A prefix is
    // enough to separate callers without storing the credential.
    return `key:${authorization.slice(7).trim().slice(0, 16)}`;

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  return `ip:${forwarded?.trim() || request.headers.get("x-real-ip") || "unknown"}`;
};

export const consume = async (
  request: Request,
  policy: Policy = PUBLIC_API_POLICY,
): Promise<Verdict> => {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % policy.window);
  const reset = windowStart + policy.window - now;

  const redis = await client();
  if (!redis) return { policy, allowed: true, remaining: null, reset };

  const key = `ratelimit:${policy.name}:${identify(request)}:${windowStart}`;

  const count = await resultify(async () => {
    // INCR and EXPIRE go out together. Setting the expiry only on the request
    // that opened the window would leak the key forever if the process died
    // between the two commands — the window key carries its own timestamp, so a
    // leaked key throttles nobody, but it never leaves Redis either. One
    // pipeline is also one round trip, so the extra command is free.
    const [value] = (await redis
      .pipeline()
      .incr(key)
      .expire(key, policy.window)
      .exec()) as [number, number];

    return value;
  });

  // Fail open: a Redis outage must not turn every agent request into a 429.
  if (!count.success) return { policy, allowed: true, remaining: null, reset };

  return {
    policy,
    allowed: count.data <= policy.limit,
    remaining: Math.max(0, policy.limit - count.data),
    reset,
  };
};

/**
 * `RateLimit-Policy` is always sent — the policy is true whether or not this
 * request could be counted. The live counters are sent only when there is a
 * real count behind them, so the headers never claim a budget nobody measured.
 */
export const rateLimitHeaders = ({
  policy,
  remaining,
  reset,
}: Verdict): Record<string, string> => ({
  "RateLimit-Policy": `"${policy.name}";q=${policy.limit};w=${policy.window}`,
  ...(remaining === null
    ? {}
    : {
        RateLimit: `"${policy.name}";r=${remaining};t=${reset}`,
        "RateLimit-Limit": String(policy.limit),
        "RateLimit-Remaining": String(remaining),
        "RateLimit-Reset": String(reset),
      }),
});
