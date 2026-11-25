import { afterAll, expect, mock, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SQL } from "drizzle-orm";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import Postgres from "postgres";
import { agentsState, tables } from "../../database/schema";

// A private Unix-socket-only cluster cannot reach or mutate an app database.
const directory = mkdtempSync(join(tmpdir(), "ecentic-storefront-state-"));
const data = join(directory, "data");
const logfile = join(directory, "postgres.log");
// Unix socket filenames must fit even when macOS supplies a long TMPDIR.
const socket = mkdtempSync("/tmp/ecentic-state-");
const lifecycle = {
  running: false,
  client: null as ReturnType<typeof Postgres> | null,
};
const command = (parameters: string[]) => {
  const result = Bun.spawnSync(parameters, {
    // PostgreSQL needs a valid locale even when the test runner clears its env.
    env: { ...process.env, LC_ALL: "C", LANG: "C" },
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0)
    throw new Error(
      `${result.stdout.toString()}${result.stderr.toString()}${existsSync(logfile) ? readFileSync(logfile, "utf8") : ""}`,
    );
};

afterAll(async () => {
  await lifecycle.client?.end({ timeout: 5 });
  if (lifecycle.running)
    command(["pg_ctl", "-D", data, "-m", "immediate", "-w", "stop"]);
  rmSync(socket, { recursive: true, force: true });
  rmSync(directory, { recursive: true, force: true });
});

command([
  "initdb",
  "-D",
  data,
  "-U",
  "ecentic_storefront_test",
  "-A",
  "trust",
  "--no-locale",
  "--encoding=UTF8",
]);
command([
  "pg_ctl",
  "-D",
  data,
  "-l",
  logfile,
  "-o",
  `-F -k ${socket} -h ''`,
  "-w",
  "start",
]);
lifecycle.running = true;
const client = Postgres({
  host: socket,
  port: 5432,
  database: "postgres",
  username: "ecentic_storefront_test",
  max: 5,
  onnotice: () => {},
});
lifecycle.client = client;
const database = drizzle({ client });
const dialect = new PgDialect();
const queries: string[] = [];
mock.module("../../database", () => ({
  schema: tables,
  db: {
    execute: (query: SQL) => {
      queries.push(dialect.sqlToQuery(query).sql);
      return database.execute(query);
    },
  },
}));
const State = await import("../../app/storefront/state");
const migration = await Bun.file(
  new URL(
    "../../../../drizzle/20261123120000_agents_state/migration.sql",
    import.meta.url,
  ),
).text();
type Entry = Pick<typeof agentsState.$inferSelect, "key" | "value"> & {
  expires_at: Date | null;
};

test("migration adoption and the real Postgres backend preserve durable state", async () => {
  // A missing migration is retryable after provisioning, without runtime DDL.
  await expect(State.postgres.get("legacy")).rejects.toThrow();
  // Fresh installs use the exact schema; existing installations keep all rows.
  await client.unsafe(migration);
  const config = getTableConfig(agentsState);
  expect(tables.agentsState).toBe(agentsState);
  expect(config.name).toBe("agents_state");
  expect(
    config.columns.map((column) => [column.name, column.getSQLType()]),
  ).toEqual([
    ["key", "text"],
    ["value", "text"],
    ["expires_at", "timestamp with time zone"],
  ]);
  await client`drop table agents_state`;
  await client`
    create table agents_state (
      key text primary key, value text not null, expires_at timestamptz
    )
  `;
  const legacy = '{"id":"saved-run","stage":"done","prepared":"gzip-data"}';
  await client`
    insert into agents_state (key, value, expires_at) values
      ('legacy', ${legacy}, now() + interval '14 days'),
      ('old', '"expired"', now() - interval '1 second'),
      ('permanent', '["saved-run"]', null)
  `;
  const before = [
    ...(await client<Entry[]>`select * from agents_state order by key`),
  ];
  await client.unsafe(migration);
  expect([
    ...(await client<Entry[]>`select * from agents_state order by key`),
  ]).toEqual(before);

  expect(await State.postgres.get("legacy")).toEqual(JSON.parse(legacy));
  expect(await State.postgres.range("permanent")).toEqual(["saved-run"]);
  expect([
    ...(await client<
      Pick<Entry, "key">[]
    >`select key from agents_state where key = 'old'`),
  ]).toEqual([]);

  // Claims stay atomic, retain a live winner's deadline, and reclaim expiry.
  const claims = await Promise.all(
    Array.from({ length: 8 }, (_, index) =>
      State.postgres.set("claim", index, { ex: 120, nx: true }),
    ),
  );
  expect(claims.filter(Boolean)).toHaveLength(1);
  const claimed = [
    ...(await client<Entry[]>`select * from agents_state where key = 'claim'`),
  ];
  expect(
    await State.postgres.set("claim", "overwrite", { ex: 1, nx: true }),
  ).toBe(false);
  expect([
    ...(await client<Entry[]>`select * from agents_state where key = 'claim'`),
  ]).toEqual(claimed);
  await client`update agents_state set expires_at = now() - interval '1 second' where key = 'claim'`;
  expect(await State.postgres.get("claim")).toBeNull();
  expect(await State.postgres.set("claim", "new", { ex: 120, nx: true })).toBe(
    true,
  );
  expect(await State.postgres.get<string>("claim")).toBe("new");
  expect(await State.postgres.set("permanent", [], { ex: 120, nx: true })).toBe(
    false,
  );

  // Counters increment in one statement and start over after expiry.
  const increments = await Promise.all(
    Array.from({ length: 8 }, () => State.postgres.increment("counter", 60)),
  );
  expect([...increments].sort((left, right) => left - right)).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8,
  ]);
  await client`update agents_state set expires_at = now() - interval '1 second' where key = 'counter'`;
  expect(await State.postgres.increment("counter", 60)).toBe(1);

  for (const value of ["a", "b", "c", "d"])
    await State.postgres.prepend("runs", value, 3);
  expect(await State.postgres.range("runs")).toEqual(["d", "c", "b"]);
  expect([
    ...(await client<
      Pick<Entry, "expires_at">[]
    >`select expires_at from agents_state where key = 'runs'`),
  ]).toEqual([{ expires_at: null }]);
  await State.postgres.set("expired", { missing: true }, { ex: -1 });
  expect(
    await State.postgres.many(["runs", "missing", "expired", "claim", "runs"]),
  ).toEqual([["d", "c", "b"], null, null, "new", ["d", "c", "b"]]);
  expect(await State.postgres.many([])).toEqual([]);
  await State.postgres.remove("claim");
  expect(await State.postgres.get("claim")).toBeNull();

  // Missing schema fails clearly; requests cannot recreate schema implicitly.
  await client`drop table agents_state`;
  await expect(State.postgres.get("legacy")).rejects.toThrow();
  expect(
    queries.every((query) => !/\b(create|alter|drop)\b/i.test(query)),
  ).toBe(true);
}, 15_000);
