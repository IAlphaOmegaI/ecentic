CREATE TABLE "promo_claim" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
	"promo" text NOT NULL,
	"email" text NOT NULL,
	"redeemedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "promo_claim_promo_unique" ON "promo_claim" USING btree ("promo");
--> statement-breakpoint
CREATE INDEX "promo_claim_email_idx" ON "promo_claim" USING btree ("email");
