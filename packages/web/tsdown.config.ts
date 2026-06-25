import { createTsdownConfig } from "@zenncore/config/tsdown";

export default createTsdownConfig([
  {
    entry: {
      "components/*/index": "./src/components/*.tsx",
      // "components/*": "./src/components/*/index.ts",
    },
  },
  {
    entry: { "hooks/index": "./src/utils/hooks/index.ts" },
    outputOptions: { preserveModules: true, preserveModulesRoot: "src/utils" },
  },
  // {
  //   entry: {
  //     "helpers/index": "./src/utils/helpers/index.ts",
  //   },
  // },
  // {
  //   entry: {
  //     "types/index": "./src/utils/types/index.ts",
  //   },
  //   minify: false, //not relevant for types
  //   sourcemap: false, // not relevant if not minified
  //   dts: {
  //     emitDtsOnly: true,
  //   },
  // },
]);
