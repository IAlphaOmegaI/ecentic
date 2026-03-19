import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/sign-in", "/sign-up", "/privacy-policy"],
        disallow: [
          "/dashboard/",
          "/onboarding/",
          "/verify",
          "/api/",
        ],
      },
    ],
    sitemap: "https://ecentic.ai/sitemap.xml",
  };
}
