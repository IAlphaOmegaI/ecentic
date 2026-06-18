import {
  type UserConfig as BaseOptions,
  defineConfig,
  mergeConfig,
  type UserConfigFn,
} from "tsdown";

type ExtraOptions = {
  typeOnly?: boolean;
};

export type TsdownOptions = BaseOptions & ExtraOptions;
export type TsdownConfig = TsdownOptions | TsdownOptions[];

const normalizeOptions = ({ typeOnly, ...options }: TsdownOptions) => {
  const extraOptions = { typeOnly } satisfies ExtraOptions;

  return Object.entries(extraOptions).reduce(
    (accumulator, [optionName, optionValue]) => {
      if (optionValue === undefined) return accumulator;

      switch (optionName as keyof ExtraOptions) {
        case "typeOnly":
          return mergeConfig(
            {
              minify: false, //not relevant for types
              sourcemap: false, // not relevant if not minified
              dts: {
                emitDtsOnly: true,
              },
            },
            accumulator,
          );
        default:
          return accumulator;
      }
    },
    options,
  );
};

export const createTsdownConfig = (
  options: TsdownConfig = {},
): UserConfigFn => {
  return defineConfig((flagOptions) => {
    const defaultOptions = mergeConfig(
      {
        dts: true,
        fixedExtension: false,
        deps: {
          skipNodeModulesBundle: true,
          neverBundle: ["react"],
        },
        inputOptions: {
          checks: { circularDependency: true },
          // experimental: {
          //   lazyBarrel: true,
          // },
        },

        // production build options
        // HACK: do not enable minify to avoid issues with react native
        // minify: !flagOptions.watch,
        // sourcemap: !flagOptions.watch, //enable only temporarily for debugging
      },
      flagOptions,
    );

    return Array.isArray(options)
      ? options.map((options) =>
          mergeConfig(defaultOptions, normalizeOptions(options)),
        )
      : mergeConfig(defaultOptions, normalizeOptions(options));
  });
};
