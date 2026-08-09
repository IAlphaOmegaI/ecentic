import type { MetadataRoute } from "next";
import { localizePath } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { seo } from "@/lib/seo";
import * as Blog from "@/server/app/blog";

export default async (): Promise<MetadataRoute.Sitemap> => {
  const [blogs, spanish] = await Promise.all([
    Blog.listPublished("en"),
    Blog.listPublished("es"),
  ]);
  const latestBlog = blogs[0]?.updatedAt ?? new Date("2026-04-07");
  const spanishBySlug = new Map(spanish.map((post) => [post.slug, post]));

  const marketing = [
    "",
    "/privacy-policy",
    "/terms",
    "/blog",
    "/features",
    "/pricing",
    "/how-it-works",
    "/demo",
    "/features/product-listings",
    "/platforms/shopify",
    "/platforms/woocommerce",
    "/compare/best-ai-ecommerce-tools",
    "/enterprise",
    "/resources",
    "/ucp-validator",
    "/ucp-playground",
  ] as const;

  const marketingEntries = routing.locales.flatMap((locale) =>
    marketing.map((path) => {
      const pathname = path === "" ? "/" : path;
      return {
        url: `${seo.host}${localizePath(pathname, locale)}`,
        lastModified: path === "/blog" ? latestBlog : new Date("2026-07-12"),
        changeFrequency: "weekly" as const,
        priority: path === "" ? 1 : path === "/blog" ? 0.8 : 0.7,
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
    priority: 0.7,
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
      priority: 0.7,
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
