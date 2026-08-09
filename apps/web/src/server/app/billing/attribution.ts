"use server";

import { resultify } from "@zenncore/utils";
import { and, eq, gte, lt, ne, sql } from "drizzle-orm";
import { db, schema } from "../../database";
import { withContext, withInstrumentation } from "../../utils/context";
import { Environment } from "../../utils/environment";
import { DatabaseError } from "../../utils/error";
import { repository } from "../../utils/repository";
import * as Subscription from "../subscription";
import * as Tracking from "../tracking";

const WINDOW_DAYS = Number(
  process.env.PERFORMANCE_FEE_ATTRIBUTION_WINDOW_DAYS ?? "7",
);

const RATE_DEFAULT = Number(
  process.env.PERFORMANCE_FEE_RATE_BPS_DEFAULT ?? "300",
);

export const { create, find, update } = repository(schema.attributedConversion);

/**
 * Records an order as an AI-attributed conversion when we honestly can — ecentic
 * is not in the AI platform's checkout, so attribution relies only on signals we
 * actually see: an explicit `_ecentic_ai_ref` cart attribute the storefront
 * tracker stamped, or, failing that, a recent `*-referral` agent visit for the
 * store inside the attribution window. No signal → no fee. Idempotent on
 * (store, order) so a retried `orders/paid` webhook never double-counts.
 *
 * Only pay-as-you-go accounts accrue a fee (`performanceFeeEnabled`) — flat
 * subscription and free Scan accounts are never charged, so their orders are
 * ignored here.
 */
export const recordOrderIfAttributed = withContext(
  async (
    _,
    {
      store,
      user,
      orderExternalId,
      orderValueCents,
      currency,
      noteAttributes,
    }: {
      store: string;
      user: string;
      orderExternalId: string;
      orderValueCents: number;
      currency: string;
      noteAttributes: Record<string, string>;
    },
  ) => {
    const seen = await find(Environment.SERVER, {
      where: and(
        eq(schema.attributedConversion.storeId, store),
        eq(schema.attributedConversion.orderExternalId, orderExternalId),
      ),
      limit: 1,
    });
    if (!seen.success) return seen;
    if (seen.data[0]) return { success: true as const, data: seen.data[0] };

    // 1) Direct signal: cart attribute set by the storefront tracker.
    // biome-ignore lint/complexity/useLiteralKeys: Record index signature; TS requires bracket access
    const tagged = noteAttributes["_ecentic_ai_ref"] ?? null;

    // 2) Fallback signal: a recent referral visit for this store.
    const since = new Date(Date.now() - WINDOW_DAYS * 864e5);
    const recentVisit = await (async () => {
      if (tagged) return null;
      const visit = await Tracking.findRecentReferralVisit(Environment.SERVER, {
        store,
        since,
      });
      return visit.success ? visit.data : null;
    })();

    const agentType = tagged ?? recentVisit?.agentType ?? null;
    const method = tagged
      ? ("cart-attribute" as const)
      : recentVisit
        ? ("utm" as const)
        : null;
    if (!agentType || !method) return { success: true as const, data: null };

    const subscriptions = await Subscription.find(Environment.SERVER, {
      where: eq(schema.subscription.userId, user),
      limit: 1,
    });
    if (!subscriptions.success) return subscriptions;

    const subscription = subscriptions.data[0];
    if (!subscription?.performanceFeeEnabled)
      return { success: true as const, data: null };

    const rateBps = subscription.performanceFeeRateBps ?? RATE_DEFAULT;
    const feeCents = Math.round((orderValueCents * rateBps) / 10_000);

    return create(Environment.SERVER, {
      userId: user,
      storeId: store,
      orderExternalId,
      orderValueCents,
      currency,
      attributedAgentType: agentType,
      attributionMethod: method,
      visitId: recentVisit?.id ?? null,
      feeRateBps: rateBps,
      feeCents,
      billingStatus: "pending",
    });
  },
  "Attribution.recordOrderIfAttributed",
);

/**
 * Pre-cap fee accrued for a user in `[start, end)`. Sums every non-voided
 * conversion — not just `pending` ones — so the value is stable across the
 * multiple times the cron reports the running delta within a single period.
 */
export const sumFeesForPeriod = withInstrumentation(
  async (_, { user, start, end }: { user: string; start: Date; end: Date }) => {
    const rows = await resultify(async () =>
      db
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
        ),
    );

    if (!rows.success)
      return {
        success: false as const,
        error: new DatabaseError("Failed to sum attributed fees for period", {
          cause: rows.error,
        }),
      };

    return { success: true as const, data: Number(rows.data[0]?.total ?? 0) };
  },
  "Attribution.sumFeesForPeriod",
);

/**
 * Recent non-voided conversions in a period window, newest first — powers the
 * billing settings card's conversion list.
 */
export const listForPeriod = withInstrumentation(
  async (
    _,
    {
      user,
      start,
      end,
      limit = 20,
    }: { user: string; start: Date; end: Date; limit?: number },
  ) => {
    return find(Environment.SERVER, {
      where: and(
        eq(schema.attributedConversion.userId, user),
        ne(schema.attributedConversion.billingStatus, "voided"),
        gte(schema.attributedConversion.createdAt, start),
        lt(schema.attributedConversion.createdAt, end),
      ),
      orderBy: [
        { column: schema.attributedConversion.createdAt, direction: "desc" },
      ],
      limit,
    });
  },
  "Attribution.listForPeriod",
);

/**
 * Stamps every non-voided conversion in the window with the fee period and its
 * cap outcome: rows within the running cap become `reported`, the overflow
 * becomes `capped`. Ordered oldest-first so the cap fills chronologically.
 */
export const settleForPeriod = withInstrumentation(
  async (
    _,
    {
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
    },
  ) => {
    const rows = await find(Environment.SERVER, {
      where: and(
        eq(schema.attributedConversion.userId, user),
        ne(schema.attributedConversion.billingStatus, "voided"),
        gte(schema.attributedConversion.createdAt, start),
        lt(schema.attributedConversion.createdAt, end),
      ),
      orderBy: [
        { column: schema.attributedConversion.createdAt, direction: "asc" },
      ],
    });
    if (!rows.success) return rows;

    const now = new Date();
    const updates = rows.data.reduce(
      (accumulator, row) => {
        const cumulative = accumulator.cumulative + row.feeCents;
        const status = cumulative <= capCents ? "reported" : "capped";
        accumulator.promises.push(
          update(Environment.SERVER, row.id, {
            billingStatus: status,
            feePeriodId,
            updatedAt: now,
          }),
        );
        return { cumulative, promises: accumulator.promises };
      },
      {
        cumulative: 0,
        promises: [] as ReturnType<typeof update>[],
      },
    );

    const settled = await Promise.all(updates.promises);
    const failure = settled.find((result) => !result.success);
    if (failure && !failure.success) return failure;

    return { success: true as const, data: settled.length };
  },
  "Attribution.settleForPeriod",
);
