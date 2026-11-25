import { Database } from "bun:sqlite";
import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { tables as schema } from "../../database/schema";
import { Environment } from "../../utils/environment";

// Next handles this build-time marker; this isolated Bun fixture runs server code.
mock.module("server-only", () => ({}));

const database = new Database(":memory:");
database.exec("create table simulation (scanId text, model text, winner text)");
const dialect = new PgDialect();
const state = { status: "complete", missing: false, reads: 0, failed: false };
mock.module("../../database", () => ({ schema }));
mock.module("../../utils/context", () => ({
  withContext:
    (callback: (context: unknown, data: unknown) => unknown) =>
    (_environment: unknown, data: unknown) =>
      callback({}, data),
}));
mock.module("../../utils/authentication", () => ({
  withAuthentication: () => () => ({
    success: false,
    error: new Error("No signed-in user"),
  }),
}));
mock.module("../../utils/repository", () => ({
  repository: () => ({
    get: async (_environment: unknown, id: string) => ({
      success: !state.missing,
      data: state.missing ? undefined : { id, status: state.status },
      error: state.missing ? new Error("Not found") : undefined,
    }),
  }),
}));
mock.module("../../app/simulation", () => ({
  getForScan: () => ({ success: false, error: new Error("No signed-in user") }),
  find: async (_environment: unknown, options: { where: SQL }) => {
    state.reads += 1;
    if (state.failed)
      return { success: false, error: new Error("Read failed") };
    const condition = dialect.sqlToQuery(options.where);
    return {
      success: true,
      data: database
        .query(
          `select * from simulation where ${condition.sql.replaceAll(/\$(\d+)/g, "?$1")}`,
        )
        .all(...(condition.params as string[])),
    };
  },
}));
const { getShareData } = await import("../../app/scan");

beforeEach(() => {
  Object.assign(state, {
    status: "complete",
    missing: false,
    reads: 0,
    failed: false,
  });
  database.exec("delete from simulation");
  for (const row of [
    ["shared", "gpt4", "product"],
    ["shared", "gpt4", "competitor"],
    ["other", "claude", "product"],
  ])
    database.query("insert into simulation values (?, ?, ?)").run(...row);
});
afterAll(() => database.close());

test("a signed-out visitor can read only the selected completed scan", async () => {
  const result = await getShareData(Environment.SERVER, { id: "shared" });
  expect(result.success && result.data.modelRates).toEqual({
    gpt4: { wins: 1, losses: 1, rate: 50 },
  });
});

test("missing and incomplete scans never read simulation rows", async () => {
  for (const status of ["pending", "running", "failed"]) {
    state.status = status;
    expect(
      (await getShareData(Environment.SERVER, { id: "shared" })).success,
    ).toBe(false);
  }
  state.missing = true;
  expect(
    (await getShareData(Environment.SERVER, { id: "missing" })).success,
  ).toBe(false);
  expect(state.reads).toBe(0);
});

test("a failed simulation read does not become an empty successful report", async () => {
  state.failed = true;
  expect(
    (await getShareData(Environment.SERVER, { id: "shared" })).success,
  ).toBe(false);
});

test("a completed scan without model rows returns no invented model results", async () => {
  database.exec("delete from simulation");
  const result = await getShareData(Environment.SERVER, { id: "shared" });
  expect(result.success && result.data.modelRates).toEqual({});
});
