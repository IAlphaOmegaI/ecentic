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
 * Which billing product an account is on. `subscription` = a flat Stripe plan
 * (Compete/Dominate, no fee); `payg` = pay-as-you-go (free to start, billed only
 * via the performance fee). Free Scan users have no billing row.
 */
export type BillingMode = "payg" | "subscription";

export const isBillingMode = (value: string): value is BillingMode =>
  value === "payg" || value === "subscription";

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

/**
 * Launch promos. A partner DEAL is open to every verified member of its program;
 * a promo is a *single seat* — the first email to claim it takes it and nobody
 * else ever can (see `server/app/promo-claim.ts`).
 *
 * Everything the offer needs lives here so the checkout discount, the claim
 * page's copy, and `scripts/create-promo-coupon.ts` cannot drift apart: the
 * script derives the coupon's amount from these prices, and `plan` is the only
 * plan the discount applies to — a claimer who buys Dominate instead pays list.
 *
 * `coupon()` resolves the Stripe coupon id; unset disables the promo, so the
 * coupon must exist in Stripe before the env var is set.
 */
export const PROMOS = {
  founding: {
    name: "Founding offer",
    plan: "compete",
    couponId: "founding-99-3mo",
    listCents: 14_900,
    claimedCents: 9_900,
    months: 3,
    currency: "usd",
    coupon: () => process.env.STRIPE_PROMO_COUPON_FOUNDING,
  },
} as const satisfies Record<
  string,
  {
    name: string;
    plan: PlanKey;
    couponId: string;
    listCents: number;
    claimedCents: number;
    months: number;
    currency: string;
    coupon: () => string | undefined;
  }
>;

export type PromoKey = keyof typeof PROMOS;

export const isPromoKey = (value: string): value is PromoKey =>
  value === "founding";

/** Fixed amount Stripe takes off each discounted invoice, in cents. */
export const discountCents = (promo: PromoKey): number =>
  PROMOS[promo].listCents - PROMOS[promo].claimedCents;
