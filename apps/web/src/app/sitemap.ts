import { resultify } from "@zenncore/utils";
import type { MetadataRoute } from "next";
import { localizePath } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { seo } from "@/lib/seo";
import * as BabyLoveGrowth from "@/server/app/babylovegrowth";
import * as Blog from "@/server/app/blog-cache";

export default async (): Promise<MetadataRoute.Sitemap> => {
  const [englishPosts, spanishPosts, blgEntries] = await Promise.all([
    resultify(() => Blog.listPublished("en")),
    resultify(() => Blog.listPublished("es")),
    resultify(() => BabyLoveGrowth.listSitemapEntries()),
  ]);
  const blogs = englishPosts.success ? englishPosts.data : [];
  const spanish = spanishPosts.success ? spanishPosts.data : [];
  const articles = blgEntries.success ? blgEntries.data : [];
  const blgSlugs = new Set(articles.map((entry) => entry.slug));
  const latestBlog =
    articles[0]?.updated_at ?? blogs[0]?.updatedAt ?? new Date("2026-04-07");

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
        lastModified:
          path === "/blog" ? latestBlog : new Date("2026-07-12"),
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

  const englishArticles = articles.map((entry) => ({
    url: `${seo.host}/blog/${entry.slug}`,
    lastModified: new Date(entry.updated_at),
    changeFrequency: "monthly" as const,
    priority: 0.7,
    alternates: {
      languages: {
        en: `${seo.host}/blog/${entry.slug}`,
        es: `${seo.host}/es/blog/${entry.slug}`,
      },
    },
  }));

  const englishDb = blogs
    .filter((post) => !blgSlugs.has(post.slug))
    .map((post) => ({
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

  const spanishDb = spanish.map((post) => ({
    url: `${seo.host}/es/blog/${post.slug}`,
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

  return [
    ...marketingEntries,
    ...englishArticles,
    ...englishDb,
    ...spanishDb,
  ];
};
