ALTER TABLE "outbound_inbox" ADD COLUMN IF NOT EXISTS "activation_requested_at" timestamp;
ALTER TABLE "outbound_inbox" ADD COLUMN IF NOT EXISTS "activation_connection_version" integer;
