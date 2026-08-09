import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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
      remotePatterns: [
        {
          protocol: "https",
          hostname: "d2qswj4ah2.ufs.sh",
        },
        {
          protocol: "https",
          hostname: "csuxjmfbwmkxiegfpljm.supabase.co",
          pathname: "/storage/v1/object/public/blog-images/**",
        },
      ],
    },
    // Markdown-for-Agents negotiates on Accept; CDN must vary HTML vs markdown.
    // Homepage also advertises agent discovery Links (RFC 8288 / RFC 9727).
    headers: async () => [
      {
        source: "/",
        headers: [
          { key: "Vary", value: "Accept" },
          { key: "Link", value: agentHomepageLinkHeader },
        ],
      },
      {
        source: "/es",
        headers: [
          { key: "Vary", value: "Accept" },
          { key: "Link", value: agentHomepageLinkHeader },
        ],
      },
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
    // `tunnelRoute` is a rewrite to an external URL (Sentry's ingest endpoint), so every
    // envelope is proxied through the dev server — which trips Node's 10-listener warning
    // on the piped ServerResponse. Its only purpose is dodging ad-blockers, which is
    // pointless on localhost, so it stays off outside production.
    tunnelRoute:
      process.env.NODE_ENV === "production" ? "/monitoring" : undefined,
  },
);
