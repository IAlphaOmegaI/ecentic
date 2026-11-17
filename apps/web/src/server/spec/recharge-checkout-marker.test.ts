import { describe, expect, test } from "bun:test";
import { createCheckoutMarker, verifyCheckoutMarker } from "../app/integration/shopify/checkout-marker";

const now = new Date("2026-11-17T12:00:00Z");
const options = { store: "store-a", reference: "e43c2ebf-ea01-4266-8b4e-9ae194139cd8", secret: "test-only-shopify-secret", now };
const marker = createCheckoutMarker(options);
const verify = (overrides = {}) => verifyCheckoutMarker({ marker, store: options.store, secret: options.secret, at: now, ...overrides });

describe("AI-started Shopify checkout receipts", () => {
  test("validates the exact issuing store and receipt", () => {
    expect(verify()?.reference).toBe(options.reference);
    expect(verify({ store: "store-b" })).toBeNull();
    expect(verify({ secret: "different-secret" })).toBeNull();
  });
  test("rejects altered, malformed and unsigned referral markers", () => {
    expect(verify({ marker: marker.replace("e43c", "a43c") })).toBeNull();
    expect(verify({ marker: marker.slice(0, -1) })).toBeNull();
    expect(verify({ marker: `${marker}:extra` })).toBeNull();
    expect(verify({ marker: "chatgpt-referral" })).toBeNull();
    expect(verify({ marker: "x".repeat(1000) })).toBeNull();
  });
  test("uses order time so delayed webhooks can be replayed safely", () => {
    expect(verify({ at: new Date(now.getTime() + 6 * 864e5) })).not.toBeNull();
    expect(verify({ at: new Date(now.getTime() + 8 * 864e5) })).toBeNull();
    expect(verify({ at: new Date(now.getTime() - 301e3) })).toBeNull();
    expect(verify({ at: new Date("invalid") })).toBeNull();
  });
  test("fails closed when the secret is absent", () => {
    expect(verify({ secret: "" })).toBeNull();
    expect(() => createCheckoutMarker({ ...options, secret: "" })).toThrow();
  });
});
