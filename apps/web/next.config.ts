import type { NextConfig } from "next";

export default {
  reactCompiler: true,
  typedRoutes: true,
  transpilePackages: [
    "@zenncore/icons",
    "@zenncore/phone",
    "@zenncore/utils",
    "@zenncore/web",
    "@zenncore/data-table",
    "@zenncore/inferred-form",
  ],
} satisfies NextConfig;
