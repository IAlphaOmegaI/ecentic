/**
 * Creates the launch-promo coupon in Stripe.
 *
 *   cd apps/web && bun scripts/create-promo-coupon.ts
 *
 * The founding offer bills Compete at $99/mo instead of $149/mo for three
 * months, so the coupon is a fixed $50 off each of the first three invoices —
 * derived from `PROMOS`, never written twice. It is restricted to Compete's
 * product (a claimer who buys Dominate pays list) and capped at one redemption
 * in total, so Stripe enforces "one seat" even if the app ever handed the
 * coupon to a second customer.
 *
 * Idempotent: re-running finds the existing coupon and only reports it. Stripe
 * coupon terms are immutable, so when an existing coupon disagrees with the
 * terms below the script refuses rather than pretending it matched — delete the
 * coupon in Stripe (or change `couponId` in `server/utils/stripe.ts`) and
 * re-run.
 */

import { loadEnvConfig } from "@next/env";
import { discountCents, PLANS, PROMOS, stripe } from "@/server/utils/stripe";

loadEnvConfig(process.cwd());

const key = "founding" as const;
const promo = PROMOS[key];
const amountOff = discountCents(key);

const money = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

// Annotated on the variable, not the arrow: TypeScript only narrows past a
// never-returning call when the declaration carries an explicit type.
const fail: (message: string) => never = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

const priceId = PLANS[promo.plan].priceId();
if (!priceId)
  fail(
    `STRIPE_SUB_${promo.plan.toUpperCase()} is not set — the coupon has no product to attach to.`,
  );

const client = stripe();

// The coupon is restricted by product, not price, so it survives a price change
// (a new price under the same product keeps working).
const price = await client.prices.retrieve(priceId);
const product =
  typeof price.product === "string" ? price.product : price.product.id;

const existing = await (async () => {
  try {
    return await client.coupons.retrieve(promo.couponId);
  } catch {
    return null;
  }
})();

if (existing) {
  const drift = [
    existing.amount_off === amountOff
      ? null
      : `amount_off is ${money(existing.amount_off ?? 0)}, expected ${money(amountOff)}`,
    existing.duration === "repeating"
      ? null
      : `duration is "${existing.duration}", expected "repeating"`,
    existing.duration_in_months === promo.months
      ? null
      : `duration_in_months is ${existing.duration_in_months}, expected ${promo.months}`,
    existing.currency === promo.currency
      ? null
      : `currency is "${existing.currency}", expected "${promo.currency}"`,
  ].filter((entry) => entry !== null);

  if (drift.length > 0)
    fail(
      `Coupon "${promo.couponId}" already exists with different terms:\n  - ${drift.join("\n  - ")}\nStripe coupons are immutable — delete it or use a new id.`,
    );

  console.log(`✓ Coupon "${promo.couponId}" already exists and matches.`);
  console.log(
    `  redeemed ${existing.times_redeemed}/${existing.max_redemptions ?? "∞"}`,
  );
  console.log(`\nSTRIPE_PROMO_COUPON_FOUNDING=${promo.couponId}`);
  process.exit(0);
}

const coupon = await client.coupons.create({
  id: promo.couponId,
  name: `${promo.name} — ${money(promo.claimedCents)}/mo for ${promo.months} months`,
  amount_off: amountOff,
  currency: promo.currency,
  duration: "repeating",
  duration_in_months: promo.months,
  // Stripe's own backstop for the single seat the app hands out.
  max_redemptions: 1,
  applies_to: { products: [product] },
  metadata: { promo: key, plan: promo.plan },
});

console.log(`✓ Created coupon "${coupon.id}"`);
console.log(
  `  ${money(amountOff)} off each of the first ${promo.months} invoices — ${money(promo.listCents)} → ${money(promo.claimedCents)}/mo`,
);
console.log(`  restricted to product ${product} (${PLANS[promo.plan].name})`);
console.log("  max redemptions: 1");
console.log(
  `\nAdd to your environment:\n\nSTRIPE_PROMO_COUPON_FOUNDING=${coupon.id}`,
);
