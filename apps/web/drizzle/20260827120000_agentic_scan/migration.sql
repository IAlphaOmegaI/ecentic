CREATE TABLE IF NOT EXISTS "agentic_scan" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"userId" text NOT NULL,
	"storeId" text NOT NULL,
	"target" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"score" integer,
	"grade" text,
	"report" jsonb,
	"error" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "agentic_scan" ADD CONSTRAINT "agentic_scan_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "agentic_scan" ADD CONSTRAINT "agentic_scan_storeId_store_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agentic_scan_store_created_idx" ON "agentic_scan" USING btree ("storeId","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agentic_scan_user_idx" ON "agentic_scan" USING btree ("userId");
