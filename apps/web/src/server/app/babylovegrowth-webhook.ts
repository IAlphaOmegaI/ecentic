import { resultify } from "@zenncore/utils";
import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db, schema } from "../database";
import { UnauthenticatedError } from "../utils/error";
import { BLOG_CACHE_TAG } from "./blog-cache";
import * as BlogTranslate from "./blog-translate";

const payloadSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  slug: z.string(),
  metaDescription: z.string().optional().default(""),
  content_html: z.string(),
  heroImageUrl: z.string().optional().nullable(),
  languageCode: z.string().optional(),
  createdAt: z.string().optional(),
  content_markdown: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  seedKeyword: z.string().optional().nullable(),
});

export type PublishPayload = z.infer<typeof payloadSchema>;

export const authorizeWebhook = (authorization: string | null) => {
  const secret = process.env.BABYLOVEGROWTH_WEBHOOK_SECRET;
  if (!secret)
    return {
      success: false as const,
      error: new Error("BABYLOVEGROWTH_WEBHOOK_SECRET is not configured"),
    };

  if (authorization !== `Bearer ${secret}`)
    return {
      success: false as const,
      error: new UnauthenticatedError("Unauthorized"),
    };

  return { success: true as const, data: true };
};

export const parsePayload = (body: unknown) => {
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success)
    return {
      success: false as const,
      error: new Error(parsed.error.message),
    };
  return { success: true as const, data: parsed.data };
};

/**
 * Translate a BabyLoveGrowth English publish into a Spanish `blog_post` row
 * (same slug, locale=es) and purge the blog cache.
 */
export const upsertSpanishTranslation = async (payload: PublishPayload) => {
  // Only translate English (or unspecified) publishes — ignore BLG Spanish if any.
  if (payload.languageCode && payload.languageCode !== "en")
    return {
      success: true as const,
      data: { skipped: true as const, reason: "non-english" },
    };

  const translation = await resultify(() =>
    BlogTranslate.translateArticle({
      title: payload.title,
      metaDescription: payload.metaDescription,
      contentHtml: payload.content_html,
      category: payload.seedKeyword ?? "Guide",
      tags: payload.keywords ?? [],
      introduction: payload.metaDescription,
      takeaways: [],
    }),
  );

  if (!translation.success) return translation;

  const externalId = String(payload.id);
  const publishedAt = (payload.createdAt ?? new Date().toISOString()).slice(
    0,
    10,
  );
  const readTime = BlogTranslate.estimateReadTime(
    translation.data.contentHtml,
  );

  const existing = await resultify(() =>
    db
      .select({ id: schema.blogPost.id })
      .from(schema.blogPost)
      .where(
        and(
          eq(schema.blogPost.slug, payload.slug),
          eq(schema.blogPost.locale, "es"),
        ),
      )
      .limit(1),
  );

  if (!existing.success) return existing;

  const values = {
    slug: payload.slug,
    locale: "es",
    source: "blg" as const,
    externalId,
    status: "published",
    category: translation.data.category,
    title: translation.data.title,
    description: translation.data.metaDescription,
    introduction: translation.data.introduction,
    publishedAt,
    readTime,
    thumbnailUrl: payload.heroImageUrl ?? null,
    tags: translation.data.tags,
    takeaways: translation.data.takeaways,
    sections: [] as const,
    contentHtml: translation.data.contentHtml,
    updatedAt: new Date(),
  };

  const write = await resultify(async () => {
    const row = existing.data[0];
    if (row) {
      await db
        .update(schema.blogPost)
        .set(values)
        .where(eq(schema.blogPost.id, row.id));
      return { id: row.id, action: "updated" as const };
    }

    const inserted = await db
      .insert(schema.blogPost)
      .values(values)
      .returning({ id: schema.blogPost.id });

    return { id: inserted[0]?.id, action: "created" as const };
  });

  if (!write.success) return write;

  revalidateTag(BLOG_CACHE_TAG, { expire: 0 });

  return {
    success: true as const,
    data: { skipped: false as const, ...write.data },
  };
};
