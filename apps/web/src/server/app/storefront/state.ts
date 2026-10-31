// Deliberately NOT a "use server" module: every export of an action file is a
// public RPC door.

import { sql } from "drizzle-orm";
import { db } from "../../database";

/**
 * `/agents` run state in one small Postgres table. Values are JSON in a text
 * column, so nothing depends on how a driver encodes jsonb.
 *
 * The app creates the table itself on first use. It is not in `schema.ts` and has
 * no migration, so `drizzle-kit push` will offer to drop it: move it into the
 * schema if `/agents` outlives tonight.
 */

export type SetOptions = { ex: number; nx?: boolean };

export type Backend = {
  get: <T>(key: string) => Promise<T | null>;
  /** Resolves false only when `nx` was asked for and the key already exists. */
  set: (key: string, value: unknown, options: SetOptions) => Promise<boolean>;
  remove: (key: string) => Promise<void>;
  increment: (key: string, ttl: number) => Promise<number>;
  prepend: (key: string, value: string, keep: number) => Promise<void>;
  range: (key: string) => Promise<string[]>;
  many: <T>(keys: string[]) => Promise<(T | null)[]>;
};

type Row = { key: string; value: string };

const setup = { pending: null as Promise<void> | null };

/** Once per process. Expired rows are only ever filtered, so this also sweeps them. */
const ready = () => {
  setup.pending ??= (async () => {
    await db.execute(sql`
      create table if not exists agents_state (
        key text primary key,
        value text not null,
        expires_at timestamptz
      )
    `);
    await db.execute(sql`delete from agents_state where expires_at <= now()`);
  })().catch((error) => {
    setup.pending = null;
    throw error;
  });
  return setup.pending;
};

const rows = async (query: Parameters<typeof db.execute>[0]) => {
  await ready();
  return [...(await db.execute(query))] as unknown as Row[];
};

const alive = sql`(expires_at is null or expires_at > now())`;

const deadline = (seconds: number) =>
  sql`now() + make_interval(secs => ${seconds}::double precision)`;

const read = async <T>(key: string) => {
  const [row] = await rows(
    sql`select key, value from agents_state where key = ${key} and ${alive}`,
  );
  return row ? (JSON.parse(row.value) as T) : null;
};

export const postgres: Backend = {
  get: read,
  set: async (key, value, { ex, nx }) => {
    const answer = await rows(sql`
      insert into agents_state (key, value, expires_at)
      values (${key}, ${JSON.stringify(value)}, ${deadline(ex)})
      on conflict (key) do update
        set value = excluded.value, expires_at = excluded.expires_at
        ${nx ? sql`where agents_state.expires_at <= now()` : sql``}
      returning key, value
    `);
    return answer.length > 0;
  },
  remove: async (key) => {
    await rows(sql`delete from agents_state where key = ${key}`);
  },
  increment: async (key, ttl) => {
    const [row] = await rows(sql`
      insert into agents_state (key, value, expires_at)
      values (${key}, '1', ${deadline(ttl)})
      on conflict (key) do update
        set value = (
          case when agents_state.expires_at > now()
            then agents_state.value::bigint + 1
            else 1
          end
        )::text,
        expires_at = excluded.expires_at
      returning key, value
    `);
    return Number(row?.value ?? 0);
  },
  prepend: async (key, value, keep) => {
    await rows(sql`
      insert into agents_state (key, value)
      values (${key}, jsonb_build_array(${value}::text)::text)
      on conflict (key) do update
        set value = (
          select jsonb_agg(item order by position)::text
          from (
            select item, position
            from jsonb_array_elements(
              jsonb_build_array(${value}::text) || agents_state.value::jsonb
            ) with ordinality as list(item, position)
            order by position
            limit ${keep}::int
          ) as kept
        )
      returning key, value
    `);
  },
  range: async (key) => (await read<string[]>(key)) ?? [],
  many: async <T>(list: string[]) => {
    if (list.length === 0) return [];
    const found = await rows(sql`
      select key, value from agents_state
      where key in ${list} and ${alive}
    `);
    const values = new Map(found.map(({ key, value }) => [key, value]));
    return list.map((key) => {
      const value = values.get(key);
      return value === undefined ? null : (JSON.parse(value) as T);
    });
  },
};
