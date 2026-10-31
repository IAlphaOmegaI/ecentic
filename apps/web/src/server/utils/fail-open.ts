import * as Sentry from "@sentry/nextjs";

const FAIL_OPEN_REPORT_INTERVAL_MS = 60_000;

const failOpen = { reportedAt: Number.NEGATIVE_INFINITY };

/**
 * Failing open keeps a request up and turns its limit off without one failed
 * request to show for it, which is how the Upstash database behind these could
 * disappear unnoticed. So every limiter that fails open has to say so, but a
 * limiter runs on every request it guards and an outage is exactly when nothing
 * is limiting that volume: at most once a minute per process, and one Sentry
 * issue however many limiters and causes feed it. A quiet limiter failing
 * alongside a busy one can lose its tag to that one, but the outage is still
 * reported. All this adds is the limiter's name: never the bucket key, which
 * names the caller.
 *
 * `abs` so a clock stepping back cannot silence this for however far it stepped.
 */
export const reportFailOpen = (limiter: string, cause: unknown) => {
  const now = Date.now();
  if (Math.abs(now - failOpen.reportedAt) < FAIL_OPEN_REPORT_INTERVAL_MS)
    return;
  failOpen.reportedAt = now;

  const error = new Error(
    `Rate limits are not being enforced: the counter failed on "${limiter}"`,
    { cause },
  );

  console.error(error);
  Sentry.captureException(error, {
    fingerprint: ["rate-limit-fail-open"],
    tags: { rate_limit_policy: limiter },
  });
};
