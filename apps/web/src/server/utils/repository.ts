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
import { updateTag } from "next/cache";
import { db } from "@/server/database";
import { withContext } from "./context";
import { DatabaseError } from "./error";

/** Table type that has id and optional createdAt for default ordering */
/** Table type that has id and optional createdAt for default ordering */
// biome-ignore lint/suspicious/noExplicitAny: PgTableWithColumns requires TableConfig; generic table type
type TableWithId = PgTableWithColumns<any> & {
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

export type OrderByEntry<T extends TableWithId> = {
  column: T[keyof T] extends AnyColumn ? T[keyof T] : never;
  direction: "asc" | "desc";
};

export type PaginateOptions<T extends TableWithId> = {
  where?: SQL;
  orderBy?: OrderByEntry<T>[];
};

/** Human-readable table name for errors (e.g. "user") */
const label = (table: TableWithId): string => {
  try {
    const name = getTableName(table as Parameters<typeof getTableName>[0]);
    return typeof name === "string" ? name : "table";
  } catch {
    return "table";
  }
};

/** Cast for Drizzle's strict table generics when using db.select/update/delete */
// biome-ignore lint/suspicious/noExplicitAny: Drizzle table generic is complex; cast needed for .from(t)
const asTable = <T>(t: T): any => t;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Generic repository over a Drizzle table (CRUD + paginate/find).
 * Returns Result types for all operations. Use with schema.user, schema.session, etc.
 */
export function repository<T extends TableWithId>(table: T) {
  const name = label(table);

  return {
    get: withContext(
      async (_, id: string) => {
        // "use cache";
        // cacheTag(name, id);

        const t = asTable(table);
        const result = await resultify(async () =>
          db.select().from(t).where(eq(t.id, id)).limit(1),
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
        return { success: true as const, data: row as Document<T> | null };
      },
      `${capitalize(name)}.get`,
    ),

    paginate: withContext(
      async (
        _,
        page: number,
        size: number,
        options: PaginateOptions<T> = {},
      ) => {
        // "use cache";
        const { where, orderBy } = options;
        const offset = (page - 1) * size;

        // cacheTag(
        //   name,
        //   `pagination/page:${page}`,
        //   `pagination/size:${size}`,
        //   `pagination/where:${JSON.stringify(where)}`,
        //   `pagination/orderBy:${JSON.stringify(orderBy)}`,
        // );

        const t = asTable(table);
        const orderColumns = orderBy?.length
          ? orderBy.map(({ column, direction }) =>
              direction === "desc" ? desc(column) : asc(column),
            )
          : t.createdAt
            ? ([desc(t.createdAt)] as const)
            : ([desc(t.id)] as const);

        const query = db
          .select()
          .from(t)
          .where(where)
          .orderBy(...orderColumns)
          .offset(offset)
          .limit(size);

        const cQuery = db
          .select({ count: sql<number>`count(*)::int` })
          .from(t)
          .where(where);

        const [result, count] = await Promise.all([
          resultify(() => query),
          resultify(() => cQuery),
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
      async (_, data: Insertable<T>) => {
        const t = asTable(table);
        const result = await resultify(async () =>
          db
            .insert(t)
            .values(data as T["$inferInsert"])
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

        updateTag(name);

        return { success: true as const, data: row };
      },
      `${capitalize(name)}.create`,
    ),

    update: withContext(
      async (_, id: string, data: Partial<Insertable<T>>) => {
        const t = asTable(table);
        const result = await resultify(async () =>
          db
            .update(t)
            .set(data as Partial<T["$inferInsert"]>)
            .where(eq(t.id, id))
            .returning(),
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

        updateTag(name);
        updateTag(id);
        updateTag(`count:${name}`);
        updateTag(`exists:${name}`);

        const row = result.data?.[0] ?? null;
        return { success: true as const, data: row as Document<T> | null };
      },
      `${capitalize(name)}.update`,
    ),

    destroy: withContext(
      async (_, id: string) => {
        const t = asTable(table);
        const result = await resultify(async () =>
          db.delete(t).where(eq(t.id, id)),
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

        updateTag(name);
        updateTag(`count:${name}`);
        updateTag(`exists:${name}`);
        updateTag(id);

        return { success: true as const, data: true };
      },
      `${capitalize(name)}.destroy`,
    ),

    exists: withContext(
      async (_, id: string) => {
        // "use cache";
        // cacheTag(`exists:${name}`, id);

        const t = asTable(table);
        const result = await resultify(async () =>
          db.select({ id: t.id }).from(t).where(eq(t.id, id)).limit(1),
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
      async (_, where?: SQL) => {
        // "use cache";
        // cacheTag(`count:${name}`, JSON.stringify(where));

        const t = asTable(table);
        const result = await resultify(async () =>
          db.select({ count: sql<number>`count(*)::int` }).from(t).where(where),
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
      async (_, options: { where?: SQL; orderBy?: OrderByEntry<T>[] } = {}) => {
        // "use cache";
        const { where, orderBy } = options;

        // cacheTag(
        //   name,
        //   `find/where:${JSON.stringify(where)}`,
        //   `find/orderBy:${JSON.stringify(orderBy)}`,
        // );

        const t = asTable(table);
        const orderColumns = orderBy?.length
          ? orderBy.map(({ column, direction }) =>
              direction === "desc" ? desc(column) : asc(column),
            )
          : t.createdAt
            ? ([desc(t.createdAt)] as const)
            : ([desc(t.id)] as const);

        const result = await resultify(async () =>
          db
            .select()
            .from(t)
            .where(where)
            .orderBy(...orderColumns),
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
