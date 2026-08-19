-- Better Auth 1.7 keys external identities by (issuer, accountId).
-- Backfill maps each existing providerId to the issuer the 1.7 runtime
-- resolves for it: credential accounts use the synthetic local namespace,
-- Google uses its OIDC issuer, and Shopify (generic OAuth without discovery)
-- falls back to the synthetic OAuth namespace.
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "issuer" text;
--> statement-breakpoint
UPDATE "account" SET "issuer" = CASE "providerId"
  WHEN 'credential' THEN 'local:credential'
  WHEN 'google' THEN 'https://accounts.google.com'
  WHEN 'shopify' THEN 'local:oauth:shopify'
  ELSE 'local:oauth:' || "providerId"
END
WHERE "issuer" IS NULL;
--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "account_issuer_accountId_uidx" ON "account" ("issuer", "accountId");
