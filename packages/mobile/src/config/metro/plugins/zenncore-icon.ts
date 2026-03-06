import path from "node:path";
import type { MetroConfig } from "expo/metro-config";

/**
 * Add the zenncore icon plugin to the metro config;
 * this does edit the babel transformer path to intercept for icon files,
 * with a fallback to the default expo/babel transformer for other files;
 *
 * @param config - The Metro configuration object
 *
 * @returns The modified Metro configuration
 */

export const withZenncoreIcon = (config: MetroConfig): MetroConfig => {
  const transformerPath = path.resolve(
    __dirname,
    "../transformers/zenncore-icon.cjs",
  );

  return {
    ...config,
    transformer: {
      ...config.transformer,
      babelTransformerPath: transformerPath,
    },
  };
};
