import type { EmptyObject } from "./empty-object";

type ExtendedObject<T extends EmptyObject> = {
  [K in keyof T]?: unknown;
};

export type Override<
  T1 extends EmptyObject,
  T2 extends ExtendedObject<T1>,
> = Omit<T1, keyof T2> & T2;

// Preserves type unions
export type DistributiveOverride<
  T1 extends EmptyObject,
  T2 extends ExtendedObject<T1>,
> = T1 extends EmptyObject ? Override<T1, T2> : never;
