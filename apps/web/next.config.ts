import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

export default withSentryConfig(
  {
    reactCompiler: true,
    typedRoutes: true,
    typescript: {
      ignoreBuildErrors: true,
    },
    cacheComponents: true,
    async rewrites() {
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
      ];
    },
    // Required to support PostHog trailing slash API requests
    skipTrailingSlashRedirect: true,
  } satisfies NextConfig,
  {
    org: "zennit-aw",
    project: "ecentic",
    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,
    // Pass the auth token
    authToken: process.env.SENTRY_AUTH_TOKEN,
    // Upload a larger set of source maps for prettier stack traces
    widenClientFileUpload: true,
    tunnelRoute: "/monitoring",
  },
);
