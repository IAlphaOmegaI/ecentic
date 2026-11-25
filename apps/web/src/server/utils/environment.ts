export type Brand<Brand extends string> = { __brand: Brand };
type Branded<T, B extends string> = T & Brand<B>;

export const getEnvironment = (): Environment => {
  return typeof window === "undefined"
    ? Environment.SERVER
    : Environment.CLIENT;
};

export const Environment = {
  SERVER: Symbol("server") as Branded<symbol, "server">,
  CLIENT: Symbol("client") as Branded<symbol, "client">,
};

export type Environment = (typeof Environment)[keyof typeof Environment];

/** Browser actions infer the domain arguments, excluding the internal environment overload. */
export type ClientParameters<
  Action extends (...parameters: never[]) => unknown,
> =
  Parameters<Action> extends [Environment, ...infer Arguments]
    ? Arguments
    : never;
