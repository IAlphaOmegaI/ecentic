CREATE TABLE "competitor" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"price" text,
	"currency" text DEFAULT 'USD',
	"image" text,
	"url" text,
	"source" text,
	"brand" text,
	"selected" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitor" ADD CONSTRAINT "competitor_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;