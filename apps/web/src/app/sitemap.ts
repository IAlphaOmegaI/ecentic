import type { MetadataRoute } from "next";

const host = "https://ecentic.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: host,
      lastModified: new Date("2025-03-01"),
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
  ];
}
