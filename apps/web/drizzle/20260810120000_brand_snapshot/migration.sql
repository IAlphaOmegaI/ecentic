CREATE TABLE IF NOT EXISTS "brand_snapshot" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"userId" text NOT NULL,
	"storeId" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"report" jsonb,
	"error" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "brand_snapshot" ADD CONSTRAINT "brand_snapshot_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "brand_snapshot" ADD CONSTRAINT "brand_snapshot_storeId_store_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brand_snapshot_store_created_idx" ON "brand_snapshot" USING btree ("storeId","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brand_snapshot_user_idx" ON "brand_snapshot" USING btree ("userId");
