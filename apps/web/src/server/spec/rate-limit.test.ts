import { describe, expect, test } from "bun:test";
import {
  identify,
  PUBLIC_API_POLICY,
  rateLimitHeaders,
  type Verdict,
} from "../utils/rate-limit";

const verdict = (overrides: Partial<Verdict> = {}): Verdict => ({
  policy: PUBLIC_API_POLICY,
  allowed: true,
  remaining: 118,
  reset: 42,
  ...overrides,
});

describe("identify", () => {
  test("counts a bearer caller against its own key, not a shared IP", () => {
    const request = new Request("https://ecentic.ai/api/v1", {
      headers: {
        authorization: "Bearer ecentic_sk_abcdefghijklmnop_rest_of_secret",
        "x-forwarded-for": "203.0.113.7",
      },
    });

    expect(identify(request)).toStartWith("key:");
  });

  test("never puts the whole credential in the bucket key", () => {
    const secret = "ecentic_sk_abcdefghijklmnop_rest_of_secret";
    const request = new Request("https://ecentic.ai/api/v1", {
      headers: { authorization: `Bearer ${secret}` },
    });

    // The key reaches Redis; the credential must not.
    expect(identify(request)).not.toContain(secret);
    expect(identify(request)).toBe(`key:${secret.slice(0, 16)}`);
  });

  test("falls back to the first forwarded client address", () => {
    const request = new Request("https://ecentic.ai/api/v1", {
      headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.18" },
    });

    expect(identify(request)).toBe("ip:203.0.113.7");
  });

  test("a non-bearer authorization header does not open a key bucket", () => {
    const request = new Request("https://ecentic.ai/api/v1", {
      headers: {
        authorization: "Basic dXNlcjpwYXNz",
        "x-real-ip": "198.51.100.9",
      },
    });

    expect(identify(request)).toBe("ip:198.51.100.9");
  });

  test("an unidentifiable caller still gets a bucket", () => {
    expect(identify(new Request("https://ecentic.ai/api/v1"))).toBe(
      "ip:unknown",
    );
  });
});

describe("rateLimitHeaders", () => {
  test("sends both the structured-field and the legacy spellings", () => {
    const headers = rateLimitHeaders(verdict());

    expect(headers["RateLimit-Policy"]).toBe('"public";q=120;w=60');
    expect(headers["RateLimit"]).toBe('"public";r=118;t=42');
    expect(headers["RateLimit-Limit"]).toBe("120");
    expect(headers["RateLimit-Remaining"]).toBe("118");
    expect(headers["RateLimit-Reset"]).toBe("42");
  });

  test("claims no count when the counter was unreachable", () => {
    // Advertising a budget nobody measured is worse than advertising none: an
    // agent pacing itself against a fabricated `remaining` is misled.
    const headers = rateLimitHeaders(verdict({ remaining: null }));

    expect(headers["RateLimit-Policy"]).toBe('"public";q=120;w=60');
    expect(headers).not.toHaveProperty("RateLimit");
    expect(headers).not.toHaveProperty("RateLimit-Remaining");
  });

  test("still states the policy when the window is exhausted", () => {
    const headers = rateLimitHeaders(
      verdict({ allowed: false, remaining: 0, reset: 5 }),
    );

    expect(headers["RateLimit-Remaining"]).toBe("0");
    expect(headers["RateLimit"]).toBe('"public";r=0;t=5');
  });
});
