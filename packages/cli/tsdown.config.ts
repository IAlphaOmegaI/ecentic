import { defineConfig } from "tsdown";

/**
 * Deliberately not `@zenncore/config/tsdown`: that preset builds libraries for
 * this workspace, and this package is published to npm on its own. It has no
 * workspace dependencies for the same reason — `npx @ecentic/cli` must work
 * from a bare npm registry, not from a checkout of this monorepo.
 */
export default defineConfig({
  entry: { cli: "./src/cli.ts" },
  format: ["esm"],
  platform: "node",
  target: "node20",
  clean: true,
  dts: false,
  minify: false,
});
