import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { productRevision } from "../utils/product-revision";

const target = process.env["LOOP_TEST_DATABASE_URL"];

describe.skipIf(!target)("Reviewed Shopify listing publication", () => {
  const suffix = randomUUID();
  const user = `loop-publish-user-${suffix}`;
  const store = `loop-publish-store-${suffix}`;
  const product = `loop-publish-product-${suffix}`;
  const savedEnvironment = { ...process.env };
  const originalFetch = globalThis.fetch;
  const state = {
    writes: 0,
    reads: 0,
    remote: "Original description",
    title: "Fixture shoe",
    expectedBody: "",
    unauthorized: false,
  };
  const modules: {
    database?: typeof import("../database");
    shopify?: typeof import("../app/integration/shopify");
  } = {};

  beforeAll(async () => {
    if (!target || new URL(target).hostname !== "127.0.0.1")
      throw new Error(
        "Only an explicit disposable localhost database can run this fixture",
      );
    Object.assign(process.env, {
      DATABASE_URL: target,
      CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 85).toString("base64"),
    });
    mock.module("@/server/utils/authentication", () => ({
      withAuthentication:
        (callback: (context: unknown, input: unknown) => unknown) =>
        (input: unknown) =>
          callback(
            {
              session: {
                user: { id: state.unauthorized ? "foreign-user" : user },
              },
            },
            input,
          ),
    }));
    mock.module("@/server/app/store", () => ({
      get: async (_environment: unknown, id: string) => {
        const { db, schema } = modules.database!;
        const [record] = await db
          .select()
          .from(schema.store)
          .where(eq(schema.store.id, id));
        return { success: true, data: record };
      },
    }));
    mock.module("@/server/app/store-account", () => ({
      getForStore: async () => ({
        success: true,
        data: {
          accessToken: "fixture-shopify-token",
          accessTokenExpiresAt: null,
        },
      }),
    }));
    mock.module("@/server/app/product", () => ({
      get: async (_environment: unknown, id: string) => {
        const { db, schema } = modules.database!;
        const [record] = await db
          .select()
          .from(schema.product)
          .where(eq(schema.product.id, id));
        return { success: true, data: record };
      },
      update: async (
        _environment: unknown,
        id: string,
        data: Record<string, unknown>,
        options: { tx?: unknown },
      ) => {
        const { db, schema } = modules.database!;
        const database = (options.tx ?? db) as typeof db;
        const [record] = await database
          .update(schema.product)
          .set(data)
          .where(eq(schema.product.id, id))
          .returning();
        return { success: true, data: record };
      },
    }));
    modules.database = await import("../database");
    const { db, schema } = modules.database;
    await db
      .insert(schema.user)
      .values({
        id: user,
        name: "Fixture",
        surname: "Merchant",
        email: `${suffix}@example.test`,
      });
    await db
      .insert(schema.store)
      .values({
        id: store,
        userId: user,
        platform: "shopify",
        name: "Fixture",
        domain: "https://loop-publication.myshopify.com",
        status: "connected",
        storeId: "1",
      });
    await db
      .insert(schema.product)
      .values({
        id: product,
        storeId: store,
        userId: user,
        externalId: "100",
        title: state.title,
        description: state.remote,
        rawData: "{}",
      });
    globalThis.fetch = Object.assign(
      async (input: string | URL | Request, options?: RequestInit) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
        );
        if (
          url.hostname !== "loop-publication.myshopify.com" ||
          url.pathname !== "/admin/api/2026-04/products/100.json"
        )
          throw new Error(
            `Unexpected fixture request ${url.hostname}${url.pathname}`,
          );
        if (options?.method === "PUT") {
          state.writes += 1;
          const body = JSON.parse(String(options.body));
          state.expectedBody = body.product.body_html;
          state.remote = body.product.body_html;
        } else state.reads += 1;
        return Response.json({
          product: {
            id: 100,
            title: state.title,
            body_html: state.remote,
            variants: [],
            images: [],
          },
        });
      },
      { preconnect: originalFetch.preconnect },
    );
    modules.shopify = await import("../app/integration/shopify");
  });

  afterAll(async () => {
    if (modules.database)
      await modules.database.db
        .delete(modules.database.schema.user)
        .where(eq(modules.database.schema.user.id, user));
    globalThis.fetch = originalFetch;
    mock.restore();
    for (const key of Object.keys(process.env))
      if (!(key in savedEnvironment)) delete process.env[key];
    Object.assign(process.env, savedEnvironment);
  });

  const current = async () => {
    const { db, schema } = modules.database!;
    const [record] = await db
      .select()
      .from(schema.product)
      .where(
        and(eq(schema.product.id, product), eq(schema.product.storeId, store)),
      );
    return record!;
  };

  test("a stale reviewed revision is rejected before a remote request", async () => {
    const record = await current();
    const revision = productRevision(record);
    const { db, schema } = modules.database!;
    await db
      .update(schema.product)
      .set({ description: "Changed locally" })
      .where(eq(schema.product.id, product));
    const result = await modules.shopify!.updateProduct({
      product,
      data: { body_html: "Reviewed" },
      expectedFingerprint: revision,
    });
    expect(result.success).toBeFalse();
    expect(state.writes).toBe(0);
    expect(state.reads).toBe(0);
    await db
      .update(schema.product)
      .set({ description: "Original description" })
      .where(eq(schema.product.id, product));
  });

  test("live merchant edits are detected before an exact reviewed write", async () => {
    const record = await current();
    state.remote = "Changed remotely";
    const result = await modules.shopify!.updateProduct({
      product,
      data: { body_html: "Reviewed" },
      expectedFingerprint: productRevision(record),
    });
    expect(result.success).toBeFalse();
    expect(state.writes).toBe(0);
    state.remote = "Original description";
  });

  test("publishes exactly the reviewed description and saves it within the product lock", async () => {
    const record = await current();
    const result = await modules.shopify!.updateProduct({
      product,
      data: { body_html: "Exactly reviewed feedback" },
      expectedFingerprint: productRevision(record),
    });
    expect(result.success).toBeTrue();
    expect(state.expectedBody).toBe("Exactly reviewed feedback");
    expect(state.writes).toBe(1);
    expect((await current()).description).toBe("Exactly reviewed feedback");
  });

  test("direct adapter invocation still checks merchant ownership", async () => {
    state.unauthorized = true;
    expect(
      (
        await modules.shopify!.updateProduct({
          product,
          data: { body_html: "Foreign change" },
        })
      ).success,
    ).toBeFalse();
    state.unauthorized = false;
    expect(state.writes).toBe(1);
  });
});
