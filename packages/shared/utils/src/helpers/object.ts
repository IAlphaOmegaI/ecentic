import { merge as mergePrimitive } from "es-toolkit/object";
import { isPlainObject } from "es-toolkit/predicate";
import type { EmptyObject } from "../types";

export type ValueOf<T> = T[keyof T];

export type PropertyAccessor<T extends EmptyObject> =
  | keyof T
  | ValueOf<{
      [K in keyof T as T[K] extends Record<string, unknown>
        ? K
        : // @ts-ignore: this is fine
          never]: `${K}.${PropertyAccessor<T[K]>}`;
    }>;

export type PropertyValue<
  T extends EmptyObject,
  K extends PropertyAccessor<T>,
> = K extends keyof T
  ? T[K]
  : K extends `${infer K}.${infer R}`
    ? // @ts-ignore: this is fine
      PropertyValue<T[K], R>
    : never;

export const access = <T extends EmptyObject, A extends PropertyAccessor<T>>(
  accessee: T,
  accessor: A,
): PropertyValue<T, A> => {
  const [key, ...rest] = accessor.toString().split(".");
  if (rest.length === 0) return accessee[key as keyof T] as PropertyValue<T, A>;
  // @ts-expect-error: this is fine
  return access(accessee[key as keyof T], rest);
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

// Helper to merge array elements by index
type MergeTuples<T extends Array, S extends Array> = T extends readonly [
  infer T0,
  ...infer TRest,
]
  ? S extends readonly [infer S0, ...infer SRest]
    ? [S0] extends [undefined]
      ? [T0, ...MergeTuples<TRest, SRest>] // Keep target element when source is undefined
      : [S0, ...MergeTuples<TRest, SRest>] // Use source element when defined
    : [T0, ...MergeTuples<TRest, []>] // Keep remaining target elements
  : S extends readonly [infer S0, ...infer SRest]
    ? [S0] extends [undefined]
      ? MergeTuples<[], SRest> // Skip undefined source elements when no target
      : [S0, ...MergeTuples<[], SRest>] // Add defined source elements
    : [];

// Helper type for merging arrays element-wise
type MergeArrays<T extends Array, S extends Array> = number extends T["length"] // Check if T is a tuple type by seeing if it has a specific length
  ? // T is an array type (length is number, not specific)
    number extends S["length"]
    ? // Both T and S are array types (not tuples)
      T extends readonly (infer TElement)[]
      ? S extends readonly (infer SElement)[]
        ? (TElement | SElement)[] // Always merge element types for array types
        : S
      : S
    : // T is array type, S is tuple type
      T extends readonly (infer TElement)[]
      ? S extends readonly [...infer SRest]
        ? MergeArrayWithTuple<TElement, SRest> // Element-wise merge of array with tuple
        : T
      : S
  : // T is a tuple type (length is specific number)
    number extends S["length"]
    ? // T is tuple type, S is array type
      T extends readonly [...infer TRest]
      ? S extends readonly (infer SElement)[]
        ? MergeTupleWithArray<TRest, SElement> // Element-wise merge of tuple with array
        : S
      : S
    : // Both are tuple types
      T extends readonly [...infer TRest]
      ? S extends readonly [...infer SRest]
        ? MergeTuples<TRest, SRest>
        : T
      : S;

// Helper to merge arrays when source is a union containing arrays (distributive)
type MergeWithUnion<T extends Array, S extends Array> = S extends any
  ? S extends Array
    ? MergeArrays<T, S> // Merge each array/tuple in the union with T
    : S // Keep non-array parts of union
  : never;

// Helper to detect if a type is a union
type IsUnion<T, U = T> = T extends any
  ? [U] extends [T]
    ? false
    : true
  : false;

// Helper to merge tuple with array type element-wise
type MergeTupleWithArray<T extends Array, SElement> = T extends readonly [
  infer T0,
  ...infer TRest,
]
  ? [T0 | SElement, ...MergeTupleWithArray<TRest, SElement>]
  : [...SElement[]];

// Helper to merge array type with tuple type element-wise
type MergeArrayWithTuple<TElement, S extends Array> = S extends readonly [
  infer S0,
  ...infer SRest,
]
  ? [S0] extends [undefined]
    ? [TElement | undefined, ...MergeArrayWithTuple<TElement, SRest>]
    : [S0, ...MergeArrayWithTuple<TElement, SRest>]
  : [...TElement[]];

// Helper to merge when target is a union containing arrays (distributive)
type MergeWithTargetUnion<T extends Array, S extends Array> = T extends any
  ? T extends Array
    ? MergeArrays<T, S> // Merge array parts with source
    : S // Non-array parts get overridden by source
  : never;

// Helper to handle unions that contain undefined
type MergeWithUndefinedUnion<T extends Array, S extends Array> = S extends any
  ? S extends undefined
    ? T // Keep target when source is undefined
    : T extends Array
      ? S extends Array
        ? MergeArrays<T, S>
        : S // Source overrides target
      : S extends Array
        ? MergeWithTargetUnion<T, S>
        : S // Source overrides target
  : never;

export type Merge<T extends Object, S extends Object> = {
  [K in keyof T | keyof S]: K extends keyof S
    ? K extends keyof T
      ? S[K] extends undefined
        ? T[K] // Keep target value when source is undefined
        : IsUnion<S[K]> extends true
          ? undefined extends S[K]
            ? MergeWithUndefinedUnion<T[K], S[K]> // Handle unions containing undefined
            : T[K] extends Array
              ? MergeWithUnion<T[K], S[K]> // Target is array, source is union
              : S[K] extends Array
                ? MergeWithTargetUnion<T[K], S[K]> // Target is not array, source union contains arrays
                : S[K] // Neither involves arrays
          : IsUnion<T[K]> extends true
            ? S[K] extends Array
              ? MergeWithTargetUnion<T[K], S[K]> // Target is union, source is array
              : S[K] // Target is union, source is not array - source overrides
            : T[K] extends Array
              ? S[K] extends Array
                ? MergeArrays<T[K], S[K]> // Both are single arrays/tuples
                : MergeWithUnion<T[K], S[K]> // S[K] might contain arrays
              : S[K] extends Array
                ? MergeWithTargetUnion<T[K], S[K]> // Handle when target is union containing arrays
                : IsPlainObject<T[K]> extends true
                  ? IsPlainObject<S[K]> extends true
                    ? Merge<T[K], S[K]> // Recursive merge for objects
                    : S[K] // Overwrite with non-object
                  : IsOptionalProperty<S, K> extends true
                    ? IsOptionalProperty<T, K> extends true
                      ? NonNullable<T[K]> | NonNullable<S[K]> | undefined
                      : T[K] | NonNullable<S[K]>
                    : S[K] // Overwrite with non-object
      : S[K] // New property
    : K extends keyof T
      ? T[K] // Keep existing property
      : never;
};

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
  obj: O,
): OmitUndefinedEntries<O> =>
  Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => !!value) as [
      keyof O,
      Exclude<O[keyof O], undefined>,
    ][],
  ) as OmitUndefinedEntries<O>;

export type OmitUndefinedEntries<T extends EmptyObject> = {
  [K in keyof T as T[K] extends undefined | "" | null ? never : K]: T[K];
};
