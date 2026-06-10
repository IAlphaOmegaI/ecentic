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

export const resolvePlanByPriceId = (priceId: string): PlanKey | null => {
  if (priceId === process.env.STRIPE_SUB_COMPETE) return "compete";
  if (priceId === process.env.STRIPE_SUB_DOMINATE) return "dominate";
  return null;
};
