-- Product-level competitor offers.
--
-- Hand-written, like every migration since 20260602204248: `bun run db:generate`
-- is blocked by the journal defects in plans/012-migration-journal-repair.md.
-- Every statement is idempotent so a partial apply can be re-run.

-- Identifiers on our own catalog. Not a provider lookup key (none of them accept
-- a GTIN) but the hard gate on Google's price-benchmark reports.
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "gtin" text;
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "mpn" text;
--> statement-breakpoint

-- Offer fields on the roster. All nullable: every existing row is a store-wide
-- rival and stays exactly as it is.
ALTER TABLE "competitor" ADD COLUMN IF NOT EXISTS "productId" text;
--> statement-breakpoint
ALTER TABLE "competitor" ADD COLUMN IF NOT EXISTS "priceAmount" numeric;
--> statement-breakpoint
ALTER TABLE "competitor" ADD COLUMN IF NOT EXISTS "sellerDomain" text;
--> statement-breakpoint
ALTER TABLE "competitor" ADD COLUMN IF NOT EXISTS "measuredAt" timestamp;
--> statement-breakpoint
ALTER TABLE "competitor" ADD COLUMN IF NOT EXISTS "confidence" text;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "competitor" ADD CONSTRAINT "competitor_productId_product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitor_product_idx" ON "competitor" USING btree ("productId");
--> statement-breakpoint

-- One offer per seller per product. Partial, because store-wide rivals
-- (productId IS NULL) legitimately repeat — several model-sourced rows can name
-- the same brand. Existing rows all have a null productId, so this cannot
-- conflict with anything already stored.
CREATE UNIQUE INDEX IF NOT EXISTS "competitor_product_seller_unique" ON "competitor" USING btree ("storeId","productId","sellerDomain") WHERE "productId" is not null and "sellerDomain" is not null;
--> statement-breakpoint

-- The observation history. `competitorId` is ON DELETE SET NULL rather than
-- CASCADE on purpose: dropping a rival from the roster must not erase the price
-- series that justified adding it.
CREATE TABLE IF NOT EXISTS "competitor_offer" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"userId" text NOT NULL,
	"storeId" text NOT NULL,
	"productId" text NOT NULL,
	"competitorId" text,
	"sellerDomain" text,
	"seller" text,
	"title" text,
	"priceAmount" numeric,
	"currency" text,
	"shipping" numeric,
	"total" numeric,
	"offerUrl" text,
	"imageUrl" text,
	"rating" numeric,
	"reviews" integer,
	"position" integer,
	"provider" text,
	"raw" jsonb,
	"measuredAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "competitor_offer" ADD CONSTRAINT "competitor_offer_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "competitor_offer" ADD CONSTRAINT "competitor_offer_storeId_store_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "competitor_offer" ADD CONSTRAINT "competitor_offer_productId_product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "competitor_offer" ADD CONSTRAINT "competitor_offer_competitorId_competitor_id_fk" FOREIGN KEY ("competitorId") REFERENCES "public"."competitor"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitor_offer_product_measured_idx" ON "competitor_offer" USING btree ("productId","measuredAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitor_offer_store_measured_idx" ON "competitor_offer" USING btree ("storeId","measuredAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitor_offer_seller_idx" ON "competitor_offer" USING btree ("sellerDomain");
--> statement-breakpoint

-- Spend ledger. Rows are written for misses too: a lookup that returned nothing
-- still cost a search, and the miss rate is what decides whether the feature
-- earns its bill.
CREATE TABLE IF NOT EXISTS "offer_usage" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"userId" text NOT NULL,
	"storeId" text NOT NULL,
	"productId" text,
	"provider" text NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	"cached" boolean DEFAULT false NOT NULL,
	"outcome" text NOT NULL,
	"offerCount" integer DEFAULT 0 NOT NULL,
	"milliseconds" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "offer_usage" ADD CONSTRAINT "offer_usage_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "offer_usage" ADD CONSTRAINT "offer_usage_storeId_store_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "offer_usage" ADD CONSTRAINT "offer_usage_productId_product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offer_usage_store_created_idx" ON "offer_usage" USING btree ("storeId","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offer_usage_user_idx" ON "offer_usage" USING btree ("userId");
--> statement-breakpoint

-- Note: the `simulation` dedupe and its `simulation_pair_unique` index are NOT
-- here. They landed separately in 20260901120000_simulation_pair_unique, which
-- this migration is ordered after — the only statement in this feature that
-- touches existing rows is already applied by the time these tables appear.
