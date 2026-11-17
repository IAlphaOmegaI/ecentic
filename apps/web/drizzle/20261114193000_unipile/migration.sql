CREATE TABLE IF NOT EXISTS "outbound_linkedin_account" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "provider_user_id" text NOT NULL,
  "status" text NOT NULL,
  "is_locked" boolean DEFAULT false NOT NULL,
  "connected_by" text NOT NULL,
  "last_checked_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
