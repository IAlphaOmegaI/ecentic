-- Merchant Center accounts visible to the connected Google login ({id, name}),
-- persisted so the settings UI can offer an account picker without an extra
-- accounts.list round-trip per page load. Guard keeps it idempotent.

ALTER TABLE "google_merchant_account"
  ADD COLUMN IF NOT EXISTS "candidateAccounts" jsonb;
