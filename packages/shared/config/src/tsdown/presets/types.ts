import type { TsdownOptions } from "../config.ts";

export const typeOptions: {
  minify: false;
  sourcemap: false;
  dts: {
    emitDtsOnly: true;
  };
} = {
  minify: false, //not relevant for types
  sourcemap: false, // not relevant if not minified
  dts: {
    emitDtsOnly: true,
  },
} satisfies TsdownOptions;
