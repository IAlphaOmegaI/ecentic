import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { SetStateAction } from "react";

// Model render snapshots and state updates without a DOM. Recording hook
// positions also catches a changed hook order when the mode changes.
const scheduler = {
  states: [] as unknown[],
  calls: [] as string[],
  operations: [] as Promise<void>[],
  errors: [] as unknown[],
};

mock.module("react", () => ({
  useState: <Value>(initial: Value) => {
    const index = scheduler.calls.length;
    scheduler.calls.push("state");
    if (!(index in scheduler.states)) scheduler.states[index] = initial;
    return [
      scheduler.states[index],
      (value: SetStateAction<Value>) => {
        scheduler.states[index] =
          typeof value === "function"
            ? (value as (previous: Value) => Value)(
                scheduler.states[index] as Value,
              )
            : value;
      },
    ];
  },
  useCallback: <Callback>(callback: Callback) => {
    scheduler.calls.push("callback");
    return callback;
  },
  useTransition: () => {
    scheduler.calls.push("transition");
    return [
      false,
      (callback: () => Promise<void>) => {
        scheduler.operations.push(
          callback().catch((error: unknown) => {
            scheduler.errors.push(error);
          }),
        );
      },
    ];
  },
}));

const { useAsyncAction } = await import("../../src/hooks/use-async-action");
const render = (action: () => Promise<unknown>, transition = true) => {
  scheduler.calls.length = 0;
  return useAsyncAction(action, transition);
};

beforeEach(() => {
  scheduler.states.length = 0;
  scheduler.calls.length = 0;
  scheduler.operations.length = 0;
  scheduler.errors.length = 0;
});

describe("useAsyncAction", () => {
  test.each([true, false])(
    "waits for its own result with transition=%s",
    async (transition) => {
      const deferred = Promise.withResolvers<number>();
      const action = () => deferred.promise;
      const [run] = render(action, transition);
      const observed = { completed: false };
      const result = run().then((value) => {
        observed.completed = true;
        return value;
      });
      await Promise.resolve();
      expect(observed.completed).toBe(false);
      expect(render(action, transition)[1]).toBe(true);
      deferred.resolve(42);
      expect(await result).toBe(42);
      expect(render(action, transition)[1]).toBe(false);
    },
  );

  test.each([true, false])(
    "preserves rejection and clears pending with transition=%s",
    async (transition) => {
      const deferred = Promise.withResolvers<number>();
      const action = () => deferred.promise;
      const [run] = render(action, transition);
      const failure = new Error("Action failed");
      const result = run();
      deferred.reject(failure);
      await expect(result).rejects.toBe(failure);
      await Promise.all(scheduler.operations);
      expect(render(action, transition)[1]).toBe(false);
      expect(scheduler.errors).toEqual([]);
    },
  );

  test.each([true, false])(
    "handles synchronous throws with transition=%s",
    async (transition) => {
      const failure = new Error("Action threw before returning a promise");
      const action = (): Promise<number> => {
        throw failure;
      };
      const [run] = render(action, transition);
      await expect(run()).rejects.toBe(failure);
      expect(render(action, transition)[1]).toBe(false);
    },
  );

  test("remains pending until every overlapping action settles", async () => {
    const first = Promise.withResolvers<number>();
    const second = Promise.withResolvers<number>();
    const [run] = render(() => first.promise, false);
    const earlier = run();
    const [next] = render(() => second.promise, false);
    const later = next();
    second.resolve(2);
    expect(await later).toBe(2);
    expect(render(() => first.promise, false)[1]).toBe(true);
    first.resolve(1);
    expect(await earlier).toBe(1);
    expect(render(() => first.promise, false)[1]).toBe(false);
  });

  test("keeps hook order when transition mode changes", async () => {
    const action = async () => "completed";
    const [first] = render(action, true);
    const order = [...scheduler.calls];
    expect(await first()).toBe("completed");
    const [second] = render(action, false);
    expect(scheduler.calls).toEqual(order);
    expect(await second()).toBe("completed");
    render(action, true);
    expect(scheduler.calls).toEqual(order);
  });

  test("preserves an undefined action result", async () => {
    const [run] = render(async () => undefined);
    expect(await run()).toBeUndefined();
  });
});
