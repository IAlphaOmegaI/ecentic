import { describe, expect, test } from "bun:test";
import {
  assertAllowedRequest,
  LoopClient,
  type LoopClientOptions,
} from "./client";
import { returnFixture } from "./fixtures";
import { readResponse } from "./http";
import { reserveRequest, retryDelay } from "./limiter";
import {
  LOOP_API_ORIGIN,
  LOOP_API_PREFIX,
  type LoopFetch,
  type LoopListQuery,
  type LoopOAuthAuth,
} from "./types";

const store = "merchant-a";
const query: LoopListQuery = {
  from: "2026-11-01T00:00:00Z",
  to: "2026-11-02T00:00:00Z",
  filter: "created_at",
  state: "closed",
};
const response = (body: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), { status, headers });
const fixture = (overrides: Partial<LoopClientOptions> = {}) =>
  new LoopClient({
    store,
    auth: { mode: "api_key", apiKey: "fake-key" },
    beforeRequest: async () => {},
    ...overrides,
  });

describe("hard transport boundary", () => {
  test("allows only read endpoints and management of owned subscriptions", () => {
    expect(
      assertAllowedRequest(
        store,
        "GET",
        `${LOOP_API_PREFIX}/warehouse/return/list`,
      ).origin,
    ).toBe(LOOP_API_ORIGIN);
    expect(assertAllowedRequest(store, "GET", "/api/v1/auth/me").pathname).toBe(
      "/api/v1/auth/me",
    );
    expect(
      assertAllowedRequest(store, "POST", `${LOOP_API_PREFIX}/webhooks`)
        .pathname,
    ).toEndWith("/webhooks");
    expect(
      assertAllowedRequest(store, "DELETE", `${LOOP_API_PREFIX}/webhooks/42`, [
        "42",
      ]).pathname,
    ).toEndWith("/42");
    for (const [method, path] of [
      ["POST", `${LOOP_API_PREFIX}/returns/12/process`],
      ["POST", `${LOOP_API_PREFIX}/returns/12/cancel`],
      ["POST", `${LOOP_API_PREFIX}/returns/12/close`],
      ["POST", `${LOOP_API_PREFIX}/warehouse/return/list`],
      ["GET", `${LOOP_API_PREFIX}/returns/12/notes`],
      ["PUT", `${LOOP_API_PREFIX}/webhooks/42`],
      ["DELETE", `${LOOP_API_PREFIX}/webhooks/43`],
      ["GET", `https://evil.example${LOOP_API_PREFIX}/warehouse/return/list`],
      [
        "GET",
        `https://user:password@api.loopreturns.com${LOOP_API_PREFIX}/warehouse/return/list`,
      ],
      [
        "GET",
        `http://api.loopreturns.com${LOOP_API_PREFIX}/warehouse/return/list`,
      ],
    ])
      expect(() =>
        assertAllowedRequest(store, method as string, path as string, ["42"]),
      ).toThrow();
  });
  test("requires a merchant and a persisted limiter", () => {
    expect(() => fixture({ store: "" })).toThrow("merchant");
    expect(() =>
      fixture({
        beforeRequest:
          undefined as unknown as LoopClientOptions["beforeRequest"],
      }),
    ).toThrow("rate limiter");
    expect(() => assertAllowedRequest("", "GET", "/api/v1/auth/me")).toThrow(
      "merchant",
    );
  });
  test("does not follow redirects or expose provider bodies on failure", async () => {
    const client = fixture({
      fetch: async (_url, options) => {
        expect(options?.redirect).toBe("error");
        expect(options?.signal).toBeDefined();
        return response(
          { customer: "private@example.com", key: "fake-key" },
          401,
        );
      },
    });
    await expect(client.identity()).rejects.toThrow(
      "Loop could not complete this request.",
    );
  });
  test("sanitizes identity and reserves both rate buckets", async () => {
    const reservations: unknown[] = [];
    const client = fixture({
      beforeRequest: async (reservation) => {
        reservations.push(reservation);
      },
      fetch: async (_url, options) => {
        expect(new Headers(options?.headers).get("X-Authorization")).toBe(
          "fake-key",
        );
        return response({
          shop_id: 77,
          scopes: ["returns", "developer_tools"],
          email: "private@example.com",
        });
      },
    });
    expect(await client.identity()).toEqual({
      shop_id: "77",
      scopes: ["returns", "developer_tools"],
    });
    expect(reservations).toEqual([
      { store, bucket: "api", limit: 300, interval: 60000 },
      { store, bucket: "auth", limit: 20, interval: 60000 },
    ]);
  });
});

describe("safe, bounded pagination", () => {
  test("walks nextPageUrl with paginate enabled and sanitized return projections", async () => {
    const urls: URL[] = [];
    const client = fixture({
      fetch: async (input) => {
        const url = new URL(String(input));
        urls.push(url);
        expect(url.searchParams.get("paginate")).toBe("true");
        return response({
          returns: [returnFixture({ id: String(urls.length) })],
          nextPageUrl:
            urls.length === 1
              ? `${LOOP_API_ORIGIN}${LOOP_API_PREFIX}/warehouse/return/list?cursor=next`
              : null,
        });
      },
    });
    const ids: string[] = [];
    for await (const page of client.pages(query))
      ids.push(...page.map((returned) => returned.id));
    expect(ids).toEqual(["1", "2"]);
    expect(urls[1]?.searchParams.get("cursor")).toBe("next");
    expect(urls[0]?.searchParams.get("state")).toBe("closed");
  });
  test("rejects cross-origin or non-list pagination before a second request", async () => {
    for (const next of [
      `https://evil.example${LOOP_API_PREFIX}/warehouse/return/list`,
      `${LOOP_API_ORIGIN}${LOOP_API_PREFIX}/webhooks`,
    ]) {
      const calls: string[] = [];
      const client = fixture({
        fetch: async (input) => {
          calls.push(String(input));
          return response({ returns: [], nextPageUrl: next });
        },
      });
      await expect(client.list(query)).rejects.toThrow();
      expect(calls).toHaveLength(1);
    }
  });
  test("detects repeating pages", async () => {
    const client = fixture({
      fetch: async () =>
        response({
          returns: [],
          nextPageUrl: `${LOOP_API_ORIGIN}${LOOP_API_PREFIX}/warehouse/return/list?cursor=loop`,
        }),
    });
    const collect = async () => {
      for await (const _page of client.pages(query)) {
        /* Exhaust the bounded iterator. */
      }
    };
    await expect(collect()).rejects.toThrow("pagination repeated");
  });
  test("rejects unsafe windows and a conflicting shop before ingestion", async () => {
    const client = fixture({
      expectedShopId: "88",
      fetch: async () =>
        response({ returns: [returnFixture()], nextPageUrl: null }),
    });
    await expect(client.list({ ...query, to: "2027-11-01" })).rejects.toThrow(
      "120 days",
    );
    await expect(client.list(query)).rejects.toThrow("another shop");
  });
  test("caps streamed bytes even without Content-Length", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify({ large: "x".repeat(500) })),
        );
        controller.close();
      },
    });
    await expect(readResponse(store, new Response(body), 100)).rejects.toThrow(
      "oversized",
    );
    await expect(
      readResponse(
        store,
        response({ bad: true }, 200, { "content-length": "1000" }),
        100,
      ),
    ).rejects.toThrow("oversized");
  });
});

describe("rate limits and OAuth recovery", () => {
  test("reserves a rolling-safe spacing for API and auth calls", () => {
    expect(reserveRequest(store, "api", null, 1000)).toEqual({
      nextAt: 1200,
      waitMilliseconds: 0,
    });
    expect(reserveRequest(store, "api", 1200, 1000)).toEqual({
      nextAt: 1400,
      waitMilliseconds: 200,
    });
    expect(reserveRequest(store, "auth", 1000, 1000)).toEqual({
      nextAt: 4000,
      waitMilliseconds: 0,
    });
  });
  test("backs off on 429, honors Retry-After and reserves every retry", async () => {
    const waits: number[] = [];
    const calls: string[] = [];
    const reservations: unknown[] = [];
    const client = fixture({
      beforeRequest: async (reservation) => {
        reservations.push(reservation);
      },
      random: () => 0.5,
      wait: async (delay) => {
        waits.push(delay);
      },
      fetch: async (input) => {
        calls.push(String(input));
        return calls.length === 1
          ? response({}, 429, { "Retry-After": "2" })
          : response({ returns: [], nextPageUrl: null });
      },
    });
    await client.list(query);
    expect(waits).toEqual([2250]);
    expect(reservations).toHaveLength(2);
    expect(
      retryDelay(store, 0, "Tue, 24 Nov 2026 12:00:05 GMT", {
        now: Date.parse("2026-11-24T12:00:00Z"),
        random: () => 0,
      }),
    ).toBe(5000);
  });
  test("bounds retries and reschedules long Retry-After instead of retrying early", async () => {
    const calls: string[] = [];
    const client = fixture({
      maxRetries: 2,
      wait: async () => {},
      fetch: async (input) => {
        calls.push(String(input));
        return response({}, 429);
      },
    });
    await expect(client.list(query)).rejects.toThrow();
    expect(calls).toHaveLength(3);
    expect(() => retryDelay(store, 0, "120")).toThrow("later retry");
  });
  test("refreshes before expiry, then once on unauthorized, using replacement credentials", async () => {
    const now = 1_000_000;
    const refreshes: string[] = [];
    const tokens: string[] = [];
    const auth: LoopOAuthAuth = {
      mode: "oauth",
      accessToken: "expired",
      refreshToken: "refresh",
      expiresAt: now + 10,
    };
    const client = fixture({
      auth,
      now: () => now,
      refresh: async (current) => {
        refreshes.push(current.accessToken);
        return {
          ...current,
          accessToken: `access-${refreshes.length}`,
          expiresAt: now + 3_600_000,
        };
      },
      fetch: async (_input, options) => {
        tokens.push(new Headers(options?.headers).get("Authorization") ?? "");
        return tokens.length === 1
          ? response({}, 401)
          : response({ returns: [], nextPageUrl: null });
      },
    });
    await client.list(query);
    expect(refreshes).toEqual(["expired", "access-1"]);
    expect(tokens).toEqual(["Bearer access-1", "Bearer access-2"]);
  });
  test("does not loop indefinitely on unauthorized OAuth", async () => {
    const refreshes: string[] = [];
    const client = fixture({
      auth: {
        mode: "oauth",
        accessToken: "access",
        refreshToken: "refresh",
        expiresAt: Date.now() + 3_600_000,
      },
      refresh: async (current) => {
        refreshes.push("refresh");
        return current;
      },
      fetch: async () => response({}, 401),
    });
    await expect(client.list(query)).rejects.toThrow();
    expect(refreshes).toHaveLength(1);
  });
});

describe("return detail response compatibility", () => {
  test("recognizes documented not-found envelopes and normalizes detail reason aliases", async () => {
    const missing = fixture({
      fetch: async () =>
        response({
          error: { data: {}, message: "No return found with this ID." },
        }),
    });
    expect(await missing.details({ return_id: "404" })).toBeNull();
    const line = returnFixture().line_items[0];
    const client = fixture({
      fetch: async (input) => {
        expect(new URL(String(input)).pathname).toBe(
          `${LOOP_API_PREFIX}/warehouse/return/details`,
        );
        return response(
          returnFixture({
            line_items: [
              {
                ...line,
                return_reason: undefined,
                parent_return_reason: undefined,
                reason: "Too small",
                parent_reason: "Fit",
              },
            ],
          }),
        );
      },
    });
    expect(
      (await client.details({ return_id: "101" }))?.line_items[0]
        ?.return_reason,
    ).toBe("Too small");
  });
});

describe("subscription ownership", () => {
  test("creates active return hooks, filters other apps and refuses foreign deletion", async () => {
    const url = "https://ecentic.example/api/loop/merchant-a";
    const requests: { method: string; url: string }[] = [];
    const transport: LoopFetch = async (input, options) => {
      const method = options?.method ?? "GET";
      requests.push({ method, url: String(input) });
      if (method === "POST") {
        const body = JSON.parse(String(options?.body));
        expect(body.status).toBe("active");
        return response({ ...body, id: 42, shop_id: 77 }, 201);
      }
      if (method === "DELETE") return new Response(null, { status: 204 });
      return response({
        webhooks: [
          {
            id: 42,
            shop_id: 77,
            topic: "return",
            trigger: "return.created",
            url,
            status: "active",
          },
          {
            id: 43,
            shop_id: 77,
            topic: "return",
            trigger: "return.created",
            url: "https://another-app.example/hook",
            status: "active",
          },
        ],
      });
    };
    const client = fixture({
      webhookUrl: url,
      expectedShopId: "77",
      fetch: transport,
    });
    expect((await client.createWebhook("return.created")).id).toBe("42");
    expect(await client.webhooks()).toHaveLength(1);
    await expect(client.deleteWebhook("43")).rejects.toThrow(
      "Only this integration",
    );
    await client.deleteWebhook("42");
    expect(
      requests.filter((request) => request.method === "DELETE"),
    ).toHaveLength(1);
  });
});
