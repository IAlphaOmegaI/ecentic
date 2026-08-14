ALTER TABLE "blog_post" ADD COLUMN IF NOT EXISTS "faqs" jsonb DEFAULT '[]'::jsonb NOT NULL;
