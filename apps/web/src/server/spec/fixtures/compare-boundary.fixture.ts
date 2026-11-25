import { afterAll, beforeEach, expect, mock, spyOn, test } from "bun:test";
import type * as Compare from "../../app/intelligence/compare";
import { Environment } from "../../utils/environment";
import { ValidationError } from "../../utils/error";

mock.module("server-only", () => ({}));
mock.module("../../utils/context", () => ({
  withContext:
    (callback: (context: unknown, input: unknown) => unknown) =>
    (_: unknown, input: unknown) =>
      callback({}, input),
}));
const state = {
  events: [] as Compare.CompareEvent[],
  completion: Promise.resolve(),
  response: "success",
  modelFailure: false,
};
const generation = mock(async (_options: { label: string }) => ({
  title: "Mug",
  brand: "Merchant",
  price: "20",
  currency: "USD",
  description: "Ceramic mug",
  image: null,
}));
const evaluation = mock((_options: { label: string }) => ({
  output: state.modelFailure
    ? Promise.reject(new Error("private provider diagnostic"))
    : Promise.resolve({
        winner: "a",
        scoreA: 70,
        scoreB: 60,
        reasoning: "The listed dimensions meet the request.",
        keyFactors: ["Dimensions"],
      }),
  textStream: {
    [Symbol.asyncIterator]: () => ({
      next: async () => ({ done: true, value: "" }),
    }),
  },
}));
mock.module("../../utils/ai", () => ({
  generate: generation,
  stream: evaluation,
  streamable: (
    callback: (update: (event: Compare.CompareEvent) => void) => Promise<void>,
  ) => {
    state.completion = callback((event) => state.events.push(event));
    return { output: "fixture-stream" };
  },
}));
const Actions = await import("../../app/intelligence/compare");
const environment = process.env.NODE_ENV;
const preconnect = globalThis.fetch.preconnect;
const network = spyOn(globalThis, "fetch");
const input = {
  urlA: "https://93.184.215.14/first",
  urlB: "https://93.184.215.14/second",
  prompt: "a ceramic mug",
};
beforeEach(() => {
  Reflect.set(process.env, "NODE_ENV", "production");
  Object.assign(state, {
    events: [],
    completion: Promise.resolve(),
    response: "success",
    modelFailure: false,
  });
  generation.mockClear();
  evaluation.mockClear();
  network.mockClear();
  network.mockImplementation(
    Object.assign(
      async () => {
        if (state.response === "redirect")
          return new Response(null, {
            status: 302,
            headers: { Location: "https://127.0.0.1/private" },
          });
        if (state.response === "unavailable")
          return new Response("failure", { status: 503 });
        return new Response(
          state.response === "oversized"
            ? "x".repeat(3 * 1024 * 1024 + 1)
            : "<h1>Mug</h1><p>A ceramic mug</p>",
        );
      },
      { preconnect },
    ),
  );
});
afterAll(() => {
  network.mockRestore();
  if (environment === undefined)
    Reflect.deleteProperty(process.env, "NODE_ENV");
  else Reflect.set(process.env, "NODE_ENV", environment);
});

test.each([
  { ...input, urlA: "file:///private/secret" },
  { ...input, urlB: `https://93.184.215.14/${"x".repeat(2048)}` },
  { ...input, prompt: "x".repeat(2001) },
])("rejects invalid comparison input before starting work", async (invalid) => {
  const result = await Actions.runCompare(Environment.SERVER, invalid);
  expect(result.success).toBe(false);
  if (!result.success)
    expect(result.error.name).toBe(ValidationError.errorName);
  expect(network).not.toHaveBeenCalled();
  expect(generation).not.toHaveBeenCalled();
});

test("refuses private destinations without a fetch or a model call", async () => {
  await Actions.runCompare(Environment.SERVER, {
    ...input,
    urlA: "https://127.0.0.1/private",
    urlB: "https://169.254.169.254/metadata",
  });
  await state.completion;
  expect(network).not.toHaveBeenCalled();
  expect(generation).not.toHaveBeenCalled();
  expect(state.events.at(-1)).toEqual({
    kind: "error",
    text: "Product A must be a reachable public HTTPS URL.",
  });
});

test.each(["redirect", "unavailable", "oversized"])(
  "stops %s pages before model work",
  async (response) => {
    state.response = response;
    await Actions.runCompare(Environment.SERVER, input);
    await state.completion;
    expect(network).toHaveBeenCalledTimes(2);
    expect(generation).not.toHaveBeenCalled();
    expect(state.events.at(-1)?.kind).toBe("error");
  },
);

test("keeps the public comparison usable with no session", async () => {
  const result = await Actions.runCompare(Environment.SERVER, input);
  expect(result.success).toBe(true);
  await state.completion;
  expect(generation).toHaveBeenCalledTimes(2);
  expect(evaluation).toHaveBeenCalledTimes(4);
  expect(generation.mock.calls.map(([options]) => options.label)).toEqual([
    "compare.extract",
    "compare.extract",
  ]);
  expect(
    evaluation.mock.calls.every(
      ([options]) => options.label === "compare.evaluate",
    ),
  ).toBe(true);
  const terminal = state.events.at(-1);
  expect(terminal?.kind).toBe("done");
  if (terminal?.kind === "done") {
    expect(terminal.results).toHaveLength(4);
    expect(terminal.results.every((result) => result.winner === "a")).toBe(
      true,
    );
  }
});

test("reports failed evaluation without inventing a Product B win", async () => {
  state.modelFailure = true;
  await Actions.runCompare(Environment.SERVER, input);
  await state.completion;
  expect(state.events.at(-1)).toEqual({
    kind: "error",
    text: "A model could not complete the comparison. Please try again.",
  });
  expect(state.events.some((event) => event.kind === "done")).toBe(false);
  expect(JSON.stringify(state.events)).not.toContain(
    "private provider diagnostic",
  );
  expect(JSON.stringify(state.events)).not.toContain("DECISION:");
});
