CREATE TABLE "store_account" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"storeId" text NOT NULL,
	"shopifyAccessToken" text,
	"shopifyAccessTokenExpiresAt" timestamp,
	"shopifyRefreshToken" text,
	"shopifyRefreshTokenExpiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_account" ADD CONSTRAINT "store_account_storeId_store_id_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE;