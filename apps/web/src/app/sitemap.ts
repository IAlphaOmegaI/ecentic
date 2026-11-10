import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { localizePath } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { marketingRoutes } from "@/lib/marketing-routes";
import { seo } from "@/lib/seo";
import * as Blog from "@/server/app/blog";

export default async (): Promise<MetadataRoute.Sitemap> => {
  // Tag the route's own cache entry, not just the `listPublished` reads inside
  // it. Those are already tagged, but their tags do not reach the metadata
  // route's entry: after a publish + `blog` purge the pages regenerated while
  // `sitemap.xml` kept serving the old set until the next deploy.
  "use cache";
  // Same lifetime as the `listPublished` reads it is built from — no reason for
  // the sitemap to regenerate more often than the rows behind it.
  cacheLife("hours");
  cacheTag(Blog.BLOG_CACHE_TAG);

  const [blogs, spanish] = await Promise.all([
    Blog.listPublished("en"),
    Blog.listPublished("es"),
  ]);
  const latestBlog = blogs[0]?.updatedAt ?? new Date("2026-04-07");
  const spanishBySlug = new Map(spanish.map((post) => [post.slug, post]));

  // No `alternates` here on purpose: hreflang ships in each page's head (see
  // `createMetadata`). Sitemap alternates render as `xhtml:link` entries whose
  // XHTML namespace makes browsers display the file as running text instead of
  // the plain XML document tree.
  const marketingEntries = routing.locales.flatMap((locale) =>
    marketingRoutes.map(({ path, changeFrequency, priority }) => {
      return {
        url: `${seo.host}${localizePath(path, locale)}`,
        lastModified: path === "/blog" ? latestBlog : new Date("2026-11-10"),
        changeFrequency,
        priority,
      };
    }),
  );

  const englishArticles = blogs.map((post) => ({
    url: `${seo.host}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.72,
  }));

  // Keep the EN fallback URLs, and include any independently published ES
  // slug as well. Never cap or hand-maintain the current database catalog.
  const spanishSlugs = new Set([
    ...blogs.map((post) => post.slug),
    ...spanish.map((post) => post.slug),
  ]);
  const englishBySlug = new Map(blogs.map((post) => [post.slug, post]));
  const spanishCatalog = [...spanishSlugs].flatMap((slug) => {
    const post = spanishBySlug.get(slug) ?? englishBySlug.get(slug);
    if (!post) return [];
    return [
      {
        url: `${seo.host}/es/blog/${slug}`,
        lastModified: post.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.72,
      },
    ];
  });

  return [...marketingEntries, ...englishArticles, ...spanishCatalog];
};
