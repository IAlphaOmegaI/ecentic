import type { MetadataRoute } from "next";
import { seo } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/sign-in", "/sign-up", "/privacy-policy"],
        disallow: ["/dashboard/", "/onboarding/", "/verify", "/api/"],
      },
    ],
    host: seo.host,
    sitemap: `${seo.host}/sitemap.xml`,
  };
}
