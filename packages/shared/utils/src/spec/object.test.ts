import { describe, expect, expectTypeOf, test } from "bun:test";
import { access, merge, removeUndefinedEntries } from "../helpers";

describe("access", () => {
  const settings = {
    locale: "en",
    theme: {
      mode: "dark",
      palette: { primary: { shade: 500 }, accent: "teal" },
    },
  };

  test("reads a top-level key", () => {
    expect(access(settings, "locale")).toBe("en");
  });

  test("reads a two-segment path", () => {
    expect(access(settings, "theme.mode")).toBe("dark");
  });

  test("reads a path of three segments", () => {
    const accent = access(settings, "theme.palette.accent");

    expect(accent).toBe("teal");
    expectTypeOf(accent).toEqualTypeOf<string>();
  });

  test("reads a path of four segments", () => {
    const shade = access(settings, "theme.palette.primary.shade");

    expect(shade).toBe(500);
    expectTypeOf(shade).toEqualTypeOf<number>();
  });
});

describe("removeUndefinedEntries", () => {
  test("drops undefined values and keeps every other falsy value", () => {
    const entries = removeUndefinedEntries({
      count: 0,
      enabled: false,
      label: "",
      owner: null,
      missing: undefined,
      name: "ecentic",
    });

    expect(entries).toStrictEqual({
      count: 0,
      enabled: false,
      label: "",
      owner: null,
      name: "ecentic",
    });
    expect(Object.keys(entries)).toEqual([
      "count",
      "enabled",
      "label",
      "owner",
      "name",
    ]);
  });

  test("its type keeps the keys it keeps and drops the keys it drops", () => {
    const entries = removeUndefinedEntries({
      label: "",
      owner: null,
      missing: undefined,
    } as const);

    expect(entries).toStrictEqual({ label: "", owner: null });
    expectTypeOf(entries).toEqualTypeOf<{
      readonly label: "";
      readonly owner: null;
    }>();
  });
});

describe("merge", () => {
  test("deep-merges into a clone and leaves the target alone", () => {
    const target = { a: 1, b: { x: 1, y: 2 } };
    const merged = merge(target, { b: { y: 3, z: 4 }, c: 5 });

    expect(merged).toStrictEqual({ a: 1, b: { x: 1, y: 3, z: 4 }, c: 5 });
    expect(target).toStrictEqual({ a: 1, b: { x: 1, y: 2 } });
  });
});
