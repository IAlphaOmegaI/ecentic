-- Google Merchant Center link state + merchant-consent OAuth credentials,
-- 1:1 with "store" (mirrors "store_account"). See
-- docs/integrations/google-merchant-center.md. Guards keep it idempotent.

CREATE TABLE IF NOT EXISTS "google_merchant_account" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "storeId" text NOT NULL UNIQUE REFERENCES "store"("id") ON DELETE CASCADE,
  "accessToken" text,
  "accessTokenExpiresAt" timestamp,
  "refreshToken" text,
  "scope" text,
  "googleAccountId" text,
  "linkState" text NOT NULL DEFAULT 'unlinked',
  "path" text NOT NULL DEFAULT 'native',
  "dataSourceName" text,
  "feedLabel" text,
  "contentLanguage" text,
  "tosVersion" text,
  "tosAcceptedAt" timestamp,
  "lastDiagnosticsAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
