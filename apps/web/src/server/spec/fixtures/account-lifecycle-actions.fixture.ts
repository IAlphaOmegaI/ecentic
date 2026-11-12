import { beforeEach, describe, expect, mock, test } from "bun:test";
import { getTableName, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { tables as schema } from "../../database/schema";

const actor = { id: "owner", email: "owner@example.com" };
const state = {
  session: { user: actor, session: { createdAt: new Date() } } as {
    user: typeof actor;
    session: { createdAt: Date };
  } | null,
  rows: {} as Record<string, Record<string, unknown>[]>,
  reads: [] as { table: string; parameters: unknown[] }[],
  locks: [] as string[],
  deleted: [] as string[],
  updates: [] as { table: string; values: unknown }[],
  cookies: [] as string[],
  committed: false,
  rolledBack: false,
  failDelete: false,
  failSignOut: false,
  transactions: 0,
  requests: [] as { url: string; options: RequestInit }[],
};
const dialect = new PgDialect();
const tableName = (table: Parameters<typeof getTableName>[0]) =>
  getTableName(table);
const transaction = {
  select: () => ({
    from: (table: Parameters<typeof getTableName>[0]) => ({
      where: (condition: SQL) => {
        const name = tableName(table);
        state.reads.push({
          table: name,
          parameters: dialect.sqlToQuery(condition).params,
        });
        const rows = state.rows[name] ?? [];
        return {
          for: async () => {
            state.locks.push(name);
            return rows;
          },
          limit: async (limit: number) => rows.slice(0, limit),
        };
      },
    }),
  }),
  delete: (table: Parameters<typeof getTableName>[0]) => ({
    where: async () => {
      state.deleted.push(tableName(table));
      if (state.failDelete) throw new Error("test database failure");
    },
  }),
  update: (table: Parameters<typeof getTableName>[0]) => ({
    set: (values: unknown) => ({
      where: async () => {
        state.updates.push({ table: tableName(table), values });
      },
    }),
  }),
};
const context = {
  auth: {
    getSession: async () => state.session,
    signOut: async () => {
      if (state.failSignOut) throw new Error("test signout failure");
      return { success: true };
    },
  },
  span: { addBreadcrumb: () => {} },
};
mock.module("../../database", () => ({
  schema,
  db: {
    transaction: async (
      callback: (target: typeof transaction) => Promise<unknown>,
    ) => {
      state.transactions++;
      try {
        const result = await callback(transaction);
        state.committed = true;
        return result;
      } catch (error) {
        state.rolledBack = true;
        state.deleted = [];
        state.updates = [];
        throw error;
      }
    },
  },
}));
mock.module("../../utils/authentication", () => ({
  withAuthentication:
    (callback: (authentication: typeof context, data: unknown) => unknown) =>
    (data: unknown) =>
      callback(context, data),
}));
mock.module("@/lib/auth", () => ({
  auth: { options: { baseURL: "https://ecentic.ai" } },
}));
mock.module("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    delete: (name: string) => state.cookies.push(name),
    set: (name: string) => state.cookies.push(name),
    getAll: () => [
      { name: "__Secure-better-auth.session_data.0", value: "test" },
    ],
  }),
}));
mock.module("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
mock.module("../../utils/http", () => ({
  request: async (url: string, options: RequestInit = {}) => {
    state.requests.push({ url, options });
    return { success: true, data: new Response(null, { status: 401 }) };
  },
}));
const { authorizedRequest } = await import(
  "../../app/integration/woocommerce/http"
);
const { disconnectStore, deleteAccount } = await import(
  "../../app/account-lifecycle"
);

beforeEach(() => {
  Object.assign(state, {
    session: { user: actor, session: { createdAt: new Date() } },
    rows: {
      user: [{ id: actor.id }],
      store: [
        {
          id: "store",
          userId: actor.id,
          usage: null,
          shopifyUsageLineId: null,
        },
      ],
    },
    reads: [],
    locks: [],
    deleted: [],
    updates: [],
    cookies: [],
    committed: false,
    rolledBack: false,
    failDelete: false,
    failSignOut: false,
    transactions: 0,
    requests: [],
  });
});

describe("actual lifecycle actions with isolated transactional adapter", () => {
  test("WooCommerce never retries a rejected header with secrets in a URL", async () => {
    await authorizedRequest(
      "https://shop.example/wp-json/wc/v3/products",
      "consumer-key",
      "private-secret",
    );
    expect(state.requests).toHaveLength(1);
    expect(state.requests[0]?.url).toBe(
      "https://shop.example/wp-json/wc/v3/products",
    );
    expect(
      new Headers(state.requests[0]?.options.headers).get("Authorization"),
    ).toStartWith("Basic ");
  });

  test("rejects malformed runtime inputs before a database transaction", async () => {
    // JavaScript callers bypass TypeScript, as a forged Server Action can.
    expect(
      await Reflect.apply(disconnectStore, null, [undefined]),
    ).toMatchObject({ data: { reason: "notFound" } });
    expect(await Reflect.apply(deleteAccount, null, [{}])).toMatchObject({
      data: { reason: "confirmation" },
    });
    expect(state.transactions).toBe(0);
  });
  test("checks an authoritative session before either mutation", async () => {
    state.session = null;
    expect(await disconnectStore({ store: "store" })).toMatchObject({
      data: { reason: "reauthenticate" },
    });
    expect(await deleteAccount({ email: actor.email })).toMatchObject({
      data: { reason: "reauthenticate" },
    });
    expect(state.transactions).toBe(0);
  });
  test("rejects another owner's store and never deletes credentials", async () => {
    Object.assign(state.rows, { store: [{ id: "store", userId: "other" }] });
    expect(await disconnectStore({ store: "store" })).toMatchObject({
      data: { reason: "notFound" },
    });
    expect(state.deleted).toHaveLength(0);
    expect(state.reads[0]?.parameters).toEqual(["store", actor.id]);
  });
  test("disconnect removes only local credentials, disables tracking and retains the store", async () => {
    expect(await disconnectStore({ store: "store" })).toMatchObject({
      data: { status: "disconnected" },
    });
    expect(state.deleted).toEqual(["store_account"]);
    expect(state.updates).toMatchObject([
      {
        table: "store",
        values: { status: "disconnected", trackerApiKey: null },
      },
    ]);
    expect(state.locks).toEqual(["store"]);
    expect(state.committed).toBe(true);
  });
  test("does not disconnect while the Shopify usage agreement needs its credentials", async () => {
    Object.assign(state.rows, {
      store: [{ id: "store", userId: actor.id, shopifyUsageLineId: "active" }],
    });
    expect(await disconnectStore({ store: "store" })).toMatchObject({
      data: { reason: "shopifyBilling" },
    });
    expect(state.deleted).toHaveLength(0);
  });
  test("rejects a confirmation for a different account before DB access", async () => {
    expect(await deleteAccount({ email: "someone@example.com" })).toMatchObject(
      { data: { reason: "confirmation" } },
    );
    expect(state.transactions).toBe(0);
  });
  test("retains billing history and connected provider grants for assisted deletion", async () => {
    Object.assign(state.rows, { fee_period: [{ id: "period" }] });
    expect(await deleteAccount({ email: actor.email })).toMatchObject({
      data: { reason: "billingRecords" },
    });
    expect(state.deleted).toHaveLength(0);
    Object.assign(state.rows, { fee_period: [] });
    Object.assign(state.rows, { store_account: [{ id: "grant" }] });
    expect(await deleteAccount({ email: actor.email })).toMatchObject({
      data: { reason: "storeConnections" },
    });
    expect(state.deleted).toHaveLength(0);
  });
  test("completes deletion and locale-aware navigation even if post-commit signout fails", async () => {
    state.failSignOut = true;
    await expect(
      deleteAccount({ email: actor.email, locale: "es" }),
    ).rejects.toThrow("redirect:/es/sign-in");
    expect(state.deleted).toEqual(["verification", "user"]);
    expect(state.committed).toBe(true);
    expect(state.cookies).toContain("__Secure-better-auth.session_token");
    expect(state.cookies).toContain("__Secure-better-auth.session_data.0");
    expect(state.reads[0]?.parameters).toEqual([actor.id]);
    expect(state.locks).toEqual(["user", "store", "subscription"]);
  });
  test("rolls back when deletion fails and does not expire the account session", async () => {
    state.failDelete = true;
    expect(await deleteAccount({ email: actor.email })).toMatchObject({
      success: false,
    });
    expect(state.rolledBack).toBe(true);
    expect(state.deleted).toHaveLength(0);
    expect(state.cookies).toHaveLength(0);
  });
});
