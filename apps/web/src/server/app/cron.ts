import * as Sentry from "@sentry/nextjs";
import { resultify } from "@zenncore/utils";
import { after } from "next/server";
import { withCron } from "@/server/utils/cron";
import { Environment } from "@/server/utils/environment";
import * as PerformanceFee from "./billing/performance-fee";
import * as Blog from "./blog";
import * as BackgroundScan from "./intelligence/background-scan";
import * as OfferResolve from "./intelligence/offer-resolve";

/**
 * The scheduled jobs, each carrying its own scheduler authorization so the
 * `/api/cron/*` handlers hold nothing but the response.
 *
 * Deliberately NOT a `"use server"` module: every export of one is reachable as
 * an RPC endpoint, which would put a second door on jobs that fan out over the
 * whole user base. These are plain context-wrapped functions, imported by the
 * route handlers and nothing else.
 */

// TEMPORARILY DISABLED, in both halves of the rail: the schedule is gone from
// `vercel.json`, so nothing invokes this, and the body short-circuits, so a
// hand-run `curl` against `/api/cron/scan` enqueues nothing either.
//
// To restore, undo both — delete the early return below, and put the entry
// back in `apps/web/vercel.json`:
//
//   { "path": "/api/cron/scan", "schedule": "0 3 * * *" }
//
// Note `/api/cron/drain` is still scheduled and still drains whatever is
// already pending; only the daily fan-out that fills that queue is off.
export const runDailyScan = withCron(
  async (_context, { limit = 20 }: { limit?: number } = {}) => {
    return { success: true, data: { disabled: true, limit } } as const;

    // biome-ignore lint/correctness/noUnreachable: temporary disable, see above
    return await BackgroundScan.runScanDaily(Environment.SERVER, { limit });
  },
  "Cron.runDailyScan",
);

export const reportDuePeriods = withCron(
  async (_context, { limit = 200 }: { limit?: number } = {}) =>
    await PerformanceFee.reportDuePeriods(Environment.SERVER, { limit }),
  "Cron.reportDuePeriods",
);

/**
 * Both automatic blog write paths share this tick: the backstop for the
 * BabyLoveGrowth webhook (`Blog.reconcileCatalog`) and posts kept as markdown
 * in the repo (`Blog.reconcileRepoPosts`). One ingest Azure-translates a whole
 * article and can take most of the route's `maxDuration`, so a tick spends
 * itself on one source at most: whichever wrote last goes second, and the
 * second runs only when the first had nothing to translate. Neither can hold
 * the schedule, since the one that just ingested yields the next tick.
 *
 * Same handoff as the drain: the tick returns immediately and the work
 * continues under `maxDuration`.
 */
export const reconcileBlogCatalog = withCron(
  async (_context, { limit = 1 }: { limit?: number } = {}) => {
    after(async () => {
      const writer = await resultify(() => Blog.lastWriter());
      const order =
        writer.success && writer.data === "repo"
          ? (["blg", "repo"] as const)
          : (["repo", "blg"] as const);

      const results: {
        blg?: Awaited<ReturnType<typeof Blog.reconcileCatalog>>;
        repo?: Awaited<ReturnType<typeof Blog.reconcileRepoPosts>>;
      } = {};

      for (const source of order) {
        const result =
          source === "blg"
            ? await Blog.reconcileCatalog({ limit })
            : await Blog.reconcileRepoPosts({ limit });
        Object.assign(results, { [source]: result });
        if (
          result.success &&
          result.data.ingested.length + result.data.partial.length > 0
        )
          break;
      }

      console.info("[cron/blog]", JSON.stringify({ order, ...results }));

      const { repo } = results;
      if (repo && !repo.success)
        Sentry.captureException(repo.error, { tags: { route: "cron/blog" } });
      // A merged post that does not go live is the one failure here nobody
      // would otherwise notice; orphaned rows are a choice, so they stay in
      // the log above.
      if (
        repo?.success &&
        repo.data.invalid.length +
          repo.data.failed.length +
          repo.data.partial.length >
          0
      )
        Sentry.captureMessage("Blog posts in content/blog need attention", {
          level: "warning",
          tags: { route: "cron/blog" },
          extra: {
            invalid: repo.data.invalid,
            failed: repo.data.failed,
            partial: repo.data.partial,
          },
        });
    });

    return { success: true, data: { scheduled: true } };
  },
  "Cron.reconcileBlogCatalog",
);

/**
 * Keeps measured competitor prices current. Same handoff as the drain: each
 * lookup is a network round trip to a paid provider, so a tick's batch runs far
 * past what the scheduler waits for.
 *
 * `limit` is the real cost throttle — a tick resolves at most this many
 * products, and raising the schedule frequency is the safe way to move more
 * volume. Entitlement is applied when selecting the batch, not only when
 * spending, so unentitled stores never occupy a slot.
 */
export const refreshOffers = withCron(
  async (_context, { limit = 25 }: { limit?: number } = {}) => {
    after(async () => {
      await OfferResolve.refreshDueOffers({ limit });
    });

    return { success: true, data: { scheduled: true } };
  },
  "Cron.refreshOffers",
);

export const drainPendingScans = withCron(
  async (_context, { limit = 1 }: { limit?: number } = {}) => {
    // Hand the tick back immediately and drain afterwards: a single scan runs
    // for minutes, far past what the scheduler waits for. The platform keeps
    // the function alive up to the route's `maxDuration` while this runs.
    after(async () => {
      await BackgroundScan.runPendingScans(Environment.SERVER, { limit });
    });

    return { success: true, data: { scheduled: true } };
  },
  "Cron.drainPendingScans",
);
