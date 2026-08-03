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

/**
 * Flat subscription tiers, cheapest first. `Dominate` is the top tier and the
 * one partner deals are written against — the /yc page promises "extended
 * ecentic Dominate" by name, so renaming it breaks a published commitment.
 * `Scale` carries what Dominate used to at the old price point.
 */
export const PLANS = {
  compete: {
    name: "Compete",
    priceId: () => process.env.STRIPE_SUB_COMPETE,
  },
  scale: {
    name: "Scale",
    priceId: () => process.env.STRIPE_SUB_SCALE,
  },
  dominate: {
    name: "Dominate",
    priceId: () => process.env.STRIPE_SUB_DOMINATE,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export const isPlanKey = (value: string): value is PlanKey =>
  value === "compete" || value === "scale" || value === "dominate";

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
  if (priceId === process.env.STRIPE_SUB_SCALE) return "scale";
  if (priceId === process.env.STRIPE_SUB_DOMINATE) return "dominate";
  return null;
};

/**
 * Partner deal coupons. Each `coupon()` resolves a Stripe coupon id; the terms
 * are encoded in that Stripe object and nowhere else. Create the coupon in
 * Stripe, then point the env var at its id.
 *
 * Deliberately not restated here. The previous version of this comment read
 * "50% off for 24 months" while `yc-student-deal` was in fact 50% off for 12,
 * and a stale figure in a comment is one copy-paste away from being quoted to a
 * founder as a commitment. Read the terms from Stripe.
 *
 * `plan` is the tier the deal was sold against — both partner pages promise
 * "extended ecentic Dominate" by name. The matching Stripe coupons are
 * restricted to that product, and Stripe rejects a checkout whose line item the
 * coupon does not cover, so the redemption is only applied when the founder
 * picks that tier. Without this gate a YC founder choosing Compete would hit a
 * hard checkout error instead of simply paying list price.
 */
export const DEALS = {
  ycombinator: {
    name: "Y Combinator",
    plan: "dominate",
    coupon: () => process.env.STRIPE_DEAL_COUPON_YC,
  },
  techstars: {
    name: "Techstars",
    plan: "dominate",
    coupon: () => process.env.STRIPE_DEAL_COUPON_TECHSTARS,
  },
} as const satisfies Record<
  string,
  { name: string; plan: PlanKey; coupon: () => string | undefined }
>;

export type DealKey = keyof typeof DEALS;

export const isDealKey = (value: string): value is DealKey =>
  value === "ycombinator" || value === "techstars";
