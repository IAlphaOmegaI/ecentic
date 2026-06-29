CREATE TABLE "deal_redemption" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"merchant" text NOT NULL,
	"companyName" text NOT NULL,
	"batch" text,
	"contactName" text NOT NULL,
	"email" text NOT NULL,
	"website" text,
	"platform" text,
	"monthlyOrders" text,
	"goal" text,
	"answers" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "deal_redemption_merchant_created_idx" ON "deal_redemption" USING btree ("merchant","createdAt");
--> statement-breakpoint
CREATE INDEX "deal_redemption_email_idx" ON "deal_redemption" USING btree ("email");
