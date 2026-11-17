CREATE TABLE "outbound_company" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"domain" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"website" text NOT NULL,
	"country" text NOT NULL,
	"relationship" text DEFAULT 'cold' NOT NULL,
	"source" text NOT NULL,
	"last_contacted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_event" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"prospect_id" text,
	"kind" text NOT NULL,
	"detail" text NOT NULL,
	"actor" text NOT NULL,
	"external_id" text UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_inbox" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" text NOT NULL UNIQUE,
	"from_name" text NOT NULL,
	"signer" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"daily_cap" integer DEFAULT 15 NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"access_token_expires_at" timestamp,
	"history_id" text,
	"sync_page_token" text,
	"sync_start_history_id" text,
	"sync_mode" text,
	"last_synced_at" timestamp,
	"next_send_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_integration_job" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"provider" text NOT NULL,
	"prospect_id" text,
	"request_id" text UNIQUE,
	"status" text NOT NULL,
	"input" jsonb NOT NULL,
	"output" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_person" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"company_id" text NOT NULL,
	"identity_key" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"linkedin_url" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_playbook" (
	"id" text PRIMARY KEY,
	"settings" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_prospect" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"company_id" text NOT NULL UNIQUE,
	"person_id" text NOT NULL,
	"details" jsonb NOT NULL,
	"status" text DEFAULT 'candidate' NOT NULL,
	"messages" jsonb DEFAULT '[]' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"playbook_revision" integer DEFAULT 0 NOT NULL,
	"approved_at" timestamp,
	"approved_by" text,
	"approval_hash" text,
	"hold_reason" text DEFAULT '' NOT NULL,
	"linkedin_status" text DEFAULT 'research' NOT NULL,
	"linkedin_draft" text DEFAULT '' NOT NULL,
	"linkedin_next_action_at" timestamp,
	"linkedin_note" text DEFAULT '' NOT NULL,
	"first_sent_at" timestamp,
	"last_sent_at" timestamp,
	"next_send_at" timestamp,
	"sent_step" integer DEFAULT 0 NOT NULL,
	"inbox_id" text,
	"thread_id" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_revision" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"prospect_id" text NOT NULL,
	"revision" integer NOT NULL,
	"messages" jsonb NOT NULL,
	"manifest" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"approved_by" text,
	"approved_at" timestamp,
	"revoked_at" timestamp,
	"revoke_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_send_attempt" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"prospect_id" text NOT NULL,
	"inbox_id" text NOT NULL,
	"step" integer NOT NULL,
	"revision" integer NOT NULL,
	"message_id" text NOT NULL UNIQUE,
	"provider_message_id" text,
	"status" text NOT NULL,
	"content_hash" text NOT NULL,
	"error" text,
	"test" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "outbound_suppression" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"scope" text NOT NULL,
	"value" text NOT NULL,
	"reason" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "outbound_event_prospect_idx" ON "outbound_event" ("prospect_id");--> statement-breakpoint
CREATE INDEX "outbound_person_company_idx" ON "outbound_person" ("company_id");--> statement-breakpoint
CREATE INDEX "outbound_person_email_idx" ON "outbound_person" ("email");--> statement-breakpoint
CREATE INDEX "outbound_prospect_status_idx" ON "outbound_prospect" ("status");--> statement-breakpoint
CREATE INDEX "outbound_prospect_due_idx" ON "outbound_prospect" ("next_send_at");--> statement-breakpoint
CREATE UNIQUE INDEX "outbound_revision_prospect_revision_uidx" ON "outbound_revision" ("prospect_id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "outbound_attempt_prospect_step_uidx" ON "outbound_send_attempt" ("prospect_id","step");--> statement-breakpoint
CREATE INDEX "outbound_attempt_inbox_created_idx" ON "outbound_send_attempt" ("inbox_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "outbound_suppression_scope_value_uidx" ON "outbound_suppression" ("scope","value");--> statement-breakpoint
ALTER TABLE "outbound_event" ADD CONSTRAINT "outbound_event_prospect_id_outbound_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "outbound_prospect"("id");--> statement-breakpoint
ALTER TABLE "outbound_integration_job" ADD CONSTRAINT "outbound_integration_job_prospect_id_outbound_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "outbound_prospect"("id");--> statement-breakpoint
ALTER TABLE "outbound_person" ADD CONSTRAINT "outbound_person_company_id_outbound_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "outbound_company"("id");--> statement-breakpoint
ALTER TABLE "outbound_prospect" ADD CONSTRAINT "outbound_prospect_company_id_outbound_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "outbound_company"("id");--> statement-breakpoint
ALTER TABLE "outbound_prospect" ADD CONSTRAINT "outbound_prospect_person_id_outbound_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "outbound_person"("id");--> statement-breakpoint
ALTER TABLE "outbound_revision" ADD CONSTRAINT "outbound_revision_prospect_id_outbound_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "outbound_prospect"("id");--> statement-breakpoint
ALTER TABLE "outbound_send_attempt" ADD CONSTRAINT "outbound_send_attempt_prospect_id_outbound_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "outbound_prospect"("id");--> statement-breakpoint
ALTER TABLE "outbound_send_attempt" ADD CONSTRAINT "outbound_send_attempt_inbox_id_outbound_inbox_id_fkey" FOREIGN KEY ("inbox_id") REFERENCES "outbound_inbox"("id");