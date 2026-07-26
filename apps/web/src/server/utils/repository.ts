import { resultify } from "@zenncore/utils";
import {
  type AnyColumn,
  asc,
  desc,
  eq,
  getTableName,
  type SQL,
  sql,
} from "drizzle-orm";
import type { PgTableWithColumns } from "drizzle-orm/pg-core";
import { db, type TransactionScope } from "@/server/database";
import { withContext } from "./context";
import { DatabaseError } from "./error";

/** Table type that has id and optional createdAt for default ordering */
type TableWithId =
  PgTableWithColumns<// @ts-expect-error - PgTableWithColumns requires TableConfig; generic table type
  {
    columns: { id: AnyColumn };
    name: string;
    schema: undefined;
    dialect: "pg";
  }> & {
    id: AnyColumn;
    createdAt?: AnyColumn;
  };

/** Inferred select (row) type for a table */
export type Document<T extends TableWithId> = T["$inferSelect"];

/** Insert type without id (id optional for create) */
export type Insertable<T extends TableWithId> = Omit<
  T["$inferInsert"],
  "id"
> & { id?: string };

export type OrderByEntry<_T extends TableWithId> = {
  column: AnyColumn;
  direction: "asc" | "desc";
};

export type PaginateOptions<T extends TableWithId> = {
  where?: SQL;
  orderBy?: OrderByEntry<T>[];
};

export type ExecuteOptions = {
  tx?: TransactionScope;
};

/** Human-readable table name for errors (e.g. "user") */
const label = (table: TableWithId): string => {
  const resolved = resultify(() =>
    getTableName(table as Parameters<typeof getTableName>[0]),
  );
  if (!resolved.success) return "table";
  return typeof resolved.data === "string" ? resolved.data : "table";
};

/** Cast for Drizzle's strict table generics when using db.select/update/delete */
// biome-ignore lint/suspicious/noExplicitAny: Drizzle table generic is complex; cast needed for .from(table)
const asTable = <T>(value: T): any => value;

const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

// biome-ignore lint/suspicious/noExplicitAny: tx and db share query API but have different nominal types
const executor = (options?: ExecuteOptions): any => options?.tx ?? db;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null);

/**
 * Strips NUL (U+0000) from every string reachable in a write payload.
 *
 * Postgres rejects 0x00 anywhere in a text value — `invalid byte sequence for
 * encoding "UTF8": 0x00` — and it is not an escape we can encode around; the
 * byte simply cannot be stored. Model output and scraped listings occasionally
 * carry one (a judge once emitted it mid-sentence in a simulation `reasoning`,
 * failing the insert and taking the whole scan down with it), so the safest
 * place to drop it is the single choke point every write already passes
 * through. Every other control character is legal and is left alone.
 *
 * Only strings, arrays and plain objects (jsonb payloads) are rebuilt — Date,
 * Buffer and Drizzle's `sql` fragments carry behaviour a copy would lose, so
 * they pass through untouched.
 */
const scrub = (value: unknown): unknown => {
  switch (true) {
    case typeof value === "string":
      return value.replaceAll("\u0000", "");
    case Array.isArray(value):
      return value.map(scrub);
    case isPlainObject(value):
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, scrub(entry)]),
      );
    default:
      return value;
  }
};

const scrubbed = <T>(data: T): T => scrub(data) as T;

/**
 * Generic repository over a Drizzle table (CRUD + paginate/find).
 * Returns Result types for all operations. Use with schema.user, schema.session, etc.
 */
export function repository<T extends TableWithId>(table: T) {
  const name = label(table);

  return {
    get: withContext(
      async (_, id: string, options?: ExecuteOptions) => {
        const run = executor(options);
        const target = asTable(table);
        const result = await resultify(
          async () =>
            run
              .select()
              .from(target)
              .where(eq(target.id, id))
              .limit(1) as Promise<Document<T>[]>,
        );

        if (!result.success) {
          if (process.env.NODE_ENV === "development")
            console.error(
              `Failed to get record from ${name} with id: ${id}`,
              result.error,
            );
          return {
            success: false,
            error: new DatabaseError(
              `Failed to get record from ${name} with id: ${id}: ${result.error}`,
              { cause: result.error },
            ),
          };
        }

        const row = result.data?.[0] ?? null;
        return { success: true, data: row };
      },
      `${capitalize(name)}.get`,
    ),

    paginate: withContext(
      async (
        _,
        page: number,
        size: number,
        paginateOptions: PaginateOptions<T> = {},
        options?: ExecuteOptions,
      ) => {
        const run = executor(options);
        const { where, orderBy } = paginateOptions;
        const offset = (page - 1) * size;

        const target = asTable(table);

        const order = orderBy?.length
          ? orderBy.map(({ column, direction }) =>
              direction === "desc" ? desc(column) : asc(column),
            )
          : target.createdAt
            ? ([desc(target.createdAt)] as const)
            : ([desc(target.id)] as const);

        const query = run
          .select()
          .from(target)
          .where(where)
          .orderBy(...order)
          .offset(offset)
          .limit(size);

        const cQuery = run
          .select({ count: sql<number>`count(*)::int` })
          .from(target)
          .where(where);

        const [result, count] = await Promise.all([
          resultify(async () => (await query) as Document<T>[]),
          resultify(async () => (await cQuery) as { count: number }[]),
        ]);

        if (!result.success) {
          if (process.env.NODE_ENV === "development")
            console.error(`Failed to paginate ${name}`, result.error);
          return {
            success: false,
            error: new DatabaseError(
              `Failed to paginate ${name}: ${result.error}`,
              { cause: result.error },
            ),
          };
        }

        if (!count.success) {
          return {
            success: false,
            error: new DatabaseError("Failed to count records", {
              cause: count.error,
            }),
          };
        }

        const total = count.data?.[0]?.count ?? 0;
        const items = (result.data ?? []) as Document<T>[];

        return {
          success: true as const,
          data: {
            items,
            pagination: { total, page, size },
          },
        };
      },
      `${capitalize(name)}.paginate`,
    ),

    create: withContext(
      async (_, data: Insertable<T>, options?: ExecuteOptions) => {
        const run = executor(options);
        const target = asTable(table);
        const result = await resultify(async () =>
          run
            .insert(target)
            .values(scrubbed(data) as T["$inferInsert"])
            .returning(),
        );

        if (!result.success) {
          if (process.env.NODE_ENV === "development")
            console.error(`Failed to create record on ${name}`, result.error);
          return {
            success: false,
            error: new DatabaseError(
              `Failed to create record on ${name}: ${result.error}. Args: ${JSON.stringify(data)}`,
              { cause: result.error },
            ),
          };
        }

        const rows = (result as { success: true; data: Document<T>[] }).data;
        const row = rows?.[0] as Document<T>;

        // updateTag(name);

        return { success: true as const, data: row };
      },
      `${capitalize(name)}.create`,
    ),

    upsert: withContext(
      async (
        _,
        data: Insertable<T>,
        config: {
          target: AnyColumn[];
          set?: Partial<Insertable<T>>;
        } & ExecuteOptions,
      ) => {
        const run = executor(config);
        const target = asTable(table);
        const values = scrubbed(data);
        const { id: _id, ...rest } = values as Record<string, unknown>;
        const set = config.set ? scrubbed(config.set) : rest;
        const result = await resultify(async () =>
          run
            .insert(target)
            .values(values as T["$inferInsert"])
            .onConflictDoUpdate({ target: config.target, set })
            .returning(),
        );

        if (!result.success) {
          if (process.env.NODE_ENV === "development")
            console.error(`Failed to upsert record on ${name}`, result.error);
          return {
            success: false,
            error: new DatabaseError(
              `Failed to upsert record on ${name}: ${result.error}. Args: ${JSON.stringify(data)}`,
              { cause: result.error },
            ),
          };
        }

        const rows = (result as { success: true; data: Document<T>[] }).data;
        const row = rows?.[0] as Document<T>;

        return { success: true as const, data: row };
      },
      `${capitalize(name)}.upsert`,
    ),

    update: withContext(
      async (
        _,
        id: string,
        data: Partial<Insertable<T>>,
        options?: ExecuteOptions,
      ) => {
        const run = executor(options);
        const target = asTable(table);
        const result = await resultify(
          async () =>
            run
              .update(target)
              .set(scrubbed(data) as Partial<T["$inferInsert"]>)
              .where(eq(target.id, id))
              .returning() as Promise<Document<T>[]>,
        );

        if (!result.success) {
          if (process.env.NODE_ENV === "development")
            console.error(
              `Failed to update record on ${name} with id: ${id}`,
              result.error,
            );
          return {
            success: false,
            error: new DatabaseError(
              `Failed to update record on ${name} with id: ${id}: ${result.error}`,
              { cause: result.error },
            ),
          };
        }

        // updateTag(name);
        // updateTag(id);
        // updateTag(`count:${name}`);
        // updateTag(`exists:${name}`);

        const row = result.data?.[0] ?? null;
        return { success: true as const, data: row as Document<T> | null };
      },
      `${capitalize(name)}.update`,
    ),

    destroy: withContext(
      async (_, id: string, options?: ExecuteOptions) => {
        const run = executor(options);
        const target = asTable(table);
        const result = await resultify(async () =>
          run.delete(target).where(eq(target.id, id)),
        );

        if (!result.success) {
          if (process.env.NODE_ENV === "development")
            console.error(
              `Failed to delete record from ${name} with id: ${id}`,
              result.error,
            );
          return {
            success: false,
            error: new DatabaseError(
              `Failed to delete record from ${name} with id: ${id}: ${result.error}`,
              { cause: result.error },
            ),
          };
        }

        // updateTag(name);
        // updateTag(`count:${name}`);
        // updateTag(`exists:${name}`);
        // updateTag(id);

        return { success: true as const, data: true };
      },
      `${capitalize(name)}.destroy`,
    ),

    exists: withContext(
      async (_, id: string, options?: ExecuteOptions) => {
        const run = executor(options);
        const target = asTable(table);
        const result = await resultify(
          async () =>
            run
              .select({ id: target.id })
              .from(target)
              .where(eq(target.id, id))
              .limit(1) as Promise<{ id: string }[]>,
        );

        if (!result.success) {
          if (process.env.NODE_ENV === "development")
            console.error(
              `Failed to check existence on ${name} with id: ${id}`,
              result.error,
            );
          return {
            success: false,
            error: new DatabaseError(
              `Failed to check existence on ${name} with id: ${id}: ${result.error}`,
              { cause: result.error },
            ),
          };
        }

        return {
          success: true as const,
          data: (result.data?.length ?? 0) > 0,
        };
      },
      `${capitalize(name)}.exists`,
    ),

    count: withContext(
      async (_, where?: SQL, options?: ExecuteOptions) => {
        const run = executor(options);
        const target = asTable(table);
        const result = await resultify(
          async () =>
            run
              .select({ count: sql<number>`count(*)::int` })
              .from(target)
              .where(where) as Promise<{ count: number }[]>,
        );

        if (!result.success) {
          if (process.env.NODE_ENV === "development")
            console.error(`Failed to count records on ${name}`, result.error);
          return {
            success: false,
            error: new DatabaseError(
              `Failed to count records on ${name}: ${result.error}`,
              { cause: result.error },
            ),
          };
        }

        const count = result.data?.[0]?.count ?? 0;
        return { success: true as const, data: count };
      },
      `${capitalize(name)}.count`,
    ),

    find: withContext(
      async (
        _,
        findOptions: {
          where?: SQL;
          orderBy?: OrderByEntry<T>[];
          limit?: number;
          offset?: number;
        } = {},
        options?: ExecuteOptions,
      ) => {
        const run = executor(options);
        const { where, orderBy, limit, offset } = findOptions;

        const target = asTable(table);

        const orderColumns = orderBy?.length
          ? orderBy.map(({ column, direction }) =>
              direction === "desc" ? desc(column) : asc(column),
            )
          : target.createdAt
            ? ([desc(target.createdAt)] as const)
            : ([desc(target.id)] as const);

        const result = await resultify(
          async () =>
            run
              .select()
              .from(target)
              .where(where)
              .orderBy(...orderColumns)
              .offset(offset)
              .limit(limit) as Promise<Document<T>[]>,
        );

        if (!result.success) {
          if (process.env.NODE_ENV === "development")
            console.error(`Failed to find records from ${name}`, result.error);
          return {
            success: false,
            error: new DatabaseError(
              `Failed to find records from ${name}: ${result.error}`,
              { cause: result.error },
            ),
          };
        }

        const rows = (result.data ?? []) as Document<T>[];
        return { success: true as const, data: rows };
      },
      `${capitalize(name)}.find`,
    ),
  };
}
