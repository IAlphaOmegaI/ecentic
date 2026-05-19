ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "jobTitle" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "company" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "source" text;--> statement-breakpoint
ALTER TABLE "scan" ALTER COLUMN "topFinding" SET DATA TYPE jsonb USING "topFinding"::jsonb;
