import { describe, expect, test } from "bun:test";
import { preflight, served } from "../utils/public-api";
import { PUBLIC_API_POLICY, type Verdict } from "../utils/rate-limit";

/**
 * `served` consumes a rate-limit window before it answers. The limiter is
 * injected here rather than mocked, so the 429 branch — the one an agent
 * depends on to back off — is provable without a Redis instance, and without a
 * module mock leaking into every other test in the run.
 */
const limiter = (verdict: Partial<Verdict>) => async (): Promise<Verdict> => ({
  policy: PUBLIC_API_POLICY,
  allowed: true,
  remaining: 119,
  reset: 30,
  ...verdict,
});

const request = () => new Request("https://ecentic.ai/api/v1/plans");

describe("served", () => {
  test("answers JSON with the version and rate-limit headers", async () => {
    const response = await served(
      request(),
      { ok: true },
      { limiter: limiter({}) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(response.headers.get("api-version")).toBe("1");
    expect(response.headers.get("ratelimit-remaining")).toBe("119");
    expect(response.headers.get("ratelimit-policy")).toBe(
      '"public";q=120;w=60',
    );
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(await response.json()).toEqual({ ok: true });
  });

  test("omits the live counters when the window could not be counted", async () => {
    const response = await served(
      request(),
      {},
      { limiter: limiter({ remaining: null }) },
    );

    expect(response.headers.get("ratelimit-policy")).toBe(
      '"public";q=120;w=60',
    );
    expect(response.headers.get("ratelimit-remaining")).toBeNull();
  });

  test("points at its own machine-readable description", async () => {
    const response = await served(request(), {}, { limiter: limiter({}) });
    const link = response.headers.get("link") ?? "";

    expect(link).toContain('rel="service-desc"');
    expect(link).toContain("/openapi.json");
    expect(link).toContain("/docs");
  });

  test("an exhausted window returns a problem with Retry-After", async () => {
    const response = await served(
      request(),
      { ok: true },
      { limiter: limiter({ allowed: false, remaining: 0, reset: 17 }) },
    );

    expect(response.status).toBe(429);
    // Regression: these headers are shared with the 200, and a JSON content
    // type leaking through relabelled the problem document as an ordinary
    // response — the one signal a generic client uses to tell them apart.
    expect(response.headers.get("content-type")).toStartWith(
      "application/problem+json",
    );
    // Without this an agent cannot know how long to wait, and retries inside
    // the same window — which is counted, and rejected again.
    expect(response.headers.get("retry-after")).toBe("17");
    expect(response.headers.get("ratelimit-remaining")).toBe("0");

    // A cached 429 would keep telling a caller to wait long after its window
    // reset. `problem()` sets no-store; this asserts nothing overrides it.
    expect(response.headers.get("cache-control")).toBe("no-store");

    const body = (await response.json()) as Record<string, unknown>;
    expect(body.code).toBe("rate-limited");
    expect(body.instance).toBe("/api/v1/plans");
    expect(body.resolution).toContain("Retry-After");
  });

  test("the payload is never served once the window is exhausted", async () => {
    const response = await served(
      request(),
      { secret: "payload" },
      { limiter: limiter({ allowed: false, remaining: 0, reset: 5 }) },
    );

    expect(await response.text()).not.toContain("payload");
  });

  test("caching is private, so counters are never shared between callers", async () => {
    const cached = await served(request(), {}, { limiter: limiter({}) });
    // A shared cache handing one agent's `remaining` to another defeats the
    // header's only purpose.
    expect(cached.headers.get("cache-control")).toStartWith("private");
    expect(cached.headers.get("cache-control")).not.toContain("s-maxage");

    const live = await served(
      request(),
      {},
      { limiter: limiter({}), cacheControl: "no-store" },
    );
    expect(live.headers.get("cache-control")).toBe("no-store");
  });
});

describe("preflight", () => {
  test("allows the headers an agent actually sends", () => {
    const response = preflight();

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-headers")).toContain(
      "Authorization",
    );
    expect(response.headers.get("access-control-expose-headers")).toContain(
      "RateLimit",
    );
  });
});
