/**
 * A tuple of exactly `N` elements of `T`.
 *
 * - A union of lengths gives a union of tuples: `FixedTuple<T, 1 | 2>` is
 *   `[T] | [T, T]` (`N extends N` distributes over `N`).
 * - A length that is not known at compile time (`number`) gives `T[]`.
 */
export type FixedTuple<
  T,
  N extends number,
  R extends unknown[] = [],
> = N extends N
  ? number extends N
    ? T[]
    : R["length"] extends N
      ? R
      : FixedTuple<T, N, [T, ...R]>
  : never;

/**
 * A tuple of exactly `N` elements of `T`, or a non-empty array of `T` when no
 * length is given.
 *
 * - A union of lengths gives a union of tuples (the `N extends undefined`
 *   check distributes over `N`).
 * - A length that is not known at compile time (`number`) gives `T[]`.
 */
export type Tuple<
  T,
  N extends number | undefined = undefined,
  R extends T[] = [],
> = N extends undefined
  ? [T, ...T[]]
  : number extends N
    ? T[]
    : R["length"] extends N
      ? R
      : Tuple<T, N, [T, ...R]>;
