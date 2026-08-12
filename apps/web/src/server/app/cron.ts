import { after } from "next/server";
import { withCron } from "@/server/utils/cron";
import { Environment } from "@/server/utils/environment";
import * as PerformanceFee from "./billing/performance-fee";
import * as Blog from "./blog";
import * as BackgroundScan from "./intelligence/background-scan";

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
 * Backstop for the BabyLoveGrowth webhook. Same handoff as the drain: a single
 * ingest Azure-translates a whole article and runs past what the scheduler
 * waits for, so the tick returns immediately and the work continues under the
 * route's `maxDuration`.
 */
export const reconcileBlogCatalog = withCron(
  async (_context, { limit = 1 }: { limit?: number } = {}) => {
    after(async () => {
      await Blog.reconcileCatalog({ limit });
    });

    return { success: true, data: { scheduled: true } };
  },
  "Cron.reconcileBlogCatalog",
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
