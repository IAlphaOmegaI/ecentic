import { createTsdownConfig } from "@zenncore/config/tsdown";

export default createTsdownConfig([
  { entry: { "helpers/index": "./src/helpers/index.ts" } },
  {
    entry: {
      "hooks/*/index": ["./src/hooks/*.{ts,tsx}", "!./src/hooks/index.ts"],
      "hooks/index": "./src/hooks/index.ts",
    },
    preserveDirectives: true,
  },
  {
    entry: {
      "types/index": "./src/types/index.ts",
    },
    minify: false, //not relevant for types
    sourcemap: false, // not relevant if not minified
    dts: {
      emitDtsOnly: true,
    },
  },
]);
