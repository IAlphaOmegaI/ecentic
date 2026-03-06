import {
  type UserConfig as BaseOptions,
  defineConfig,
  type UserConfigFn,
} from "tsdown";

export type TsdownOptions = {
  preserveDirectives?: boolean;
} & BaseOptions;

export type TsdownConfig = TsdownOptions | TsdownOptions[];

const mergeOptions = (
  { preserveDirectives, ...options }: TsdownOptions,
  defaultOptions: BaseOptions,
): BaseOptions => {
  return {
    ...defaultOptions,
    ...options,

    outputOptions: {
      ...defaultOptions.outputOptions,
      preserveModules: preserveDirectives,
      ...options.outputOptions,
    },
  };
};

export const createTsdownConfig = (
  options: TsdownConfig = {},
): UserConfigFn => {
  return defineConfig((flagOptions) => {
    const defaultOptions = {
      entry: ["./src/**/index.ts"],
      dts: true,
      fixedExtension: false,
      skipNodeModulesBundle: true,
      external: ["react"],

      // production build options
      // HACK: do not enable minify to avoid issues with react native
      // minify: !flagOptions.watch,
      // sourcemap: !flagOptions.watch, //enable only temporarily for debugging

      ...flagOptions,
    } satisfies BaseOptions;

    return Array.isArray(options)
      ? options.map((options) => mergeOptions(options, defaultOptions))
      : mergeOptions(options, defaultOptions);
  });
};
