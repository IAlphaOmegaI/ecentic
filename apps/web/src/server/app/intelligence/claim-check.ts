"use server";

import { resultify } from "@zenncore/utils";
import { and, eq, gte, sql } from "drizzle-orm";
import { after } from "next/server";
import { db, schema, withTransaction } from "../../database";
import { withSubscription } from "../../utils/entitlement";
import { Environment } from "../../utils/environment";
import { ConflictError, NotFoundError } from "../../utils/error";
import {
  type Document,
  repository,
  resultifyRead,
} from "../../utils/repository";
import * as Product from "../product";
import * as Store from "../store";
import { runClaimCheck } from "./claim-check-engine";
import { snapshotListing } from "./claim-check-rules";

// Private on purpose: exporting the repository from a `"use server"` module
// would hand the client unauthenticated create/update actions. Every exported
// action below is session-, billing- and ownership-checked.
const ClaimChecks = repository(schema.claimCheck);

type Row = Document<typeof schema.claimCheck>;

/**
 * A `running` row older than this is a dead run — its `after()` continuation
 * was killed — not one in flight. Comfortably past the engine's own run budget
 * (240s) and the route's 300s `maxDuration`, so a live run is never expired.
 */
const RUNNING_STALE_MS = 6 * 60 * 1000;

/** Runs per store per rolling day: each one is ~6 model calls and page reads. */
const DAILY_RUN_CAP = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRED = "expired";

const isFresh = (row: Pick<Row, "createdAt">) =>
  Date.now() - row.createdAt.getTime() < RUNNING_STALE_MS;

/** Postgres `unique_violation`, wherever the driver and ORM nested it. */
const isUniqueViolation = (error: unknown, depth = 0): boolean => {
  if (!error || typeof error !== "object" || depth > 4) return false;
  if ((error as { code?: unknown }).code === "23505") return true;
  return isUniqueViolation((error as { cause?: unknown }).cause, depth + 1);
};

const ownedProduct = async (user: string, store: string, product: string) => {
  const result = await Product.get(Environment.SERVER, product);
  if (!result.success) return result;
  if (
    !result.data ||
    result.data.userId !== user ||
    result.data.storeId !== store
  )
    return {
      success: false as const,
      error: new NotFoundError("Product not found"),
    };
  return { success: true as const, data: result.data };
};

const runningFor = (product: string) =>
  ClaimChecks.find(Environment.SERVER, {
    where: and(
      eq(schema.claimCheck.productId, product),
      eq(schema.claimCheck.status, "running"),
    ),
    limit: 1,
  });

type Settlement = Partial<typeof schema.claimCheck.$inferInsert>;

/**
 * Moves a run out of `running` — and only out of `running`. A completion that
 * lands after its run was expired cannot resurrect it, and an expiry cannot
 * overwrite a completion that beat it.
 */
const settle = (id: string, data: Settlement) =>
  resultify(async () =>
    db
      .update(schema.claimCheck)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(schema.claimCheck.id, id),
          eq(schema.claimCheck.status, "running"),
        ),
      )
      .returning({ id: schema.claimCheck.id }),
  );

/** One retry: a report minutes in the making should survive a dropped connection. */
const settleOrRetry = async (id: string, data: Settlement) => {
  const first = await settle(id, data);
  if (first.success) return first;
  return settle(id, data);
};

type Admission = { kind: "created"; run: Row } | { kind: "limit" };

/**
 * Counts today's runs and inserts the new one under a per-store advisory lock,
 * so the daily cap holds against concurrent starts on different products (the
 * unique index only guards one product). The lock is transaction-scoped, which
 * the pooled connection supports.
 */
const admit = (userId: string, storeId: string, productId: string) =>
  resultify(() =>
    withTransaction(async (tx): Promise<Admission> => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`claim-check:${storeId}`}))`,
      );
      const today = await ClaimChecks.count(
        Environment.SERVER,
        and(
          eq(schema.claimCheck.storeId, storeId),
          gte(schema.claimCheck.createdAt, new Date(Date.now() - DAY_MS)),
        ),
        { tx },
      );
      if (!today.success) throw today.error;
      if (today.data >= DAILY_RUN_CAP) return { kind: "limit" };

      const created = await ClaimChecks.create(
        Environment.SERVER,
        { userId, storeId, productId, status: "running" },
        { tx },
      );
      if (!created.success) throw created.error;
      return { kind: "created", run: created.data };
    }),
  );

/**
 * Starts a claim check for one product and returns at once with the run id.
 * The check itself (live page, ~6 model calls, a few page reads — a minute or
 * two) continues via `after()`, so the merchant can leave the page; the row
 * flips to `complete`/`failed` when it lands and the page polls {@link status}.
 *
 * The insert is the lock: a partial unique index allows one `running` row per
 * product, so a double click returns the run already in flight instead of
 * paying for a second.
 */
export const start = withSubscription(
  async (
    context,
    { store: storeId, product: productId }: { store: string; product: string },
  ) => {
    const userId = context.session.user.id;

    const product = await ownedProduct(userId, storeId, productId);
    if (!product.success) return product;

    const store = await Store.get(Environment.SERVER, storeId);
    if (!store.success) return store;
    if (!store.data || store.data.userId !== userId)
      return {
        success: false as const,
        error: new NotFoundError("Store not found"),
      };

    const running = await runningFor(productId);
    if (!running.success) return running;
    const [inFlight] = running.data;
    if (inFlight && isFresh(inFlight))
      return {
        success: true as const,
        data: { run: inFlight.id, alreadyRunning: true },
      };
    if (inFlight) {
      const expired = await settle(inFlight.id, {
        status: "failed",
        error: EXPIRED,
      });
      if (!expired.success) return expired;
    }

    const admitted = await admit(userId, storeId, productId);
    if (!admitted.success) {
      if (!isUniqueViolation(admitted.error)) return admitted;
      // Lost the race to a concurrent start: report the run that won.
      const winner = await runningFor(productId);
      if (!winner.success) return winner;
      const [current] = winner.data;
      if (!current) return admitted;
      return {
        success: true as const,
        data: { run: current.id, alreadyRunning: true },
      };
    }
    if (admitted.data.kind === "limit")
      return {
        success: false as const,
        error: new ConflictError(
          `This store has run ${DAILY_RUN_CAP} claim checks in the last 24 hours. Try again later.`,
        ),
      };

    const run = admitted.data.run;
    const storeRecord = store.data;

    after(async () => {
      const report = await resultify(() =>
        runClaimCheck({
          product: product.data,
          store: {
            domain: storeRecord.domain,
            storefrontHosts: storeRecord.storefrontHosts,
          },
          startedAt: run.createdAt,
        }),
      );
      const completedAt = new Date();

      if (!report.success) {
        await settleOrRetry(run.id, {
          status: "failed",
          error: report.error.message.slice(0, 500),
          completedAt,
        });
        return;
      }

      const { summary } = report.data;
      await settleOrRetry(run.id, {
        status: "complete",
        report: report.data,
        claims: summary.claims,
        verified: summary.verified,
        contradicted: summary.contradicted,
        divergent: summary.divergent,
        completedAt,
      });
    });

    return {
      success: true as const,
      data: { run: run.id, alreadyRunning: false },
    };
  },
  "ClaimCheck.start",
);

/**
 * Everything the claims page renders, in three narrow reads: the product, the
 * latest completed report, and the newest run of any status. Querying the
 * completed report directly — not searching the last N runs for one — keeps a
 * streak of failures from hiding the last good report.
 */
export const overviewForProduct = withSubscription(
  async (context, { store, product }: { store: string; product: string }) => {
    const userId = context.session.user.id;

    const owned = await ownedProduct(userId, store, product);
    if (!owned.success) return owned;

    const scope = and(
      eq(schema.claimCheck.productId, product),
      eq(schema.claimCheck.userId, userId),
    );
    const newestFirst = [
      { column: schema.claimCheck.createdAt, direction: "desc" as const },
    ];

    const [complete, latest] = await Promise.all([
      ClaimChecks.find(Environment.SERVER, {
        where: and(scope, eq(schema.claimCheck.status, "complete")),
        orderBy: newestFirst,
        limit: 1,
      }),
      ClaimChecks.find(Environment.SERVER, {
        where: scope,
        orderBy: newestFirst,
        limit: 1,
      }),
    ]);
    if (!complete.success) return complete;
    if (!latest.success) return latest;

    const [report] = complete.data;
    const [newest] = latest.data;

    const running =
      newest?.status === "running" && isFresh(newest) ? newest : null;
    const failed =
      newest &&
      (newest.status === "failed" ||
        (newest.status === "running" && !isFresh(newest))) &&
      (!report || newest.createdAt > report.createdAt)
        ? newest
        : null;

    return {
      success: true as const,
      data: {
        product: {
          id: owned.data.id,
          title: owned.data.title,
          url: owned.data.url,
        },
        complete:
          report?.report != null
            ? {
                id: report.id,
                report: report.report,
                completedAt: report.completedAt ?? report.updatedAt,
                // The report judged the listing as it was when the run began;
                // say so when the catalog has moved on since.
                listingChanged:
                  report.report.listing.hash !==
                  snapshotListing(owned.data).hash,
              }
            : null,
        running: running
          ? { id: running.id, startedAt: running.createdAt }
          : null,
        failed: failed
          ? {
              id: failed.id,
              expired: failed.status === "running" || failed.error === EXPIRED,
              error: failed.error === EXPIRED ? null : failed.error,
            }
          : null,
      },
    };
  },
  "ClaimCheck.overviewForProduct",
);

/**
 * Poll target for the in-progress banner: one run's state, without the
 * report, so polling every few seconds never ships the jsonb.
 */
export const status = withSubscription(
  async (context, { run }: { run: string }) => {
    const result = await resultifyRead(async () =>
      db
        .select({
          status: schema.claimCheck.status,
          userId: schema.claimCheck.userId,
          createdAt: schema.claimCheck.createdAt,
        })
        .from(schema.claimCheck)
        .where(eq(schema.claimCheck.id, run))
        .limit(1),
    );
    if (!result.success) return result;

    const [row] = result.data;
    if (!row || row.userId !== context.session.user.id)
      return {
        success: false as const,
        error: new NotFoundError("Claim check not found"),
      };

    const state =
      row.status === "running" && !isFresh(row) ? "failed" : row.status;
    return { success: true as const, data: state };
  },
  "ClaimCheck.status",
);
