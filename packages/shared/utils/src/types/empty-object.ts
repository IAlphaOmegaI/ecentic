/**
 * An object with no keys: `{}` is one, `{ name: "ecentic" }` and primitives
 * are not. Use it where the empty object itself is meant, such as "no state"
 * or a test of whether `{}` fits a type (`EmptyObject extends Pick<T, K>`).
 *
 * Not for "any object" constraints or intersections: every key of
 * `A & EmptyObject` is `never`, and an object with keys does not satisfy
 * `T extends EmptyObject`. Use `GenericObject` for those.
 */
export type EmptyObject = { [key: PropertyKey]: never };
