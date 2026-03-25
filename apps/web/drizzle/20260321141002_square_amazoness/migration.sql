CREATE TABLE IF NOT EXISTS "agent_traffic_daily" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"storeId" text NOT NULL,
	"userId" text NOT NULL,
	"date" date NOT NULL,
	"agentType" text NOT NULL,
	"agentCategory" text NOT NULL,
	"pageType" text NOT NULL,
	"visitCount" integer DEFAULT 0 NOT NULL,
	"uniqueProducts" integer DEFAULT 0 NOT NULL,
	"productVisits" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_visit" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"storeId" text NOT NULL,
	"userId" text NOT NULL,
	"productId" text,
	"externalProductId" text,
	"agentType" text NOT NULL,
	"agentCategory" text NOT NULL,
	"detectionMethod" text NOT NULL,
	"detectionLayer" integer DEFAULT 1 NOT NULL,
	"pageUrl" text NOT NULL,
	"pageType" text NOT NULL,
	"referrer" text,
	"userAgent" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store" ADD COLUMN IF NOT EXISTS "trackerApiKey" text;
--> statement-breakpoint
ALTER TABLE "store" ADD COLUMN IF NOT EXISTS "storefrontHosts" jsonb;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "agent_traffic_daily" ADD CONSTRAINT "agent_traffic_daily_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "agent_traffic_daily" ADD CONSTRAINT "agent_traffic_daily_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "agent_visit" ADD CONSTRAINT "agent_visit_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "agent_visit" ADD CONSTRAINT "agent_visit_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "agent_visit" ADD CONSTRAINT "agent_visit_productId_product_id_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
