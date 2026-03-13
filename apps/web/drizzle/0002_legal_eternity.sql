CREATE TABLE "scan" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"userId" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"totalSimulations" integer DEFAULT 0 NOT NULL,
	"completedSimulations" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"topFinding" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulation" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"scanId" text NOT NULL,
	"productId" text NOT NULL,
	"competitorId" text NOT NULL,
	"model" text NOT NULL,
	"winner" text NOT NULL,
	"reasoning" text,
	"productScore" integer,
	"competitorScore" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scan" ADD CONSTRAINT "scan_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation" ADD CONSTRAINT "simulation_scanId_scan_id_fk" FOREIGN KEY ("scanId") REFERENCES "public"."scan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation" ADD CONSTRAINT "simulation_productId_product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation" ADD CONSTRAINT "simulation_competitorId_competitor_id_fk" FOREIGN KEY ("competitorId") REFERENCES "public"."competitor"("id") ON DELETE cascade ON UPDATE no action;