import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { localizePath } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
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

  const blogs = await Blog.listPublished("en");
  const latestBlog = blogs[0]?.updatedAt ?? new Date("2026-04-07");

  const marketing = [
    { path: "", changeFrequency: "weekly", priority: 1 },
    { path: "/features", changeFrequency: "weekly", priority: 0.95 },
    { path: "/pricing", changeFrequency: "weekly", priority: 0.95 },
    { path: "/how-it-works", changeFrequency: "monthly", priority: 0.9 },
    { path: "/demo", changeFrequency: "monthly", priority: 0.9 },
    {
      path: "/features/product-listings",
      changeFrequency: "monthly",
      priority: 0.85,
    },
    { path: "/platforms/shopify", changeFrequency: "monthly", priority: 0.85 },
    {
      path: "/platforms/woocommerce",
      changeFrequency: "monthly",
      priority: 0.85,
    },
    { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
    { path: "/enterprise", changeFrequency: "monthly", priority: 0.8 },
    { path: "/resources", changeFrequency: "weekly", priority: 0.8 },
    { path: "/docs", changeFrequency: "monthly", priority: 0.8 },
    { path: "/docs/mcp", changeFrequency: "monthly", priority: 0.7 },
    {
      path: "/docs/authentication",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    { path: "/docs/errors", changeFrequency: "monthly", priority: 0.6 },
    { path: "/docs/rate-limits", changeFrequency: "monthly", priority: 0.6 },
    { path: "/docs/versioning", changeFrequency: "monthly", priority: 0.6 },
    { path: "/ucp-validator", changeFrequency: "monthly", priority: 0.7 },
    { path: "/webmcp-scanner", changeFrequency: "monthly", priority: 0.7 },
    { path: "/ucp-playground", changeFrequency: "monthly", priority: 0.7 },
    { path: "/about", changeFrequency: "monthly", priority: 0.6 },
    { path: "/support", changeFrequency: "monthly", priority: 0.6 },
    { path: "/ai-instructions", changeFrequency: "monthly", priority: 0.6 },
    { path: "/yc", changeFrequency: "monthly", priority: 0.5 },
    { path: "/techstars", changeFrequency: "monthly", priority: 0.5 },
    { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  ] as const satisfies ReadonlyArray<{
    path: string;
    changeFrequency: NonNullable<
      MetadataRoute.Sitemap[number]["changeFrequency"]
    >;
    priority: number;
  }>;

  // No `alternates` here on purpose: hreflang ships in each page's head (see
  // `createMetadata`). Sitemap alternates render as `xhtml:link` entries whose
  // XHTML namespace makes browsers display the file as running text instead of
  // the plain XML document tree.
  const marketingEntries = routing.locales.flatMap((locale) =>
    marketing.map(({ path, changeFrequency, priority }) => {
      const pathname = path === "" ? "/" : path;
      return {
        url: `${seo.host}${localizePath(pathname, locale)}`,
        lastModified: path === "/blog" ? latestBlog : new Date("2026-07-12"),
        changeFrequency,
        priority,
      };
    }),
  );

  // English articles only: the `/es/blog/<slug>` routes still serve, but they
  // are machine translations marked `noindex`, and a sitemap lists only what
  // search is meant to index.
  const articles = blogs.map((post) => ({
    url: `${seo.host}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.72,
  }));

  return [...marketingEntries, ...articles];
};
