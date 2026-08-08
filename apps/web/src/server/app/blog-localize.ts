import { resultify } from "@zenncore/utils";
import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db, schema } from "../database";
import * as BabyLoveGrowth from "./babylovegrowth";
import { BLOG_CACHE_TAG } from "./blog-cache";
import * as BlogTranslate from "./blog-translate";

type BlogPostRow = typeof schema.blogPost.$inferSelect;

const findPublished = async (slug: string, locale: "en" | "es") => {
  const posts = await db
    .select()
    .from(schema.blogPost)
    .where(
      and(
        eq(schema.blogPost.status, "published"),
        eq(schema.blogPost.slug, slug),
        eq(schema.blogPost.locale, locale),
      ),
    )
    .limit(1);
  return posts[0] ?? null;
};

const upsertSpanishRow = async (values: {
  slug: string;
  source: "local" | "blg";
  externalId?: string | null;
  category: string;
  title: string;
  description: string;
  introduction: string;
  publishedAt: string;
  readTime: string;
  thumbnailUrl: string | null;
  tags: readonly string[];
  takeaways: readonly string[];
  contentHtml: string;
}) => {
  const existing = await db
    .select({ id: schema.blogPost.id })
    .from(schema.blogPost)
    .where(
      and(
        eq(schema.blogPost.slug, values.slug),
        eq(schema.blogPost.locale, "es"),
      ),
    )
    .limit(1);

  const row = existing[0];
  const payload = {
    slug: values.slug,
    locale: "es" as const,
    source: values.source,
    externalId: values.externalId ?? null,
    status: "published",
    category: values.category,
    title: values.title,
    description: values.description,
    introduction: values.introduction,
    publishedAt: values.publishedAt,
    readTime: values.readTime,
    thumbnailUrl: values.thumbnailUrl,
    tags: values.tags,
    takeaways: values.takeaways,
    sections: [] as const,
    contentHtml: values.contentHtml,
    updatedAt: new Date(),
  };

  if (row) {
    await db
      .update(schema.blogPost)
      .set(payload)
      .where(eq(schema.blogPost.id, row.id));
  } else {
    await db.insert(schema.blogPost).values(payload);
  }

  revalidateTag(BLOG_CACHE_TAG, { expire: 0 });
  return findPublished(values.slug, "es");
};

/**
 * Ensure a Spanish `blog_post` exists for the same slug as an English source
 * (BabyLoveGrowth or local editorial). Used so `/es/blog/[slug]` mirrors EN.
 */
export const ensureSpanishPost = async (
  slug: string,
): Promise<BlogPostRow | null> => {
  const existing = await findPublished(slug, "es");
  if (existing) return existing;

  const article = await resultify(() => BabyLoveGrowth.getArticleBySlug(slug));

  if (article.success && article.data) {
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

    if (!translation.success) return null;

    return upsertSpanishRow({
      slug,
      source: "blg",
      externalId: String(article.data.id),
      category: translation.data.category,
      title: translation.data.title,
      description: translation.data.metaDescription,
      introduction: translation.data.introduction,
      publishedAt: article.data.created_at.slice(0, 10),
      readTime: BlogTranslate.estimateReadTime(translation.data.contentHtml),
      thumbnailUrl: article.data.hero_image_url || null,
      tags: translation.data.tags,
      takeaways: translation.data.takeaways,
      contentHtml: translation.data.contentHtml,
    });
  }

  const english = await findPublished(slug, "en");
  if (!english) return null;

  const html =
    english.contentHtml ??
    [
      `<p>${english.introduction}</p>`,
      ...english.sections.map(
        (section) => `<h2>${section.title}</h2><div>${section.content}</div>`,
      ),
    ].join("\n");

  const translation = await resultify(() =>
    BlogTranslate.translateArticle({
      title: english.title,
      metaDescription: english.description,
      contentHtml: html,
      category: english.category,
      tags: english.tags,
      introduction: english.introduction,
      takeaways: english.takeaways,
    }),
  );

  if (!translation.success) return null;

  return upsertSpanishRow({
    slug,
    source: english.source === "blg" ? "blg" : "local",
    externalId: english.externalId,
    category: translation.data.category,
    title: translation.data.title,
    description: translation.data.metaDescription,
    introduction: translation.data.introduction,
    publishedAt: english.publishedAt,
    readTime: BlogTranslate.estimateReadTime(translation.data.contentHtml),
    thumbnailUrl: english.thumbnailUrl,
    tags: translation.data.tags,
    takeaways: translation.data.takeaways,
    contentHtml: translation.data.contentHtml,
  });
};

export type ResolvedBlog =
  | {
      kind: "blg";
      article: NonNullable<
        Awaited<ReturnType<typeof BabyLoveGrowth.getArticleBySlug>>
      >;
    }
  | { kind: "post"; post: BlogPostRow };

/**
 * Resolve a blog slug for a locale. Spanish uses the same slug set as English:
 * prefer a stored ES row, optionally translate from the EN source on demand,
 * and fall back to the English source so the route never 404s for a real post.
 */
export const resolveBlog = async (
  slug: string,
  locale: "en" | "es",
  options: { translate?: boolean } = {},
): Promise<ResolvedBlog | null> => {
  const translate = options.translate ?? true;

  if (locale === "en") {
    const article = await BabyLoveGrowth.getArticleBySlug(slug);
    if (article) return { kind: "blg", article };
    const post = await findPublished(slug, "en");
    if (post) return { kind: "post", post };
    return null;
  }

  const existingSpanish = await findPublished(slug, "es");
  if (existingSpanish) return { kind: "post", post: existingSpanish };

  if (translate) {
    const spanish = await ensureSpanishPost(slug);
    if (spanish) return { kind: "post", post: spanish };
  }

  const article = await BabyLoveGrowth.getArticleBySlug(slug);
  if (article) return { kind: "blg", article };

  const english = await findPublished(slug, "en");
  if (english) return { kind: "post", post: english };

  return null;
};

/** English catalog slugs (BLG + local) — Spanish routes share this set. */
export const listCatalogSlugs = async () => {
  const [articles, english] = await Promise.all([
    BabyLoveGrowth.listArticles(),
    resultify(() =>
      db
        .select({ slug: schema.blogPost.slug })
        .from(schema.blogPost)
        .where(
          and(
            eq(schema.blogPost.locale, "en"),
            eq(schema.blogPost.status, "published"),
          ),
        ),
    ),
  ]);

  const slugs = new Set(articles.map((article) => article.slug));
  if (english.success) {
    for (const row of english.data) slugs.add(row.slug);
  }
  return [...slugs];
};
