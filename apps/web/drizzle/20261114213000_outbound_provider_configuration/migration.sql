ALTER TABLE "outbound_provider_credential"
  ADD COLUMN IF NOT EXISTS "configuration" jsonb DEFAULT '{}'::jsonb NOT NULL;
