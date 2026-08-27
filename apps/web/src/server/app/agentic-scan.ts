"use server";

import { and, eq, inArray } from "drizzle-orm";
import { schema } from "../database";
import { dedupe } from "../utils/dedupe";
import { withSubscription } from "../utils/entitlement";
import { Environment } from "../utils/environment";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";
import {
  normalizeTarget,
  RUNNING_STALE_MS,
} from "./intelligence/agentic-contract";
import * as Store from "./store";

export const { get, create, update, destroy, find, exists, count } = repository(
  schema.agenticScan,
);

export type Type = Document<typeof schema.agenticScan>;

const isFresh = (scan: Type) =>
  Date.now() - scan.createdAt.getTime() < RUNNING_STALE_MS;

/**
 * Everything the page renders in one query: the newest completed scan, the run
 * in flight if there is one, the newest failure when it postdates the shown
 * scan, and the score history behind the trend. Scoped to the caller so a
 * guessed store id resolves to nothing.
 */
export const overviewForStore = dedupe(
  withSubscription(async (context, { store }: { store: string }) => {
    const record = await Store.resolveForUser(Environment.SERVER, { store });
    if (!record.success) return record;

    const result = await find(Environment.SERVER, {
      where: and(
        eq(schema.agenticScan.storeId, store),
        eq(schema.agenticScan.userId, context.session.user.id),
        // The table also holds competitor scans, so the store's own history is
        // the rows whose target is the store's own domain.
        eq(schema.agenticScan.target, normalizeTarget(record.data.domain)),
      ),
      orderBy: [
        { column: schema.agenticScan.createdAt, direction: "desc" as const },
      ],
      limit: 30,
    });
    if (!result.success) return result;

    const complete =
      result.data.find((scan) => scan.status === "complete" && scan.report) ??
      null;
    // A run still in flight, so the page can say so instead of showing the
    // previous scan as if it were current.
    const running =
      result.data.find((scan) => scan.status === "running" && isFresh(scan)) ??
      null;

    // Oldest-first, and only scans that produced a score — the trend is a line
    // through measurements, not through attempts.
    const history = result.data
      .filter((scan) => scan.status === "complete" && scan.score !== null)
      .map((scan) => ({
        score: scan.score as number,
        scannedAt: scan.createdAt,
      }))
      .reverse();

    return { success: true as const, data: { complete, running, history } };
  }, "AgenticScan.overviewForStore"),
);

/**
 * The newest completed scan for each of a set of domains — the competitor
 * comparison reads this rather than one query per domain. Domains the merchant
 * has never scanned simply have no entry.
 */
export const latestForTargets = dedupe(
  withSubscription(
    async (
      context,
      { store, targets }: { store: string; targets: readonly string[] },
    ) => {
      if (targets.length === 0)
        return { success: true as const, data: {} as Record<string, Type> };

      const result = await find(Environment.SERVER, {
        where: and(
          eq(schema.agenticScan.storeId, store),
          eq(schema.agenticScan.userId, context.session.user.id),
          eq(schema.agenticScan.status, "complete"),
          inArray(schema.agenticScan.target, [...targets]),
        ),
        orderBy: [
          { column: schema.agenticScan.createdAt, direction: "desc" as const },
        ],
        limit: 100,
      });
      if (!result.success) return result;

      // Rows arrive newest-first, so the first row seen for a domain is its
      // latest and later ones are history.
      const latest = result.data.reduce<Record<string, Type>>((carry, scan) => {
        if (!carry[scan.target] && scan.report) carry[scan.target] = scan;
        return carry;
      }, {});

      return { success: true as const, data: latest };
    },
    "AgenticScan.latestForTargets",
  ),
);
