import { mock } from "bun:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import messages from "../../../../messages/en.json";

const browser = new JSDOM(
  "<!doctype html><html><body><div id='root'></div></body></html>",
  { url: "http://localhost/", pretendToBeVisual: true },
);
const window = browser.window as unknown as Window & typeof globalThis;
for (const name of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Element",
  "Node",
  "HTMLButtonElement",
  "MutationObserver",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "FocusEvent",
  "CustomEvent",
  "getComputedStyle",
] as const) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: name === "window" ? window : window[name],
  });
}
Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});
globalThis.fetch = Object.assign(
  async () => {
    throw new Error("Live requests forbidden in preparation tests");
  },
  { preconnect: () => {} },
);

type Summary = { candidates: string[]; verified: string[]; target: number };
type Result = {
  results: { prospectId: string; status: "verified" | "held" }[];
  held: number;
};
type Response<Value> =
  | { success: true; data: Value }
  | { success: false; error: { message: string } };
const calls = { summaries: 0, batches: [] as string[][], refreshes: 0 };
const summary: Summary = {
  candidates: ["one", "two", "three", "four"],
  verified: ["existing"],
  target: 3,
};
const response = {
  summary: async (): Promise<Response<Summary>> => ({
    success: true,
    data: summary,
  }),
  batch: async (ids: string[]): Promise<Response<Result>> => ({
    success: true,
    data: {
      results: ids.map((prospectId) => ({ prospectId, status: "verified" })),
      held: 0,
    },
  }),
};
mock.module("@/i18n/navigation", () => ({
  useRouter: () => ({
    refresh: () => {
      calls.refreshes += 1;
    },
  }),
}));
mock.module("@/server/app/outbound", () => ({
  getPreparationSummary: async () => {
    calls.summaries += 1;
    return response.summary();
  },
}));
mock.module("@/server/app/outbound/integrations", () => ({
  prepareBatch: async ({ prospectIds }: { prospectIds: string[] }) => {
    calls.batches.push(prospectIds);
    return response.batch(prospectIds);
  },
}));
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { NextIntlClientProvider } = await import("next-intl");
const { PreparationBatch } = await import(
  "@/app/[locale]/(workspace)/_components/preparation"
);
const host = document.getElementById("root");
assert(host);
const root = createRoot(host);
const copy = messages.outbound.preparation;
const render = (key: string, target = 99) =>
  act(async () => {
    root.render(
      <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
        <PreparationBatch key={key} target={target} />
      </NextIntlClientProvider>,
    );
  });
const button = (text: string) => {
  const found = Array.from(host.querySelectorAll("button")).find(
    (node) => node.textContent?.trim() === text,
  );
  assert(found, `Missing button: ${text}`);
  return found;
};
const click = (text: string) =>
  act(async () => {
    button(text).dispatchEvent(
      new window.MouseEvent("click", { bubbles: true }),
    );
  });
const pending = <Value,>() => {
  const state = { resolve: (_value: Value) => {} };
  const promise = new Promise<Value>((resolve) => {
    state.resolve = resolve;
  });
  return { promise, resolve: state.resolve };
};
const success = <Value,>(data: Value) => ({ success: true as const, data });
const complete = (ids: string[]): Result => ({
  results: ids.map((prospectId) => ({ prospectId, status: "verified" })),
  held: 0,
});

// Initial render and rerenders do not load hidden workspace data.
await render("loading");
await render("loading", 100);
assert.equal(calls.summaries, 0);
assert.equal(calls.batches.length, 0);
assert(!button(copy.action.primary).disabled);
assert(!host.textContent?.includes(copy.empty), "Unknown is not loaded-empty");
const loading = pending<Response<Summary>>();
response.summary = () => loading.promise;
await click(copy.action.primary);
assert.equal(calls.summaries, 1);
assert(button(copy.action.primary).disabled, "Summary load disables Start");
await click(copy.action.primary);
assert.equal(calls.summaries, 1, "A pending Start cannot load twice");
assert.equal(
  calls.batches.length,
  0,
  "Summary must arrive before research starts",
);
await act(async () => loading.resolve(success(summary)));
assert.deepEqual(calls.batches, [["one", "two"]]);
assert(
  host.textContent?.includes(
    "2 checked this run · 3 / 3 findings ready · 0 held",
  ),
);
assert(host.textContent?.includes(copy.complete));
assert(host.textContent?.includes("Work toward 100 recent product findings"));

// Stop during the read prevents even the first provider batch.
await render("stop-loading");
const stoppedLoad = pending<Response<Summary>>();
response.summary = () => stoppedLoad.promise;
await click(copy.action.primary);
await click(copy.action.secondary);
assert(button(copy.action.secondary).disabled);
await act(async () => stoppedLoad.resolve(success(summary)));
assert.equal(calls.batches.length, 1);
assert(host.textContent?.includes(copy.stopped));

// Stop waits for an in-flight result; restarting retains visited and verified IDs.
await render("stop-batch");
response.summary = async () => success({ ...summary, target: 4 });
const firstBatch = pending<Response<Result>>();
response.batch = () => firstBatch.promise;
await click(copy.action.primary);
assert.deepEqual(calls.batches.at(-1), ["one", "two", "three"]);
await click(copy.action.secondary);
await act(async () =>
  firstBatch.resolve(
    success({
      results: [
        { prospectId: "one", status: "verified" },
        { prospectId: "two", status: "held" },
        { prospectId: "three", status: "verified" },
      ],
      held: 1,
    }),
  ),
);
assert(
  host.textContent?.includes(
    "3 checked this run · 3 / 4 findings ready · 1 held",
  ),
);
assert(host.textContent?.includes(copy.stopped));
response.batch = async (ids) => success(complete(ids));
await click(copy.action.primary);
assert.deepEqual(calls.batches.at(-1), ["four"]);
assert(
  host.textContent?.includes(
    "1 checked this run · 4 / 4 findings ready · 0 held",
  ),
);
assert(host.textContent?.includes(copy.complete));

// A failed batch is retriable; it cannot count as processed or visited.
await render("failure");
response.summary = async () => success({ ...summary, target: 2 });
response.batch = async () => ({
  success: false,
  error: { message: "Fixture batch failed" },
});
await click(copy.action.primary);
assert(host.textContent?.includes("Fixture batch failed"));
assert(
  host.textContent?.includes(
    "0 checked this run · 1 / 2 findings ready · 0 held",
  ),
);
response.batch = async (ids) => success(complete(ids));
await click(copy.action.primary);
assert.deepEqual(calls.batches.at(-1), ["one"]);
assert(host.textContent?.includes(copy.complete));

// Empty and failed summaries do not issue paid research.
await render("empty");
response.summary = async () =>
  success({ candidates: [], verified: [], target: 2 });
const beforeEmpty = calls.batches.length;
await click(copy.action.primary);
assert.equal(calls.batches.length, beforeEmpty);
assert(host.textContent?.includes(copy.empty));
assert(
  !button(copy.action.primary).disabled,
  "Empty queues can be checked again",
);
// Import refreshes preserve this component's local state; new candidates must be reachable.
response.summary = async () =>
  success({ candidates: ["newly-imported"], verified: [], target: 1 });
const beforeRefresh = calls.summaries;
await render("empty", 100);
assert.equal(
  calls.summaries,
  beforeRefresh,
  "Refresh does not start preparation",
);
await click(copy.action.primary);
assert.deepEqual(calls.batches.at(-1), ["newly-imported"]);
assert(host.textContent?.includes(copy.complete));
assert(
  !button(copy.action.primary).disabled,
  "Exhausted queues can also be checked again",
);
const afterRetry = calls.batches.length;
await render("summary-failure");
response.summary = async () => ({
  success: false,
  error: { message: "Fixture summary failed" },
});
await click(copy.action.primary);
assert.equal(calls.batches.length, afterRetry);
assert(host.textContent?.includes("Fixture summary failed"));
assert(!button(copy.action.primary).disabled, "Failed reads can be retried");

// Navigating away while the read is pending must never begin research.
await render("unmount");
const abandoned = pending<Response<Summary>>();
response.summary = () => abandoned.promise;
await click(copy.action.primary);
await act(async () => root.unmount());
await act(async () => abandoned.resolve(success(summary)));
assert.equal(calls.batches.length, afterRetry);
browser.window.close();
console.log("Manual preparation DOM contracts passed");
