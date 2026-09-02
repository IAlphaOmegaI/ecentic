import { afterEach, describe, expect, test } from "bun:test";
import {
  AGENT_PROFILE,
  buildRestTools,
  resolveShoppingService,
} from "../app/intelligence/ucp/playground";

type CapturedRequest = {
  url: string;
  method: string;
  headers: Headers;
  body: unknown;
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const captureRequests = (): CapturedRequest[] => {
  const requests: CapturedRequest[] = [];

  globalThis.fetch = (async (input, init) => {
    requests.push({
      url: String(input),
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    });

    return Response.json({ error: "stubbed response" });
  }) as typeof fetch;

  return requests;
};

const executionOptions = {
  toolCallId: "test-tool-call",
  messages: [],
  context: undefined,
} as never;

describe("UCP playground REST transport", () => {
  test("uses Google's published UCP agent profile", () => {
    expect(AGENT_PROFILE).toBe("https://ucp.goog/.well-known/ucp.json");
  });

  test("selects a REST-only shopping service from discovery", async () => {
    globalThis.fetch = (async () =>
      Response.json({
        ucp: {
          version: "2026-04-08",
          services: {
            "dev.ucp.shopping": [
              {
                version: "2026-04-08",
                transport: "rest",
                endpoint: "https://merchant.example/ucp",
              },
            ],
          },
          payment_handlers: {},
        },
      })) as typeof fetch;

    await expect(resolveShoppingService("merchant.example/")).resolves.toEqual({
      success: true,
      endpoint: "https://merchant.example/ucp",
      transport: "rest",
      profileUrl: "https://merchant.example/.well-known/ucp",
    });
  });

  test("uses canonical REST operations and wire payloads", async () => {
    const requests = captureRequests();
    const tools = buildRestTools(
      "https://merchant.example/ucp/",
      AGENT_PROFILE,
    );
    const lineItems = [{ item: { id: "variant-1" }, quantity: 1 }];
    const updatedLineItems = [
      { id: "line-1", item: { id: "variant-1" }, quantity: 2 },
    ];

    await tools.search_catalog.execute?.(
      { catalog: { query: "carry-on" } },
      executionOptions,
    );
    await tools.lookup_catalog.execute?.(
      { catalog: { ids: ["product-1"] } },
      executionOptions,
    );
    await tools.get_product.execute?.(
      { catalog: { id: "product-1" } },
      executionOptions,
    );
    await tools.create_cart.execute?.(
      { cart: { line_items: lineItems } },
      executionOptions,
    );
    await tools.get_cart.execute?.({ id: "cart/1" }, executionOptions);
    await tools.update_cart.execute?.(
      { id: "cart/1", cart: { line_items: updatedLineItems } },
      executionOptions,
    );
    await tools.cancel_cart.execute?.({ id: "cart/1" }, executionOptions);
    await tools.create_checkout.execute?.(
      { checkout: { line_items: lineItems } },
      executionOptions,
    );
    await tools.get_checkout.execute?.({ id: "checkout/1" }, executionOptions);
    await tools.update_checkout.execute?.(
      {
        id: "checkout/1",
        checkout: { line_items: updatedLineItems },
      },
      executionOptions,
    );
    await tools.complete_checkout.execute?.(
      {
        id: "checkout/1",
        checkout: { payment: { instruments: [] } },
      },
      executionOptions,
    );
    await tools.cancel_checkout.execute?.(
      { id: "checkout/1" },
      executionOptions,
    );
    await tools.get_order.execute?.({ id: "order/1" }, executionOptions);

    expect(
      requests.map(({ method, url, body }) => ({ method, url, body })),
    ).toEqual([
      {
        method: "POST",
        url: "https://merchant.example/ucp/catalog/search",
        body: { query: "carry-on" },
      },
      {
        method: "POST",
        url: "https://merchant.example/ucp/catalog/lookup",
        body: { ids: ["product-1"] },
      },
      {
        method: "POST",
        url: "https://merchant.example/ucp/catalog/product",
        body: { id: "product-1" },
      },
      {
        method: "POST",
        url: "https://merchant.example/ucp/carts",
        body: { line_items: lineItems },
      },
      {
        method: "GET",
        url: "https://merchant.example/ucp/carts/cart%2F1",
        body: undefined,
      },
      {
        method: "PUT",
        url: "https://merchant.example/ucp/carts/cart%2F1",
        body: { line_items: updatedLineItems },
      },
      {
        method: "POST",
        url: "https://merchant.example/ucp/carts/cart%2F1/cancel",
        body: undefined,
      },
      {
        method: "POST",
        url: "https://merchant.example/ucp/checkout-sessions",
        body: { line_items: lineItems },
      },
      {
        method: "GET",
        url: "https://merchant.example/ucp/checkout-sessions/checkout%2F1",
        body: undefined,
      },
      {
        method: "PUT",
        url: "https://merchant.example/ucp/checkout-sessions/checkout%2F1",
        body: { line_items: updatedLineItems },
      },
      {
        method: "POST",
        url: "https://merchant.example/ucp/checkout-sessions/checkout%2F1/complete",
        body: { payment: { instruments: [] } },
      },
      {
        method: "POST",
        url: "https://merchant.example/ucp/checkout-sessions/checkout%2F1/cancel",
        body: undefined,
      },
      {
        method: "GET",
        url: "https://merchant.example/ucp/orders/order%2F1",
        body: undefined,
      },
    ]);

    const mutationRequestIndexes = new Set([3, 5, 6, 7, 9, 10, 11]);

    for (const [index, request] of requests.entries()) {
      expect(request.headers.get("UCP-Agent")).toBe(
        `profile="${AGENT_PROFILE}"`,
      );
      expect(request.headers.get("Request-Id")).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );

      if (mutationRequestIndexes.has(index)) {
        expect(request.headers.get("Idempotency-Key")).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
      } else {
        expect(request.headers.has("Idempotency-Key")).toBe(false);
      }
    }
  });
});
