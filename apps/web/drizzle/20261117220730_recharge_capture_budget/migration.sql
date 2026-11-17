ALTER TABLE "recharge_connections" ADD COLUMN "answerCaptureDay" text;--> statement-breakpoint
ALTER TABLE "recharge_connections" ADD COLUMN "answerCaptureCount" integer DEFAULT 0 NOT NULL;