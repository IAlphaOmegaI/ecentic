import { describe, expect, expectTypeOf, mock, test } from "bun:test";
import * as Helpers from "../helpers";
import { pipe } from "../helpers";

describe("pipe", () => {
  test("runs the head once, on the call's arguments", () => {
    const add = mock((left: number, right: number) => left + right);
    const double = mock((value: number) => value * 2);

    expect(pipe(add, double)(1, 2)).toBe(6);
    expect(add).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith(1, 2);
    expect(double).toHaveBeenCalledTimes(1);
    expect(double).toHaveBeenCalledWith(3);
  });

  test("feeds each output into the next function, in order", () => {
    const calls: string[] = [];
    const run = pipe(
      (word: string) => {
        calls.push("head");
        return word.trim();
      },
      (word: string) => {
        calls.push("upper");
        return word.toUpperCase();
      },
      (word: string) => {
        calls.push("length");
        return word.length;
      },
    );

    expect(run("  agent  ")).toBe(5);
    expect(calls).toEqual(["head", "upper", "length"]);
  });

  test("its type takes the head's parameters and returns the last output", () => {
    const run = pipe(
      (left: number, right: number) => left + right,
      (sum: number) => `${sum}`,
      (text: string) => text.length > 1,
    );

    expectTypeOf(run).parameters.toEqualTypeOf<[number, number]>();
    expectTypeOf(run).returns.toEqualTypeOf<boolean>();
    expect(run(4, 6)).toBe(true);
  });

  test("is exported from the package entry", () => {
    expect(Helpers.pipe).toBe(pipe);
    expect(typeof Helpers.pipe).toBe("function");
  });
});
