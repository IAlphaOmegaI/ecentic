import { resultify } from "@zenncore/utils";
import { and, eq, ne } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db, schema } from "../database";
import { withCron } from "../utils/cron";
import * as BabyLoveGrowth from "./babylovegrowth";
import { BLOG_CACHE_TAG } from "./blog-cache";
import * as BlogTranslate from "./blog-translate";

/**
 * Translate EN BabyLoveGrowth articles (and local EN editorial posts) that
 * lack a Spanish row. Cron-guarded for one-shot / periodic backfill.
 */
export const translateMissingSpanish = withCron(async () => {
  const articles = await resultify(() => BabyLoveGrowth.listArticles());
  const blgList = articles.success ? articles.data : [];

  const existingSpanish = await resultify(() =>
    db
      .select({
        slug: schema.blogPost.slug,
      })
      .from(schema.blogPost)
      .where(eq(schema.blogPost.locale, "es")),
  );

  if (!existingSpanish.success) return existingSpanish;

  const spanishSlugs = new Set(
    existingSpanish.data.map((row: { slug: string }) => row.slug),
  );
  const translated: string[] = [];
  const failed: string[] = [];

  for (const summary of blgList) {
    if (spanishSlugs.has(summary.slug)) continue;

    const article = await resultify(() =>
      BabyLoveGrowth.getArticleBySlug(summary.slug),
    );
    if (!article.success || !article.data) {
      failed.push(summary.slug);
      continue;
    }

    const translation = await resultify(() =>
      BlogTranslate.translateArticle({
        title: article.data.title,
        metaDescription: article.data.meta_description,
        contentHtml: article.data.content_html,
        category: article.data.seedKeyword ?? "Guide",
        tags: article.data.keywords,
        introduction: article.data.meta_description,
      }),
    );

    if (!translation.success) {
      failed.push(summary.slug);
      continue;
    }

    const write = await resultify(() =>
      db.insert(schema.blogPost).values({
        slug: summary.slug,
        locale: "es",
        source: "blg",
        externalId: String(article.data.id),
        status: "published",
        category: translation.data.category,
        title: translation.data.title,
        description: translation.data.metaDescription,
        introduction: translation.data.introduction,
        publishedAt: article.data.created_at.slice(0, 10),
        readTime: BlogTranslate.estimateReadTime(translation.data.contentHtml),
        thumbnailUrl: article.data.hero_image_url || null,
        tags: translation.data.tags,
        takeaways: translation.data.takeaways,
        sections: [],
        contentHtml: translation.data.contentHtml,
      }),
    );

    if (!write.success) {
      failed.push(summary.slug);
      continue;
    }

    translated.push(summary.slug);
    spanishSlugs.add(summary.slug);
  }

  const localEnglish = await resultify(() =>
    db
      .select()
      .from(schema.blogPost)
      .where(
        and(
          eq(schema.blogPost.locale, "en"),
          eq(schema.blogPost.source, "local"),
          ne(schema.blogPost.status, "draft"),
        ),
      ),
  );

  if (localEnglish.success) {
    for (const post of localEnglish.data) {
      if (spanishSlugs.has(post.slug)) continue;

      const html =
        post.contentHtml ??
        [
          `<p>${post.introduction}</p>`,
          ...post.sections.map(
            (section: { title: string; content: string }) =>
              `<h2>${section.title}</h2><div>${section.content}</div>`,
          ),
        ].join("\n");

      const translation = await resultify(() =>
        BlogTranslate.translateArticle({
          title: post.title,
          metaDescription: post.description,
          contentHtml: html,
          category: post.category,
          tags: post.tags,
          introduction: post.introduction,
          takeaways: post.takeaways,
        }),
      );

      if (!translation.success) {
        failed.push(post.slug);
        continue;
      }

      const write = await resultify(() =>
        db.insert(schema.blogPost).values({
          slug: post.slug,
          locale: "es",
          source: "local",
          status: "published",
          category: translation.data.category,
          title: translation.data.title,
          description: translation.data.metaDescription,
          introduction: translation.data.introduction,
          publishedAt: post.publishedAt,
          readTime: BlogTranslate.estimateReadTime(
            translation.data.contentHtml,
          ),
          thumbnailUrl: post.thumbnailUrl,
          tags: translation.data.tags,
          takeaways: translation.data.takeaways,
          sections: [],
          contentHtml: translation.data.contentHtml,
        }),
      );

      if (!write.success) {
        failed.push(post.slug);
        continue;
      }

      translated.push(post.slug);
      spanishSlugs.add(post.slug);
    }
  }

  if (translated.length > 0) revalidateTag(BLOG_CACHE_TAG, { expire: 0 });

  return {
    success: true as const,
    data: { translated, failed },
  };
}, "BlogBackfill.translateMissingSpanish");
