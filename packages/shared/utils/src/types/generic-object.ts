/**
 * Any object: the constraint for "some object" (`T extends GenericObject`),
 * and the "nothing to add" member of an intersection (`A & GenericObject` is
 * `A` for any object `A`).
 *
 * It rejects primitives, and accepts object types with keys, interfaces,
 * class instances, arrays and functions. For an object that must have no keys
 * at all, use `EmptyObject`.
 */
export type GenericObject = object;
