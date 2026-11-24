import { beforeEach, expect, mock, test } from "bun:test";
import { createHmac } from "node:crypto";
import {
  CHECKOUT_MARKER,
  createCheckoutMarker,
} from "../../app/integration/shopify/checkout-marker";

const calls = {
  reads: [] as unknown[],
  redactions: [] as unknown[],
  records: [] as unknown[],
  fail: false,
};
const secret = "local-inbound-fixture-secret";
Object.assign(process.env, { SHOPIFY_API_SECRET: secret });
mock.module("@sentry/nextjs", () => ({ captureMessage: () => undefined }));
mock.module("@/server/utils/context", () => ({
  withContext:
    (fn: (...args: unknown[]) => unknown) => (_env: unknown, input: unknown) =>
      fn({ span: { addBreadcrumb() {} } }, input),
}));
mock.module("@/server/app/store", () => ({
  find: async () => ({
    success: true,
    data: [{ id: "owned-store", userId: "owner" }],
  }),
}));
mock.module("@/server/app/billing/attribution", () => ({
  recordOrderIfAttributed: async () => ({ success: true }),
}));
mock.module("../../app/integration/recharge", () => ({
  getAttributionsForOrders: async (input: unknown) => {
    calls.reads.push(input);
    return [{ shopifyOrderId: "19", subscriptionId: "sub", status: "active" }];
  },
  redactOrders: async (input: unknown) => {
    calls.redactions.push(input);
    if (calls.fail) throw new Error("private database detail");
  },
  recordAiOrder: async (input: unknown) => {
    calls.records.push(input);
    if (calls.fail) throw new Error("private database detail");
    return true;
  },
}));
const Inbound = await import("../../app/integration/shopify/inbound");
const { Environment } = await import("../../utils/environment");
const deliver = (topic: string, payload: unknown, invalid = false) => {
  const body = JSON.stringify(
    topic.startsWith("customers/") && payload && typeof payload === "object"
      ? { shop_domain: "example.myshopify.com", ...payload }
      : payload,
  );
  return Inbound.handle(Environment.SERVER, {
    shop: "example.myshopify.com",
    topic,
    body,
    signature: invalid
      ? "bad"
      : createHmac("sha256", secret).update(body).digest("base64"),
  });
};
beforeEach(() => {
  calls.reads.length = calls.redactions.length = calls.records.length = 0;
  calls.fail = false;
});

test("signed privacy exports include only requested exact order IDs", async () => {
  const result = await deliver("customers/data_request", {
    customer: { id: 3, email: "discard@example.test" },
    orders_requested: [19, "20"],
  });
  expect(result.success).toBe(true);
  expect(calls.reads).toEqual([{ store: "owned-store", orders: ["19", "20"] }]);
  expect(JSON.stringify(result)).toContain("subscriptionId");
  expect(JSON.stringify(result)).not.toContain("discard@example.test");
});
test("signed privacy redactions are scoped and failed deletion remains retryable", async () => {
  expect(
    (
      await deliver("customers/redact", {
        customer: { id: 3 },
        orders_to_redact: [19],
      })
    ).success,
  ).toBe(true);
  expect(calls.redactions).toEqual([{ store: "owned-store", orders: ["19"] }]);
  calls.fail = true;
  const result = await deliver("customers/redact", {
    customer: { id: 3 },
    orders_to_redact: [19],
  });
  expect(result.success).toBe(false);
  if (!result.success)
    expect(result.error.message).toBe(
      "Could not process customer privacy request",
    );
});
test("unsigned or malformed privacy requests never read or erase records", async () => {
  expect(
    (
      await deliver(
        "customers/redact",
        { customer: { id: 3 }, orders_to_redact: [19] },
        true,
      )
    ).success,
  ).toBe(false);
  expect(
    (await deliver("customers/data_request", { customer: null })).success,
  ).toBe(false);
  expect(
    (
      await deliver("customers/data_request", {
        customer: { id: 3 },
        orders_requested: [Number.MAX_SAFE_INTEGER + 1],
      })
    ).success,
  ).toBe(false);
  expect(calls.reads).toEqual([]);
  expect(calls.redactions).toEqual([]);
});
test("paid signed receipts persist exact links and return failures for retry", async () => {
  const createdAt = new Date();
  const marker = createCheckoutMarker({
    store: "owned-store",
    reference: "4e343997-ad30-4cd5-b2ea-ce686ce4c488",
    secret,
    now: createdAt,
  });
  const payload = {
    id: 19,
    financial_status: "paid",
    created_at: createdAt.toISOString(),
    note_attributes: [{ name: CHECKOUT_MARKER, value: marker }],
  };
  expect((await deliver("orders/paid", payload)).success).toBe(true);
  expect(calls.records).toHaveLength(1);
  calls.fail = true;
  const result = await deliver("orders/paid", payload);
  expect(result.success).toBe(false);
  if (!result.success)
    expect(result.error.message).toBe("Could not persist checkout attribution");
});
test("referral attributes cannot create a checkout attribution", async () => {
  expect(
    (
      await deliver("orders/paid", {
        id: 19,
        financial_status: "paid",
        created_at: new Date().toISOString(),
        note_attributes: [{ name: "_ecentic_ai_ref", value: "ChatGPT" }],
      })
    ).success,
  ).toBe(true);
  expect(calls.records).toEqual([]);
});

test("relabeled unpaid and mismatched-shop privacy bodies cannot mutate attribution", async () => {
  expect(
    (await deliver("orders/paid", { id: 19, financial_status: "pending" }))
      .success,
  ).toBe(false);
  expect(
    (
      await deliver("orders/paid", {
        id: Number.MAX_SAFE_INTEGER + 1,
        financial_status: "paid",
      })
    ).success,
  ).toBe(false);
  expect(
    (
      await deliver("customers/redact", {
        shop_domain: "other.myshopify.com",
        customer: { id: 3 },
        orders_to_redact: [19],
      })
    ).success,
  ).toBe(false);
  expect(
    (
      await deliver("shop/redact", {
        shop_id: 1,
        shop_domain: "example.myshopify.com",
        customer: { id: 3 },
        orders_to_redact: [19],
      })
    ).success,
  ).toBe(false);
  expect(calls.records).toEqual([]);
  expect(calls.redactions).toEqual([]);
});

const webhookResponses: Response[] = [];
const webhookRequests: { url: string; method: string }[] = [];
mock.module("@/server/utils/http", () => ({
  request: async (url: string, options: RequestInit) => {
    webhookRequests.push({ url, method: options.method ?? "GET" });
    return {
      success: true,
      data: webhookResponses.shift() ?? new Response(null, { status: 500 }),
    };
  },
  parse: async (response: Response) => ({
    success: true,
    data: await response.json(),
  }),
}));
const { ensurePaidOrderWebhook } = await import(
  "../../app/integration/shopify/order-webhook"
);
test("Shopify connect verifies or repairs order delivery and exposes registration failures", async () => {
  const input = {
    shop: "example.myshopify.com",
    version: "2026-10",
    accessToken: "fixture-only",
    origin: "https://ecentic.example",
  };
  const existing = () =>
    Response.json({
      webhooks: [
        {
          topic: "orders/paid",
          address: "https://ecentic.example/api/integrations/shopify/webhooks",
        },
      ],
    });
  const absent = () => Response.json({ webhooks: [] });
  for (const scenario of [
    { responses: [existing()], methods: ["GET"], success: true },
    {
      responses: [absent(), new Response(null, { status: 201 })],
      methods: ["GET", "POST"],
      success: true,
    },
    {
      responses: [absent(), new Response(null, { status: 422 }), existing()],
      methods: ["GET", "POST", "GET"],
      success: true,
    },
    {
      responses: [new Response(null, { status: 403 })],
      methods: ["GET"],
      success: false,
    },
    {
      responses: [absent(), new Response(null, { status: 500 })],
      methods: ["GET", "POST"],
      success: false,
    },
  ]) {
    webhookResponses.push(...scenario.responses);
    webhookRequests.length = 0;
    expect((await ensurePaidOrderWebhook(input)).success).toBe(
      scenario.success,
    );
    expect(webhookRequests.map((request) => request.method)).toEqual(
      scenario.methods,
    );
    expect(webhookResponses).toHaveLength(0);
  }
});
