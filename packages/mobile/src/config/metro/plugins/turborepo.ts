import path from "node:path";
import type { MetroConfig } from "expo/metro-config";
import { FileStore } from "metro-cache";

/**
 * Move the Metro cache to the `.cache/metro` folder.
 * If you have any environment variables, you can configure Turborepo to invalidate it when needed.
 *
 * @see https://turbo.build/repo/docs/reference/configuration#env
 *
 * @param config - The Metro configuration object
 * @param projectRoot - The __dirname of the metro config file, the project root
 *
 * @returns The modified Metro configuration
 */
export const withTurborepo = (
  config: MetroConfig,
  projectRoot: string,
): MetroConfig => {
  return {
    ...config,
    cacheStores: [
      new FileStore({
        root: path.join(projectRoot, "node_modules", ".cache", "metro"),
      }),
    ],
  };
};
