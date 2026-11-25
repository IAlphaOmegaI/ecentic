import { merge as mergePrimitive } from "es-toolkit/object";
import { isPlainObject } from "es-toolkit/predicate";
import type { Get, Paths } from "type-fest";
import type { EmptyObject } from "../types";

export type ValueOf<T> = T[keyof T];

export type PropertyAccessor<T extends EmptyObject> = keyof T | Paths<T>;

export type PropertyValue<
  T extends EmptyObject,
  Key extends PropertyAccessor<T>,
> = Key extends keyof T ? T[Key] : Key extends string ? Get<T, Key> : never;

export const access = <T extends EmptyObject, Key extends PropertyAccessor<T>>(
  source: T,
  path: Key,
): PropertyValue<T, Key> => {
  const segments = typeof path === "string" ? path.split(".") : [path];
  return segments.reduce<unknown>(
    (value, segment) =>
      value === null || value === undefined
        ? undefined
        : Reflect.get(Object(value), segment),
    source,
  ) as PropertyValue<T, Key>;
};

export type IsOptionalProperty<T, K extends keyof T> =
  EmptyObject extends Pick<T, K> ? true : false;

type Primitive = string | number | boolean | null | undefined;
// biome-ignore lint/suspicious/noExplicitAny: any needed for generic objects
type Object = Record<PropertyKey, any>;
// biome-ignore lint/suspicious/noExplicitAny: any needed for generic arrays
type Array = readonly any[];

// Helper type to check if a type is a plain object (not array, null, or primitive)
export type IsPlainObject<T> = T extends Object
  ? T extends Array
    ? false
    : T extends Primitive
      ? false
      : true
  : false;

// Keep the exported type tied to the implementation, including tuple,
// optional-property and non-plain-object handling from es-toolkit.
export type Merge<T extends Object, S extends Object> = ReturnType<
  typeof mergePrimitive<T, S>
>;

/**
 * Merges the properties of the source object into a deep clone of the target object.
 *
 * This function performs a deep merge, meaning nested objects and arrays are merged recursively.
 *
 * - If a property in the source object is an array or object and the corresponding property in the target object is also an array or object, they will be merged.
 * - If a property in the source object is undefined, it will not overwrite a defined property in the target object.
 *
 * Note that this function does not mutate the target object.
 *
 * @param target - The target object to be cloned and merged into. This object is not modified directly.
 * @param source - The source object whose properties will be merged into the cloned target object.
 * @returns A new object with properties from the source object merged into a deep clone of the target object.
 *
 * @template T - Type of the target object.
 * @template S - Type of the source object.
 *
 * @example
 * const target = { a: 1, b: { x: 1, y: 2 } };
 * const source = { b: { y: 3, z: 4 }, c: 5 };
 *
 * const result = merge(target, source);
 * console.log(result);
 * // Output: { a: 1, b: { x: 1, y: 3, z: 4 }, c: 5 }
 *
 * @example
 * const target = { a: [1, 2], b: { x: 1 } };
 * const source = { a: [3], b: { y: 2 } };
 *
 * const result = merge(target, source);
 * console.log(result);
 * // Output: { a: [3, 2], b: { x: 1, y: 2 } }
 *
 * @example
 * const target = { a: null };
 * const source = { a: [1, 2, 3] };
 *
 * const result = merge(target, source);
 * console.log(result);
 * // Output: { a: [1, 2, 3] }
 */
export const merge = <T extends Object, S extends Object>(
  target: T,
  sources: S,
): Merge<T, S> => mergePrimitive(structuredClone(target), sources);

export { isPlainObject };

export const removeUndefinedEntries = <O extends EmptyObject>(
  object: O,
): OmitUndefinedEntries<O> =>
  Object.fromEntries(
    Object.entries(object).filter(
      ([_, value]) => value !== undefined && value !== null && value !== "",
    ) as [keyof O, Exclude<O[keyof O], undefined>][],
  ) as OmitUndefinedEntries<O>;

export type OmitUndefinedEntries<T extends EmptyObject> = {
  [K in keyof T as T[K] extends undefined | "" | null ? never : K]: T[K];
};
