// Not a `"use server"` module: this file exports cache tags, sync webhook
// helpers, and `"use cache"` readers alongside withContext actions.
// A file-level `"use server"` may only export async functions — mixing in
// `BLOG_CACHE_TAG` / `parsePublishPayload` emptied the module's export surface
// under Turbopack (PR #15 consolidate) and broke the production build.

import { resultify } from "@zenncore/utils";
import { slugify } from "babylovegrowth-next-js-blog";
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

const metaTranslationSchema = z.object({
  title: z.string(),
  metaDescription: z.string(),
  introduction: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  takeaways: z.array(z.string()),
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

const translateBrandRules = `Keep the product name "ecentic" untranslated (lowercase as written). Keep ChatGPT, Claude, Gemini, Perplexity, Shopify, and WooCommerce untranslated.`;

const translateMetaCore = async (input: {
  title: string;
  metaDescription: string;
  introduction: string;
  category: string;
  tags: readonly string[];
  takeaways: readonly string[];
}) => {
  const meta = await AI.generate({
    label: "Blog.translateArticleMeta",
    model: "gpt",
    output: metaTranslationSchema,
    schemaName: "SpanishBlogMeta",
    instructions: `You translate ecommerce blog metadata from English to Spanish (es-ES).

Rules:
- ${translateBrandRules}
- Write natural Spanish for merchants; do not invent new fields.
- tags and takeaways must keep the same count and order as the input arrays.
- Never use Markdown.`,
    prompt: JSON.stringify({
      title: input.title,
      metaDescription: input.metaDescription,
      introduction: input.introduction,
      category: input.category,
      tags: input.tags,
      takeaways: input.takeaways,
    }),
  });

  return {
    title: meta.title,
    metaDescription: meta.metaDescription,
    introduction: meta.introduction,
    category: meta.category,
    tags: alignStringArray(input.tags, meta.tags),
    takeaways: alignStringArray(input.takeaways, meta.takeaways),
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
  sections?: readonly BlogSection[];
  contentHtml: string | null;
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
  return englishRows.data.map((row) => row.slug);
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
 * Persist EN from a BLG publish, Azure-translate to ES, upsert both rows
 * (same slug), purge the `blog` tag so static pages regenerate.
 * English is always written first — ES translate failure does not roll EN back.
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
      id: spanish?.id ?? english?.id,
      action: "upserted" as const,
    },
  };
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

    const catalog = await BabyLoveGrowth.listArticlesFresh();

    const missing = catalog
      .filter((article) => {
        if (article.languageCode && article.languageCode !== "en") return false;
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
  });
  if (!translation.success) return translation;

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
    readTime: estimateReadTime(translation.data.contentHtml),
    thumbnailUrl: english.thumbnailUrl,
    tags: translation.data.tags,
    takeaways: translation.data.takeaways,
    sections: [],
    contentHtml: translation.data.contentHtml,
  });

  return {
    success: true as const,
    data: { slug, mode: "html" as const, id: spanish?.id },
  };
};
