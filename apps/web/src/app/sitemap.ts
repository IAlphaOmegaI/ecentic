import type { MetadataRoute } from "next";
import { seo } from "@/lib/seo";
import * as Blog from "@/server/app/blog";
import { Environment } from "@/server/utils/environment";

export default async (): Promise<MetadataRoute.Sitemap> => {
  const posts = await Blog.listPublished(Environment.SERVER);
  const blogs = posts.success ? posts.data : [];

  return [
    {
      url: seo.host,
      lastModified: new Date("2026-04-07"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${seo.host}/privacy-policy`,
      lastModified: new Date("2025-01-01"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${seo.host}/blog`,
      lastModified: blogs[0]?.updatedAt ?? new Date("2026-04-07"),
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
      url: `${seo.host}/ucp-validator`,
      lastModified: new Date("2026-04-26"),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    ...blogs.map((post) => ({
      url: `${seo.host}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
};
