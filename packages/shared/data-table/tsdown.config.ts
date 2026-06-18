import { createTsdownConfig } from "@zenncore/config/tsdown";

export default createTsdownConfig({
  entry: [
    {
      //preserve directives
      "hooks/*": "./src/hooks/*",
      "context/*": "./src/context/*",
    },
    "./src/index.ts",
  ],
});
