ALTER TABLE "blog_post" ADD COLUMN IF NOT EXISTS "locale" text DEFAULT 'en' NOT NULL;
ALTER TABLE "blog_post" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'local' NOT NULL;
ALTER TABLE "blog_post" ADD COLUMN IF NOT EXISTS "externalId" text;
ALTER TABLE "blog_post" ADD COLUMN IF NOT EXISTS "contentHtml" text;

DROP INDEX IF EXISTS "blog_post_slug_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "blog_post_slug_locale_unique" ON "blog_post" ("slug", "locale");
CREATE INDEX IF NOT EXISTS "blog_post_locale_status_published_idx" ON "blog_post" ("locale", "status", "publishedAt");
