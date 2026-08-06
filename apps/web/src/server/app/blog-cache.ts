import { and, desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "../database";

// Public blog reads, cached with `"use cache"`. The repository/`withContext`
// rail awaits `headers()` for Sentry instrumentation — a dynamic API that is
// not allowed inside a cache scope — so these query Drizzle directly. Errors
// throw instead of returning a Result: a throw keeps the failed render out of
// the cache, while a warm entry keeps serving visitors through database
// hiccups (e.g. a Neon cold resume exceeding the connect timeout).

/** Purged by `Revalidation.revalidateBlog` when posts change outside the app. */
export const BLOG_CACHE_TAG = "blog";

const published = eq(schema.blogPost.status, "published");

const latestFirst = [
  desc(schema.blogPost.publishedAt),
  desc(schema.blogPost.updatedAt),
] as const;

export const listPublished = async () => {
  "use cache";
  cacheLife("hours");
  cacheTag(BLOG_CACHE_TAG);

  return db
    .select()
    .from(schema.blogPost)
    .where(published)
    .orderBy(...latestFirst);
};

export const getPublishedBySlug = async (slug: string) => {
  "use cache";
  cacheLife("hours");
  cacheTag(BLOG_CACHE_TAG, `blog-${slug}`);

  const posts = await db
    .select()
    .from(schema.blogPost)
    .where(and(published, eq(schema.blogPost.slug, slug)))
    .limit(1);

  return posts[0] ?? null;
};
