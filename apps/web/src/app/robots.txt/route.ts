import { seo } from "@/lib/seo";

/**
 * robots.txt with Content Signals (https://contentsignals.org/).
 * Next.js MetadataRoute.Robots does not serialize Content-Signal yet, so this
 * is a route handler instead of app/robots.ts.
 */
const body = [
  "User-Agent: *",
  "Content-Signal: ai-train=no, search=yes, ai-input=yes",
  // The allow comes FIRST, deliberately.
  //
  // RFC 9309 §2.2.2 resolves a conflict by longest match, which makes order
  // irrelevant — but a large share of real parsers, the Python standard
  // library's `urllib.robotparser` among them, take the first matching line in
  // the file instead. Under that reading a trailing `Allow` never runs: the
  // earlier `Disallow: /api/` answers first and the public API stays shut.
  // Listing the exception above the rule it excepts satisfies both readings,
  // and under neither does it open anything else — /api/auth, /api/cron,
  // /api/dev, /api/stripe and /api/webhooks match only `Disallow: /api/`.
  "Allow: /api/v1",
  "Disallow: /api/",
  "Disallow: /dashboard/",
  "Disallow: /onboarding/",
  "Disallow: /verify",
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
