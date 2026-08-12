import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { resultify } from "@zenncore/utils";
import { verifyWebhookHmac } from "../app/integration/shopify/hmac";

const SECRET = "shpss_test_secret";

const sign = (body: string) =>
  createHmac("sha256", SECRET).update(body, "utf8").digest("base64");

describe("verifyWebhookHmac", () => {
  test("accepts a signature Shopify would have sent", () => {
    const body = JSON.stringify({ id: 1, total_price: "29.99" });
    expect(verifyWebhookHmac(body, sign(body), SECRET)).toBe(true);
  });

  test("rejects a body altered after signing", () => {
    const signature = sign(JSON.stringify({ id: 1, total_price: "29.99" }));
    const tampered = JSON.stringify({ id: 1, total_price: "2999.00" });
    expect(verifyWebhookHmac(tampered, signature, SECRET)).toBe(false);
  });

  test("rejects a signature made with a different secret", () => {
    const body = JSON.stringify({ id: 1 });
    const forged = createHmac("sha256", "wrong").update(body).digest("base64");
    expect(verifyWebhookHmac(body, forged, SECRET)).toBe(false);
  });

  // The pre-refactor implementation called `timingSafeEqual` with no length
  // guard, so either of these threw — surfacing as a 500 instead of a 401, and
  // letting a caller tell "malformed" apart from "wrong" by the status alone.
  test("returns false, not a throw, for a truncated signature", () => {
    const body = JSON.stringify({ id: 1 });
    const result = resultify(() =>
      verifyWebhookHmac(body, sign(body).slice(0, 10), SECRET),
    );

    expect(result.success).toBe(true);
    expect(result.success && result.data).toBe(false);
  });

  test("returns false, not a throw, for an empty signature", () => {
    const result = resultify(() => verifyWebhookHmac("{}", "", SECRET));

    expect(result.success).toBe(true);
    expect(result.success && result.data).toBe(false);
  });
});
