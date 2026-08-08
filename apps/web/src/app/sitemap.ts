import { resultify } from "@zenncore/utils";
import type { MetadataRoute } from "next";
import { seo } from "@/lib/seo";
import * as BabyLoveGrowth from "@/server/app/babylovegrowth";
import * as Blog from "@/server/app/blog-cache";

export default async (): Promise<MetadataRoute.Sitemap> => {
  const [posts, blgEntries] = await Promise.all([
    resultify(() => Blog.listPublished()),
    resultify(() => BabyLoveGrowth.listSitemapEntries()),
  ]);
  const blogs = posts.success ? posts.data : [];
  const articles = blgEntries.success ? blgEntries.data : [];
  const blgSlugs = new Set(articles.map((entry) => entry.slug));
  const latestBlog =
    articles[0]?.updated_at ??
    blogs[0]?.updatedAt ??
    new Date("2026-04-07");

  return [
    {
      url: seo.host,
      lastModified: new Date("2026-04-07"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${seo.host}/privacy-policy`,
      lastModified: new Date("2026-07-12"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${seo.host}/terms`,
      lastModified: new Date("2026-07-12"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${seo.host}/blog`,
      lastModified: latestBlog,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${seo.host}/features`,
      lastModified: new Date("2026-04-07"),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${seo.host}/pricing`,
      lastModified: new Date("2026-05-31"),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${seo.host}/how-it-works`,
      lastModified: new Date("2026-05-31"),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${seo.host}/demo`,
      lastModified: new Date("2026-05-31"),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${seo.host}/features/product-listings`,
      lastModified: new Date("2026-04-07"),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${seo.host}/platforms/shopify`,
      lastModified: new Date("2026-04-07"),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${seo.host}/platforms/woocommerce`,
      lastModified: new Date("2026-04-07"),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${seo.host}/compare/best-ai-ecommerce-tools`,
      lastModified: new Date("2026-04-07"),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${seo.host}/enterprise`,
      lastModified: new Date("2026-04-26"),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${seo.host}/resources`,
      lastModified: new Date("2026-07-11"),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${seo.host}/ucp-validator`,
      lastModified: new Date("2026-04-26"),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${seo.host}/ucp-playground`,
      lastModified: new Date("2026-07-08"),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    ...articles.map((entry) => ({
      url: `${seo.host}/blog/${entry.slug}`,
      lastModified: new Date(entry.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...blogs
      .filter((post) => !blgSlugs.has(post.slug))
      .map((post) => ({
        url: `${seo.host}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
  ];
};
