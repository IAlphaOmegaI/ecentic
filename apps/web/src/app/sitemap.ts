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

  const [blogs, spanish] = await Promise.all([
    Blog.listPublished("en"),
    Blog.listPublished("es"),
  ]);
  const latestBlog = blogs[0]?.updatedAt ?? new Date("2026-04-07");
  const spanishBySlug = new Map(spanish.map((post) => [post.slug, post]));

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
    {
      path: "/compare/best-ai-ecommerce-tools",
      changeFrequency: "monthly",
      priority: 0.85,
    },
    { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
    { path: "/enterprise", changeFrequency: "monthly", priority: 0.8 },
    { path: "/resources", changeFrequency: "weekly", priority: 0.8 },
    { path: "/ucp-validator", changeFrequency: "monthly", priority: 0.7 },
    { path: "/ucp-playground", changeFrequency: "monthly", priority: 0.7 },
    { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  ] as const satisfies ReadonlyArray<{
    path: string;
    changeFrequency: NonNullable<
      MetadataRoute.Sitemap[number]["changeFrequency"]
    >;
    priority: number;
  }>;

  const marketingEntries = routing.locales.flatMap((locale) =>
    marketing.map(({ path, changeFrequency, priority }) => {
      const pathname = path === "" ? "/" : path;
      return {
        url: `${seo.host}${localizePath(pathname, locale)}`,
        lastModified: path === "/blog" ? latestBlog : new Date("2026-07-12"),
        changeFrequency,
        priority,
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((alternate) => [
              alternate,
              `${seo.host}${localizePath(pathname, alternate)}`,
            ]),
          ),
        },
      };
    }),
  );

  const englishArticles = blogs.map((post) => ({
    url: `${seo.host}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.72,
    alternates: {
      languages: {
        en: `${seo.host}/blog/${post.slug}`,
        es: `${seo.host}/es/blog/${post.slug}`,
      },
    },
  }));

  // Same slug set as English — ES routes are first-class even before a
  // translated row exists (`Blog.resolve` falls back to EN).
  const spanishCatalog = blogs.map((post) => {
    const translated = spanishBySlug.get(post.slug);
    return {
      url: `${seo.host}/es/blog/${post.slug}`,
      lastModified: translated?.updatedAt ?? post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.72,
      alternates: {
        languages: {
          en: `${seo.host}/blog/${post.slug}`,
          es: `${seo.host}/es/blog/${post.slug}`,
        }, 
      },
    };
  });

  return [...marketingEntries, ...englishArticles, ...spanishCatalog];
};
