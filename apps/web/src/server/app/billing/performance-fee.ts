"use server";

import { and, asc, eq, gte, isNotNull, lt, ne, sql } from "drizzle-orm";
import { db, schema } from "../../database";
import { UserRole } from "../../database/validators";
import { withAuthentication } from "../../utils/authentication";
import { withAuthorization } from "../../utils/authorization";
import { withContext } from "../../utils/context";
import { Environment } from "../../utils/environment";
import { NotFoundError } from "../../utils/error";
import { repository } from "../../utils/repository";
import * as Shopify from "../integration/shopify";
import * as Subscription from "../subscription";

const RATE_DEFAULT = Number(
  process.env.PERFORMANCE_FEE_RATE_BPS_DEFAULT ?? "300",
);
const CAP_DEFAULT = Number(
  process.env.PERFORMANCE_FEE_CAP_CENTS_DEFAULT ?? "50000",
);

export const {
  create: createPeriod,
  update: updatePeriod,
  find: findPeriod,
  upsert: upsertPeriod,
} = repository(schema.feePeriod);

export type FeeConfig = {
  enabled: boolean;
  rateBps: number;
  capCents: number;
  /** null when the user has no subscription row (no rail to bill). */
  subscriptionId: string | null;
};

/**
 * Effective performance-fee configuration for a user: the per-subscription
 * override when set, otherwise the env defaults. `rateBps`/`capCents` are always
 * concrete numbers so callers can compute a fee without re-reading env; check
 * `enabled` (and `subscriptionId`) before actually charging.
 */
export const resolveFeeConfig = withContext(
  async (_, { user }: { user: string }) => {
    const rows = await Subscription.find(Environment.SERVER, {
      where: eq(schema.subscription.userId, user),
      limit: 1,
    });
    if (!rows.success) return rows;

    const row = rows.data[0];
    if (!row)
      return {
        success: true as const,
        data: {
          enabled: false,
          rateBps: RATE_DEFAULT,
          capCents: CAP_DEFAULT,
          subscriptionId: null,
        } satisfies FeeConfig,
      };

    return {
      success: true as const,
      data: {
        enabled: row.performanceFeeEnabled,
        rateBps: row.performanceFeeRateBps ?? RATE_DEFAULT,
        capCents: row.performanceFeeCapCents ?? CAP_DEFAULT,
        subscriptionId: row.id,
      } satisfies FeeConfig,
    };
  },
  "PerformanceFee.resolveFeeConfig",
);

/**
 * Pre-cap fee accrued for a user in `[start, end)`. Sums every non-voided
 * conversion — not just `pending` ones — so the value is stable across the
 * multiple times the cron reports the running delta within a single period
 * (once a conversion is stamped `reported`/`capped` it must still count toward
 * the cap). Refunds set `voided` and drop out here, lowering the accrual.
 */
export const accruedForPeriod = withContext(
  async (_, { user, start, end }: { user: string; start: Date; end: Date }) => {
    const rows = await db
      .select({
        total: sql<number>`coalesce(sum(${schema.attributedConversion.feeCents}), 0)`,
      })
      .from(schema.attributedConversion)
      .where(
        and(
          eq(schema.attributedConversion.userId, user),
          ne(schema.attributedConversion.billingStatus, "voided"),
          gte(schema.attributedConversion.createdAt, start),
          lt(schema.attributedConversion.createdAt, end),
        ),
      );

    return { success: true as const, data: Number(rows[0]?.total ?? 0) };
  },
  "PerformanceFee.accruedForPeriod",
);

export type PeriodSummary = {
  enabled: boolean;
  rateBps: number;
  capCents: number;
  accruedCents: number;
  billedCents: number;
  reportedCents: number;
  remainingCents: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  conversions: {
    id: string;
    orderExternalId: string;
    orderValueCents: number;
    currency: string;
    attributedAgentType: string;
    feeCents: number;
    createdAt: Date;
  }[];
};

/**
 * Current-period performance-fee summary for the signed-in user, powering the
 * billing settings card: accrual vs cap, effective rate, period end, and the
 * most recent attributed orders. The window is the Stripe subscription's
 * current period; with no active period there is nothing to bill and the
 * summary is empty.
 */
export const getCurrentPeriodSummary = withAuthentication(async (context) => {
  const user = context.session.user.id;

  const subscriptions = await Subscription.find(Environment.SERVER, {
    where: eq(schema.subscription.userId, user),
    limit: 1,
  });
  if (!subscriptions.success) return subscriptions;

  const subscription = subscriptions.data[0] ?? null;
  const rateBps = subscription?.performanceFeeRateBps ?? RATE_DEFAULT;
  const capCents = subscription?.performanceFeeCapCents ?? CAP_DEFAULT;
  const start = subscription?.currentPeriodStart ?? null;
  const end = subscription?.currentPeriodEnd ?? null;

  const empty: PeriodSummary = {
    enabled: subscription?.performanceFeeEnabled ?? false,
    rateBps,
    capCents,
    accruedCents: 0,
    billedCents: 0,
    reportedCents: 0,
    remainingCents: capCents,
    periodStart: start,
    periodEnd: end,
    conversions: [],
  };

  if (!subscription || !start || !end)
    return { success: true as const, data: empty };

  const accrued = await accruedForPeriod(Environment.SERVER, {
    user,
    start,
    end,
  });
  if (!accrued.success) return accrued;

  const period = await findPeriod(Environment.SERVER, {
    where: and(
      eq(schema.feePeriod.subscriptionId, subscription.id),
      eq(schema.feePeriod.periodStart, start),
    ),
    limit: 1,
  });
  if (!period.success) return period;

  const conversions = await db
    .select({
      id: schema.attributedConversion.id,
      orderExternalId: schema.attributedConversion.orderExternalId,
      orderValueCents: schema.attributedConversion.orderValueCents,
      currency: schema.attributedConversion.currency,
      attributedAgentType: schema.attributedConversion.attributedAgentType,
      feeCents: schema.attributedConversion.feeCents,
      createdAt: schema.attributedConversion.createdAt,
    })
    .from(schema.attributedConversion)
    .where(
      and(
        eq(schema.attributedConversion.userId, user),
        ne(schema.attributedConversion.billingStatus, "voided"),
        gte(schema.attributedConversion.createdAt, start),
        lt(schema.attributedConversion.createdAt, end),
      ),
    )
    .orderBy(sql`${schema.attributedConversion.createdAt} desc`)
    .limit(20);

  const billed = Math.min(accrued.data, capCents);

  return {
    success: true as const,
    data: {
      enabled: subscription.performanceFeeEnabled,
      rateBps,
      capCents,
      accruedCents: accrued.data,
      billedCents: billed,
      reportedCents: period.data[0]?.reportedCents ?? 0,
      remainingCents: Math.max(capCents - billed, 0),
      periodStart: start,
      periodEnd: end,
      conversions,
    } satisfies PeriodSummary,
  };
}, "PerformanceFee.getCurrentPeriodSummary");

/**
 * Admin-only override of a user's fee terms — the surface Enterprise contracts
 * negotiate against (custom rate/cap, or the fee toggled off entirely). Passing
 * `null` for rate/cap reverts that field to the env default.
 */
export const setConfig = withAuthorization(
  [UserRole.ADMIN],
  async (
    _,
    {
      user,
      enabled,
      rateBps = null,
      capCents = null,
    }: {
      user: string;
      enabled: boolean;
      rateBps?: number | null;
      capCents?: number | null;
    },
  ) => {
    const rows = await Subscription.find(Environment.SERVER, {
      where: eq(schema.subscription.userId, user),
      limit: 1,
    });
    if (!rows.success) return rows;

    const row = rows.data[0];
    if (!row)
      return {
        success: false as const,
        error: new NotFoundError("Subscription"),
      };

    return Subscription.update(Environment.SERVER, row.id, {
      performanceFeeEnabled: enabled,
      performanceFeeRateBps: rateBps,
      performanceFeeCapCents: capCents,
      updatedAt: new Date(),
    });
  },
  "PerformanceFee.setConfig",
);

/**
 * A user bills through Shopify when any of their stores carries an approved
 * capped usage line; otherwise through Stripe. Per-store usage lines mean a
 * user could in principle straddle both rails — we route to the first Shopify
 * store found, which is the common single-store case.
 */
const resolveRail = async (
  user: string,
): Promise<{ kind: "stripe" } | { kind: "shopify"; store: string }> => {
  const rows = await db
    .select({ id: schema.store.id })
    .from(schema.store)
    .where(
      and(
        eq(schema.store.userId, user),
        isNotNull(schema.store.shopifyUsageLineId),
      ),
    )
    .limit(1);

  const store = rows[0];
  if (store) return { kind: "shopify" as const, store: store.id };
  return { kind: "stripe" as const };
};

/**
 * Stamps every non-voided conversion in the window with the fee period and its
 * cap outcome: rows within the running cap become `reported`, the overflow
 * becomes `capped`. Ordered oldest-first so the cap fills chronologically. Both
 * states still count toward accrual — only `voided` (refunds) drops out.
 */
const settleConversions = async ({
  user,
  start,
  end,
  capCents,
  feePeriodId,
}: {
  user: string;
  start: Date;
  end: Date;
  capCents: number;
  feePeriodId: string;
}) => {
  const rows = await db
    .select({
      id: schema.attributedConversion.id,
      feeCents: schema.attributedConversion.feeCents,
    })
    .from(schema.attributedConversion)
    .where(
      and(
        eq(schema.attributedConversion.userId, user),
        ne(schema.attributedConversion.billingStatus, "voided"),
        gte(schema.attributedConversion.createdAt, start),
        lt(schema.attributedConversion.createdAt, end),
      ),
    )
    .orderBy(asc(schema.attributedConversion.createdAt));

  const now = new Date();
  const state = rows.reduce(
    (accumulator, row) => {
      const cumulative = accumulator.cumulative + row.feeCents;
      const status = cumulative <= capCents ? "reported" : "capped";
      accumulator.updates.push(
        db
          .update(schema.attributedConversion)
          .set({ billingStatus: status, feePeriodId, updatedAt: now })
          .where(eq(schema.attributedConversion.id, row.id)),
      );
      return { cumulative, updates: accumulator.updates };
    },
    { cumulative: 0, updates: [] as Promise<unknown>[] },
  );

  await Promise.all(state.updates);
};

/**
 * Reconciles one subscription's open period against its rail. Recomputes the
 * capped, billed amount, upserts the period row (preserving `reportedCents`),
 * reports only the not-yet-reported delta, then settles the conversions. Safe
 * to run repeatedly within a period — the delta is 0 once caught up.
 */
const closeSubscriptionPeriod = withContext(
  async (_, { subscription }: { subscription: Subscription.Type }) => {
    const start = subscription.currentPeriodStart;
    const end = subscription.currentPeriodEnd;
    if (!start || !end)
      return {
        success: true as const,
        data: { skipped: "no-period" as const },
      };

    const rateBps = subscription.performanceFeeRateBps ?? RATE_DEFAULT;
    const capCents = subscription.performanceFeeCapCents ?? CAP_DEFAULT;

    const accrued = await accruedForPeriod(Environment.SERVER, {
      user: subscription.userId,
      start,
      end,
    });
    if (!accrued.success) return accrued;

    if (accrued.data === 0)
      return {
        success: true as const,
        data: { skipped: "no-accrual" as const },
      };

    const rail = await resolveRail(subscription.userId);
    const billed = Math.min(accrued.data, capCents);

    const period = await upsertPeriod(
      Environment.SERVER,
      {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        periodStart: start,
        periodEnd: end,
        rateBps,
        capCents,
        accruedCents: accrued.data,
        billedCents: billed,
        rail: rail.kind,
      },
      {
        target: [schema.feePeriod.subscriptionId, schema.feePeriod.periodStart],
        set: {
          periodEnd: end,
          rateBps,
          capCents,
          accruedCents: accrued.data,
          billedCents: billed,
          rail: rail.kind,
          updatedAt: new Date(),
        },
      },
    );
    if (!period.success) return period;

    const reportedCents = period.data.reportedCents;
    const delta = billed - reportedCents;

    if (delta > 0) {
      const reported =
        rail.kind === "shopify"
          ? await Shopify.createUsageRecord(Environment.SERVER, {
              store: rail.store,
              cents: delta,
              description: `Ecentic AI-attributed performance fee (${new Date(
                start,
              )
                .toISOString()
                .slice(0, 10)})`,
            })
          : await Subscription.reportPerformanceUsage(Environment.SERVER, {
              customer: subscription.stripeCustomerId,
              quantityCents: delta,
            });
      if (!reported.success) return reported;

      const closedAt = end.getTime() <= Date.now() ? new Date() : null;
      const updated = await updatePeriod(Environment.SERVER, period.data.id, {
        reportedCents: billed,
        closedAt,
        updatedAt: new Date(),
      });
      if (!updated.success) return updated;
    }

    await settleConversions({
      user: subscription.userId,
      start,
      end,
      capCents,
      feePeriodId: period.data.id,
    });

    return {
      success: true as const,
      data: {
        accruedCents: accrued.data,
        billedCents: billed,
        reportedDeltaCents: Math.max(delta, 0),
        rail: rail.kind,
      },
    };
  },
  "PerformanceFee.closeSubscriptionPeriod",
);

/**
 * Period-close entrypoint for the billing cron. Walks every fee-enabled
 * subscription and reconciles its open period against the right rail. Reports
 * the running billed delta capped per period, so it is safe to run daily.
 */
export const reportDuePeriods = withContext(
  async (_, { limit = 200 }: { limit?: number } = {}) => {
    const subscriptions = await Subscription.find(Environment.SERVER, {
      where: eq(schema.subscription.performanceFeeEnabled, true),
      limit,
    });
    if (!subscriptions.success) return subscriptions;

    const outcomes = await Promise.all(
      subscriptions.data.map((subscription) =>
        closeSubscriptionPeriod(Environment.SERVER, { subscription }),
      ),
    );

    const reported = outcomes.filter(
      (outcome) => outcome.success && "billedCents" in outcome.data,
    ).length;

    return {
      success: true as const,
      data: { processed: subscriptions.data.length, reported },
    };
  },
  "PerformanceFee.reportDuePeriods",
);
