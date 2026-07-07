import Stripe from "stripe";

let cached: Stripe | undefined;

export const stripe = (): Stripe => {
  if (cached) return cached;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe is not configured");

  cached = new Stripe(secretKey, {
    typescript: true,
  });
  return cached;
};

export const PLANS = {
  compete: {
    name: "Compete",
    priceId: () => process.env.STRIPE_SUB_COMPETE,
  },
  dominate: {
    name: "Dominate",
    priceId: () => process.env.STRIPE_SUB_DOMINATE,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export const isPlanKey = (value: string): value is PlanKey =>
  value === "compete" || value === "dominate";

/**
 * Metered price for the AI-attributed performance fee, backed by a Stripe
 * Billing Meter. Reporting a meter event of `value = fee in cents` against a
 * $0.01-per-unit price charges exactly that many cents. Both env vars are unset
 * until the meter + price are created in Stripe, which keeps the fee dark: no
 * metered line is attached at checkout and nothing is ever reported.
 */
export const PERFORMANCE_FEE = {
  eventName: () => process.env.STRIPE_METER_PERFORMANCE_FEE_EVENT,
  priceId: () => process.env.STRIPE_PRICE_PERFORMANCE_FEE,
} as const;

export const resolvePlanByPriceId = (priceId: string): PlanKey | null => {
  if (priceId === process.env.STRIPE_SUB_COMPETE) return "compete";
  if (priceId === process.env.STRIPE_SUB_DOMINATE) return "dominate";
  return null;
};

/**
 * Partner deal coupons. Each `coupon()` resolves a Stripe coupon id that
 * encodes the discount terms (e.g. 50% off for 24 months). Create the coupon
 * in Stripe, then point the env var at its id.
 */
export const DEALS = {
  ycombinator: {
    name: "Y Combinator",
    coupon: () => process.env.STRIPE_DEAL_COUPON_YC,
  },
  techstars: {
    name: "Techstars",
    coupon: () => process.env.STRIPE_DEAL_COUPON_TECHSTARS,
  },
} as const;

export type DealKey = keyof typeof DEALS;

export const isDealKey = (value: string): value is DealKey =>
  value === "ycombinator" || value === "techstars";
