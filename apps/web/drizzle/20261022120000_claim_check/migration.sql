-- Claim checks: one row per verification run of one product.
--
-- Hand-written, like every migration since 20260602204248: `bun run db:generate`
-- is blocked by the journal defects in plans/012-migration-journal-repair.md.
-- Every statement is idempotent so a partial apply can be re-run.
CREATE TABLE IF NOT EXISTS "claim_check" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"userId" text NOT NULL,
	"storeId" text NOT NULL,
	"productId" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"claims" integer,
	"verified" integer,
	"contradicted" integer,
	"divergent" integer,
	"report" jsonb,
	"error" text,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "claim_check" ADD CONSTRAINT "claim_check_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "claim_check" ADD CONSTRAINT "claim_check_storeId_store_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "claim_check" ADD CONSTRAINT "claim_check_productId_product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claim_check_product_created_idx" ON "claim_check" USING btree ("productId","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claim_check_store_created_idx" ON "claim_check" USING btree ("storeId","createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claim_check_user_idx" ON "claim_check" USING btree ("userId");
--> statement-breakpoint

-- At most one running check per product: the start action's insert is the
-- lock, so two racing clicks cannot both pay for a run.
CREATE UNIQUE INDEX IF NOT EXISTS "claim_check_product_running_unique" ON "claim_check" USING btree ("productId") WHERE "status" = 'running';
