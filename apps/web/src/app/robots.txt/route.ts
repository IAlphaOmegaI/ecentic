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
  // Everything under /api is closed by default — auth, cron, webhooks, the
  // Stripe and Shopify callbacks, the staff-only /api/dev tree — and then the
  // one public part is opened back up. A longer matching rule wins over a
  // shorter one, so this allows /api/v1 and its children while /api/auth,
  // /api/cron and the rest stay disallowed.
  //
  // Without the exception, robots.txt contradicts the app's own machine-readable
  // guidance: /openapi.json, /.well-known/api-catalog and /llms.txt all send
  // agents to /api/v1, and a compliant fetcher then refuses to go there.
  "Disallow: /api/",
  "Allow: /api/v1",
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
