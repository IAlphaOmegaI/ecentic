import { seo } from "@/lib/seo";

/**
 * robots.txt with Content Signals (https://contentsignals.org/).
 * Next.js MetadataRoute.Robots does not serialize Content-Signal yet, so this
 * is a route handler instead of app/robots.ts.
 */
const body = [
  "User-Agent: *",
  "Content-Signal: ai-train=no, search=yes, ai-input=yes",
  "Disallow: /dashboard/",
  "Disallow: /onboarding/",
  "Disallow: /verify",
  "Disallow: /api/",
  "",
  `Host: ${seo.host}`,
  `Sitemap: ${seo.host}/sitemap.xml`,
  "",
].join("\n");

export const GET = () =>
  new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
