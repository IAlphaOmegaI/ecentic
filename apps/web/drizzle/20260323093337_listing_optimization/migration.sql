CREATE TABLE IF NOT EXISTS "listing_optimization" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"userId" text NOT NULL,
	"productId" text NOT NULL,
	"status" text NOT NULL,
	"proposedTitle" text,
	"proposedDescription" text,
	"winRateBefore" integer,
	"estimatedLift" integer,
	"winRateAfter" integer,
	"publishedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "listing_optimization_user_product_unique" ON "listing_optimization" ("userId","productId");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "listing_optimization" ADD CONSTRAINT "listing_optimization_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "listing_optimization" ADD CONSTRAINT "listing_optimization_productId_product_id_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
