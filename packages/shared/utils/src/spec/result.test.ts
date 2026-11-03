import { describe, expect, expectTypeOf, test } from "bun:test";
import { type Result, resultify } from "../helpers";

/** A thenable that is not a native Promise, like a Drizzle query builder. */
const thenable = <T>(value: T): PromiseLike<T> => ({
  // biome-ignore lint/suspicious/noThenProperty: the point is a hand-made thenable
  then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
});

/** A thenable that is a function, which `await` also accepts. */
const callableThenable = <T>(value: T): (() => T) & PromiseLike<T> =>
  Object.assign(() => value, thenable(value));

describe("resultify", () => {
  test("types a non-native PromiseLike as a promised Result, and awaits it", async () => {
    const pending = resultify(() => thenable(42));

    expectTypeOf(pending).toEqualTypeOf<Promise<Result<number>>>();
    expect(pending).toBeInstanceOf(Promise);
    expect(await pending).toEqual({ success: true, data: 42 });
  });

  test("turns a rejected non-native PromiseLike into a failure", async () => {
    const failure = new Error("connection reset");
    const pending = resultify(
      (): PromiseLike<number> => ({
        // biome-ignore lint/suspicious/noThenProperty: the point is a hand-made thenable
        then: (resolve, reject) =>
          Promise.reject(failure).then(resolve, reject),
      }),
    );

    expect(await pending).toEqual({ success: false, error: failure });
  });

  test("awaits a thenable that is a function", async () => {
    const pending = resultify(() => callableThenable("rows"));

    expectTypeOf(pending).toEqualTypeOf<Promise<Result<string>>>();
    expect(pending).toBeInstanceOf(Promise);
    expect(await pending).toEqual({ success: true, data: "rows" });
  });

  test("keeps a plain function as data", () => {
    const callback = () => "not a thenable";

    expect(resultify(() => callback)).toEqual({
      success: true,
      data: callback,
    });
  });

  test("keeps sync and native async results as they were", async () => {
    const sync = resultify(() => 1);
    const async = resultify(async () => 1);

    expectTypeOf(sync).toEqualTypeOf<Result<number>>();
    expectTypeOf(async).toEqualTypeOf<Promise<Result<number>>>();
    expect(sync).toEqual({ success: true, data: 1 });
    expect(await async).toEqual({ success: true, data: 1 });
  });
});
