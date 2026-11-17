import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { createRechargeClient } from "./client";
import type { RechargeFetch } from "./http";
import { exchangeCode } from "./oauth";
import { normalizeSubscriptionOffers } from "./offers";
import {
  mapOrderSubscriptions,
  projectWebhookPayload,
  verifyRechargeWebhook,
} from "./webhooks";

test("mocked install → initial offer sync → signed first-order webhook contract", async () => {
  const calls: { path: string; method: string }[] = [];
  const transport: RechargeFetch = async (input, options) => {
    const url = new URL(String(input));
    const method = options?.method ?? "GET";
    calls.push({ path: url.pathname, method });
    if (url.pathname === "/oauth/token")
      return Response.json({
        access_token: "test-access",
        refresh_token: "test-refresh",
        scope:
          "store_info read_products read_plans read_orders read_subscriptions",
      });
    expect(new Headers(options?.headers).get("X-Recharge-Access-Token")).toBe(
      "test-access",
    );
    switch (url.pathname) {
      case "/store":
        return Response.json({
          store: {
            id: 50,
            external_platform: "shopify",
            external_platform_domain: "ecentic.myshopify.com",
            currency: "USD",
          },
        });
      case "/products":
        return Response.json({
          products: [
            {
              external_product_id: "100",
              variants: [
                { external_variant_id: "101", prices: { unit_price: "20.00" } },
              ],
            },
          ],
          next_cursor: null,
        });
      case "/plans":
        return Response.json({
          plans: [
            {
              id: 200,
              type: "subscription",
              external_product_id: { ecommerce: "100" },
              external_plan_id: "201",
              discount_type: "percentage",
              discount_amount: "10",
              subscription_preferences: {
                order_interval_frequency: 1,
                charge_interval_frequency: 1,
                order_interval_unit: "month",
              },
            },
          ],
          next_cursor: null,
        });
      case "/webhooks":
        return Response.json(
          { webhook: { id: 300, ...JSON.parse(String(options?.body)) } },
          { status: 201 },
        );
      default:
        throw new Error(`Unexpected fixture endpoint: ${url.pathname}`);
    }
  };
  const tokens = await exchangeCode({
    code: "test-code",
    clientId: "app",
    redirectUri: "https://ecentic.ai/callback",
    fetch: transport,
  });
  const reservations = { count: 0 };
  const client = createRechargeClient({
    getAccessToken: async () => tokens.accessToken,
    beforeRequest: async () => {
      reservations.count += 1;
    },
    fetch: transport,
  });
  const shop = await client.getStore();
  expect(shop.external_platform_domain).toBe("ecentic.myshopify.com");
  const products = await client.listProducts();
  const plans = await client.listPlans();
  const offers = normalizeSubscriptionOffers({
    products: products.items,
    plans: plans.items,
    currency: shop.currency,
  });
  expect(offers[0]?.price).toBe("18.00");
  await client.createWebhook({
    topic: "order/created",
    address: "https://ecentic.ai/hooks/per-connection-secret/order-created",
  });

  const secret = "test-client-secret";
  const payload = Buffer.from(
    JSON.stringify({
      order: {
        id: 400,
        external_order_id: { ecommerce: "401" },
        type: "checkout",
        status: "success",
        created_at: "2026-11-17T10:00:00",
        line_items: [
          { purchase_item_type: "subscription", purchase_item_id: 500 },
        ],
      },
    }),
  );
  const headers = new Headers({
    "X-Recharge-Hmac-Sha256": createHash("sha256")
      .update(secret)
      .update(payload)
      .digest("hex"),
  });
  expect(verifyRechargeWebhook({ body: payload, headers, secret })).toBe(true);
  const event = projectWebhookPayload(
    "order/created",
    JSON.parse(payload.toString()),
  );
  if (event?.kind !== "order") throw new Error("Expected order event");
  expect(mapOrderSubscriptions(event.order)).toEqual([
    {
      shopifyOrderId: "401",
      rechargeOrderId: "400",
      subscriptionId: "500",
      createdAt: "2026-11-17T10:00:00.000Z",
      orderType: "checkout",
    },
  ]);
  expect(reservations.count).toBe(4);
  expect(calls.filter((call) => call.method !== "GET")).toEqual([
    { path: "/oauth/token", method: "POST" },
    { path: "/webhooks", method: "POST" },
  ]);
});
