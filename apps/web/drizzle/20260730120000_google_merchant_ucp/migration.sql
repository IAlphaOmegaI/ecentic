-- Google UCP agentic checkout (docs/integrations/google-ucp.md): per-product
-- checkout eligibility + consumer notice + checkout item-id mapping, pushed to
-- Google as customAttributes through the existing supplemental data source.
-- A row is an explicit merchant choice; absence means nothing is pushed.
-- Guards keep it idempotent.

CREATE TABLE IF NOT EXISTS "google_merchant_ucp" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "storeId" text NOT NULL REFERENCES "store"("id") ON DELETE CASCADE,
  "productId" text NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
  "checkoutEligible" boolean NOT NULL DEFAULT false,
  "noticeType" text,
  "noticeMessage" text,
  "merchantItemId" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "google_merchant_ucp_store_idx"
  ON "google_merchant_ucp" ("storeId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "google_merchant_ucp_store_product_unique"
  ON "google_merchant_ucp" ("storeId", "productId");
