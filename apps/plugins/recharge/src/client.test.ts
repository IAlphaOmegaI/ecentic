import { describe, expect, test } from "bun:test";
import { createRechargeClient, paginate } from "./client";
import { type Bucket, reserveRequest, retryDelay } from "./limiter";

describe("Recharge read client", () => {
  test("rate limits every attempt and retries a 429 with minimum delay and jitter", async () => {
    const state = { attempts: 0, reservations: 0 };
    const sleeps: number[] = [];
    const client = createRechargeClient({
      getAccessToken: async () => "access",
      beforeRequest: async () => {
        state.reservations += 1;
      },
      random: () => 0.5,
      sleep: async (milliseconds) => {
        sleeps.push(milliseconds);
      },
      fetch: async (url, options) => {
        state.attempts += 1;
        expect(String(url)).toStartWith(
          "https://api.rechargeapps.com/products?",
        );
        expect(
          new Headers(options?.headers).get("X-Recharge-Access-Token"),
        ).toBe("access");
        expect(new Headers(options?.headers).get("X-Recharge-Version")).toBe(
          "2021-11",
        );
        return state.attempts === 1
          ? new Response(null, { status: 429, headers: { "Retry-After": "3" } })
          : Response.json({ products: [], next_cursor: null });
      },
    });
    expect(await client.listProducts()).toEqual({
      items: [],
      nextCursor: null,
    });
    expect(state.reservations).toBe(2);
    expect(sleeps).toEqual([3250]);
  });

  test("refreshes once on a 401 and does not retry an invalid replacement forever", async () => {
    const state = { refreshes: 0, attempts: 0, reservations: 0 };
    const client = createRechargeClient({
      getAccessToken: async () => "expired",
      refreshAccessToken: async () => {
        state.refreshes += 1;
        return "replacement";
      },
      beforeRequest: async () => {
        state.reservations += 1;
      },
      fetch: async (_url, options) => {
        state.attempts += 1;
        const token = new Headers(options?.headers).get(
          "X-Recharge-Access-Token",
        );
        expect(token).toBe(state.attempts === 1 ? "expired" : "replacement");
        return new Response(null, { status: 401 });
      },
    });
    await expect(client.getStore()).rejects.toMatchObject({ status: 401 });
    expect(state).toEqual({ attempts: 2, refreshes: 1, reservations: 2 });
  });

  test("does not resend filters once a cursor is present", async () => {
    const urls: URL[] = [];
    const client = createRechargeClient({
      getAccessToken: async () => "access",
      beforeRequest: async () => {},
      fetch: async (url) => {
        urls.push(new URL(String(url)));
        return Response.json({
          orders: [{ id: urls.length }],
          next_cursor: urls.length === 1 ? "next+page" : null,
        });
      },
    });
    const pages = [];
    for await (const page of paginate(client.listOrders, {
      external_order_id: "123",
      limit: 2,
    }))
      pages.push(page);
    expect(pages).toEqual([[{ id: 1 }], [{ id: 2 }]]);
    expect(urls[0]?.searchParams.get("external_order_id")).toBe("123");
    expect(urls[1]?.searchParams.get("external_order_id")).toBeNull();
    expect(urls[1]?.searchParams.get("cursor")).toBe("next+page");
  });

  test("webhook registration shares the limiter and exposes no business writes", async () => {
    const state = { reservations: 0 };
    const client = createRechargeClient({
      getAccessToken: async () => "access",
      beforeRequest: async () => {
        state.reservations += 1;
      },
      fetch: async (_url, options) => {
        expect(options?.method).toBe("POST");
        expect(JSON.parse(String(options?.body))).toEqual({
          topic: "subscription/created",
          address: "https://ecentic.ai/hook",
          version: "2021-11",
        });
        return Response.json(
          {
            webhook: {
              id: 1,
              topic: "subscription/created",
              address: "https://ecentic.ai/hook",
            },
          },
          { status: 201 },
        );
      },
    });
    await client.createWebhook({
      topic: "subscription/created",
      address: "https://ecentic.ai/hook",
    });
    expect(state.reservations).toBe(1);
    expect("createSubscription" in client).toBe(false);
    expect("updateOrder" in client).toBe(false);
  });

  test("bounded retries stop a permanently rate-limited request", async () => {
    const state = { calls: 0 };
    const client = createRechargeClient({
      getAccessToken: async () => "access",
      beforeRequest: async () => {},
      sleep: async () => {},
      maxRetries: 2,
      fetch: async () => {
        state.calls += 1;
        return new Response(null, { status: 429 });
      },
    });
    await expect(client.getStore()).rejects.toMatchObject({ status: 429 });
    expect(state.calls).toBe(3);
  });
});

describe("persisted rate-limit policy", () => {
  test("reserves forty calls, waits at capacity and refills two each second", () => {
    const full = Array.from({ length: 40 }).reduce<Bucket>(
      (bucket) => reserveRequest(bucket, 0).bucket,
      { used: 0, updatedAt: 0 },
    );
    expect(full.used).toBe(40);
    expect(reserveRequest(full, 0).waitMilliseconds).toBe(500);
    expect(reserveRequest(full, 1000)).toEqual({
      bucket: { used: 39, updatedAt: 1000 },
      waitMilliseconds: 0,
    });
  });

  test("backoff honors both seconds and dates with a two-second floor", () => {
    expect(retryDelay(0, "1", { random: () => 0 })).toBe(2000);
    expect(
      retryDelay(0, "Thu, 01 Jan 1970 00:00:05 GMT", {
        now: 0,
        random: () => 0,
      }),
    ).toBe(5000);
    expect(retryDelay(2, null, { random: () => 0 })).toBe(8000);
  });
});
