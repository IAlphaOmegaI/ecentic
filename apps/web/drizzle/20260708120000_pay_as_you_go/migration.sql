-- Pay-as-you-go billing: split the performance fee off into its own product,
-- superseding the additive-on-subscription model from 20260707120000.
--   * drop the unused metered-item pointer — the metered Stripe approach was
--     replaced by one-off invoices, so `stripePerformanceItemId` is dead;
--   * add subscription.billingMode ("payg" | "subscription"); existing rows are
--     flat Stripe subscriptions, so they default to "subscription";
--   * a PAYG account has no Stripe customer until the first fee is due, so
--     stripeCustomerId becomes nullable;
--   * fee_period.state tracks awaiting_payment / reported / uncollectible.
-- Guards make it idempotent regardless of whether an environment was still on
-- the additive schema or already reconciled.

ALTER TABLE "subscription" DROP COLUMN IF EXISTS "stripePerformanceItemId";
--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "billingMode" text DEFAULT 'subscription' NOT NULL;
--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "stripeCustomerId" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "fee_period" ADD COLUMN IF NOT EXISTS "state" text DEFAULT 'open' NOT NULL;
