import * as Sentry from "@sentry/nextjs";
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
  /**
   * Whether an API key gets its own window. Off for anonymous surfaces: a
   * caller could otherwise mint a fresh window per request by inventing a
   * `Bearer` header, and the limit would never apply.
   */
  keyed?: boolean;
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
 * The landing hero's store-URL check. Anonymous, and every call fetches a
 * stranger's storefront — metered tightly so the form cannot be used as a free
 * reachability probe. Not part of the public API, so not listed below.
 */
export const ENTRY_POLICY: Policy = {
  name: "entry",
  limit: 10,
  window: 60,
  keyed: false,
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
 * Resolved once, lazily. A client that cannot be built must not take a public
 * discovery endpoint down with it — the request goes through unmetered and says
 * so by omitting the count from the headers. Missing Upstash variables land in
 * the same place one step later: the client only warns, and its commands fail.
 */
const client = async () => {
  const module = await resultify(() => import("./durable"));
  if (!module.success) return module;

  return resultify(() => module.data.redis);
};

const FAIL_OPEN_REPORT_INTERVAL_MS = 60_000;

const failOpen = { reportedAt: Number.NEGATIVE_INFINITY };

/**
 * Failing open keeps the API up and turns the limits off without one failed
 * request to show for it, which is how the Upstash database behind this could
 * disappear unnoticed. So it has to say so, but `consume` runs on every public
 * request and an outage is exactly when nothing is limiting that volume: at most
 * once a minute per process, and one Sentry issue however many policies and
 * causes feed it. All this adds is the policy name: never the bucket key, which
 * names the caller.
 */
const reportFailOpen = (policy: Policy, cause: Error) => {
  const now = Date.now();
  if (now - failOpen.reportedAt < FAIL_OPEN_REPORT_INTERVAL_MS) return;
  failOpen.reportedAt = now;

  const error = new Error(
    `Rate limits are not being enforced: the counter failed on "${policy.name}"`,
    { cause },
  );

  console.error(error);
  Sentry.captureException(error, {
    fingerprint: ["rate-limit-fail-open"],
    tags: { rate_limit_policy: policy.name },
  });
};

/**
 * The identity a window is counted against. An API key gets its own window so
 * one noisy agent cannot spend a shared IP's budget; everything else falls back
 * to the edge-provided client IP.
 *
 * Takes anything carrying headers, not only a `Request`, so a server action can
 * pass `await headers()` — it has no `Request` to hand over.
 */
type Caller = { headers: Pick<Headers, "get"> };

export const identify = (request: Caller, { keyed = true } = {}) => {
  const authorization = keyed ? request.headers.get("authorization") : null;
  if (authorization?.startsWith("Bearer "))
    // The key itself is a secret and must not become a Redis key. A prefix is
    // enough to separate callers without storing the credential.
    return `key:${authorization.slice(7).trim().slice(0, 16)}`;

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  return `ip:${forwarded?.trim() || request.headers.get("x-real-ip") || "unknown"}`;
};

export const consume = async (
  request: Caller,
  policy: Policy = PUBLIC_API_POLICY,
): Promise<Verdict> => {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % policy.window);
  const reset = windowStart + policy.window - now;

  // Fail open: a Redis outage must not turn every agent request into a 429.
  const open = (cause: Error): Verdict => {
    reportFailOpen(policy, cause);
    return { policy, allowed: true, remaining: null, reset };
  };

  const redis = await client();
  if (!redis.success) return open(redis.error);

  const key = `ratelimit:${policy.name}:${identify(request, { keyed: policy.keyed ?? true })}:${windowStart}`;

  const count = await resultify(async () => {
    // INCR and EXPIRE go out together. Setting the expiry only on the request
    // that opened the window would leak the key forever if the process died
    // between the two commands — the window key carries its own timestamp, so a
    // leaked key throttles nobody, but it never leaves Redis either. One
    // pipeline is also one round trip, so the extra command is free.
    const [value] = (await redis.data
      .pipeline()
      .incr(key)
      .expire(key, policy.window)
      .exec()) as [number, number];

    return value;
  });

  if (!count.success) return open(count.error);

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
