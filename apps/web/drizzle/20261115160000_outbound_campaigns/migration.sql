CREATE TABLE IF NOT EXISTS "outbound_campaign" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "criteria" jsonb NOT NULL,
  "revision" integer NOT NULL DEFAULT 1,
  "answers" text NOT NULL DEFAULT '',
  "discovery_state" jsonb NOT NULL DEFAULT '{"apolloPage":1,"apolloExhausted":false,"claySearchId":null,"clayExhausted":false}'::jsonb,
  "created_by" text NOT NULL,
  "updated_by" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "outbound_campaign_status_idx" ON "outbound_campaign" ("status");

-- Null preserves every legacy prospect and its immutable contact/send history.
ALTER TABLE "outbound_prospect" ADD COLUMN IF NOT EXISTS "campaign_id" text REFERENCES "outbound_campaign" ("id");
CREATE INDEX IF NOT EXISTS "outbound_prospect_campaign_idx" ON "outbound_prospect" ("campaign_id");

CREATE TABLE IF NOT EXISTS "outbound_campaign_company" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "campaign_id" text NOT NULL REFERENCES "outbound_campaign" ("id"),
  "domain" text NOT NULL,
  "name" text NOT NULL,
  "website" text NOT NULL,
  "country" text,
  "platform" text,
  "team_size" integer,
  "annual_revenue" bigint,
  "source" text NOT NULL,
  "source_id" text,
  "source_payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" text NOT NULL DEFAULT 'candidate',
  "reason" text NOT NULL DEFAULT '',
  "prospect_id" text REFERENCES "outbound_prospect" ("id"),
  "criteria_revision" integer NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "outbound_campaign_company_domain_unique" ON "outbound_campaign_company" ("campaign_id", "domain");
CREATE INDEX IF NOT EXISTS "outbound_campaign_company_queue_idx" ON "outbound_campaign_company" ("campaign_id", "status");
CREATE INDEX IF NOT EXISTS "outbound_campaign_company_domain_idx" ON "outbound_campaign_company" ("domain");

CREATE TABLE IF NOT EXISTS "outbound_campaign_run" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "campaign_id" text NOT NULL REFERENCES "outbound_campaign" ("id"),
  "request_id" text NOT NULL UNIQUE,
  "provider" text NOT NULL,
  "operation" text NOT NULL,
  "status" text NOT NULL DEFAULT 'starting',
  "criteria_revision" integer NOT NULL,
  "criteria" jsonb NOT NULL,
  "cursor" jsonb NOT NULL,
  "output" jsonb,
  "company_count" integer NOT NULL DEFAULT 0,
  "error" text,
  "created_by" text NOT NULL,
  "started_at" timestamp NOT NULL DEFAULT now(),
  "completed_at" timestamp
);
CREATE INDEX IF NOT EXISTS "outbound_campaign_run_recent_idx" ON "outbound_campaign_run" ("campaign_id", "started_at");
-- An unresolved provider POST holds the campaign until it is reconciled.
CREATE UNIQUE INDEX IF NOT EXISTS "outbound_campaign_run_open_unique"
  ON "outbound_campaign_run" ("campaign_id") WHERE "status" IN ('starting', 'uncertain');
