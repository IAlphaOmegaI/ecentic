CREATE TABLE "agent_api_key" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"keyHash" text NOT NULL,
	"lastUsedAt" timestamp,
	"expiresAt" timestamp,
	"revokedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_account" ADD COLUMN "storeAccountId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "store" DROP COLUMN "accessToken";--> statement-breakpoint
ALTER TABLE "store" DROP COLUMN "consumerKey";--> statement-breakpoint
ALTER TABLE "store" DROP COLUMN "consumerSecret";--> statement-breakpoint
CREATE UNIQUE INDEX "agent_api_key_hash_unique" ON "agent_api_key" ("keyHash");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_api_key_prefix_unique" ON "agent_api_key" ("prefix");--> statement-breakpoint
ALTER TABLE "agent_api_key" ADD CONSTRAINT "agent_api_key_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;