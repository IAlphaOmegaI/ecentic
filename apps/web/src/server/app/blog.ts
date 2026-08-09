// Not a `"use server"` module: this file exports cache tags, sync webhook
// helpers, and `"use cache"` readers alongside withContext/withCron actions.
// A file-level `"use server"` may only export async functions — mixing in
// `BLOG_CACHE_TAG` / `parsePublishPayload` emptied the module's export surface
// under Turbopack (PR #15 consolidate) and broke the production build.

import { resultify } from "@zenncore/utils";
import { and, desc, eq, ne } from "drizzle-orm";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { db, schema } from "../database";
import * as AI from "../utils/ai";
import { withContext } from "../utils/context";
import { withCron } from "../utils/cron";
import { Environment } from "../utils/environment";
import { UnauthenticatedError } from "../utils/error";
import { type Document, repository } from "../utils/repository";
import * as BabyLoveGrowth from "./babylovegrowth";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.blogPost);

export type Type = Document<typeof schema.blogPost>;

/** Purged by `revalidateBlog` / Spanish writes. Keep in sync with BLG cache tags. */
export const BLOG_CACHE_TAG = "blog";

const purgeBlogCache = () => {
  // `revalidateTag` is illegal during RSC render / prerender. Defer so
  // ensureSpanish can run from page resolve via `after()` without crashing
  // the route (Sentry: "used revalidateTag blog during render").
  after(() => {
    revalidateTag(BLOG_CACHE_TAG, { expire: 0 });
  });
};

const published = eq(schema.blogPost.status, "published");

const latestFirst = [
  desc(schema.blogPost.publishedAt),
  desc(schema.blogPost.updatedAt),
] as const;

/**
 * Public blog reads use `"use cache"`. The repository / `withContext` rail
 * awaits `headers()` for Sentry — forbidden inside a cache scope — so these
 * query Drizzle directly and throw on failure (keeps bad renders out of cache).
 */
export const listPublished = async (locale = "en") => {
  "use cache";
  cacheLife("hours");
  cacheTag(BLOG_CACHE_TAG);

  return db
    .select()
    .from(schema.blogPost)
    .where(and(published, eq(schema.blogPost.locale, locale)))
    .orderBy(...latestFirst);
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

  const posts = await db
    .select()
    .from(schema.blogPost)
    .where(
      and(
        published,
        eq(schema.blogPost.slug, slug),
        eq(schema.blogPost.locale, locale),
      ),
    )
    .limit(1);

  return posts[0] ?? null;
};

/**
 * Uncached single-post read for the write/translate rail ONLY — call sites
 * need answers the cache cannot give while the deferred `after()` tag purge
 * is still pending: read-after-write (`upsertSpanishRow`), the race-loser
 * re-read, and `ensureSpanishCore`'s exists check (a stale cached `null`
 * there would buy a duplicate Azure translation). Never call from a page
 * render path — use `getPublishedBySlug`, or the route loses its static
 * shell. Do not merge the two: each is wrong for the other's call sites.
 */
const findPublished = async (slug: string, locale: "en" | "es") => {
  const posts = await db
    .select()
    .from(schema.blogPost)
    .where(
      and(
        published,
        eq(schema.blogPost.slug, slug),
        eq(schema.blogPost.locale, locale),
      ),
    )
    .limit(1);
  return posts[0] ?? null;
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

export type Translation = z.infer<typeof translationSchema>;

export type TranslateArticleInput = {
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

export const translateArticle = withContext(
  async (_context, input: TranslateArticleInput) => translateArticleCore(input),
  "Blog.translateArticle",
);

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
    const inserted = await resultify(() =>
      db.insert(schema.blogPost).values(payload),
    );
    if (!inserted.success) {
      const raced = await findPublished(values.slug, "es");
      if (raced) return raced;
      throw inserted.error;
    }
  }

  purgeBlogCache();
  return findPublished(values.slug, "es");
};

/**
 * Ensure a Spanish row exists for the EN slug (BLG or local editorial).
 * Plain async — safe to await from public RSC `resolve` (no `headers()`).
 */
const ensureSpanishCore = async (slug: string) => {
  const existing = await findPublished(slug, "es");
  if (existing) return { success: true as const, data: existing };

  const article = await resultify(() => BabyLoveGrowth.getArticleBySlug(slug));

  if (article.success && article.data) {
    const translation = await translateArticleCore({
      title: article.data.title,
      metaDescription: article.data.meta_description,
      contentHtml: article.data.content_html,
      category: article.data.seedKeyword ?? "Guide",
      tags: article.data.keywords,
      introduction: article.data.meta_description,
    });

    if (!translation.success) return translation;

    const row = await upsertSpanishRow({
      slug,
      source: "blg",
      externalId: String(article.data.id),
      category: translation.data.category,
      title: translation.data.title,
      description: translation.data.metaDescription,
      introduction: translation.data.introduction,
      publishedAt: article.data.created_at.slice(0, 10),
      readTime: estimateReadTime(translation.data.contentHtml),
      thumbnailUrl: article.data.hero_image_url || null,
      tags: translation.data.tags,
      takeaways: translation.data.takeaways,
      contentHtml: translation.data.contentHtml,
    });

    return { success: true as const, data: row };
  }

  const english = await findPublished(slug, "en");
  if (!english) return { success: true as const, data: null };

  const html =
    english.contentHtml ??
    [
      `<p>${english.introduction}</p>`,
      ...english.sections.map(
        (section) => `<h2>${section.title}</h2><div>${section.content}</div>`,
      ),
    ].join("\n");

  const translation = await translateArticleCore({
    title: english.title,
    metaDescription: english.description,
    contentHtml: html,
    category: english.category,
    tags: english.tags,
    introduction: english.introduction,
    takeaways: english.takeaways,
  });

  if (!translation.success) return translation;

  const row = await upsertSpanishRow({
    slug,
    source: english.source === "blg" ? "blg" : "local",
    externalId: english.externalId,
    category: translation.data.category,
    title: translation.data.title,
    description: translation.data.metaDescription,
    introduction: translation.data.introduction,
    publishedAt: english.publishedAt,
    readTime: estimateReadTime(translation.data.contentHtml),
    thumbnailUrl: english.thumbnailUrl,
    tags: translation.data.tags,
    takeaways: translation.data.takeaways,
    contentHtml: translation.data.contentHtml,
  });

  return { success: true as const, data: row };
};

export const ensureSpanish = withContext(
  async (_context, { slug }: { slug: string }) => ensureSpanishCore(slug),
  "Blog.ensureSpanish",
);

export type Resolved =
  | {
      kind: "blg";
      article: NonNullable<
        Awaited<ReturnType<typeof BabyLoveGrowth.getArticleBySlug>>
      >;
    }
  | { kind: "post"; post: Type };

/**
 * Same slug catalog for EN/ES. Prefer stored ES; fall back to EN so posts
 * never 404. Plain async (no `withContext`): public RSC cannot touch
 * `headers()` from Sentry server-action instrumentation during prerender.
 *
 * Read paths must go through `"use cache"` readers (`getPublishedBySlug`,
 * `BabyLoveGrowth.getArticleBySlug`) — one uncached await here evicts the
 * whole post body from the prerendered shell (`◐` instead of `○`).
 *
 * When `translate` is true and the ES row is missing, await Azure translate
 * + upsert (cache purge still deferred via `after`) so `/es/blog/[slug]`
 * actually returns Spanish instead of baking the EN fallback into the
 * prerendered page.
 */
export const resolve = async ({
  slug,
  locale,
  translate = true,
}: {
  slug: string;
  locale: "en" | "es";
  translate?: boolean;
}) =>
  resultify(async () => {
    if (locale === "en") {
      const article = await BabyLoveGrowth.getArticleBySlug(slug);
      if (article) return { kind: "blg" as const, article };
      const post = await getPublishedBySlug(slug, "en");
      if (post) return { kind: "post" as const, post };
      return null;
    }

    const existingSpanish = await getPublishedBySlug(slug, "es");
    if (existingSpanish)
      return { kind: "post" as const, post: existingSpanish };

    if (translate) {
      const spanish = await ensureSpanishCore(slug);
      if (!spanish.success) {
        // Translate failed — still serve EN below so the route never 500s.
      } else if (spanish.data) {
        return { kind: "post" as const, post: spanish.data };
      }
    }

    const article = await BabyLoveGrowth.getArticleBySlug(slug);
    if (article) return { kind: "blg" as const, article };

    const english = await getPublishedBySlug(slug, "en");
    if (english) return { kind: "post" as const, post: english };

    return null;
  });

/** English catalog slugs (BLG + local) — Spanish routes share this set.
 * Plain async (no `withContext`): used from `generateStaticParams`, which
 * cannot touch `headers()`. Fail soft so a DB blip never takes down the build. */
export const listCatalogSlugs = async () => {
  const articles = await BabyLoveGrowth.listArticles();

  const englishRows = await (async () => {
    try {
      return await db
        .select({ slug: schema.blogPost.slug })
        .from(schema.blogPost)
        .where(and(eq(schema.blogPost.locale, "en"), published));
    } catch {
      return [] as { slug: string }[];
    }
  })();

  const slugs = new Set(articles.map((article) => article.slug));
  for (const row of englishRows) slugs.add(row.slug);
  return [...slugs];
};

/** Cron: translate EN BLG + local posts missing a Spanish row. */
export const translateMissingSpanish = withCron(async () => {
  const articles = await resultify(() => BabyLoveGrowth.listArticles());
  const blgList = articles.success ? articles.data : [];

  const existingSpanish = await resultify(() =>
    db
      .select({ slug: schema.blogPost.slug })
      .from(schema.blogPost)
      .where(eq(schema.blogPost.locale, "es")),
  );

  if (!existingSpanish.success) return existingSpanish;

  const spanishSlugs = new Set(existingSpanish.data.map((row) => row.slug));
  const translated: string[] = [];
  const failed: string[] = [];

  for (const summary of blgList) {
    if (spanishSlugs.has(summary.slug)) continue;

    const ensured = await ensureSpanish(Environment.SERVER, {
      slug: summary.slug,
    });
    if (!ensured.success || !ensured.data) {
      failed.push(summary.slug);
      continue;
    }

    translated.push(summary.slug);
    spanishSlugs.add(summary.slug);
  }

  const localEnglish = await resultify(() =>
    db
      .select({ slug: schema.blogPost.slug })
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

      const ensured = await ensureSpanish(Environment.SERVER, {
        slug: post.slug,
      });
      if (!ensured.success || !ensured.data) {
        failed.push(post.slug);
        continue;
      }

      translated.push(post.slug);
      spanishSlugs.add(post.slug);
    }
  }

  if (translated.length > 0) purgeBlogCache();

  return {
    success: true as const,
    data: { translated, failed },
  };
}, "Blog.translateMissingSpanish");

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

/** Translate a BLG English publish into a Spanish `blog_post` (same slug). */
export const ingestPublish = withContext(
  async (_context, payload: PublishPayload) => {
    if (payload.languageCode && payload.languageCode !== "en")
      return {
        success: true as const,
        data: { skipped: true as const, reason: "non-english" as const },
      };

    const translation = await translateArticleCore({
      title: payload.title,
      metaDescription: payload.metaDescription,
      contentHtml: payload.content_html,
      category: payload.seedKeyword ?? "Guide",
      tags: payload.keywords ?? [],
      introduction: payload.metaDescription,
      takeaways: [],
    });

    if (!translation.success) return translation;

    const row = await upsertSpanishRow({
      slug: payload.slug,
      source: "blg",
      externalId: String(payload.id),
      category: translation.data.category,
      title: translation.data.title,
      description: translation.data.metaDescription,
      introduction: translation.data.introduction,
      publishedAt: (payload.createdAt ?? new Date().toISOString()).slice(0, 10),
      readTime: estimateReadTime(translation.data.contentHtml),
      thumbnailUrl: payload.heroImageUrl ?? null,
      tags: translation.data.tags,
      takeaways: translation.data.takeaways,
      contentHtml: translation.data.contentHtml,
    });

    return {
      success: true as const,
      data: {
        skipped: false as const,
        id: row?.id,
        action: "upserted" as const,
      },
    };
  },
  "Blog.ingestPublish",
);
