ALTER TABLE "outbound_inbox"
  ADD COLUMN IF NOT EXISTS "transport" text DEFAULT 'gmail-oauth' NOT NULL,
  ADD COLUMN IF NOT EXISTS "connection_version" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "app_password" text,
  ADD COLUMN IF NOT EXISTS "mailbox_checkpoint" jsonb;
