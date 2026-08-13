import { afterEach, describe, expect, test } from "bun:test";
import { redeemRefreshToken } from "../app/integration/shopify/token";
import { isIntegrationAuthError } from "../utils/error";

const GRANT = {
  shop: "ecentic.myshopify.com",
  clientId: "test_key",
  clientSecret: "shpss_test_secret",
  refreshToken: "shprt_original",
};

// The real backoff sleeps 12s across its three steps. The delays are a
// parameter precisely so the policy can be exercised at full retry depth here.
const NO_DELAY = { delays: [0, 0, 0] };

const PAYLOAD = {
  access_token: "shpat_new",
  expires_in: 3600,
  refresh_token: "shprt_new",
  refresh_token_expires_in: 7776000,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** What Shopify's edge actually returns on a 520 — the body that started this. */
const html = (status: number) =>
  new Response("<!DOCTYPE html><html><body>error code: 520</body></html>", {
    status,
    headers: { "Content-Type": "text/html" },
  });

const original = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = original;
});

/** Serves each queued response in turn, recording every request body sent. */
const stubFetch = (responses: (() => Response)[]) => {
  const bodies: string[] = [];

  globalThis.fetch = (async (_url: string, options: RequestInit) => {
    bodies.push(String(options.body));
    const next = responses[bodies.length - 1] ?? responses.at(-1);
    if (!next) throw new Error("no stubbed response");
    return next();
  }) as typeof fetch;

  return bodies;
};

// The reconnect CTA in the sync toasts is gated on this exact pattern, so it is
// the real contract for whether a merchant gets sent through a reinstall.
const RECONNECT_PROMPT = /reconnect your store|access token/i;

describe("redeemRefreshToken", () => {
  test("returns the new token pair when Shopify answers first time", async () => {
    const bodies = stubFetch([() => json(PAYLOAD)]);
    const result = await redeemRefreshToken(GRANT, NO_DELAY);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(PAYLOAD);
    expect(bodies).toHaveLength(1);
  });

  test("retries a 5xx and succeeds on the follow-up", async () => {
    const bodies = stubFetch([() => html(520), () => json(PAYLOAD)]);
    const result = await redeemRefreshToken(GRANT, NO_DELAY);

    expect(result.success).toBe(true);
    expect(bodies).toHaveLength(2);
  });

  test("retries a 429", async () => {
    const bodies = stubFetch([() => json({}, 429), () => json(PAYLOAD)]);
    const result = await redeemRefreshToken(GRANT, NO_DELAY);

    expect(result.success).toBe(true);
    expect(bodies).toHaveLength(2);
  });

  test("retries a network failure", async () => {
    const responses = [
      () => {
        throw new TypeError("fetch failed");
      },
      () => json(PAYLOAD),
    ];
    const bodies = stubFetch(responses);
    const result = await redeemRefreshToken(GRANT, NO_DELAY);

    expect(result.success).toBe(true);
    expect(bodies).toHaveLength(2);
  });

  test("re-sends the SAME refresh token on every attempt", async () => {
    // Shopify replays the identical response for an hour after the original
    // refresh, which is only safe if the retry does not rotate the token itself.
    const bodies = stubFetch([
      () => html(520),
      () => html(502),
      () => json(PAYLOAD),
    ]);
    await redeemRefreshToken(GRANT, NO_DELAY);

    expect(bodies).toHaveLength(3);
    for (const body of bodies)
      expect(JSON.parse(body).refresh_token).toBe("shprt_original");
  });

  // The regression this whole change exists for: an HTML edge error page was
  // read as proof the grant was dead, so a transient outage told merchants with
  // perfectly healthy connections to reinstall the app.
  test("an HTML 5xx that outlives the retries does NOT ask for a reconnect", async () => {
    const bodies = stubFetch([() => html(520)]);
    const result = await redeemRefreshToken(GRANT, NO_DELAY);

    expect(result.success).toBe(false);
    expect(result.success === false && result.error.message).not.toMatch(
      RECONNECT_PROMPT,
    );
    // First attempt, three backoff steps, one final try.
    expect(bodies).toHaveLength(5);
  });

  test("a transient failure carries the upstream status, not a bare 500", async () => {
    stubFetch([() => html(503)]);
    const result = await redeemRefreshToken(GRANT, NO_DELAY);

    expect(result.success).toBe(false);
    expect(
      result.success === false &&
        (result.error as Error & { statusCode?: number }).statusCode,
    ).toBe(503);
  });

  test("a 401 invalid_request asks for a reconnect", async () => {
    const bodies = stubFetch([
      () => json({ error: "invalid_request" }, 401),
      () => json(PAYLOAD),
    ]);
    const result = await redeemRefreshToken(GRANT, NO_DELAY);

    expect(result.success).toBe(false);
    expect(result.success === false && result.error.message).toMatch(
      RECONNECT_PROMPT,
    );
    // A dead grant is final — retrying it would only burn latency.
    expect(bodies).toHaveLength(1);
  });

  test("a 400 is final too, and is not blamed on the stored token", async () => {
    const result = await (async () => {
      stubFetch([() => json({ error: "invalid_grant" }, 400)]);
      return redeemRefreshToken(GRANT, NO_DELAY);
    })();

    expect(result.success).toBe(false);
    expect(result.success === false && result.error.message).not.toMatch(
      RECONNECT_PROMPT,
    );
  });

  // `publishProductsToShopify` loops over the whole catalog and breaks out on
  // this predicate. If a failure here stopped answering to it, the loop would
  // run the full retry ladder once per product instead of once per store.
  describe("every failure is recognisable as store-scoped", () => {
    test.each([
      ["a dead grant (401)", () => json({ error: "invalid_request" }, 401)],
      ["an edge outage (HTML 520)", () => html(520)],
      ["an unexpected 400", () => json({ error: "invalid_grant" }, 400)],
    ])("%s", async (_label, response) => {
      stubFetch([response]);
      const result = await redeemRefreshToken(GRANT, NO_DELAY);

      expect(result.success).toBe(false);
      expect(
        result.success === false && isIntegrationAuthError(result.error),
      ).toBe(true);
    });
  });
});
