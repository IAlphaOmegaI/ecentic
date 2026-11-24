-- Recharge-only DDL. Earlier hand-authored migrations already cover the unrelated
-- schema drift reported by Drizzle; their SQL is intentionally not repeated here.
CREATE TABLE "ai_order_attributions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"storeId" text NOT NULL,
	"shopifyOrderId" text NOT NULL,
	"rechargeOrderId" text,
	"marker" text NOT NULL,
	"subscriptionId" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"subscribedAt" timestamp,
	"cancelledAt" timestamp,
	"sourceUpdatedAt" timestamp,
	"orderedAt" timestamp NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "recharge_aggregates" (
	"storeId" text PRIMARY KEY,
	"aiFirstOrders" integer DEFAULT 0 NOT NULL,
	"convertedSubscriptions" integer DEFAULT 0 NOT NULL,
	"activeSubscriptions" integer DEFAULT 0 NOT NULL,
	"asOf" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "recharge_catalog_items" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"storeId" text NOT NULL,
	"externalId" text NOT NULL,
	"syncRunId" text NOT NULL,
	"data" jsonb NOT NULL
);--> statement-breakpoint
CREATE TABLE "recharge_checkout_intents" (
	"id" text PRIMARY KEY,
	"storeId" text NOT NULL,
	"generation" integer NOT NULL,
	"consumedOrderId" text,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "recharge_connections" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"storeId" text NOT NULL UNIQUE,
	"externalStoreId" text,
	"domain" text,
	"currency" text,
	"accessToken" text,
	"refreshToken" text,
	"accessTokenExpiresAt" timestamp,
	"scopes" jsonb DEFAULT '[]' NOT NULL,
	"status" text DEFAULT 'syncing' NOT NULL,
	"generation" integer DEFAULT 1 NOT NULL,
	"installedAt" timestamp DEFAULT now() NOT NULL,
	"uninstalledAt" timestamp,
	"lastSyncedAt" timestamp,
	"lastMaintenanceAt" timestamp,
	"error" text,
	"lease" text,
	"leaseUntil" timestamp,
	"nextRequestAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "recharge_installations" (
	"id" text PRIMARY KEY,
	"userId" text,
	"storeId" text,
	"code" text,
	"grant" text,
	"returnTo" text,
	"state" text DEFAULT 'pending' NOT NULL,
	"lease" text,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "recharge_jobs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"storeId" text NOT NULL,
	"generation" integer NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL UNIQUE,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"availableAt" timestamp DEFAULT now() NOT NULL,
	"lease" text,
	"error" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "recharge_offer_checks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"storeId" text NOT NULL,
	"offerId" text NOT NULL,
	"productId" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"surface" text NOT NULL,
	"country" text DEFAULT 'US' NOT NULL,
	"prompt" text NOT NULL,
	"expected" jsonb NOT NULL,
	"observed" jsonb,
	"evidence" text,
	"requestKey" text NOT NULL UNIQUE,
	"error" text,
	"checkedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "recharge_subscription_offers" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"storeId" text NOT NULL,
	"productId" text,
	"externalProductId" text NOT NULL,
	"externalVariantId" text DEFAULT '' NOT NULL,
	"planId" text NOT NULL,
	"sellingPlanId" text,
	"planType" text,
	"discountType" text,
	"discountValue" text,
	"price" text,
	"currency" text,
	"orderIntervalUnit" text,
	"orderIntervalFrequency" integer,
	"chargeIntervalFrequency" integer,
	"pricingStatus" text DEFAULT 'unavailable' NOT NULL,
	"unavailableReason" text,
	"syncRunId" text NOT NULL,
	"syncedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "recharge_attribution_identity" ON "ai_order_attributions" ("storeId","shopifyOrderId","subscriptionId");--> statement-breakpoint
CREATE INDEX "recharge_attribution_subscription" ON "ai_order_attributions" ("storeId","subscriptionId");--> statement-breakpoint
CREATE UNIQUE INDEX "recharge_catalog_identity" ON "recharge_catalog_items" ("storeId","externalId");--> statement-breakpoint
CREATE INDEX "recharge_intent_store" ON "recharge_checkout_intents" ("storeId");--> statement-breakpoint
CREATE INDEX "recharge_jobs_due" ON "recharge_jobs" ("status","availableAt");--> statement-breakpoint
CREATE INDEX "recharge_jobs_store" ON "recharge_jobs" ("storeId");--> statement-breakpoint
CREATE INDEX "recharge_checks_store_status" ON "recharge_offer_checks" ("storeId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "recharge_offer_identity" ON "recharge_subscription_offers" ("storeId","externalProductId","externalVariantId","planId");--> statement-breakpoint
CREATE INDEX "recharge_offer_product" ON "recharge_subscription_offers" ("storeId","productId");--> statement-breakpoint
ALTER TABLE "ai_order_attributions" ADD CONSTRAINT "ai_order_attributions_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recharge_aggregates" ADD CONSTRAINT "recharge_aggregates_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recharge_catalog_items" ADD CONSTRAINT "recharge_catalog_items_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recharge_checkout_intents" ADD CONSTRAINT "recharge_checkout_intents_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recharge_connections" ADD CONSTRAINT "recharge_connections_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recharge_installations" ADD CONSTRAINT "recharge_installations_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recharge_installations" ADD CONSTRAINT "recharge_installations_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recharge_jobs" ADD CONSTRAINT "recharge_jobs_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recharge_offer_checks" ADD CONSTRAINT "recharge_offer_checks_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recharge_offer_checks" ADD CONSTRAINT "recharge_offer_checks_9Z7Eri0MeCaO_fkey" FOREIGN KEY ("offerId") REFERENCES "recharge_subscription_offers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recharge_offer_checks" ADD CONSTRAINT "recharge_offer_checks_productId_product_id_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recharge_subscription_offers" ADD CONSTRAINT "recharge_subscription_offers_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recharge_subscription_offers" ADD CONSTRAINT "recharge_subscription_offers_productId_product_id_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE;
