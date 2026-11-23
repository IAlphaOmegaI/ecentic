export type Brand<Brand extends string> = { __brand: Brand };
type Branded<T, B extends string> = T & Brand<B>;

export const getEnvironment = (): Environment => {
  return typeof window === "undefined"
    ? Environment.SERVER
    : Environment.CLIENT;
};

export const Environment = {
  SERVER: Symbol("server") as Branded<symbol, "server">,
  // Server Action arguments cross React Flight. Symbols become opaque temporary
  // references, so the server could not recognize and remove the client marker.
  CLIENT: "__ecentic_outbound_client__" as Branded<string, "client">,
};

export type Environment = (typeof Environment)[keyof typeof Environment];
