-- Production-readiness audit fixes (docs/integrations/overview.md):
-- Google's offer identity is the triplet (contentLanguage, feedLabel,
-- offerId) — keying on offerId alone collides across markets. `offerKey`
-- carries the full identity; `inputName` stores the productInput resource
-- name from the insert response so stale inputs can be deleted. Guards keep
-- it idempotent.

ALTER TABLE "google_merchant_offer"
  ADD COLUMN IF NOT EXISTS "offerKey" text;
--> statement-breakpoint
ALTER TABLE "google_merchant_offer"
  ADD COLUMN IF NOT EXISTS "inputName" text;
--> statement-breakpoint
UPDATE "google_merchant_offer"
  SET "offerKey" = coalesce("contentLanguage", '') || '~' || coalesce("feedLabel", '') || '~' || "offerId"
  WHERE "offerKey" IS NULL;
--> statement-breakpoint
ALTER TABLE "google_merchant_offer"
  ALTER COLUMN "offerKey" SET NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "google_merchant_offer_store_offer_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "google_merchant_offer_store_offerkey_unique"
  ON "google_merchant_offer" ("storeId", "offerKey");
