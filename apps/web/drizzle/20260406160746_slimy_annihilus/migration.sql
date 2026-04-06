ALTER TABLE "user" ADD COLUMN "jobTitle" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "company" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "scan" ALTER COLUMN "topFinding" SET DATA TYPE jsonb USING "topFinding"::jsonb;