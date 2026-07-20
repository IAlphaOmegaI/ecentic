-- Store-scoped scans: a scan now judges one store's products instead of every
-- product on the account, so the run matches what the per-store dashboard page
-- implies. Legacy rows keep NULL storeId (account-wide runs) and stay readable.
-- Guards make the migration idempotent.

ALTER TABLE "scan" ADD COLUMN IF NOT EXISTS "storeId" text;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "scan" ADD CONSTRAINT "scan_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_store_idx" ON "scan" ("storeId");
