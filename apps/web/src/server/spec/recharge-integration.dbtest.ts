import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import postgres from "postgres";

const target = process.env["RECHARGE_TEST_DATABASE_URL"];

describe.skipIf(!target)(
  "Recharge persisted install and worker lifecycle",
  () => {
    const identity = randomUUID();
    const store = `recharge-store-${identity}`;
    const product = `recharge-product-${identity}`;
    const customer = `recharge-user-${identity}`;
    const originalFetch = globalThis.fetch;
    const originalEnvironment = { ...process.env };
    const database =
      target && new URL(target).hostname === "127.0.0.1"
        ? postgres(target, { max: 2 })
        : null;
    const hooks: { id: number; topic: string; address: string }[] = [];
    const requests: string[] = [];
    const state = {
      refreshes: 0,
      storeGate: null as { promise: Promise<void>; entered: () => void } | null,
      orders: [] as Record<string, unknown>[],
      subscription: {
        id: 501,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cancelled_at: null as string | null,
      },
    };

    beforeAll(async () => {
      if (!target || new URL(target).hostname !== "127.0.0.1")
        throw new Error(
          "Recharge DB tests require an explicit isolated localhost database",
        );
      Object.assign(process.env, {
        DATABASE_URL: target,
        CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 91).toString("base64"),
        RECHARGE_CLIENT_ID: "fixture-client",
        RECHARGE_CLIENT_SECRET: "fixture-secret",
        RECHARGE_REDIRECT_URI:
          "https://fixture.ecentic.test/api/integrations/recharge/callback",
        APP_HOST: "https://fixture.ecentic.test",
      });
      await database!`insert into "user" (id,name,email,surname) values (${customer},'Fixture',${`${identity}@example.test`},'Merchant')`;
      await database!`insert into store (id,"userId",platform,name,domain,status,"storeId") values (${store},${customer},'shopify','Fixture','https://recharge-fixture.myshopify.com','connected','1001')`;
      await database!`insert into product (id,"storeId","userId","externalId",title,price,currency,"rawData") values (${product},${store},${customer},'101','Fixture product','20.00','USD',${JSON.stringify({ variants: [{ id: 201, price: "20.00" }] })})`;
      globalThis.fetch = Object.assign(
        async (input: string | URL | Request, options?: RequestInit) => {
          const url = new URL(
            input instanceof Request ? input.url : String(input),
          );
          requests.push(`${options?.method ?? "GET"} ${url.pathname}`);
          if (url.pathname === "/oauth/token") {
            const parameters = new URLSearchParams(String(options?.body));
            if (parameters.get("grant_type") === "refresh_token") {
              state.refreshes += 1;
              return Response.json({
                access_token: "refreshed-fixture-access",
                expires_in: 3600,
              });
            }
            return Response.json({
              access_token: "fixture-access",
              refresh_token: "fixture-refresh",
              expires_in: 3600,
              scope:
                "store_info read_products read_plans read_orders read_subscriptions",
            });
          }
          if (url.pathname === "/store") {
            if (state.storeGate) {
              state.storeGate.entered();
              await state.storeGate.promise;
            }
            return Response.json({
              store: {
                id: 55,
                external_platform: "shopify",
                external_platform_domain: "recharge-fixture.myshopify.com",
                currency: "USD",
              },
            });
          }
          if (url.pathname === "/products")
            return Response.json({
              products: url.searchParams.has("cursor")
                ? []
                : [
                    {
                      external_product_id: 101,
                      variants: [
                        {
                          external_variant_id: 201,
                          prices: { unit_price: "20.00" },
                        },
                      ],
                    },
                  ],
              next_cursor: url.searchParams.has("cursor")
                ? null
                : "products-page-2",
            });
          if (url.pathname === "/plans")
            return Response.json({
              plans: [
                {
                  id: 301,
                  type: "subscription",
                  external_product_id: { ecommerce: 101 },
                  external_plan_id: 401,
                  discount_type: "percentage",
                  discount_amount: "10",
                  subscription_preferences: {
                    order_interval_unit: "month",
                    order_interval_frequency: 1,
                    charge_interval_frequency: 1,
                  },
                },
              ],
              next_cursor: null,
            });
          if (url.pathname === "/orders")
            return Response.json({ orders: state.orders, next_cursor: null });
          if (url.pathname === "/subscriptions")
            return Response.json({
              subscriptions: [state.subscription],
              next_cursor: null,
            });
          if (url.pathname === "/subscriptions/501")
            return Response.json({ subscription: state.subscription });
          if (url.pathname === "/webhooks" && options?.method === "POST") {
            const body = JSON.parse(String(options.body));
            const hook = {
              id: hooks.length + 1,
              topic: String(body.topic),
              address: String(body.address),
            };
            hooks.push(hook);
            return Response.json({ webhook: hook });
          }
          if (url.pathname === "/webhooks")
            return Response.json({ webhooks: hooks, next_cursor: null });
          if (
            url.pathname.startsWith("/webhooks/") &&
            options?.method === "DELETE"
          ) {
            const index = hooks.findIndex(
              (hook) => String(hook.id) === url.pathname.split("/").at(-1),
            );
            if (index >= 0) hooks.splice(index, 1);
            return new Response(null, { status: 204 });
          }
          throw new Error(
            `Unexpected fixture network request: ${url.pathname}`,
          );
        },
        { preconnect: originalFetch.preconnect },
      ) as typeof fetch;
    });

    afterAll(async () => {
      globalThis.fetch = originalFetch;
      if (database) {
        await database`delete from "user" where id=${customer}`;
        await database.end();
      }
      for (const name of [
        "DATABASE_URL",
        "CREDENTIAL_ENCRYPTION_KEY",
        "RECHARGE_CLIENT_ID",
        "RECHARGE_CLIENT_SECRET",
        "RECHARGE_REDIRECT_URI",
        "APP_HOST",
      ])
        if (originalEnvironment[name] === undefined) delete process.env[name];
        else process.env[name] = originalEnvironment[name];
    });

    test("install → sync → verified receipt → duplicate/stale webhooks → erasure and uninstall", async () => {
      const Integration = await import("../app/integration/recharge/index");
      const Model = await import("../app/integration/recharge/model");
      const Webhooks = await import("../app/integration/recharge/webhooks");
      const install = await Integration.beginInstall({ store, user: customer });
      expect(install.url).toContain("myshopify_domain=recharge-fixture");
      await Integration.captureCode("fixture-code", install.cookie);
      const [pending] =
        await database!`select code from recharge_installations where id=${Model.installationHash(install.cookie)}`;
      expect(pending!["code"]).toStartWith("ecentic.enc.v1:");
      expect(pending!["code"]).not.toContain("fixture-code");
      await Integration.redeemPending({
        cookie: install.cookie,
        user: customer,
      });
      const [raw] =
        await database!`select "accessToken","refreshToken" from recharge_connections where "storeId"=${store}`;
      expect(raw!["accessToken"]).toStartWith("ecentic.enc.v1:");
      expect(raw!["refreshToken"]).toStartWith("ecentic.enc.v1:");
      await Integration.drain({ limit: 10 });
      const offers = await Integration.listOffersForProducts({
        store,
        products: [product],
      });
      expect(offers).toHaveLength(1);
      expect(offers[0]!.price).toBe("18.00");
      expect(offers[0]!.sellingPlanId).toBe("401");
      expect(hooks).toHaveLength(4);
      expect(
        (await Integration.getStatus({ store, user: customer })).status,
      ).toBe("connected");
      await expect(
        Integration.getStatus({ store, user: "someone-else" }),
      ).rejects.toThrow("store_not_found");

      const reference = randomUUID();
      await Integration.createCheckoutIntent({
        store,
        reference,
        expiresAt: new Date(Date.now() + 60_000),
      });
      const ordered = new Date(Math.floor(Date.now() / 1000) * 1000);
      const receipt = {
        store,
        order: "701",
        reference,
        marker: "server-verified-marker",
        createdAt: ordered,
      };
      expect(await Integration.recordAiOrder(receipt)).toBe(true);
      expect(await Integration.recordAiOrder(receipt)).toBe(true);
      expect(
        await Integration.recordAiOrder({ ...receipt, order: "702" }),
      ).toBe(false);
      state.orders.push({
        id: 601,
        external_order_id: { ecommerce: 701 },
        type: "checkout",
        status: "success",
        created_at: ordered.toISOString(),
        line_items: [
          { purchase_item_id: 501, purchase_item_type: "subscription" },
        ],
      });
      await database!`update recharge_connections set "accessTokenExpiresAt"=now() where "storeId"=${store}`;

      // Two independent workers cannot consume the same shop concurrently. A
      // killed worker's lease is recoverable, and its later writes are fenced.
      const claims = await Promise.all([Model.claim(), Model.claim()]);
      const first = claims.find(Boolean)!;
      expect(claims.filter(Boolean)).toHaveLength(1);
      await database!`update recharge_connections set "leaseUntil"=now()-interval '1 second' where "storeId"=${store}`;
      const recovered = (await Model.claim())!;
      expect(recovered.token).not.toBe(first.token);
      await expect(Model.fenced(first, async () => true)).rejects.toThrow(
        "superseded",
      );
      await Model.finish(recovered, recovered.job.payload);
      const beforeDeadlineYield = requests.length;
      await Integration.drain({ limit: 1, budgetMilliseconds: 500 });
      expect(requests.length).toBe(beforeDeadlineYield);
      await Integration.drain({ limit: 10 });
      expect(state.refreshes).toBe(1);
      expect((await Model.getConnection(store))!.refreshToken).toBe(
        "fixture-refresh",
      );
      expect(
        await Integration.getMetrics({ store, user: customer }),
      ).toMatchObject({
        aiFirstOrders: 1,
        convertedSubscriptions: 1,
        activeSubscriptions: 1,
      });

      const connection = (await Model.getConnection(store))!;
      const deliver = async (
        topic:
          | "subscription/created"
          | "subscription/cancelled"
          | "order/created"
          | "recharge/uninstalled",
        payload: unknown,
      ) => {
        const body = Buffer.from(JSON.stringify(payload));
        const headers = new Headers({
          "X-Recharge-Hmac-Sha256": createHash("sha256")
            .update("fixture-secret")
            .update(body)
            .digest("hex"),
        });
        const input = {
          url: new URL(
            Webhooks.webhookAddress(
              connection.id,
              connection.generation,
              topic,
            ),
          ),
          body,
          headers,
        };
        await Promise.all([
          Integration.acceptWebhook(input),
          Integration.acceptWebhook(input),
        ]);
        return input;
      };
      Object.assign(state.subscription, {
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date(Date.now() + 1000).toISOString(),
      });
      await deliver("subscription/cancelled", {
        subscription: {
          ...state.subscription,
          email: "private@example.test",
          address: { address1: "Secret address" },
        },
      });
      const [events] =
        await database!`select count(*)::int as total from recharge_jobs where "storeId"=${store} and kind='webhook'`;
      expect(events!["total"]).toBe(1);
      const rows =
        await database!`select payload from recharge_jobs where "storeId"=${store}`;
      expect(JSON.stringify(rows)).not.toContain("private@example.test");
      expect(JSON.stringify(rows)).not.toContain("Secret address");
      await Integration.drain({ limit: 10 });
      expect(
        (await Integration.getMetrics({ store, user: customer }))
          .activeSubscriptions,
      ).toBe(0);
      // Old create event does not resurrect a currently cancelled subscription.
      await deliver("subscription/created", {
        subscription: {
          id: 501,
          status: "active",
          updated_at: "2020-01-01T00:00:00Z",
        },
      });
      await Integration.drain({ limit: 10 });
      expect(
        (await Integration.getMetrics({ store, user: customer }))
          .activeSubscriptions,
      ).toBe(0);
      Object.assign(state.subscription, {
        status: "active",
        cancelled_at: null,
        updated_at: new Date(Date.now() + 2000).toISOString(),
      });
      await deliver("subscription/created", {
        subscription: state.subscription,
      });
      await Integration.drain({ limit: 10 });
      expect(
        (await Integration.getMetrics({ store, user: customer }))
          .activeSubscriptions,
      ).toBe(1);

      // Exact successful one-time checkout is a completed non-conversion, not a
      // provider failure or a recurring order attributed to the first checkout.
      const oneTimeReference = randomUUID();
      await Integration.createCheckoutIntent({
        store,
        reference: oneTimeReference,
        expiresAt: new Date(Date.now() + 60_000),
      });
      await Integration.recordAiOrder({
        ...receipt,
        order: "703",
        reference: oneTimeReference,
        createdAt: new Date(),
      });
      state.orders.push({
        id: 603,
        external_order_id: { ecommerce: 703 },
        type: "checkout",
        status: "success",
        line_items: [],
      });
      await Integration.drain({ limit: 10 });
      const [oneTime] =
        await database!`select status from ai_order_attributions where "storeId"=${store} and "shopifyOrderId"='703'`;
      expect(oneTime!["status"]).toBe("not_subscription");
      await Integration.redactOrders({ store, orders: ["703"] });
      expect(
        await Integration.recordAiOrder({
          ...receipt,
          order: "703",
          reference: oneTimeReference,
          createdAt: new Date(),
        }),
      ).toBe(false);
      expect(
        await Integration.getAttributionsForOrders({ store, orders: ["703"] }),
      ).toHaveLength(0);

      // Missing hook is recreated by maintenance using the same bounded client.
      hooks.splice(0, 1);
      await Integration.maintain();
      await Integration.drain({ limit: 10 });
      expect(hooks).toHaveLength(4);
      const { db } = await import("../database");
      const day = new Date().toISOString().slice(0, 10);
      expect(
        await db.transaction((transaction) =>
          Integration.reserveAnswerCaptures({
            store,
            day,
            requested: 7,
            transaction,
          }),
        ),
      ).toBe(7);
      expect(
        await db.transaction((transaction) =>
          Integration.reserveAnswerCaptures({
            store,
            day,
            requested: 7,
            transaction,
          }),
        ),
      ).toBe(3);
      expect(
        await db.transaction((transaction) =>
          Integration.reserveAnswerCaptures({
            store,
            day,
            requested: 1,
            transaction,
          }),
        ),
      ).toBe(0);
      // A Marketplace code whose store lookup is in flight must not reconnect a
      // connection after a newer uninstall, even though it was not store-bound.
      const marketplaceCookie = await Model.newInstallation({
        code: "marketplace-in-flight",
      });
      const lookup = Promise.withResolvers<void>();
      const gate = Promise.withResolvers<void>();
      state.storeGate = {
        promise: gate.promise,
        entered: () => lookup.resolve(),
      };
      const redemption = Integration.redeemPending({
        cookie: marketplaceCookie,
        user: customer,
      });
      await lookup.promise;
      // Revocation may have been observed before the uninstall notification.
      await database!`update recharge_connections set status='reconnect_required' where "storeId"=${store}`;
      const uninstall = await deliver("recharge/uninstalled", {});
      await Integration.drain({ limit: 10 });
      gate.resolve();
      await expect(redemption).rejects.toThrow("superseded");
      expect(
        await database!`select id from recharge_installations where id=${Model.installationHash(marketplaceCookie)}`,
      ).toHaveLength(0);
      const disconnected = await Model.getConnection(store);
      expect(disconnected!.accessToken).toBeNull();
      expect(disconnected!.refreshToken).toBeNull();
      expect(disconnected!.status).toBe("disconnected");
      expect(disconnected!.generation).toBeGreaterThan(connection.generation);
      expect(disconnected!.answerCaptureCount).toBe(10);
      const metrics = await Integration.getMetrics({ store, user: customer });
      expect(metrics).toMatchObject({
        aiFirstOrders: 1,
        convertedSubscriptions: 1,
        activeSubscriptions: 1,
      });
      expect(metrics.asOf).toBeInstanceOf(Date);
      for (const table of [
        "recharge_jobs",
        "recharge_subscription_offers",
        "ai_order_attributions",
        "recharge_checkout_intents",
      ])
        expect(
          (
            await database!.unsafe(
              `select count(*)::int as total from ${table} where "storeId"=$1`,
              [store],
            )
          )[0]!["total"],
        ).toBe(0);
      await Integration.acceptWebhook(uninstall);
      expect((await Integration.drain()).processed).toBe(0);
      await expect(
        Integration.createCheckoutIntent({
          store,
          reference: randomUUID(),
          expiresAt: new Date(Date.now() + 60_000),
        }),
      ).rejects.toThrow("reconnect_required");
      expect(
        requests.every(
          (request) =>
            request.startsWith("GET ") ||
            request === "POST /oauth/token" ||
            request === "POST /webhooks" ||
            request.startsWith("DELETE /webhooks/"),
        ),
      ).toBe(true);
    }, 60_000);
  },
);
