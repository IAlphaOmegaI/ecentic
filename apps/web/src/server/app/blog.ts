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
import { isPublishedLocale, type Locale } from "@/i18n/locales";
import { createAzureTranslationGenerator } from "@/i18n/translation/azure";
import { translationPolicyVersion } from "@/i18n/translation/runner";
import { blogReadingMinutes, blogTopicSlug } from "@/lib/blog-locale";
import { blogSourceHash } from "@/lib/blog-translation-content";
import { schema } from "../database";
import {
  blogTargetLocales,
  blogTranslationProgress,
  drainBlogTranslationBatch,
  enqueueBlogTranslations,
  toBlogTranslationSource,
} from "../utils/blog-translation";
import { withContext } from "../utils/context";
import { Environment } from "../utils/environment";
import { UnauthenticatedError } from "../utils/error";
import { type Document, repository } from "../utils/repository";
// Safe one-way edge: `./babylovegrowth` deliberately does not import this
// module (it re-declares `BLOG_CACHE_TAG` rather than pull it from here).
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
export const listPublished = async (locale: Locale = "en") => {
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
  locale: Locale = "en",
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
const findPublished = async (slug: string, locale: Locale) => {
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

const faqSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export type Faq = z.infer<typeof faqSchema>;

type BlogSection = { number: string; title: string; content: string };
const estimateReadTime = (html: string) =>
  `${blogReadingMinutes(html, "en")} min`;

type LocaleRowValues = {
  slug: string;
  locale: Locale;
  source: "local" | "blg" | "repo";
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
  sections?: readonly BlogSection[];
  contentHtml: string | null;
  /**
   * `undefined` keeps whatever is stored; `[]` clears it. BabyLoveGrowth only
   * ships `faqJsonLd` on its newer articles, and the reconcile cron re-ingests
   * an older one every time it is missing a locale — writing the payload's
   * absence through would erase the hand-written pairs those posts carry.
   */
  faqs?: readonly Faq[];
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
    sections: values.sections ?? [],
    contentHtml: values.contentHtml,
    ...(values.faqs ? { faqs: values.faqs } : {}),
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

export type Resolved = { kind: "post"; post: Type };

/**
 * Shared slugs across published locales. Stored `blog_post` rows only — never live BLG.
 * Public SSG uses many workers; per-process rate limits cannot stop a BLG
 * stampede. Persist complete translations through the job queue, then ISR.
 */
export const resolve = async ({
  slug,
  locale,
}: {
  slug: string;
  locale: Locale;
}) =>
  resultify(async () => {
    const stored = await getPublishedBySlug(slug, locale);
    if (stored) return { kind: "post" as const, post: stored };

    return null;
  });

/** English catalog slugs from Postgres — public SSG must not depend on live BLG. */
export const listCatalogSlugs = async () => {
  const englishRows = await find(Environment.SERVER, {
    where: and(eq(schema.blogPost.locale, "en"), published),
  });
  if (!englishRows.success) throw englishRows.error;
  return englishRows.data.map((row) => row.slug);
};

/** Only real published locale/slug pairs may be indexed or advertised as alternates. */
export const listPublishedLocales = async (slug: string) => {
  "use cache";
  cacheLife("hours");
  cacheTag(BLOG_CACHE_TAG);
  const rows = await find(Environment.SERVER, {
    where: and(published, eq(schema.blogPost.slug, slug)),
  });
  if (!rows.success) throw rows.error;
  return rows.data.map((row) => row.locale).filter(isPublishedLocale);
};

export const listPublishedPaths = async () => {
  const rows = await find(Environment.SERVER, { where: published });
  if (!rows.success) throw rows.error;
  return rows.data.flatMap((row) =>
    isPublishedLocale(row.locale)
      ? [{ locale: row.locale, slug: row.slug }]
      : [],
  );
};

/** Published posts whose category/tags map to the localized topic slug. */
export const listPublishedByTag = async (
  tagSlug: string,
  locale: Locale = "en",
) => {
  const posts = await listPublished(locale);
  return posts.filter((post) =>
    [post.category, ...post.tags].some(
      (keyword) => keyword.trim() && blogTopicSlug(keyword) === tagSlug,
    ),
  );
};

/**
 * BabyLoveGrowth authors an FAQ block into the article body and ships the same
 * pairs as ready-made `FAQPage` JSON-LD. Reading them off the payload is the
 * only way to get the questions as data — recovering them from the rendered
 * HTML means guessing at a translated heading, and a miss there is silent.
 * Older articles have no `faqJsonLd` at all, which is why `undefined` (rather
 * than `[]`) is what an absent block normalizes to.
 */
const faqJsonLdSchema = z.object({
  mainEntity: z.array(
    z.object({
      name: z.string(),
      acceptedAnswer: z.object({ text: z.string() }).nullish(),
    }),
  ),
});

const normalizeFaqJsonLd = (value: unknown) => {
  const parsed = faqJsonLdSchema.safeParse(value);
  if (!parsed.success) return undefined;

  const faqs = parsed.data.mainEntity
    .map((entry) => ({
      question: entry.name.trim(),
      answer: entry.acceptedAnswer?.text.trim() ?? "",
    }))
    .filter((faq) => faq.question && faq.answer);

  return faqs.length > 0 ? faqs : undefined;
};

/**
 * BabyLoveGrowth's article payload is snake_case for `meta_description`,
 * `hero_image_url` and `created_at` (see `BlogArticleSummary` in the client
 * package) and camelCase for the rest. Reading only the camelCase spellings
 * still parsed — every one of those fields is optional — so a real delivery
 * stored an empty description, no hero image, and today's date as
 * `publishedAt`, silently. Both spellings are accepted and normalized here so
 * `ingestPublish` keeps taking one shape.
 */
const publishPayloadSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    title: z.string(),
    slug: z.string(),
    content_html: z.string(),
    content_markdown: z.string().optional(),
    languageCode: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    seedKeyword: z.string().optional().nullable(),
    meta_description: z.string().optional().nullable(),
    metaDescription: z.string().optional().nullable(),
    hero_image_url: z.string().optional().nullable(),
    heroImageUrl: z.string().optional().nullable(),
    created_at: z.string().optional(),
    createdAt: z.string().optional(),
    faqJsonLd: z.unknown().optional(),
  })
  .transform((payload) => ({
    id: payload.id,
    title: payload.title,
    slug: payload.slug,
    content_html: payload.content_html,
    content_markdown: payload.content_markdown,
    languageCode: payload.languageCode,
    keywords: payload.keywords,
    seedKeyword: payload.seedKeyword,
    metaDescription: payload.meta_description ?? payload.metaDescription ?? "",
    heroImageUrl: payload.hero_image_url ?? payload.heroImageUrl ?? null,
    createdAt: payload.created_at ?? payload.createdAt,
    faqs: normalizeFaqJsonLd(payload.faqJsonLd),
  }));

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
 * Persist the English source and durable target-locale jobs. Only completed,
 * reviewed translations become published rows; failures never roll English back.
 */
const ingestPublishCore = async (payload: PublishPayload) => {
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

  const english = await upsertLocaleRow({
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
    faqs: payload.faqs,
  });

  if (!english) throw new Error("English article was not persisted");
  const queued = await enqueueBlogTranslations(english, undefined, {
    replacePublished: true,
  });
  return {
    success: true as const,
    data: {
      skipped: false as const,
      id: english.id,
      action: "upserted-en-queued" as const,
      queued,
    },
  };
};

export const ingestPublish = withContext(
  async (_context, payload: PublishPayload) => await ingestPublishCore(payload),
  "Blog.ingestPublish",
);

/** Repair missing English publishes and enqueue incomplete locale coverage without retranslating reviewed rows. */
export const reconcileCatalog = async ({
  limit = 1,
}: {
  limit?: number;
} = {}) =>
  resultify(async () => {
    const stored = await find(Environment.SERVER, { where: published });
    if (!stored.success) throw stored.error;
    const english = stored.data.filter((row) => row.locale === "en");
    const present = new Set(english.map((row) => row.slug));
    const catalog = await BabyLoveGrowth.listArticlesFresh();
    const missing = catalog.filter(
      (article) =>
        (!article.languageCode || article.languageCode === "en") &&
        !present.has(article.slug),
    );
    const ingested: string[] = [];
    const failed: { slug: string; error: string }[] = [];
    for (const article of missing.slice(0, limit)) {
      const result = await resultify(async () => {
        const full = await BabyLoveGrowth.getArticleFresh(article.slug);
        const payload = parsePublishPayload(full);
        if (!payload.success) throw payload.error;
        return ingestPublishCore(payload.data);
      });
      if (!result.success)
        failed.push({ slug: article.slug, error: String(result.error) });
      else ingested.push(article.slug);
    }
    const progress = await blogTranslationProgress();
    const byKey = new Map(
      progress.map((job) => [`${job.slug}:${job.locale}`, job]),
    );
    const publishedKeys = new Set(
      stored.data.map((post) => `${post.slug}:${post.locale}`),
    );
    const candidates = english.filter((post) => {
      const hash = blogSourceHash(
        toBlogTranslationSource(post),
        translationPolicyVersion,
      );
      return blogTargetLocales.some((locale) => {
        const job = byKey.get(`${post.slug}:${locale}`);
        return job
          ? job.sourceHash !== hash
          : !publishedKeys.has(`${post.slug}:${locale}`);
      });
    });
    for (const post of candidates.slice(0, limit))
      await enqueueBlogTranslations(post);
    return {
      missingEnglish: missing.length,
      queuedSources: candidates.slice(0, limit).map((post) => post.slug),
      ingested,
      failed,
    };
  });

/** One reviewed batch per request; long articles resume on following ticks. */
export const drainTranslations = async () =>
  resultify(async () => {
    const result = await drainBlogTranslationBatch({
      generate: createAzureTranslationGenerator({
        timeoutMs: 50_000,
        maxRetries: 1,
      }),
    });
    if (result.status === "published") purgeBlogCache();
    return result;
  });
