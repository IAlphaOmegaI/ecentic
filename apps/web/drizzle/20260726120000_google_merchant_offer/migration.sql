-- Spike-1 amendments (docs/integrations/google-merchant-center.md):
-- the primary data source's defaultRule must be patched to include our
-- supplemental source (auto-pickup does not happen), and pushed overrides get
-- an offer-level lifecycle (pending → live) verified asynchronously because
-- Google reprocesses lazily. Guards keep it idempotent.

ALTER TABLE "google_merchant_account"
  ADD COLUMN IF NOT EXISTS "primaryDataSourceName" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "google_merchant_offer" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "storeId" text NOT NULL REFERENCES "store"("id") ON DELETE CASCADE,
  "productId" text NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
  "offerId" text NOT NULL,
  "feedLabel" text,
  "contentLanguage" text,
  "attributesHash" text,
  "status" text NOT NULL DEFAULT 'pending',
  "error" text,
  "pushedAt" timestamp,
  "verifiedAt" timestamp,
  "lastUpdateDate" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "google_merchant_offer_store_idx"
  ON "google_merchant_offer" ("storeId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "google_merchant_offer_store_offer_unique"
  ON "google_merchant_offer" ("storeId", "offerId");
