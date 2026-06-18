import { createTsdownConfig } from "@zenncore/config/tsdown";

export default createTsdownConfig([
  {
    entry: {
      "helpers/index": "./src/helpers/index.ts",
      //preserve directives
      "hooks/*/index": ["./src/hooks/*.{ts,tsx}", "!./src/hooks/index.ts"],
      "hooks/index": "./src/hooks/index.ts",
    },
    deps: {
      neverBundle: ["type-fest"],
    },
  },
  {
    entry: {
      "types/index": "./src/types/index.ts",
    },
    deps: {
      neverBundle: ["type-fest"],
    },
    minify: false, //not relevant for types
    sourcemap: false, // not relevant if not minified
    dts: {
      emitDtsOnly: true,
    },
  },
]);
