import type { MetadataRoute } from "next";
import * as Blog from "@/server/app/blog";
import { Environment } from "@/server/utils/environment";

const host = "https://ecentic.ai";

export default async (): Promise<MetadataRoute.Sitemap> => {
  const posts = await Blog.listPublished(Environment.SERVER);
  const blogEntries = posts.success ? posts.data : [];

  return [
    {
      url: host,
      lastModified: new Date("2026-04-07"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${host}/sign-up`,
      lastModified: new Date("2025-03-01"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${host}/privacy-policy`,
      lastModified: new Date("2025-01-01"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${host}/blog`,
      lastModified: blogEntries[0]?.updatedAt ?? new Date("2026-04-07"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...blogEntries.map((post) => ({
      url: `${host}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
};
