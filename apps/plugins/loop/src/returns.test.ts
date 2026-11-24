import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { exchangeDirection } from "./exchanges";
import { returnFixture } from "./fixtures";
import { assertMerchant } from "./guard";
import { redactComment } from "./privacy";
import { classifyReason, normalizeReason } from "./reasons";
import { dateWindows, parseReturn, webhookKey } from "./returns";
import type { LoopVariant } from "./types";
import { verifySignature } from "./webhooks";

const store = "merchant-a";
const raw = JSON.stringify(returnFixture());
const signature = (secret: string, body = raw) =>
  createHmac("sha256", secret).update(body).digest("base64");

describe("Loop webhook authentication", () => {
  test("checks raw bytes, tampering, wrong secrets and malformed signatures", () => {
    expect(
      verifySignature(store, Buffer.from(raw), signature("active"), ["active"]),
    ).toBe(true);
    expect(
      verifySignature(store, `${raw} `, signature("active"), ["active"]),
    ).toBe(false);
    expect(verifySignature(store, raw, signature("other"), ["active"])).toBe(
      false,
    );
    expect(verifySignature(store, raw, null, ["active"])).toBe(false);
    expect(verifySignature(store, raw, "x".repeat(44), ["active"])).toBe(false);
  });
  test("accepts old and new secrets only during the supplied rotation window", () => {
    expect(verifySignature(store, raw, signature("old"), ["old", "new"])).toBe(
      true,
    );
    expect(verifySignature(store, raw, signature("new"), ["old", "new"])).toBe(
      true,
    );
    expect(verifySignature(store, raw, signature("old"), ["new"])).toBe(false);
  });
});

describe("privacy and idempotency", () => {
  test("drops all nested customer objects and unknown fields before persistence", () => {
    const returned = parseReturn(store, returnFixture());
    const serialized = JSON.stringify(returned);
    expect(serialized).not.toContain("private@example.com");
    expect(serialized).not.toContain("415");
    expect(serialized).not.toContain("Private");
    expect(serialized).not.toContain("Example Street");
    expect(serialized).not.toContain("customer");
    expect(serialized).not.toContain("additional_field");
    expect(returned.line_items[0]?.return_comment).toContain(
      "Runs half a size small",
    );
    expect(returned.line_items[0]?.return_comment).not.toContain("AB12345");
    expect(returned.exchanges).toEqual([
      { product_id: "2001", variant_id: "3002" },
    ]);
  });
  test("redacts contact/order identifiers without losing useful dimensions or fit statements", () => {
    const source =
      "Contact me at a.b+returns@example.co.uk, +44 20 7946 0958 ext 21, order number ZZ-55441, #998812. 8.5 was small; need size 9. Capacity 250 ml, 40 x 20 cm.";
    const redacted = redactComment(store, source);
    expect(redacted).not.toContain("example.co.uk");
    expect(redacted).not.toContain("7946");
    expect(redacted).not.toContain("ZZ-55441");
    expect(redacted).not.toContain("998812");
    expect(redacted).toContain("8.5 was small; need size 9");
    expect(redacted).toContain("250 ml, 40 x 20 cm");
    expect(redactComment(store, "Ref abc-7788", ["abc-7788"])).not.toContain(
      "abc-7788",
    );
  });
  test("duplicates have one stable merchant-scoped key; edits and triggers have distinct keys", () => {
    const returned = parseReturn(store, returnFixture());
    expect(webhookKey(store, returned)).toBe(
      webhookKey(store, parseReturn(store, returnFixture())),
    );
    expect(webhookKey(store, returned)).not.toBe(
      webhookKey("merchant-b", parseReturn("merchant-b", returnFixture())),
    );
    expect(webhookKey(store, returned)).not.toBe(
      webhookKey(
        store,
        parseReturn(
          store,
          returnFixture({ edited_at: "2026-11-03T00:00:00Z" }),
        ),
      ),
    );
    expect(webhookKey(store, returned)).not.toBe(
      webhookKey(
        store,
        parseReturn(store, returnFixture({ trigger: "return.updated" })),
      ),
    );
    expect(() => webhookKey("merchant-b", returned)).toThrow(
      "another merchant",
    );
  });
  test("rejects ambiguous IDs and duplicate returned units; tolerates additive provider fields", () => {
    expect(() =>
      parseReturn(store, returnFixture({ id: Number.MAX_SAFE_INTEGER + 1 })),
    ).toThrow();
    const fixture = returnFixture();
    expect(() =>
      parseReturn(
        store,
        returnFixture({
          line_items: [fixture.line_items[0], fixture.line_items[0]],
        }),
      ),
    ).toThrow("duplicate");
    expect(parseReturn(store, returnFixture({ totally_new: true })).id).toBe(
      "101",
    );
  });
});

describe("merchant-specific reason concepts", () => {
  test.each([
    ["Runs a little small", null, "fit", true],
    ["Wrong shade of blue", "Appearance", "color", true],
    ["Different fabric than advertised", "Quality", "material", true],
    ["Capacity too small", null, "dimensions", true],
    ["Does not work with my phone", null, "compatibility", true],
    ["Missing parts", null, "contents", true],
    ["Not as described", null, "not_as_described", true],
    ["Damaged in transit", "Size", "damaged", false],
    ["Arrived late", null, "shipping", false],
    ["Changed my mind", "Fit", "changed_mind", false],
    ["Ordered by mistake", null, "changed_mind", false],
    ["Duplicate order", null, "changed_mind", false],
    ["Unwanted gift", null, "changed_mind", false],
  ] as const)("classifies %s", (reason, parent, category, fixable) => {
    expect(
      classifyReason(store, reason as string, parent as string | null),
    ).toEqual({ category, dataFixable: fixable, source: "rule" });
  });
  test("unknown merchant wording goes to the model; parent is part of the mapping key", () => {
    expect(classifyReason(store, "Option 17 — see our policy")).toBeNull();
    expect(normalizeReason(store, "  TOO   SMALL ", " FIT ")).toEqual(
      normalizeReason(store, "too small", "fit"),
    );
    expect(normalizeReason(store, "other", "fit").key).not.toBe(
      normalizeReason(store, "other", "damaged").key,
    );
    expect(normalizeReason(store, "other", null).key).toBe(
      normalizeReason(store, "other", "").key,
    );
  });
});

const variant = (
  id: string,
  size: string,
  other: Partial<LoopVariant> = {},
): LoopVariant => ({
  store,
  id,
  productId: "2001",
  options: { Size: size, Color: "Blue" },
  ...other,
});

describe("exchange direction", () => {
  test("calculates numeric and ordered apparel direction without guessing product identity", () => {
    expect(
      exchangeDirection(store, {
        from: variant("1", "8"),
        to: variant("2", "9"),
      }),
    ).toEqual({ attribute: "size", direction: "up", steps: 1 });
    expect(
      exchangeDirection(store, {
        from: variant("1", "8"),
        to: variant("2", "8.5"),
      }),
    ).toEqual({ attribute: "size", direction: "up", steps: 0.5 });
    expect(
      exchangeDirection(store, {
        from: variant("1", "XL"),
        to: variant("2", "M"),
      }),
    ).toEqual({ attribute: "size", direction: "down", steps: 2 });
    expect(
      exchangeDirection(store, {
        from: variant("1", "8"),
        to: variant("2", "9", { productId: "other" }),
      }),
    ).toBeNull();
  });
  test("rejects cross-store, different sizing systems and simultaneous color changes", () => {
    expect(() =>
      exchangeDirection(store, {
        from: variant("1", "8"),
        to: variant("2", "9", { store: "merchant-b" }),
      }),
    ).toThrow();
    expect(
      exchangeDirection(store, {
        from: variant("1", "US 8"),
        to: variant("2", "EU 9"),
      }),
    ).toBeNull();
    expect(
      exchangeDirection(store, {
        from: variant("1", "8"),
        to: variant("2", "9", { options: { Size: "9", Color: "Red" } }),
      }),
    ).toBeNull();
    expect(
      exchangeDirection(store, {
        from: variant("1", "Custom"),
        to: variant("2", "Regular"),
      }),
    ).toBeNull();
  });
});

describe("window boundaries and single-merchant guard", () => {
  test("chunks 180 days into six 30-day windows and enforces the 120-day maximum", () => {
    const from = "2026-01-01T00:00:00Z";
    const to = new Date(Date.parse(from) + 180 * 86_400_000).toISOString();
    const windows = dateWindows(store, from, to);
    expect(windows).toHaveLength(6);
    expect(windows[0]?.from).toBe(new Date(from).toISOString());
    expect(windows.at(-1)?.to).toBe(to);
    expect(
      windows.every(
        (window, index) =>
          index === 0 || windows[index - 1]?.to === window.from,
      ),
    ).toBe(true);
    expect(dateWindows(store, from, to, 120)).toHaveLength(2);
    expect(() => dateWindows(store, from, to, 121)).toThrow();
    expect(() => dateWindows(store, to, from)).toThrow();
  });
  test("rejects absent, blank and plural merchants before inspecting any return data", () => {
    for (const invalid of [
      undefined,
      null,
      "",
      "  ",
      ["a", "b"],
      { store: "a" },
    ]) {
      expect(() => assertMerchant(invalid)).toThrow();
      const missing = invalid as unknown as string;
      expect(() => parseReturn(missing, returnFixture())).toThrow();
      expect(() => classifyReason(missing, "fit")).toThrow();
      expect(() => redactComment(missing, "comment")).toThrow();
      expect(() => normalizeReason(missing, "fit")).toThrow();
      expect(() =>
        verifySignature(missing, raw, signature("secret"), ["secret"]),
      ).toThrow();
      expect(() => dateWindows(missing, "2026-01-01", "2026-02-01")).toThrow();
      expect(() =>
        exchangeDirection(missing, {
          from: variant("1", "S"),
          to: variant("2", "M"),
        }),
      ).toThrow();
    }
  });
});
