"use server";

import { and, eq } from "drizzle-orm";
import { schema } from "../../database";
import { withContext } from "../../utils/context";
import { Environment } from "../../utils/environment";
import { repository } from "../../utils/repository";
import * as Tracking from "../tracking";
import { resolveFeeConfig } from "./performance-fee";

const WINDOW_DAYS = Number(
  process.env.PERFORMANCE_FEE_ATTRIBUTION_WINDOW_DAYS ?? "7",
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

    const config = await resolveFeeConfig(Environment.SERVER, { user });
    if (!config.success) return config;
    if (!config.data.enabled) return { success: true as const, data: null };

    const feeCents = Math.round(
      (orderValueCents * config.data.rateBps) / 10_000,
    );

    return create(Environment.SERVER, {
      userId: user,
      storeId: store,
      orderExternalId,
      orderValueCents,
      currency,
      attributedAgentType: agentType,
      attributionMethod: method,
      visitId: recentVisit?.id ?? null,
      feeRateBps: config.data.rateBps,
      feeCents,
      billingStatus: "pending",
    });
  },
  "Attribution.recordOrderIfAttributed",
);
