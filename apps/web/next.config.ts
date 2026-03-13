import type { NextConfig } from "next";

export default {
  reactCompiler: true,
  typedRoutes: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    "@zenncore/icons",
    "@zenncore/phone",
    "@zenncore/utils",
    "@zenncore/web",
    "@zenncore/data-table",
    "@zenncore/inferred-form",
  ],
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
} satisfies NextConfig;
