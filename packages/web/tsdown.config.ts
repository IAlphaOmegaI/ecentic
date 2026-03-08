import { createTsdownConfig } from "@zenncore/config/tsdown";

export default createTsdownConfig([
  {
    entry: {
      "components/*/index": "./src/components/*.tsx",
      "hooks/*/index": [
        "./src/utils/hooks/*.{ts,tsx}",
        "!./src/utils/hooks/index.ts",
      ],
      "hooks/index": "./src/utils/hooks/index.ts",
      "helpers/index": "./src/utils/helpers/index.ts",
    },
    preserveDirectives: true,
  },
  // { entry: { "helpers/index": "./src/utils/helpers/index.ts" } },
  {
    entry: {
      "types/index": "./src/utils/types/index.ts",
    },
    minify: false, //not relevant for types
    sourcemap: false, // not relevant if not minified
    dts: {
      emitDtsOnly: true,
    },
  },
]);
