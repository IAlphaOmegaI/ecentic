// Not a `"use server"` module: this file exports cache tags, sync webhook
// helpers, and `"use cache"` readers alongside withContext actions.
// A file-level `"use server"` may only export async functions — mixing in
// `BLOG_CACHE_TAG` / `parsePublishPayload` emptied the module's export surface
// under Turbopack (PR #15 consolidate) and broke the production build.

import { join } from "node:path";
import * as Sentry from "@sentry/nextjs";
import { resultify } from "@zenncore/utils";
import { slugify } from "babylovegrowth-next-js-blog";
import { and, eq, inArray, or } from "drizzle-orm";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { RETIRED_BLOG_POSTS } from "@/lib/blog-redirects";
import { schema } from "../database";
import * as AI from "../utils/ai";
import * as BlogContent from "../utils/blog-content";
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
 * A post folded into another one stays `published` in Postgres (BLG may
 * re-send it) but leaves every public list — its URL now redirects.
 */
const isListed = (row: { slug: string }) => !RETIRED_BLOG_POSTS.has(row.slug);

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
  return rows.data.filter(isListed);
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

const faqSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export type Faq = z.infer<typeof faqSchema>;

const metaTranslationSchema = z.object({
  title: z.string(),
  metaDescription: z.string(),
  introduction: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  takeaways: z.array(z.string()),
  faqs: z.array(faqSchema),
});

const htmlChunkSchema = z.object({
  html: z.string(),
});

const sectionSchema = z.object({
  number: z.string(),
  title: z.string(),
  content: z.string(),
});

type BlogSection = z.infer<typeof sectionSchema>;

type TranslateArticleInput = {
  title: string;
  metaDescription: string;
  contentHtml: string;
  category?: string;
  tags?: readonly string[];
  introduction?: string;
  takeaways?: readonly string[];
  faqs?: readonly Faq[];
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

const plainTextLength = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;

const KEEP_TOKEN = (index: number) => `<!--ECENTIC_KEEP_${index}-->`;
const KEEP_PATTERN = /<!--ECENTIC_KEEP_(\d+)-->/g;
/** Soft ceiling so structured JSON + Spanish still fits model output. */
const HTML_CHUNK_CHAR_LIMIT = 4_500;
const MIN_TRANSLATION_LENGTH_RATIO = 0.55;

const extractPreservedBlocks = (html: string) => {
  const blocks: string[] = [];
  const body = html.replace(
    /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,
    (match) => {
      const index = blocks.length;
      blocks.push(match);
      return KEEP_TOKEN(index);
    },
  );

  return {
    body,
    restore: (translated: string) =>
      translated.replace(KEEP_PATTERN, (_match, digits: string) => {
        const index = Number(digits);
        return blocks[index] ?? "";
      }),
  };
};

const splitOversizedChunk = (chunk: string): string[] => {
  if (chunk.length <= HTML_CHUNK_CHAR_LIMIT) return [chunk];

  const paragraphs = chunk.split(/(?=<p\b)/i);
  const pieces: string[] = [];
  let buffer = "";

  for (const paragraph of paragraphs) {
    if (!paragraph) continue;
    if (buffer && buffer.length + paragraph.length > HTML_CHUNK_CHAR_LIMIT) {
      pieces.push(buffer);
      buffer = paragraph;
      continue;
    }
    buffer += paragraph;
  }

  if (buffer) pieces.push(buffer);
  return pieces.length > 0 ? pieces : [chunk];
};

const chunkHtmlForTranslation = (html: string): string[] => {
  if (html.length <= HTML_CHUNK_CHAR_LIMIT) return [html];

  const parts = html.split(/(?=<h[1-6]\b)/i);
  const chunks: string[] = [];
  let current = "";

  for (const part of parts) {
    if (!part) continue;
    if (current && current.length + part.length > HTML_CHUNK_CHAR_LIMIT) {
      chunks.push(...splitOversizedChunk(current));
      current = part;
      continue;
    }
    current += part;
  }

  if (current) chunks.push(...splitOversizedChunk(current));
  return chunks;
};

/** Models sometimes emit Markdown inside HTML — coerce common markers. */
const demarkdownHtml = (html: string) =>
  html
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(?<![*\w])\*([^*]+)\*(?![*\w])/g, "<em>$1</em>");

const alignStringArray = (
  source: readonly string[],
  translated: readonly string[],
) => source.map((value, index) => translated[index] ?? value);

/**
 * Same contract as `alignStringArray`: the English array is authoritative for
 * length and order, so a model that drops, merges, or invents a pair cannot
 * change how many questions the Spanish row answers — only their wording.
 */
const alignFaqs = (source: readonly Faq[], translated: readonly Faq[]) =>
  source.map((faq, index) => ({
    question: translated[index]?.question ?? faq.question,
    answer: translated[index]?.answer ?? faq.answer,
  }));

const translateBrandRules = `Keep the product name "ecentic" untranslated (lowercase as written). Keep ChatGPT, Claude, Gemini, Perplexity, Shopify, and WooCommerce untranslated. Never substitute a different product for one the source names — "ChatGPT" is never "GPT-4", and a plan name (Compete, Scale, Dominate) always keeps the price the source gave it.`;

/**
 * Prices are the one thing a translation cannot paraphrase. An earlier pass
 * dropped the decimal separator and shifted every ecentic plan up a tier in
 * Spanish — "$14.90/mo" became "149 $/mes", "$44.90" became "449 $", and
 * Dominate inherited Scale's number — which is a wrong price on a live page,
 * not a wording problem.
 */
const translateNumberRules =
  "Copy every number exactly as the source gives it: prices, percentages, dates, counts. Only the decimal and thousands separators change for Spanish (14.90 → 14,90; 1,500 → 1.500). Never drop a separator, never round, and never drop or merge an item from a list of priced things.";

const translateMetaCore = async (input: {
  title: string;
  metaDescription: string;
  introduction: string;
  category: string;
  tags: readonly string[];
  takeaways: readonly string[];
  faqs: readonly Faq[];
}) => {
  const meta = await AI.generate({
    label: "Blog.translateArticleMeta",
    model: "gpt",
    output: metaTranslationSchema,
    schemaName: "SpanishBlogMeta",
    instructions: `You translate ecommerce blog metadata from English to Spanish (es-ES).

Rules:
- ${translateBrandRules}
- ${translateNumberRules}
- Write natural Spanish for merchants; do not invent new fields.
- title and metaDescription are search-result copy, not prose: title must be at most 60 characters and metaDescription at most 160. Spanish runs longer than English, so rewrite for the limit — drop a qualifier, use a shorter synonym — rather than translating literally and overflowing. Everything past those limits is truncated in the SERP.
- tags, takeaways and faqs must keep the same count and order as the input arrays.
- faqs entries are a reader-facing question and its answer; translate both, keep the question phrased as a question, and do not shorten the answer.
- Never use Markdown.`,
    prompt: JSON.stringify({
      title: input.title,
      metaDescription: input.metaDescription,
      introduction: input.introduction,
      category: input.category,
      tags: input.tags,
      takeaways: input.takeaways,
      faqs: input.faqs,
    }),
  });

  return {
    title: meta.title,
    metaDescription: meta.metaDescription,
    introduction: meta.introduction,
    category: meta.category,
    tags: alignStringArray(input.tags, meta.tags),
    takeaways: alignStringArray(input.takeaways, meta.takeaways),
    faqs: alignFaqs(input.faqs, meta.faqs),
  };
};

const translateHtmlChunk = async (
  englishHtml: string,
  attempt = 0,
): Promise<string> => {
  const translated = await AI.generate({
    label: "Blog.translateHtmlChunk",
    model: "gpt",
    output: htmlChunkSchema,
    schemaName: "SpanishBlogHtmlChunk",
    instructions: `You translate ecommerce blog HTML from English to Spanish (es-ES).

Rules:
- Return ONLY Spanish HTML in html. Never Markdown (**bold**, _italic_, # headings, - lists as MD).
- Preserve every HTML tag and attribute (same structure). Translate visible text nodes only.
- Do not omit paragraphs, lists, tables, or links. Output length should be similar to the input.
- Keep URLs and href/src/class/id/data-* values unchanged.
- ${translateBrandRules}
- ${translateNumberRules}
- Leave <!--ECENTIC_KEEP_N--> placeholders exactly as written.`,
    prompt: englishHtml,
  });

  const html = demarkdownHtml(translated.html.trim());
  const sourceLength = plainTextLength(englishHtml);
  const targetLength = plainTextLength(html);

  if (
    sourceLength > 200 &&
    targetLength < sourceLength * MIN_TRANSLATION_LENGTH_RATIO &&
    attempt < 1
  ) {
    return translateHtmlChunk(englishHtml, attempt + 1);
  }

  return html;
};

/**
 * Translate EN → es-ES with Azure (gpt seat).
 * Meta is one call; HTML is chunked (scripts/styles preserved) so long BLG
 * bodies are not truncated mid-article.
 */
const translateArticleCore = async (input: TranslateArticleInput) => {
  const tags = input.tags ?? [];
  const takeaways = input.takeaways ?? [];
  const faqs = input.faqs ?? [];
  const category = input.category ?? "Guide";
  const introduction = input.introduction ?? input.metaDescription;

  return resultify(async () => {
    const meta = await translateMetaCore({
      title: input.title,
      metaDescription: input.metaDescription,
      introduction,
      category,
      tags,
      takeaways,
      faqs,
    });

    const preserved = extractPreservedBlocks(input.contentHtml);
    const chunks = chunkHtmlForTranslation(preserved.body);
    const translatedChunks: string[] = [];

    for (const chunk of chunks) {
      translatedChunks.push(await translateHtmlChunk(chunk));
    }

    return {
      ...meta,
      contentHtml: demarkdownHtml(preserved.restore(translatedChunks.join(""))),
    };
  });
};

/** Editorial posts store body in `sections` (plain text), not `contentHtml`. */
const translateSectionsCore = async (sections: readonly BlogSection[]) => {
  const translated: BlogSection[] = [];

  for (const section of sections) {
    const result = await AI.generate({
      label: "Blog.translateSection",
      model: "gpt",
      output: sectionSchema,
      schemaName: "SpanishBlogSection",
      instructions: `You translate one ecommerce blog section from English to Spanish (es-ES).

Rules:
- ${translateBrandRules}
- ${translateNumberRules}
- Keep the same section number.
- content is plain text (paragraphs separated by blank lines; lines starting with "- " are list items). Do not emit HTML tags.
- Preserve existing **bold** / list markers only when the English source already uses them; do not invent Markdown.
- Translate the full content — do not shorten or summarize.`,
      prompt: JSON.stringify(section),
    });
    translated.push(result);
  }

  return translated;
};

type LocaleRowValues = {
  slug: string;
  locale: "en" | "es";
  source: Type["source"];
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
 * Same slug catalog for EN/ES. Stored `blog_post` rows only — never live BLG.
 * Public SSG uses many workers; per-process rate limits cannot stop a BLG
 * stampede. Persist via the BabyLoveGrowth webhook (EN + Azure ES), then ISR.
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

    if (locale === "es") {
      const english = await getPublishedBySlug(slug, "en");
      if (english) return { kind: "post" as const, post: english };
    }

    return null;
  });

/** English catalog slugs from Postgres — public SSG must not depend on live BLG. */
export const listCatalogSlugs = async () => {
  const englishRows = await find(Environment.SERVER, {
    where: and(eq(schema.blogPost.locale, "en"), published),
  });
  if (!englishRows.success) throw englishRows.error;
  return englishRows.data.filter(isListed).map((row) => row.slug);
};

/** Published posts whose category/tags slugify to `tagSlug`. */
export const listPublishedByTag = async (
  tagSlug: string,
  locale: "en" | "es" = "en",
) => {
  const posts = await listPublished(locale);
  return posts.filter((post) =>
    [post.category, ...post.tags].some(
      (keyword) => keyword.trim() && slugify(keyword) === tagSlug,
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

/** One article in the shape every write path hands to `ingestArticleCore`. */
type Article = {
  slug: string;
  source: Type["source"];
  externalId: string;
  title: string;
  description: string;
  publishedAt: string;
  category: string;
  tags: readonly string[];
  thumbnailUrl: string | null;
  contentHtml: string;
  /** Same contract as `LocaleRowValues.faqs`: `undefined` keeps what is stored. */
  faqs?: readonly Faq[];
};

/** Whether a markdown file in `content/blog` has claimed this slug. */
const claimedByRepo = async (slug: string) => {
  const rows = await find(Environment.SERVER, {
    where: and(
      eq(schema.blogPost.slug, slug),
      eq(schema.blogPost.source, "repo"),
    ),
    limit: 1,
  });
  if (!rows.success) throw rows.error;
  return rows.data.length > 0;
};

const skipRepoOwned = (slug: string, id?: string | number) => {
  Sentry.captureMessage(
    "BLG publish skipped: slug is published from the repo",
    {
      level: "info",
      tags: { integration: "babylovegrowth" },
      extra: { slug, id },
    },
  );
  return {
    success: true as const,
    data: { skipped: true as const, reason: "repo-owned" as const },
  };
};

/**
 * Persist EN, Azure-translate to ES, upsert both rows (same slug), purge the
 * `blog` tag so static pages regenerate. Shared by the BabyLoveGrowth webhook
 * and reconcile and by repo posts, so every source gets the same translation.
 * English is always written first — ES translate failure does not roll EN back.
 */
const ingestArticleCore = async (article: Article) => {
  const english = await upsertLocaleRow({
    slug: article.slug,
    locale: "en",
    source: article.source,
    externalId: article.externalId,
    category: article.category,
    title: article.title,
    description: article.description,
    introduction: article.description,
    publishedAt: article.publishedAt,
    readTime: estimateReadTime(article.contentHtml),
    thumbnailUrl: article.thumbnailUrl,
    tags: article.tags,
    takeaways: [],
    contentHtml: article.contentHtml,
    faqs: article.faqs,
  });

  // Spanish is translated from whatever English ended up with, not from the
  // payload: a post BLG never sent `faqJsonLd` for still has hand-written pairs
  // on its English row, and those deserve a Spanish rendering too.
  const translation = await translateArticleCore({
    title: article.title,
    metaDescription: article.description,
    contentHtml: article.contentHtml,
    category: article.category,
    tags: article.tags,
    introduction: article.description,
    takeaways: [],
    faqs: article.faqs ?? english?.faqs ?? [],
  });

  if (!translation.success)
    return {
      success: true as const,
      data: {
        skipped: false as const,
        id: english?.id,
        action: "upserted-en-only" as const,
        esError:
          translation.error instanceof Error
            ? translation.error.message
            : String(translation.error),
      },
    };

  // The translation took minutes, long enough for a repo file to claim the
  // slug, and a BLG write never lands on a repo row.
  if (article.source === "blg" && (await claimedByRepo(article.slug)))
    return skipRepoOwned(article.slug, article.externalId);

  // A repo post's English body is the sanitized render of a reviewed file; its
  // Spanish body is model output, so it goes through the same allowlist.
  const spanishHtml =
    article.source === "repo"
      ? BlogContent.sanitize(translation.data.contentHtml)
      : translation.data.contentHtml;

  const spanish = await upsertLocaleRow({
    slug: article.slug,
    locale: "es",
    source: article.source,
    externalId: article.externalId,
    category: translation.data.category,
    title: translation.data.title,
    description: translation.data.metaDescription,
    introduction: translation.data.introduction,
    publishedAt: article.publishedAt,
    readTime: estimateReadTime(spanishHtml),
    thumbnailUrl: article.thumbnailUrl,
    tags: translation.data.tags,
    takeaways: translation.data.takeaways,
    contentHtml: spanishHtml,
    faqs: translation.data.faqs,
  });

  return {
    success: true as const,
    data: {
      skipped: false as const,
      id: spanish?.id ?? english?.id,
      action: "upserted" as const,
    },
  };
};

/**
 * Every row stored under these slugs, in any locale or status, plus every
 * repo row — the second half is what finds the orphans of deleted files.
 */
const findStoredRows = async (slugs: readonly string[]) => {
  const repo = eq(schema.blogPost.source, "repo");
  const rows = await find(Environment.SERVER, {
    where:
      slugs.length > 0
        ? or(inArray(schema.blogPost.slug, [...slugs]), repo)
        : repo,
  });
  if (!rows.success) throw rows.error;
  return rows.data;
};

/**
 * Persist a BLG publish through `ingestArticleCore`. A slug published from the
 * repo is the repo's: the file in `content/blog` replaced the BLG article on
 * purpose, and neither the webhook nor the reconcile may write it back.
 */
const ingestPublishCore = async (payload: PublishPayload) => {
  if (payload.languageCode && payload.languageCode !== "en")
    return {
      success: true as const,
      data: { skipped: true as const, reason: "non-english" as const },
    };

  if (await claimedByRepo(payload.slug))
    return skipRepoOwned(payload.slug, payload.id);

  return await ingestArticleCore({
    slug: payload.slug,
    source: "blg",
    externalId: String(payload.id),
    title: payload.title,
    description: payload.metaDescription,
    publishedAt: (payload.createdAt ?? new Date().toISOString()).slice(0, 10),
    category: payload.seedKeyword ?? "Guide",
    tags: payload.keywords ?? [],
    thumbnailUrl: payload.heroImageUrl ?? null,
    contentHtml: payload.content_html,
    faqs: payload.faqs,
  });
};

export const ingestPublish = withContext(
  async (_context, payload: PublishPayload) => await ingestPublishCore(payload),
  "Blog.ingestPublish",
);

/**
 * Catch-up for publishes the webhook never delivered. That webhook is the only
 * write path for BLG posts, so a single dropped POST — a redirect the sender
 * does not follow, a deploy mid-flight, a 500 — leaves the post permanently
 * absent from Postgres and therefore 404 on the site, with nothing to notice it.
 * This diffs BLG's published catalog against stored rows and ingests whatever is
 * missing either locale, EN + ES, through the same path the webhook uses.
 *
 * `limit` is per tick on purpose: one ingest translates a whole article through
 * Azure and runs for minutes, so the backlog is walked a post at a time rather
 * than spending the route's `maxDuration` on a fan-out.
 */
export const reconcileCatalog = async ({
  limit = 1,
}: {
  limit?: number;
} = {}) =>
  await resultify(async () => {
    const stored = await find(Environment.SERVER, { where: published });
    if (!stored.success) throw stored.error;

    const storedLocales = stored.data.reduce((locales, row) => {
      locales.set(
        row.slug,
        (locales.get(row.slug) ?? new Set()).add(row.locale),
      );
      return locales;
    }, new Map<string, Set<string>>());

    // `ingestPublishCore` would skip these anyway; leaving them out here is
    // what keeps a repo post that is missing a locale from being picked every
    // tick and starving the BLG backlog behind it. Any status counts, as it
    // does for that skip, so a repo row hidden by hand cannot do the same.
    const repoRows = await find(Environment.SERVER, {
      where: eq(schema.blogPost.source, "repo"),
    });
    if (!repoRows.success) throw repoRows.error;
    const repoOwned = new Set(repoRows.data.map((row) => row.slug));

    const catalog = await BabyLoveGrowth.listArticlesFresh();

    const missing = catalog
      .filter((article) => {
        if (article.languageCode && article.languageCode !== "en") return false;
        if (repoOwned.has(article.slug)) return false;
        const locales = storedLocales.get(article.slug);
        return !locales?.has("en") || !locales.has("es");
      })
      // A post with no rows at all is the 404; one missing only ES still
      // renders, because `resolve` falls back to the English row. Repair the
      // 404s first so a post whose translation keeps failing — which stays in
      // this list, and at `limit: 1` would be picked every tick — cannot starve
      // a newly published one out of the site entirely.
      .sort(
        (first, second) =>
          Number(storedLocales.has(first.slug)) -
          Number(storedLocales.has(second.slug)),
      );

    const ingested: string[] = [];
    const partial: { slug: string; esError: string }[] = [];
    const failed: { slug: string; error: string }[] = [];

    for (const article of missing.slice(0, limit)) {
      // The published-article shape is exactly what the webhook posts, so it
      // goes through the same parse — one payload contract, not two.
      const full = await BabyLoveGrowth.getArticleFresh(article.slug);
      if (!full) {
        failed.push({ slug: article.slug, error: "not published on BLG" });
        continue;
      }

      const payload = parsePublishPayload(full);
      if (!payload.success) {
        failed.push({ slug: article.slug, error: payload.error.message });
        continue;
      }

      const result = await ingestPublishCore(payload.data);
      if (result.data.skipped) continue;

      // EN landed, ES did not. The row stays missing a locale, so the next tick
      // sees it again and retries the translation — no separate repair path.
      if (result.data.action === "upserted-en-only") {
        partial.push({ slug: article.slug, esError: result.data.esError });
        continue;
      }

      ingested.push(article.slug);
    }

    return { candidates: missing.length, ingested, partial, failed };
  });

/**
 * The second automatic write path: markdown files in `apps/web/content/blog`
 * (see the README there). The cron reads them from its own deployment bundle —
 * `next.config.ts` traces the folder into the route — so a post goes live with
 * the deploy that ships it, hero image included, and never ahead of it.
 *
 * Each file is checked like `bun run blog:check` checks it in CI (frontmatter,
 * markdown structure, house voice — everything but whether an image exists,
 * since `public/` is not in a function bundle). A file that fails is reported
 * in `invalid` and never published, so a post merged past a red check stays
 * off the site rather than going out as it is.
 *
 * A post needs work when its EN or ES row is missing, belongs to another
 * source, or was ingested from different bytes (`externalId` carries the
 * content hash). A repo file takes over a BabyLoveGrowth slug by rewriting both
 * rows. Drafts are skipped. Rows whose file is gone are left alone and listed
 * in `orphaned`, to be removed by hand if that was the intent.
 *
 * Same pacing as `reconcileCatalog`: one post per tick, 404s first.
 */
export const reconcileRepoPosts = async ({
  limit = 1,
  // `turbopackIgnore`: a `process.cwd()` path is otherwise read as "any file",
  // and Turbopack traces the whole project into every route importing this
  // module. The folder reaches the cron through `outputFileTracingIncludes`.
  directory = join(
    /*turbopackIgnore: true*/ process.cwd(),
    BlogContent.CONTENT_DIRECTORY,
  ),
}: {
  limit?: number;
  directory?: string;
} = {}) =>
  await resultify(async () => {
    const files = await BlogContent.read(directory);
    const reports = BlogContent.validate(files);
    const posts = reports.flatMap((report) => report.post ?? []);
    const rows = await findStoredRows(reports.map((report) => report.slug));

    const { pending, orphaned } = BlogContent.plan({
      posts,
      slugs: new Set(reports.map((report) => report.slug)),
      rows,
    });

    const ingested: string[] = [];
    const partial: { slug: string; esError: string }[] = [];
    const failed: { slug: string; error: string }[] = [];

    for (const post of pending.slice(0, limit)) {
      // A tick cut off at `maxDuration` mid-translation reports nothing else.
      console.info("[blog] ingesting", post.path);
      const result = await resultify(() =>
        ingestArticleCore({
          slug: post.slug,
          source: "repo",
          externalId: post.externalId,
          title: post.title,
          description: post.description,
          publishedAt: post.publishedAt,
          category: post.category,
          tags: post.tags,
          thumbnailUrl: post.thumbnailUrl,
          contentHtml: post.contentHtml,
          // Always explicit: the file is the whole truth, so a takeover of a
          // BLG slug must clear that article's pairs when the file has none.
          faqs: post.faqs,
        }),
      );

      if (!result.success) {
        failed.push({
          slug: post.slug,
          error:
            result.error instanceof Error
              ? result.error.message
              : String(result.error),
        });
        continue;
      }

      // EN landed, ES did not. The ES row still carries the old hash (or is
      // missing), so the next tick retries — no separate repair path.
      if (result.data.data.skipped) continue;
      if (result.data.data.action === "upserted-en-only") {
        partial.push({ slug: post.slug, esError: result.data.data.esError });
        continue;
      }

      ingested.push(post.slug);
    }

    const live = new Set(
      rows.filter((row) => row.source === "repo").map((row) => row.slug),
    );

    return {
      files: files.length,
      candidates: pending.length,
      ingested,
      partial,
      failed,
      invalid: reports
        .filter((report) => report.errors.length > 0)
        .map((report) => ({
          path: report.path,
          errors: report.errors.map(
            (issue) => `line ${issue.line}: ${issue.message}`,
          ),
        })),
      drafts: posts
        .filter((post) => post.draft)
        .map((post) => ({ slug: post.slug, live: live.has(post.slug) })),
      orphaned,
    };
  });

/**
 * Which automatic source wrote a post most recently. The blog cron runs the
 * other one first, so neither rail can hold every tick: one that just spent a
 * tick ingesting yields the next one.
 */
export const lastWriter = async () => {
  const latest = await find(Environment.SERVER, {
    where: inArray(schema.blogPost.source, ["blg", "repo"]),
    orderBy: [{ column: schema.blogPost.updatedAt, direction: "desc" }],
    limit: 1,
  });
  if (!latest.success) throw latest.error;
  return latest.data[0]?.source ?? null;
};

/**
 * Rebuild Spanish from a stored English row (editorial sections or BLG HTML).
 * Used to repair truncated / Markdown-contaminated ES after translate changes.
 * Steady-state publishes go through `ingestPublish` (webhook) only.
 */
export const resyncSpanishFromEnglishCore = async (slug: string) => {
  const english = await findPublished(slug, "en");
  if (!english)
    return {
      success: false as const,
      error: new Error(`No English row for slug: ${slug}`),
    };

  const metaInput = {
    title: english.title,
    metaDescription: english.description,
    introduction: english.introduction,
    category: english.category,
    tags: english.tags,
    takeaways: english.takeaways,
    faqs: english.faqs,
  };

  if (english.sections.length > 0 && !english.contentHtml?.trim()) {
    const meta = await resultify(() => translateMetaCore(metaInput));
    if (!meta.success) return meta;

    const sections = await resultify(() =>
      translateSectionsCore([...english.sections]),
    );
    if (!sections.success) return sections;

    const bodyForReadTime = sections.data
      .map((section) => `${section.title}\n${section.content}`)
      .join("\n");

    const spanish = await upsertLocaleRow({
      slug: english.slug,
      locale: "es",
      source: english.source,
      externalId: english.externalId,
      category: meta.data.category,
      title: meta.data.title,
      description: meta.data.metaDescription,
      introduction: meta.data.introduction,
      publishedAt: english.publishedAt,
      readTime: estimateReadTime(bodyForReadTime),
      thumbnailUrl: english.thumbnailUrl,
      tags: meta.data.tags,
      takeaways: meta.data.takeaways,
      sections: sections.data,
      contentHtml: null,
      faqs: meta.data.faqs,
    });

    return {
      success: true as const,
      data: { slug, mode: "sections" as const, id: spanish?.id },
    };
  }

  const contentHtml = english.contentHtml?.trim();
  if (!contentHtml)
    return {
      success: false as const,
      error: new Error(`English row has no body for slug: ${slug}`),
    };

  const translation = await translateArticleCore({
    title: english.title,
    metaDescription: english.description,
    contentHtml,
    category: english.category,
    tags: english.tags,
    introduction: english.introduction,
    takeaways: english.takeaways,
    faqs: english.faqs,
  });
  if (!translation.success) return translation;

  const spanishHtml =
    english.source === "repo"
      ? BlogContent.sanitize(translation.data.contentHtml)
      : translation.data.contentHtml;

  const spanish = await upsertLocaleRow({
    slug: english.slug,
    locale: "es",
    source: english.source,
    externalId: english.externalId,
    category: translation.data.category,
    title: translation.data.title,
    description: translation.data.metaDescription,
    introduction: translation.data.introduction,
    publishedAt: english.publishedAt,
    readTime: estimateReadTime(spanishHtml),
    thumbnailUrl: english.thumbnailUrl,
    tags: translation.data.tags,
    takeaways: translation.data.takeaways,
    sections: [],
    contentHtml: spanishHtml,
    faqs: translation.data.faqs,
  });

  return {
    success: true as const,
    data: { slug, mode: "html" as const, id: spanish?.id },
  };
};
