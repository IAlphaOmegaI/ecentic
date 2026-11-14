import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { defaultLocale, publishedLocales as locales } from "./src/i18n/locales";
import { RETIRED_BLOG_POSTS } from "./src/lib/blog-redirects";
import { REMOTE_IMAGES } from "./src/lib/image-hosts";

// Keep in sync with `agentHomepageLinkHeader` in `src/lib/agent-discovery.ts`.
// next.config cannot import that module (path aliases / Node resolution).
const agentHomepageLinkHeader =
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json", </llms.txt>; rel="describedby"; type="text/plain", </auth.md>; rel="service-doc"; type="text/markdown", </.well-known/oauth-authorization-server>; rel="oauth-authorization-server"; type="application/json", </.well-known/openid-configuration>; rel="openid-configuration"; type="application/json", </.well-known/oauth-protected-resource>; rel="oauth-protected-resource"; type="application/json", </.well-known/mcp/server-card.json>; rel="service-desc"; type="application/json", </.well-known/agent-skills/index.json>; rel="service-desc"; type="application/json", </.well-known/ucp>; rel="service-desc"; type="application/json", </.well-known/acp.json>; rel="service-desc"; type="application/json", </openapi.json>; rel="service-desc"; type="application/json", </api/mcp>; rel="service-desc"; type="application/json", </resources>; rel="service-doc"; type="text/html"';

const withNextIntl = createNextIntlPlugin({
  requestConfig: "./src/i18n/request.ts",
  experimental: {
    // Generates messages/en.d.json.ts so AppConfig.Messages keeps ICU
    // argument literals (TS otherwise widens JSON strings).
    createMessagesDeclaration: "./messages/en.json",
  },
});

export default withSentryConfig(
  withNextIntl({
    reactCompiler: true,
    typedRoutes: true,
    poweredByHeader: false,
    typescript: {
      ignoreBuildErrors: true,
    },
    cacheComponents: true,
    partialPrefetching: true,
    serverExternalPackages: ["@sentry/server-utils"],
    // The blog cron publishes `content/blog/*.md` from its own bundle (see
    // `Blog.reconcileRepoPosts`); nothing imports those files, so they have to
    // be traced in by hand or the deployed route finds an empty folder.
    outputFileTracingIncludes: {
      "/api/cron/blog": ["./content/blog/*.md"],
    },
    experimental: {
      // Bound prerender workers: each loads the locale catalog and blog cache.
      cpus: 2,
      // Required so `app/global-not-found.tsx` works without a pass-through
      // `app/layout.tsx` (locale segment is the root layout for root-params).
      globalNotFound: true,
    },
    // `/docs` is the canonical developer entry point. The other three are the
    // paths crawlers and agents guess first; a permanent redirect is cheaper
    // than four copies of the same page and keeps one URL in the index.
    redirects: async () => [
      ...locales
        .map((locale) => (locale === defaultLocale ? "" : `/${locale}`))
        .flatMap((prefix) => [
          {
            source: `${prefix}/compare/best-ai-ecommerce-tools`,
            destination: `${prefix}/blog/best-ecommerce-ai-platforms`,
            permanent: true,
          },
          ...[...RETIRED_BLOG_POSTS].map(([slug, target]) => ({
            source: `${prefix}/blog/${slug}`,
            destination: `${prefix}/blog/${target}`,
            permanent: true,
          })),
          {
            source: `${prefix}/stories/dua-flavors`,
            destination: `${prefix}/stories/dua-flavours`,
            statusCode: 301 as const,
          },
          {
            source: `${prefix}/features`,
            destination: `${prefix}/platform`,
            statusCode: 301 as const,
          },
          {
            source: `${prefix}/how-it-works`,
            destination: `${prefix}/platform`,
            statusCode: 301 as const,
          },
          {
            source: `${prefix}/features/product-listings`,
            destination: `${prefix}/platform/fix`,
            statusCode: 301 as const,
          },
          {
            source: `${prefix}/enterprise`,
            destination: `${prefix}/solutions/enterprise`,
            statusCode: 301 as const,
          },
          {
            source: `${prefix}/platforms/shopify`,
            destination: `${prefix}/integrations/shopify`,
            statusCode: 301 as const,
          },
          {
            source: `${prefix}/platforms/woocommerce`,
            destination: `${prefix}/integrations/woocommerce`,
            statusCode: 301 as const,
          },
          ...["developers", "developer", "api-docs", "documentation"].map(
            (alias) => ({
              source: `${prefix}/${alias}`,
              destination: `${prefix}/docs`,
              permanent: true,
            }),
          ),
          // Discovery documents are machine-readable and have one canonical URL.
          {
            source: `${prefix}/docs/openapi`,
            destination: "/openapi.json",
            permanent: false,
          },
          // ecentic receives webhooks but does not publish outbound webhooks.
          {
            source: `${prefix}/docs/webhooks`,
            destination: `${prefix}/docs#webhooks`,
            permanent: false,
          },
        ]),
    ],
    rewrites: async () => {
      return [
        {
          source: "/ingest/static/:path*",
          destination: "https://eu-assets.i.posthog.com/static/:path*",
        },
        {
          source: "/ingest/:path*",
          destination: "https://eu.i.posthog.com/:path*",
        },
        {
          source: "/ingest/decide",
          destination: "https://eu.i.posthog.com/decide",
        },
        {
          source: "/.well-known/ucp",
          destination: "/api/well-known/ucp",
        },
        {
          source: "/.well-known/api-catalog",
          destination: "/api/well-known/api-catalog",
        },
      ];
    },
    // Required to support PostHog trailing slash API requests
    skipTrailingSlashRedirect: true,
    images: {
      // AVIF first: the hero texture is the homepage's LCP element, and at the
      // 640w a phone fetches it is 58KB as WebP q75 but 22KB as AVIF q50
      // (measured with sharp, Oct 2026). Browsers without AVIF still negotiate
      // WebP through `Accept`.
      formats: ["image/avif", "image/webp"],
      // 50 is for decorative art that sits behind an opacity or blend, where
      // the loss is invisible and the bytes are not (the hero texture).
      qualities: [50, 75],
      // Shared with the blog, which skips the optimizer for any other origin
      // instead of rendering a 400 (see `src/lib/image-hosts.ts`).
      remotePatterns: REMOTE_IMAGES.map((image) => ({
        protocol: "https" as const,
        hostname: image.hostname,
        pathname: `${image.prefix}**`,
      })),
    },
    // Markdown-for-Agents negotiates on Accept; CDN must vary HTML vs markdown.
    // Homepage also advertises agent discovery Links (RFC 8288 / RFC 9727).
    headers: async () => [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      ...locales.map((locale) => ({
        source: locale === defaultLocale ? "/" : `/${locale}`,
        headers: [
          { key: "Vary", value: "Accept" },
          { key: "Link", value: agentHomepageLinkHeader },
        ],
      })),
      // The MCP GET answers `405` for `Accept: text/event-stream` and `200`
      // otherwise, so its representation varies by `Accept`. A route handler
      // cannot emit this itself — the App Router writes its own `Vary` over
      // anything set in the handler body — so it is declared one layer out.
      { source: "/mcp", headers: [{ key: "Vary", value: "Accept" }] },
      { source: "/api/mcp", headers: [{ key: "Vary", value: "Accept" }] },
      {
        source: "/.well-known/agent-skills/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // `public/` is served `max-age=0, must-revalidate`, so the hero loop was
        // re-fetched on every visit. Safe to freeze because these are versioned
        // by filename — a new cut ships as a new name, never a new body.
        source: "/videos/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ],
  } satisfies NextConfig),
  {
    org: "zennit-aw",
    project: "ecentic",
    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,
    // Pass the auth token
    authToken: process.env.SENTRY_AUTH_TOKEN,
    // Upload a larger set of source maps for prettier stack traces
    widenClientFileUpload: true,
    // No `disableLogger`: deprecated in @sentry/nextjs 10, and its replacement
    // (`webpack.treeshake.removeDebugLogging`) does nothing under Turbopack,
    // which is what builds this app. It would only add a deprecation warning to
    // every build in exchange for no bytes.
    // `tunnelRoute` is a rewrite to an external URL (Sentry's ingest endpoint), so every
    // envelope is proxied through the dev server — which trips Node's 10-listener warning
    // on the piped ServerResponse. Its only purpose is dodging ad-blockers, which is
    // pointless on localhost, so it stays off outside production.
    tunnelRoute:
      process.env.NODE_ENV === "production" ? "/monitoring" : undefined,
  },
);
