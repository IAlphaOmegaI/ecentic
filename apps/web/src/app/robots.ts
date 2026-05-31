import type { MetadataRoute } from "next";
import { seo } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: ["/dashboard/", "/onboarding/", "/verify", "/api/"],
      },
    ],
    host: seo.host,
    sitemap: `${seo.host}/sitemap.xml`,
  };
}
