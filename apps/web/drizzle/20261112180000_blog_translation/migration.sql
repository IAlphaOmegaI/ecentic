CREATE TABLE IF NOT EXISTS "blog_translation" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "slug" text NOT NULL,
  "locale" text NOT NULL,
  "sourceHash" text NOT NULL,
  "policyVersion" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "completedUnits" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "blockedUnits" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "totalUnits" integer DEFAULT 0 NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "availableAt" timestamp DEFAULT now() NOT NULL,
  "lockedUntil" timestamp,
  "lease" text,
  "error" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "blog_translation_slug_locale_unique" ON "blog_translation" ("slug", "locale");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_translation_drain_idx" ON "blog_translation" ("status", "availableAt");
