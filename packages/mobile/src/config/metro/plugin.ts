import type { MetroConfig } from "expo/metro-config";

/**
 * A Metro plugin is a function that takes a Metro config and returns a modified version
 */
type MetroPlugin = (config: MetroConfig) => MetroConfig;

/**
 * composePlugins – composes an array of plugins into a single plugin
 *
 * @param plugins - The plugins to compose into a single plugin
 * @returns A function that applies all plugins in sequence to a Metro config
 */
export const composePlugins = (...plugins: MetroPlugin[]): MetroPlugin => {
  /**
   * @param config - The metro config to apply the plugins to
   * @returns The composed metro config
   */
  return (config: MetroConfig) => {
    return plugins.reduce(
      (composedConfig, plugin) => plugin(composedConfig),
      config,
    );
  };
};
