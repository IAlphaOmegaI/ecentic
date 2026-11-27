import { afterEach, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));
const HubSpot = await import("@/server/utils/outbound/hubspot");
const original = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = original;
});

test("HubSpot checks contacts and companies with read-only authenticated requests", async () => {
  const calls: string[] = [];
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);
      calls.push(url);
      expect(options?.method).toBe("GET");
      expect(options?.body).toBeUndefined();
      expect(options?.redirect).toBe("error");
      expect(new Headers(options?.headers).get("authorization")).toBe(
        "Bearer hubspot-test-secret",
      );
      expect(url).not.toContain("hubspot-test-secret");
      return Response.json({ results: [{ id: "123", properties: {} }] });
    }),
    { preconnect: original.preconnect },
  );
  expect(await HubSpot.validateKey("hubspot-test-secret")).toEqual({
    success: true,
    data: { valid: true },
  });
  expect(calls).toEqual([
    "https://api.hubapi.com/crm/v3/objects/contacts?limit=1",
    "https://api.hubapi.com/crm/v3/objects/companies?limit=1",
  ]);
});

test("missing company read scope fails without exposing provider response text", async () => {
  const calls: string[] = [];
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return calls.length === 1
        ? Response.json({ results: [] })
        : Response.json({ message: "hubspot-test-secret" }, { status: 403 });
    }),
    { preconnect: original.preconnect },
  );
  const result = await HubSpot.validateKey("hubspot-test-secret");
  expect(result.success).toBe(false);
  if (result.success) throw new Error("Missing scope unexpectedly accepted");
  expect(result.error.code).toBe("access");
  expect(JSON.stringify(result)).not.toContain("hubspot-test-secret");
  expect(calls).toHaveLength(2);
});

test("malformed CRM response cannot validate a key or trigger a retry", async () => {
  const request = mock(async () => Response.json({ ok: true }));
  globalThis.fetch = Object.assign(request, {
    preconnect: original.preconnect,
  });
  const result = await HubSpot.validateKey("hubspot-test-secret");
  expect(result.success).toBe(false);
  expect(request).toHaveBeenCalledTimes(1);
});

test("HubSpot page reads request explicit identifiers and ignore provider paging URLs", async () => {
  const calls: string[] = [];
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL, options?: RequestInit) => {
      calls.push(String(input));
      expect(options?.method).toBe("GET");
      expect(options?.body).toBeUndefined();
      return Response.json({
        results: [
          {
            id: "123",
            archived: false,
            updatedAt: "2026-11-27T00:00:00.000Z",
            properties: {
              email: "known@example.com",
              hs_additional_emails: "other@example.com",
            },
          },
        ],
        paging: {
          next: {
            after: "opaque+/=",
            link: "https://untrusted.example/credential-harvest",
          },
        },
      });
    }),
    { preconnect: original.preconnect },
  );
  const result = await HubSpot.readPage({
    apiKey: "hubspot-test-secret",
    object: "contacts",
    after: "last+/=",
  });
  expect(result.success).toBe(true);
  if (!result.success) throw result.error;
  expect(result.data.value.paging?.next).toEqual({ after: "opaque+/=" });
  const url = new URL(calls[0]!);
  expect(url.origin).toBe("https://api.hubapi.com");
  expect(url.searchParams.get("limit")).toBe("100");
  expect(url.searchParams.get("archived")).toBe("false");
  expect(url.searchParams.get("properties")).toBe("email,hs_additional_emails");
  expect(url.searchParams.get("after")).toBe("last+/=");
  expect(calls).toHaveLength(1);
});

test("oversized and archived record pages fail closed without another request", async () => {
  for (const results of [
    Array.from({ length: 101 }, (_, index) => ({
      id: String(index),
      archived: false,
      updatedAt: "2026-11-27T00:00:00.000Z",
      properties: {},
    })),
    [
      {
        id: "1",
        archived: true,
        updatedAt: "2026-11-27T00:00:00.000Z",
        properties: {},
      },
    ],
  ]) {
    const fetch = mock(async () => Response.json({ results }));
    globalThis.fetch = Object.assign(fetch, {
      preconnect: original.preconnect,
    });
    expect(
      (
        await HubSpot.readPage({
          apiKey: "synthetic",
          object: "companies",
          after: null,
        })
      ).success,
    ).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  }
});
