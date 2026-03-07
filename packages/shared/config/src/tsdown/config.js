// ../config/src/tsdown/config.ts
import {
  defineConfig
} from "tsdown";
var mergeOptions = ({ preserveDirectives, ...options }, defaultOptions) => {
  return {
    ...defaultOptions,
    ...options,
    outputOptions: {
      ...defaultOptions.outputOptions,
      preserveModules: preserveDirectives,
      ...options.outputOptions
    }
  };
};
var createTsdownConfig = (options = {}) => {
  return defineConfig((flagOptions) => {
    const defaultOptions = {
      entry: ["./src/**/index.ts"],
      dts: true,
      fixedExtension: false,
      skipNodeModulesBundle: true,
      external: ["react"],
      ...flagOptions
    };
    return Array.isArray(options) ? options.map((options2) => mergeOptions(options2, defaultOptions)) : mergeOptions(options, defaultOptions);
  });
};
export {
  createTsdownConfig
};
