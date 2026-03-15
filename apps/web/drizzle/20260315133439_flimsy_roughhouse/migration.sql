CREATE TABLE "ucp_profile" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"userId" text NOT NULL UNIQUE,
	"merchantName" text,
	"description" text,
	"logoUrl" text,
	"paymentMethods" text,
	"shippingPolicy" text,
	"returnPolicy" text,
	"contactEmail" text,
	"sustainability" text,
	"certifications" text,
	"generatedJson" text,
	"autoUpdate" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "structuredData" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "ipAddress" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "userAgent" text;--> statement-breakpoint
ALTER TABLE "ucp_profile" ADD CONSTRAINT "ucp_profile_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;