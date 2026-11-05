import type { GenericObject } from "./generic-object";

type ExtendedObject<T extends GenericObject> = {
  [K in keyof T]?: unknown;
};

export type Override<
  T1 extends GenericObject,
  T2 extends ExtendedObject<T1>,
> = Omit<T1, keyof T2> & T2;

// Preserves type unions
export type DistributiveOverride<
  T1 extends GenericObject,
  T2 extends ExtendedObject<T1>,
> = T1 extends GenericObject ? Override<T1, T2> : never;
