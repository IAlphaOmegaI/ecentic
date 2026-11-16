import { beforeEach, expect, mock, test } from "bun:test";

const state = {
  owner: "owner",
  fail: "",
  writes: [] as Record<string, unknown>[],
};
mock.module("../../utils/authentication", () => ({
  withAuthentication:
    (callback: (context: unknown, data: unknown) => unknown) =>
    (data: unknown) =>
      callback({ session: { user: { id: "owner" } } }, data),
}));
mock.module("../../app/store", () => ({
  get: async () => ({
    success: true,
    data: { id: "store", userId: state.owner },
  }),
  update: async () => ({ success: true, data: {} }),
  create: async () => ({ success: true, data: {} }),
}));
mock.module("../../app/product", () => ({
  sync: async (_environment: unknown, record: Record<string, unknown>) => {
    state.writes.push(record);
    const { title } = record;
    return title === state.fail
      ? { success: false, error: new Error("row failed") }
      : { success: true, data: record };
  },
}));
const { syncProducts } = await import("../../app/integration/csv");
beforeEach(() => {
  state.owner = "owner";
  state.fail = "";
  state.writes = [];
});

test("valid input preserves explicit, embedded, and unspecified currency", async () => {
  const result = await syncProducts({
    store: "store",
    products: [
      { id: "001", title: "Mouse", price: "45", currency: "eur" },
      { title: "Keyboard", price: "60 CAD" },
      { title: "Speaker", price: "20" },
    ],
  });
  expect(result).toEqual({ success: true, data: 3 });
  expect(state.writes.map(({ currency }) => currency)).toEqual([
    "EUR",
    "CAD",
    null,
  ]);
  expect(state.writes.map(({ externalId }) => externalId)).toEqual([
    "001",
    null,
    null,
  ]);
});

test("partial results report only successful rows and do not retry successes", async () => {
  state.fail = "Broken";
  const result = await syncProducts({
    store: "store",
    products: [
      { title: "Saved", price: "10" },
      { title: "Broken", price: "20" },
    ],
  });
  expect(result).toEqual({ success: true, data: 1 });
  expect(state.writes).toHaveLength(2);
});

test("foreign stores cannot receive imports", async () => {
  state.owner = "another-user";
  const result = await syncProducts({
    store: "store",
    products: [{ title: "Never imported" }],
  });
  expect(result.success).toBe(false);
  expect(state.writes).toHaveLength(0);
});
