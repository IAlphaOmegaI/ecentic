import { Database } from "bun:sqlite";
import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import { type AnyColumn, asc, desc, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { tables as schema } from "../../database/schema";

const database = new Database(":memory:");
database.exec(`
  create table store (id text, userId text);
  create table product (id text, userId text, storeId text, title text, sku text, price text, currency text, images text);
  create table competitor (id text, userId text, storeId text, title text, brand text, price text, currency text, image text, confidence text);
`);
const dialect = new PgDialect();
const state = { reads: [] as string[], failure: "" };
type Find = {
  where: SQL;
  orderBy?: { column: AnyColumn | SQL; direction: "asc" | "desc" }[];
  limit?: number;
};

// Run the actual repository predicates against a small relational fixture. SQLite's
// LIKE needs the explicit escape that Postgres gives ILIKE by default. These cases
// exercise ASCII title/SKU/brand matching; production retains Postgres ILIKE.
const sqlite = (query: string) =>
  query
    .replaceAll(/\bilike (\$\d+)/g, "like $1 escape '\\'")
    .replaceAll(/\$(\d+)/g, "?$1");
const find =
  (table: string) => async (_environment: unknown, options: Find) => {
    state.reads.push(table);
    if (state.failure === table)
      return { success: false, error: new Error("fixture read failed") };
    const condition = dialect.sqlToQuery(options.where);
    const order = options.orderBy?.map(
      ({ column, direction }) =>
        dialect.sqlToQuery(direction === "asc" ? asc(column) : desc(column))
          .sql,
    );
    return {
      success: true,
      data: database
        .query(
          `select * from "${table}" where ${sqlite(condition.sql)}${order?.length ? ` order by ${order.join(", ")}` : ""}${options.limit ? ` limit ${options.limit}` : ""}`,
        )
        .all(...(condition.params as string[])),
    };
  };
mock.module("../../database", () => ({ schema }));
mock.module("../../utils/authentication", () => ({
  withAuthentication:
    (callback: (context: unknown, data: unknown) => unknown) =>
    (data: unknown) =>
      callback({ session: { user: { id: "owner" } } }, data),
}));
mock.module("../../app/store", () => ({ find: find("store") }));
mock.module("../../app/product", () => ({ find: find("product") }));
mock.module("../../app/competitor", () => ({ find: find("competitor") }));
const { searchForCurrentUser } = await import("../../app/command-search");

beforeEach(() => {
  database.exec(
    "delete from store; delete from product; delete from competitor;",
  );
  database.query("insert into store values (?, ?)").run("store", "owner");
  database.query("insert into store values (?, ?)").run("other-store", "owner");
  database
    .query("insert into store values (?, ?)")
    .run("foreign-store", "foreign");
  state.reads = [];
  state.failure = "";
});
afterAll(() => database.close());

const product = (
  id: string,
  title: string,
  sku: string | null = null,
  store = "store",
  owner = "owner",
  images = '["https://example.com/product.png"]',
) =>
  database
    .query("insert into product values (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, owner, store, title, sku, "29.95", null, images);
const competitor = (
  id: string,
  title: string,
  brand: string,
  confidence: string | null,
  store = "store",
  owner = "owner",
) =>
  database
    .query("insert into competitor values (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, owner, store, title, brand, "19.95", "EUR", null, confidence);

test("matches a title and SKU beyond the first ten rows", async () => {
  Array.from({ length: 15 }, (_, index) =>
    product(`earlier-${index}`, `Earlier product ${index}`, `EARLY-${index}`),
  );
  product("trek", "Trek Backpack", "EC-TREK");
  for (const query of ["trek", "  ec-TREK  "]) {
    const result = await searchForCurrentUser({ store: "store", query });
    expect(result.success && result.data.products.map(({ id }) => id)).toEqual([
      "trek",
    ]);
  }
});

test("filters ownership and store before the five/four result limits", async () => {
  product("other-product", "A Trek", null, "other-store");
  product("foreign-product", "A Trek", null, "store", "foreign");
  competitor("other-rival", "A Trek", "Trek", "measured", "other-store");
  competitor("foreign-rival", "A Trek", "Trek", "measured", "store", "foreign");
  for (const index of Array.from({ length: 8 }, (_, index) => index)) {
    product(`product-${index}`, `Trek ${index}`);
    competitor(`rival-${index}`, `Trek ${index}`, "Trek", "measured");
  }
  const result = await searchForCurrentUser({ store: "store", query: "Trek" });
  expect(result.success && result.data.products.map(({ id }) => id)).toEqual([
    "product-0",
    "product-1",
    "product-2",
    "product-3",
    "product-4",
  ]);
  expect(result.success && result.data.competitors.map(({ id }) => id)).toEqual(
    ["rival-0", "rival-1", "rival-2", "rival-3"],
  );
});

test("matches competitor brands and returns prices only with verified confidence", async () => {
  competitor("measured", "A backpack", "Trek", "measured");
  competitor("corroborated", "B backpack", "Trek", "corroborated");
  competitor("inferred", "C backpack", "Trek", "inferred");
  competitor("unknown", "D backpack", "Trek", null);
  const result = await searchForCurrentUser({ store: "store", query: "trek" });
  expect(
    result.success &&
      result.data.competitors.map(({ id, price, confidence }) => ({
        id,
        price,
        confidence,
      })),
  ).toEqual([
    { id: "measured", price: "19.95", confidence: "measured" },
    { id: "corroborated", price: "19.95", confidence: "corroborated" },
    { id: "inferred", price: null, confidence: "inferred" },
    { id: "unknown", price: null, confidence: null },
  ]);
});

test("literal LIKE syntax cannot widen the requested query", async () => {
  product("literal", "100% cotton_A\\B", "SKU-%_\\");
  product("wildcard", "100X cottonYAZB", "SKU-XYZ");
  for (const query of ["%", "_", "\\", "SKU-%_\\"]) {
    const result = await searchForCurrentUser({ store: "store", query });
    expect(result.success && result.data.products.map(({ id }) => id)).toEqual([
      "literal",
    ]);
  }
  const injection = await searchForCurrentUser({
    store: "store",
    query: "' OR 1=1 --",
  });
  expect(injection.success && injection.data.products).toEqual([]);
});

test("invalid input and an empty query perform no catalog reads", async () => {
  for (const request of [
    { store: "", query: "trek" },
    { store: "store", query: "x".repeat(121) },
    { store: "store", query: "trek\u0000" },
  ])
    expect((await searchForCurrentUser(request)).success).toBe(false);
  expect(await searchForCurrentUser({ store: "store", query: "   " })).toEqual({
    success: true,
    data: { products: [], competitors: [] },
  });
  expect(state.reads).toEqual([]);
});

test("foreign and unknown stores never reach product or competitor delegates", async () => {
  for (const store of ["foreign-store", "missing-store"]) {
    expect((await searchForCurrentUser({ store, query: "trek" })).success).toBe(
      false,
    );
  }
  expect(state.reads).toEqual(["store", "store"]);
});

test("display rows preserve unknown currency and tolerate malformed images", async () => {
  product("broken", "Trek", null, "store", "owner", "malformed");
  const result = await searchForCurrentUser({ store: "store", query: "trek" });
  expect(result.success && result.data.products).toEqual([
    {
      id: "broken",
      title: "Trek",
      price: "29.95",
      currency: null,
      image: null,
    },
  ]);
});

test("valid image arrays keep their first thumbnail through the real resultify helper", async () => {
  product("valid", "Trek A");
  product(
    "object",
    "Trek B",
    null,
    "store",
    "owner",
    '{"image":"not-an-array"}',
  );
  product("invalid-entry", "Trek C", null, "store", "owner", "[42]");
  const result = await searchForCurrentUser({ store: "store", query: "trek" });
  expect(
    result.success &&
      result.data.products.map(({ id, image }) => ({ id, image })),
  ).toEqual([
    { id: "valid", image: "https://example.com/product.png" },
    { id: "object", image: null },
    { id: "invalid-entry", image: null },
  ]);
});

test("a failed read is an error rather than partial successful results", async () => {
  state.failure = "competitor";
  expect(
    (await searchForCurrentUser({ store: "store", query: "trek" })).success,
  ).toBe(false);
});
