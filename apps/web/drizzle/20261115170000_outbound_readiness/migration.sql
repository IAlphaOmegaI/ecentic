CREATE TABLE IF NOT EXISTS "outbound_mailbox_readiness" (
  "email" text PRIMARY KEY NOT NULL,
  "plan" jsonb NOT NULL,
  "last_check" jsonb,
  "dkim_selectors" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "checked_at" timestamp,
  "updated_by" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
