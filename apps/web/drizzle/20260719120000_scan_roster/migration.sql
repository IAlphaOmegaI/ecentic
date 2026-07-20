-- Per-scan roster: the products and competitors picked before the run starts.
-- NULL means "everything" — all of the store's products / all currently
-- selected competitors, resolved at drain time (cron scans and legacy rows).
-- Guards make the migration idempotent.

ALTER TABLE "scan" ADD COLUMN IF NOT EXISTS "productIds" jsonb;
--> statement-breakpoint
ALTER TABLE "scan" ADD COLUMN IF NOT EXISTS "competitorIds" jsonb;
