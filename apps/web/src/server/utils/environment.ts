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
