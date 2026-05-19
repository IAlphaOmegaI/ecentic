CREATE TABLE IF NOT EXISTS "blog_post" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" text NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"introduction" text NOT NULL,
	"publishedAt" date NOT NULL,
	"readTime" text NOT NULL,
	"tags" jsonb NOT NULL,
	"takeaways" jsonb NOT NULL,
	"sections" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "blog_post_slug_unique" ON "blog_post" ("slug");