import { describe, expectTypeOf, test } from "bun:test";
import type { IsOptionalProperty } from "../helpers";
import type {
  EmptyObject,
  FixedTuple,
  GenericObject,
  Override,
  Tuple,
} from "../types";

describe("FixedTuple", () => {
  test("keeps a single length exact", () => {
    expectTypeOf<FixedTuple<string, 0>>().toEqualTypeOf<[]>();
    expectTypeOf<FixedTuple<string, 3>>().toEqualTypeOf<
      [string, string, string]
    >();
  });

  test("builds one tuple per length in a union", () => {
    expectTypeOf<FixedTuple<string, 1 | 2>>().toEqualTypeOf<
      [string] | [string, string]
    >();
    expectTypeOf<FixedTuple<number, 0 | 3>>().toEqualTypeOf<
      [] | [number, number, number]
    >();
  });

  test("is a plain array when the length is not known", () => {
    expectTypeOf<FixedTuple<string, number>>().toEqualTypeOf<string[]>();
  });
});

describe("Tuple", () => {
  test("is a non-empty array when no length is given", () => {
    expectTypeOf<Tuple<string>>().toEqualTypeOf<[string, ...string[]]>();
  });

  test("keeps a single length exact", () => {
    expectTypeOf<Tuple<string, 2>>().toEqualTypeOf<[string, string]>();
  });

  test("builds one tuple per length in a union", () => {
    expectTypeOf<Tuple<string, 1 | 2>>().toEqualTypeOf<
      [string] | [string, string]
    >();
  });

  test("is a plain array when the length is not known", () => {
    expectTypeOf<Tuple<string, number>>().toEqualTypeOf<string[]>();
  });
});

describe("GenericObject", () => {
  test("rejects primitives", () => {
    expectTypeOf<number>().not.toExtend<GenericObject>();
    expectTypeOf<string>().not.toExtend<GenericObject>();
    expectTypeOf<boolean>().not.toExtend<GenericObject>();
    expectTypeOf<bigint>().not.toExtend<GenericObject>();
    expectTypeOf<symbol>().not.toExtend<GenericObject>();
    expectTypeOf<null>().not.toExtend<GenericObject>();
    expectTypeOf<undefined>().not.toExtend<GenericObject>();
  });

  // The "any object" constraint (`T extends GenericObject`): object types with
  // keys, interfaces and class instances must all satisfy it.
  test("accepts any object type", () => {
    expectTypeOf<Record<never, never>>().toExtend<GenericObject>();
    expectTypeOf<{ name: string }>().toExtend<GenericObject>();
    expectTypeOf<Error>().toExtend<GenericObject>();
    expectTypeOf<string[]>().toExtend<GenericObject>();
  });

  // `field.ts` in @zenncore/inferred-form intersects it in as "nothing to add".
  test("adds nothing to an intersection", () => {
    type ClassList = { root?: string; label?: string };

    expectTypeOf<(ClassList & GenericObject)["root"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<keyof (ClassList & GenericObject)>().toEqualTypeOf<
      keyof ClassList
    >();
  });

  test("constrains Override", () => {
    type Renamed = Override<{ id: number; name: string }, { id: string }>;

    expectTypeOf<Renamed["id"]>().toEqualTypeOf<string>();
    expectTypeOf<Renamed["name"]>().toEqualTypeOf<string>();
  });
});

describe("EmptyObject", () => {
  test("rejects primitives", () => {
    expectTypeOf<number>().not.toExtend<EmptyObject>();
    expectTypeOf<string>().not.toExtend<EmptyObject>();
    expectTypeOf<boolean>().not.toExtend<EmptyObject>();
    expectTypeOf<bigint>().not.toExtend<EmptyObject>();
    expectTypeOf<symbol>().not.toExtend<EmptyObject>();
    expectTypeOf<null>().not.toExtend<EmptyObject>();
    expectTypeOf<undefined>().not.toExtend<EmptyObject>();
  });

  test("accepts only an object without keys", () => {
    expectTypeOf<Record<never, never>>().toExtend<EmptyObject>();
    expectTypeOf({}).toExtend<EmptyObject>();
    expectTypeOf<{ name: string }>().not.toExtend<EmptyObject>();
    expectTypeOf<{ name?: string }>().not.toExtend<EmptyObject>();
    expectTypeOf<Error>().not.toExtend<EmptyObject>();
    expectTypeOf<string[]>().not.toExtend<EmptyObject>();
  });

  // `IsOptionalProperty` asks whether `{}` fits `Pick<T, K>`.
  test("tells optional keys from required ones", () => {
    type Profile = { name: string; bio?: string };

    expectTypeOf<IsOptionalProperty<Profile, "bio">>().toEqualTypeOf<true>();
    expectTypeOf<IsOptionalProperty<Profile, "name">>().toEqualTypeOf<false>();
  });
});
