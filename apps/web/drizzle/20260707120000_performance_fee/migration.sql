-- Performance-fee pricing: an additive usage layer on top of the base plans.
-- Adds per-subscription fee config, a Shopify usage-line pointer on store, and
-- the two accounting tables (fee_period + attributed_conversion) the
-- attribution pipeline and period-close cron read/write.

ALTER TABLE "store" ADD COLUMN "shopifyUsageLineId" text;
--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "performanceFeeEnabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "performanceFeeRateBps" integer;
--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "performanceFeeCapCents" integer;
--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "stripePerformanceItemId" text;
--> statement-breakpoint
CREATE TABLE "fee_period" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"userId" text NOT NULL,
	"subscriptionId" text NOT NULL,
	"periodStart" timestamp NOT NULL,
	"periodEnd" timestamp NOT NULL,
	"rateBps" integer NOT NULL,
	"capCents" integer NOT NULL,
	"accruedCents" integer DEFAULT 0 NOT NULL,
	"billedCents" integer DEFAULT 0 NOT NULL,
	"reportedCents" integer DEFAULT 0 NOT NULL,
	"rail" text DEFAULT 'stripe' NOT NULL,
	"closedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attributed_conversion" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"userId" text NOT NULL,
	"storeId" text NOT NULL,
	"orderExternalId" text NOT NULL,
	"orderValueCents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"attributedAgentType" text NOT NULL,
	"attributionMethod" text NOT NULL,
	"visitId" text,
	"feeRateBps" integer NOT NULL,
	"feeCents" integer NOT NULL,
	"billingStatus" text DEFAULT 'pending' NOT NULL,
	"feePeriodId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fee_period" ADD CONSTRAINT "fee_period_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "fee_period" ADD CONSTRAINT "fee_period_subscriptionId_subscription_id_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "attributed_conversion" ADD CONSTRAINT "attributed_conversion_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "attributed_conversion" ADD CONSTRAINT "attributed_conversion_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "attributed_conversion" ADD CONSTRAINT "attributed_conversion_visitId_agent_visit_id_fkey" FOREIGN KEY ("visitId") REFERENCES "agent_visit"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "attributed_conversion" ADD CONSTRAINT "attributed_conversion_feePeriodId_fee_period_id_fkey" FOREIGN KEY ("feePeriodId") REFERENCES "fee_period"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "fee_period_sub_start_unique" ON "fee_period" USING btree ("subscriptionId","periodStart");
--> statement-breakpoint
CREATE INDEX "fee_period_user_idx" ON "fee_period" USING btree ("userId");
--> statement-breakpoint
CREATE UNIQUE INDEX "attributed_conversion_store_order_unique" ON "attributed_conversion" USING btree ("storeId","orderExternalId");
--> statement-breakpoint
CREATE INDEX "attributed_conversion_user_created_idx" ON "attributed_conversion" USING btree ("userId","createdAt");
--> statement-breakpoint
CREATE INDEX "attributed_conversion_period_idx" ON "attributed_conversion" USING btree ("feePeriodId");
