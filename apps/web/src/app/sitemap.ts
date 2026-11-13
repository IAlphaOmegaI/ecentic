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

  const catalogs = await Promise.all(
    routing.locales.map(async (locale) => ({
      locale,
      posts: await Blog.listPublished(locale),
    })),
  );
  const latestBlog =
    catalogs
      .flatMap((catalog) => catalog.posts)
      .sort(
        (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
      )[0]?.updatedAt ?? new Date("2026-04-07");

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

  const articleEntries = catalogs.flatMap(({ locale, posts }) =>
    posts.map((post) => ({
      url: `${seo.host}${localizePath(`/blog/${post.slug}`, locale)}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.72,
    })),
  );
  return [...marketingEntries, ...articleEntries];
};
