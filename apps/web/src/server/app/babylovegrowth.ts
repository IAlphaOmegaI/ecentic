import {
  type BlogArticle,
  type BlogArticleSummary,
  BlogClient,
  type BlogSitemapEntry,
  type BlogTag,
  deriveTags,
  slugify,
} from "babylovegrowth-next-js-blog";
import { cacheLife, cacheTag } from "next/cache";

/**
 * BabyLoveGrowth CMS reads, cached with `"use cache"`.
 * Route-level `export const revalidate` is incompatible with Cache Components,
 * so these wrappers own the cache lifetime. Purge via `Revalidation.revalidateBlog`.
 *
 * Cache tag must stay `"blog"` — same as `Blog.BLOG_CACHE_TAG` (not imported
 * from `./blog` to avoid a cycle: blog → babylovegrowth → blog).
 *
 * The BLG API rate-limits to 2 req/s. Tags/sitemaps are derived from the
 * article list, fetches single-flight + retry on 429, and list helpers fail
 * soft so parallel prerenders never take down the build.
 */

const BLOG_CACHE_TAG = "blog";

/** Next Cache Components only — no-ops in Bun CLI / scripts. */
const applyBlogCache = (...tags: string[]) => {
  if (!process.env.__NEXT_USE_CACHE) return;
  cacheLife("days");
  cacheTag(...tags);
};

const client = () =>
  new BlogClient({
    apiKey: process.env.BABYLOVEGROWTH_BLOG_API_KEY,
    baseUrl: process.env.BABYLOVEGROWTH_BLOG_API_URL,
    revalidate: false,
  });

const isRateLimited = (error: unknown) =>
  error instanceof Error && /\b429\b/.test(error.message);

/** BLG allows max 2 req/s per API key — serialize all HTTP through this gap. */
const MIN_REQUEST_GAP_MS = 550;

const globalForBlg = globalThis as typeof globalThis & {
  __ecenticBlgArticles?: Promise<BlogArticleSummary[]>;
  __ecenticBlgQueue?: Promise<unknown>;
  __ecenticBlgLastAt?: number;
};

const withRateLimit = async <Data>(operation: () => Promise<Data>) => {
  const previous = globalForBlg.__ecenticBlgQueue ?? Promise.resolve();
  let release: (value: unknown) => void = () => {};
  globalForBlg.__ecenticBlgQueue = new Promise((resolve) => {
    release = resolve;
  });

  await previous.catch(() => undefined);

  const elapsed = Date.now() - (globalForBlg.__ecenticBlgLastAt ?? 0);
  const wait = Math.max(0, MIN_REQUEST_GAP_MS - elapsed);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));

  try {
    globalForBlg.__ecenticBlgLastAt = Date.now();
    return await operation();
  } finally {
    release(undefined);
  }
};

const withRetry = async <Data>(
  operation: () => Promise<Data>,
  attempts = 8,
): Promise<Data> => {
  const run = async (remaining: number): Promise<Data> => {
    try {
      return await withRateLimit(operation);
    } catch (error) {
      if (!isRateLimited(error) || remaining <= 1) throw error;
      const attempt = attempts - remaining + 1;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(8_000, 500 * 2 ** attempt)),
      );
      return run(remaining - 1);
    }
  };

  return run(attempts);
};

const articleKeywords = (article: BlogArticleSummary) =>
  [article.seedKeyword, ...article.keywords].filter(
    (keyword): keyword is string => Boolean(keyword?.trim()),
  );

const fetchAllArticles = (): Promise<BlogArticleSummary[]> => {
  if (!globalForBlg.__ecenticBlgArticles) {
    globalForBlg.__ecenticBlgArticles = withRetry(() =>
      client().getAllArticles({ publishedOnly: true }),
    ).catch((error: unknown) => {
      globalForBlg.__ecenticBlgArticles = undefined;
      throw error;
    });
  }
  return globalForBlg.__ecenticBlgArticles;
};

export const listArticles = async (): Promise<BlogArticleSummary[]> => {
  "use cache";
  applyBlogCache(BLOG_CACHE_TAG);

  if (!process.env.BABYLOVEGROWTH_BLOG_API_KEY) return [];

  try {
    return await fetchAllArticles();
  } catch {
    return [];
  }
};

/** Uncached list that throws — for scripts/backfill (not soft-empty). */
export const listArticlesStrict = async (): Promise<BlogArticleSummary[]> => {
  if (!process.env.BABYLOVEGROWTH_BLOG_API_KEY) {
    throw new Error("BABYLOVEGROWTH_BLOG_API_KEY is not configured");
  }
  return fetchAllArticles();
};

export const getArticleBySlug = async (
  slug: string,
): Promise<BlogArticle | null> => {
  "use cache";
  applyBlogCache(BLOG_CACHE_TAG, `blog-${slug}`);

  if (!process.env.BABYLOVEGROWTH_BLOG_API_KEY) return null;

  try {
    const article = await withRetry(() => client().getArticleBySlug(slug));
    if (!article?.published) return null;
    return article;
  } catch (error) {
    // Do not return null on transport/rate-limit failures — a soft null is
    // cached for `cacheLife("days")` and 404s English posts while Spanish
    // (served from Postgres) still works. Serialize via `withRateLimit` and
    // persist EN with `blog:backfill-english` so SSG rarely needs live BLG.
    throw error;
  }
};

export const listTags = async (): Promise<BlogTag[]> => {
  "use cache";
  applyBlogCache(BLOG_CACHE_TAG);

  const articles = await listArticles();
  return deriveTags(articles);
};

export const listArticlesByTag = async (
  tagSlug: string,
): Promise<BlogArticleSummary[]> => {
  "use cache";
  applyBlogCache(BLOG_CACHE_TAG, `blog-tag-${tagSlug}`);

  const articles = await listArticles();
  return articles.filter((article) =>
    articleKeywords(article).some((keyword) => slugify(keyword) === tagSlug),
  );
};

export const listSitemapEntries = async (): Promise<BlogSitemapEntry[]> => {
  "use cache";
  applyBlogCache(BLOG_CACHE_TAG);

  const articles = await listArticles();
  return articles.map((article) => ({
    slug: article.slug,
    created_at: article.created_at,
    updated_at: article.updated_at,
    languageCode: article.languageCode,
  }));
};
