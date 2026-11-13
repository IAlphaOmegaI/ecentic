import { expect, test } from "bun:test";
import { z } from "zod";
import {
  createTranslationCapacity,
  translationOutputBudget,
  withTranslationOutputBudget,
} from "./capacity";

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

const request = {
  phase: "review" as const,
  system: "",
  prompt: `Review all units.\n${JSON.stringify({ units: [{ id: "title", text: "Example" }] })}`,
  schemaName: "test",
  schema: z.object({}),
};

test("confirmed truncation retries the whole request once with more output room", async () => {
  const budgets: number[] = [];
  const truncated = new Error("output limit");
  const result = await withTranslationOutputBudget(
    request,
    async (budget) => {
      budgets.push(budget);
      if (budgets.length === 1) throw truncated;
      return { checkedPasses: ["semantic", "structural"], complete: true };
    },
    (error) => error === truncated,
  );
  expect(budgets).toEqual([2000, 4000]);
  expect(result.complete).toBe(true);
});

test("a second truncation or a different failure propagates without accepting partial output", async () => {
  const truncated = new Error("output limit");
  const attempts: number[] = [];
  await expect(
    withTranslationOutputBudget(
      request,
      async (budget) => {
        attempts.push(budget);
        throw truncated;
      },
      (error) => error === truncated,
    ),
  ).rejects.toBe(truncated);
  expect(attempts).toEqual([2000, 4000]);
  const invalid = new Error("invalid schema");
  const otherAttempts: number[] = [];
  await expect(
    withTranslationOutputBudget(
      request,
      async (budget) => {
        otherAttempts.push(budget);
        throw invalid;
      },
      (error) => error === truncated,
    ),
  ).rejects.toBe(invalid);
  expect(otherAttempts).toEqual([2000]);
});
