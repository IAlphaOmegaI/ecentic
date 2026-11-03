/**
 * Any non-primitive value: the "some object" constraint (`T extends
 * EmptyObject`) and the "nothing to add" member of an intersection.
 *
 * `object`, not `Record<never, never>` (which is `{}` and so also accepts
 * numbers, strings and the other primitives), and not an index signature of
 * `never` (which rejects every object with a key, and turns each property of
 * an intersection into `never`).
 */
export type EmptyObject = object;
