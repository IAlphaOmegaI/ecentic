ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "ucpOfferJson" jsonb;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ucp_audit" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
	"userId" text NOT NULL,
	"productId" text NOT NULL,
	"score" integer NOT NULL,
	"gaps" jsonb NOT NULL,
	"specVersion" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ucp_audit_user_product_created_idx" ON "ucp_audit" ("userId","productId","createdAt");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "ucp_audit" ADD CONSTRAINT "ucp_audit_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "ucp_audit" ADD CONSTRAINT "ucp_audit_productId_product_id_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
