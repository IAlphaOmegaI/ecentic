import { describe, expectTypeOf, test } from "bun:test";
import type { IsOptionalProperty } from "../helpers";
import type { EmptyObject, FixedTuple, Override, Tuple } from "../types";

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

  // The workspace uses it as the "any object" constraint (`T extends
  // EmptyObject`), so object types with keys, interfaces and class instances
  // must still satisfy it.
  test("accepts any object type", () => {
    expectTypeOf<Record<never, never>>().toExtend<EmptyObject>();
    expectTypeOf<{ name: string }>().toExtend<EmptyObject>();
    expectTypeOf<Error>().toExtend<EmptyObject>();
    expectTypeOf<string[]>().toExtend<EmptyObject>();
  });

  // `field.ts` in @zenncore/inferred-form intersects it in as "nothing to add".
  test("adds nothing to an intersection", () => {
    type ClassList = { root?: string; label?: string };

    expectTypeOf<(ClassList & EmptyObject)["root"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<keyof (ClassList & EmptyObject)>().toEqualTypeOf<
      keyof ClassList
    >();
  });

  test("still tells optional keys from required ones", () => {
    type Profile = { name: string; bio?: string };

    expectTypeOf<IsOptionalProperty<Profile, "bio">>().toEqualTypeOf<true>();
    expectTypeOf<IsOptionalProperty<Profile, "name">>().toEqualTypeOf<false>();
  });

  test("still constrains Override", () => {
    type Renamed = Override<{ id: number; name: string }, { id: string }>;

    expectTypeOf<Renamed["id"]>().toEqualTypeOf<string>();
    expectTypeOf<Renamed["name"]>().toEqualTypeOf<string>();
  });
});
