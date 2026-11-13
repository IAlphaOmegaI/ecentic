import { expect, test } from "bun:test";
import { z } from "zod";
import { createTranslationCapacity, translationOutputBudget } from "./capacity";

test("concurrent workers share the minute reservation window", async () => {
  const clock = { time: 0, waits: [] as number[] };
  const reserve = createTranslationCapacity({
    tokensPerMinute: 100,
    now: () => clock.time,
    wait: async (milliseconds) => {
      clock.waits.push(milliseconds);
      clock.time += milliseconds;
    },
  });
  await Promise.all([
    reserve(60, new AbortController().signal),
    reserve(60, new AbortController().signal),
    reserve(30, new AbortController().signal),
  ]);
  expect(clock.waits).toEqual([60_000]);
});

test("cancelled requests do not poison the reservation queue", async () => {
  const reserve = createTranslationCapacity({ tokensPerMinute: 100 });
  const controller = new AbortController();
  controller.abort();
  await expect(reserve(50, controller.signal)).rejects.toThrow();
  await expect(
    reserve(50, new AbortController().signal),
  ).resolves.toBeUndefined();
});

test("small corrections reserve only the requested targets", () => {
  const budget = translationOutputBudget({
    phase: "correct",
    system: "",
    prompt: `Correct requested IDs.\n${JSON.stringify({
      units: [
        { id: "short", text: "Close" },
        { id: "unaffected", text: "x".repeat(20_000) },
      ],
      requestedIds: ["short"],
    })}`,
    schemaName: "test",
    schema: z.object({}),
  });
  expect(budget).toBe(2000);
});
