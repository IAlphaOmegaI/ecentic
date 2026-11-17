CREATE TABLE IF NOT EXISTS "outbound_conversation" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "prospect_id" text NOT NULL REFERENCES "outbound_prospect"("id"),
  "channel" text NOT NULL,
  "account_id" text NOT NULL,
  "account_label" text NOT NULL,
  "provider_thread_id" text NOT NULL,
  "counterpart" text NOT NULL,
  "subject" text NOT NULL DEFAULT '',
  "stage" text NOT NULL DEFAULT 'open',
  "needs_reply" boolean NOT NULL DEFAULT false,
  "revision" integer NOT NULL DEFAULT 0,
  "draft_body" text NOT NULL DEFAULT '',
  "draft_generated_at" timestamp,
  "draft_based_on_message_id" text,
  "last_inbound_at" timestamp,
  "last_outbound_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "outbound_conversation_provider_uidx" ON "outbound_conversation"("channel", "account_id", "provider_thread_id");
CREATE INDEX IF NOT EXISTS "outbound_conversation_attention_idx" ON "outbound_conversation"("needs_reply", "updated_at");
CREATE INDEX IF NOT EXISTS "outbound_conversation_prospect_idx" ON "outbound_conversation"("prospect_id");

CREATE TABLE IF NOT EXISTS "outbound_conversation_message" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "conversation_id" text NOT NULL REFERENCES "outbound_conversation"("id"),
  "provider_message_id" text NOT NULL,
  "direction" text NOT NULL,
  "body_text" text NOT NULL,
  "subject" text NOT NULL DEFAULT '',
  "from_address" text NOT NULL,
  "to_address" text NOT NULL,
  "rfc_message_id" text,
  "is_automated" boolean NOT NULL DEFAULT false,
  "truncated" boolean NOT NULL DEFAULT false,
  "sent_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "outbound_conversation_message_provider_uidx" ON "outbound_conversation_message"("conversation_id", "provider_message_id");
CREATE INDEX IF NOT EXISTS "outbound_conversation_message_thread_idx" ON "outbound_conversation_message"("conversation_id", "sent_at");

CREATE TABLE IF NOT EXISTS "outbound_conversation_send" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "conversation_id" text NOT NULL REFERENCES "outbound_conversation"("id"),
  "revision" integer NOT NULL,
  "status" text NOT NULL,
  "input" jsonb NOT NULL,
  "provider_message_id" text,
  "error" text,
  "created_by" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "completed_at" timestamp
);
CREATE UNIQUE INDEX IF NOT EXISTS "outbound_conversation_send_revision_uidx" ON "outbound_conversation_send"("conversation_id", "revision");
