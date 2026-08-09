// Not a `"use server"` module: this file exports cache tags, sync webhook
// helpers, and `"use cache"` readers alongside withContext actions.
// A file-level `"use server"` may only export async functions — mixing in
// `BLOG_CACHE_TAG` / `parsePublishPayload` emptied the module's export surface
// under Turbopack (PR #15 consolidate) and broke the production build.

import { resultify } from "@zenncore/utils";
import { and, eq } from "drizzle-orm";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { schema } from "../database";
import * as AI from "../utils/ai";
import { withContext } from "../utils/context";
import { Environment } from "../utils/environment";
import { UnauthenticatedError } from "../utils/error";
import { type Document, repository } from "../utils/repository";
import * as BabyLoveGrowth from "./babylovegrowth";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.blogPost);

export type Type = Document<typeof schema.blogPost>;

/** Purged by `revalidateBlog` / locale upserts. Keep in sync with BLG cache tags. */
export const BLOG_CACHE_TAG = "blog";

const purgeBlogCache = () => {
  // `revalidateTag` is illegal during RSC render / prerender. Defer so
  // webhook upserts never crash the route (Sentry: "used revalidateTag blog
  // during render"). Outside a Next request `after` throws — skip.
  try {
    after(() => {
      revalidateTag(BLOG_CACHE_TAG, { expire: 0 });
    });
  } catch {
    // non-request context
  }
};

const published = eq(schema.blogPost.status, "published");

/**
 * Public blog reads use `"use cache"`. Repository helpers go through
 * headers-free `withInstrumentation`, so these are safe inside a cache scope.
 * Throw on failure so bad renders stay out of cache.
 */
export const listPublished = async (locale = "en") => {
  "use cache";
  cacheLife("hours");
  cacheTag(BLOG_CACHE_TAG);

  const rows = await find(Environment.SERVER, {
    where: and(published, eq(schema.blogPost.locale, locale)),
    orderBy: [
      { column: schema.blogPost.publishedAt, direction: "desc" },
      { column: schema.blogPost.updatedAt, direction: "desc" },
    ],
  });
  if (!rows.success) throw rows.error;
  return rows.data;
};

/**
 * Cached single-post read — the ONLY slug lookup page renders may use.
 * An uncached query in a render path evicts the whole post body from the
 * prerendered shell (`◐` instead of `○`); this happened once already when
 * `resolve` used `findPublished`. May serve results up to an hour stale
 * (until the `blog` tag purge lands), which is fine for public reads.
 */
export const getPublishedBySlug = async (
  slug: string,
  locale: "en" | "es" = "en",
) => {
  "use cache";
  cacheLife("hours");
  cacheTag(BLOG_CACHE_TAG, `blog-${slug}-${locale}`);

  const posts = await find(Environment.SERVER, {
    where: and(
      published,
      eq(schema.blogPost.slug, slug),
      eq(schema.blogPost.locale, locale),
    ),
    limit: 1,
  });
  if (!posts.success) throw posts.error;

  return posts.data[0] ?? null;
};

/**
 * Uncached single-post read for the write rail ONLY — call sites need answers
 * the cache cannot give while the deferred `after()` tag purge is still
 * pending: read-after-write and race-loser re-reads. Never call from a page
 * render path — use `getPublishedBySlug`.
 */
const findPublished = async (slug: string, locale: "en" | "es") => {
  const posts = await find(Environment.SERVER, {
    where: and(
      published,
      eq(schema.blogPost.slug, slug),
      eq(schema.blogPost.locale, locale),
    ),
    limit: 1,
  });
  if (!posts.success) throw posts.error;
  return posts.data[0] ?? null;
};

const translationSchema = z.object({
  title: z.string(),
  metaDescription: z.string(),
  introduction: z.string(),
  contentHtml: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  takeaways: z.array(z.string()),
});

type TranslateArticleInput = {
  title: string;
  metaDescription: string;
  contentHtml: string;
  category?: string;
  tags?: readonly string[];
  introduction?: string;
  takeaways?: readonly string[];
};

const estimateReadTime = (html: string) => {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(" ").length : 0;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min`;
};

/** Translate EN → es-ES with Azure (gpt seat). Preserves HTML/URLs/`ecentic`. */
const translateArticleCore = async (input: TranslateArticleInput) => {
  const tags = input.tags ?? [];
  const takeaways = input.takeaways ?? [];
  const category = input.category ?? "Guide";
  const introduction = input.introduction ?? input.metaDescription;

  return resultify(() =>
    AI.generate({
      label: "Blog.translateArticle",
      model: "gpt",
      output: translationSchema,
      schemaName: "SpanishBlogTranslation",
      instructions: `You translate ecommerce blog content from English to Spanish (es-ES).

Rules:
- Translate visible text only; preserve every HTML tag, attribute, URL, and script/style block exactly.
- Keep the product name "ecentic" untranslated (lowercase as written).
- Keep brand names of AI products (ChatGPT, Claude, Gemini, Perplexity, Shopify, WooCommerce) untranslated.
- Write natural Spanish suitable for merchants; do not invent new sections.
- Return Spanish for title, metaDescription, introduction, contentHtml, category, tags, and takeaways.
- tags and takeaways must keep the same count as the input arrays.`,
      prompt: JSON.stringify({
        title: input.title,
        metaDescription: input.metaDescription,
        introduction,
        contentHtml: input.contentHtml,
        category,
        tags,
        takeaways,
      }),
    }),
  );
};

type LocaleRowValues = {
  slug: string;
  locale: "en" | "es";
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
};

const upsertLocaleRow = async (values: LocaleRowValues) => {
  const existing = await find(Environment.SERVER, {
    where: and(
      eq(schema.blogPost.slug, values.slug),
      eq(schema.blogPost.locale, values.locale),
    ),
    limit: 1,
  });
  if (!existing.success) throw existing.error;

  const row = existing.data[0];
  const payload = {
    slug: values.slug,
    locale: values.locale,
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
    const updated = await update(Environment.SERVER, row.id, payload);
    if (!updated.success) throw updated.error;
  } else {
    const inserted = await create(Environment.SERVER, payload);
    if (!inserted.success) {
      const raced = await findPublished(values.slug, values.locale);
      if (raced) return raced;
      throw inserted.error;
    }
  }

  purgeBlogCache();
  return findPublished(values.slug, values.locale);
};

export type Resolved =
  | {
      kind: "blg";
      article: NonNullable<
        Awaited<ReturnType<typeof BabyLoveGrowth.getArticleBySlug>>
      >;
    }
  | { kind: "post"; post: Type };

/**
 * Same slug catalog for EN/ES. Prefer stored `blog_post` rows (BLG webhook
 * writes both locales; editorial writes EN and ES as you publish). Fall back
 * to the live BLG API only when no row exists yet. Plain async — no
 * `withContext` / `headers()` during prerender.
 *
 * Public pages never Azure-translate on the render path.
 */
export const resolve = async ({
  slug,
  locale,
}: {
  slug: string;
  locale: "en" | "es";
}) =>
  resultify(async () => {
    const stored = await getPublishedBySlug(slug, locale);
    if (stored) return { kind: "post" as const, post: stored };

    if (locale === "en") {
      const article = await BabyLoveGrowth.getArticleBySlug(slug);
      if (article) return { kind: "blg" as const, article };
      return null;
    }

    // ES miss: never present live BLG English as Spanish. Prefer EN row so
    // the page still resolves until a Spanish upsert lands.
    const english = await getPublishedBySlug(slug, "en");
    if (english) return { kind: "post" as const, post: english };

    const article = await BabyLoveGrowth.getArticleBySlug(slug);
    if (article) return { kind: "blg" as const, article };

    return null;
  });

/** English catalog slugs (BLG + local) — Spanish routes share this set. */
export const listCatalogSlugs = async () => {
  const articles = await BabyLoveGrowth.listArticles();

  const englishRows = await find(Environment.SERVER, {
    where: and(eq(schema.blogPost.locale, "en"), published),
  });
  const rows = englishRows.success ? englishRows.data : [];

  const slugs = new Set(articles.map((article) => article.slug));
  for (const row of rows) slugs.add(row.slug);
  return [...slugs];
};

const publishPayloadSchema = z.object({
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

export type PublishPayload = z.infer<typeof publishPayloadSchema>;

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

export const parsePublishPayload = (body: unknown) => {
  const parsed = publishPayloadSchema.safeParse(body);
  if (!parsed.success)
    return {
      success: false as const,
      error: new Error(parsed.error.message),
    };
  return { success: true as const, data: parsed.data };
};

/**
 * Persist EN from a BLG publish, Azure-translate to ES, upsert both rows
 * (same slug), purge the `blog` tag so static pages regenerate.
 */
export const ingestPublish = withContext(
  async (_context, payload: PublishPayload) => {
    if (payload.languageCode && payload.languageCode !== "en")
      return {
        success: true as const,
        data: { skipped: true as const, reason: "non-english" as const },
      };

    const publishedAt = (payload.createdAt ?? new Date().toISOString()).slice(
      0,
      10,
    );
    const category = payload.seedKeyword ?? "Guide";
    const tags = payload.keywords ?? [];
    const description = payload.metaDescription;
    const thumbnailUrl = payload.heroImageUrl ?? null;
    const externalId = String(payload.id);

    await upsertLocaleRow({
      slug: payload.slug,
      locale: "en",
      source: "blg",
      externalId,
      category,
      title: payload.title,
      description,
      introduction: description,
      publishedAt,
      readTime: estimateReadTime(payload.content_html),
      thumbnailUrl,
      tags,
      takeaways: [],
      contentHtml: payload.content_html,
    });

    const translation = await translateArticleCore({
      title: payload.title,
      metaDescription: description,
      contentHtml: payload.content_html,
      category,
      tags,
      introduction: description,
      takeaways: [],
    });

    if (!translation.success) return translation;

    const spanish = await upsertLocaleRow({
      slug: payload.slug,
      locale: "es",
      source: "blg",
      externalId,
      category: translation.data.category,
      title: translation.data.title,
      description: translation.data.metaDescription,
      introduction: translation.data.introduction,
      publishedAt,
      readTime: estimateReadTime(translation.data.contentHtml),
      thumbnailUrl,
      tags: translation.data.tags,
      takeaways: translation.data.takeaways,
      contentHtml: translation.data.contentHtml,
    });

    return {
      success: true as const,
      data: {
        skipped: false as const,
        id: spanish?.id,
        action: "upserted" as const,
      },
    };
  },
  "Blog.ingestPublish",
);
