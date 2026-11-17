import { describe, expect, test } from "bun:test";
import { createHash, createHmac } from "node:crypto";
import {
  mapOrderSubscriptions,
  projectWebhookPayload,
  rechargeTimestamp,
  verifyRechargeWebhook,
  webhookDigest,
} from "./webhooks";

const secret = "test-partner-secret";
const body = Buffer.from('{"subscription": {"id": 123,"status":"active"}}');
const legacy = createHash("sha256").update(secret).update(body).digest("hex");

describe("webhook verification", () => {
  test("verifies legacy SHA-256(secret + raw bytes), not a JSON serialization", () => {
    const headers = new Headers({ "X-Recharge-Hmac-Sha256": legacy });
    expect(verifyRechargeWebhook({ secret, body, headers })).toBe(true);
    expect(
      verifyRechargeWebhook({
        secret,
        body: Buffer.from(JSON.stringify(JSON.parse(body.toString()))),
        headers,
      }),
    ).toBe(false);
    expect(
      verifyRechargeWebhook({
        secret,
        body: Buffer.from(body.toString().replace("active", "cancelled")),
        headers,
      }),
    ).toBe(false);
    expect(verifyRechargeWebhook({ secret: "wrong", body, headers })).toBe(
      false,
    );
    expect(
      verifyRechargeWebhook({
        secret,
        body,
        headers: new Headers({ "X-Recharge-Hmac-Sha256": "nope" }),
      }),
    ).toBe(false);
  });

  test("accepts a fresh timestamp-bound HMAC, rejects stale or tampered requests", () => {
    const seconds = 1_800_000_000;
    const signature = createHmac("sha256", secret)
      .update(`${seconds}.`)
      .update(body)
      .digest("hex");
    const headers = new Headers({
      "X-Recharge-Webhook-Signature": `t=${seconds},v1=${signature}`,
      "X-Recharge-Webhook-Timestamp": String(seconds),
    });
    expect(
      verifyRechargeWebhook({ secret, body, headers, now: seconds * 1000 }),
    ).toBe(true);
    expect(
      verifyRechargeWebhook({
        secret,
        body,
        headers,
        now: (seconds + 172801) * 1000,
      }),
    ).toBe(false);
    expect(
      verifyRechargeWebhook({
        secret,
        body: Buffer.from("changed"),
        headers,
        now: seconds * 1000,
      }),
    ).toBe(false);
  });

  test("an invalid modern signature cannot downgrade to a valid legacy one", () => {
    const headers = new Headers({
      "X-Recharge-Hmac-Sha256": legacy,
      "X-Recharge-Webhook-Signature": "t=1800000000,v1=bad",
    });
    expect(
      verifyRechargeWebhook({ secret, body, headers, now: 1_800_000_000_000 }),
    ).toBe(false);
  });

  test("duplicate deliveries have a stable digest scoped to their topic", () => {
    expect(webhookDigest("subscription/created", body)).toBe(
      webhookDigest("subscription/created", Buffer.from(body)),
    );
    expect(webhookDigest("subscription/cancelled", body)).not.toBe(
      webhookDigest("subscription/created", body),
    );
  });
});

describe("minimal webhook records and exact attribution", () => {
  test("interprets Recharge timestamps without a zone as UTC", () => {
    expect(rechargeTimestamp("2026-11-17T10:00:00")).toBe(
      "2026-11-17T10:00:00.000Z",
    );
    expect(rechargeTimestamp("2026-11-17T10:00:00-08:00")).toBe(
      "2026-11-17T18:00:00.000Z",
    );
    expect(rechargeTimestamp("not a date")).toBeNull();
  });
  test("discards names, emails, addresses and arbitrary properties before persistence", () => {
    const projection = projectWebhookPayload("order/created", {
      order: {
        id: 700,
        external_order_id: { ecommerce: "900" },
        customer: {
          id: 50,
          email: "never-store@example.test",
          first_name: "Never",
          external_customer_id: { ecommerce: "60" },
        },
        billing_address: { first_name: "Never", address1: "Never persist" },
        type: "checkout",
        status: "success",
        created_at: "2026-11-17T12:00:00Z",
        line_items: [
          {
            purchase_item_type: "subscription",
            purchase_item_id: 123,
            properties: [{ name: "email", value: "never-store@example.test" }],
          },
        ],
      },
    });
    expect(projection?.kind).toBe("order");
    expect(JSON.stringify(projection)).not.toContain("Never");
    expect(JSON.stringify(projection)).not.toContain("email");
    expect(JSON.stringify(projection)).not.toContain("address");
    if (projection?.kind !== "order")
      throw new Error("Expected order projection");
    expect(mapOrderSubscriptions(projection.order)).toEqual([
      {
        shopifyOrderId: "900",
        rechargeOrderId: "700",
        subscriptionId: "123",
        createdAt: "2026-11-17T12:00:00.000Z",
        orderType: "checkout",
      },
    ]);
  });

  test("supports multiple subscriptions, ignores onetimes and deduplicates line items", () => {
    const links = mapOrderSubscriptions({
      id: 1,
      external_order_id: { ecommerce: "2" },
      line_items: [
        { purchase_item_type: "subscription", purchase_item_id: 3 },
        { purchase_item_type: "subscription", purchase_item_id: 3 },
        { purchase_item_type: "subscription", purchase_item_id: 4 },
        { purchase_item_type: "onetime", purchase_item_id: 5 },
      ],
    });
    expect(links.map((link) => link.subscriptionId)).toEqual(["3", "4"]);
  });

  test("never matches without an exact Shopify order id or with an imprecise number", () => {
    expect(
      mapOrderSubscriptions({
        id: 1,
        line_items: [
          { purchase_item_type: "subscription", purchase_item_id: 3 },
        ],
      }),
    ).toEqual([]);
    expect(
      mapOrderSubscriptions({
        id: 1,
        external_order_id: { ecommerce: Number.MAX_SAFE_INTEGER + 1 },
        line_items: [
          { purchase_item_type: "subscription", purchase_item_id: 3 },
        ],
      }),
    ).toEqual([]);
  });

  test("preserves cancellation status and time without storing cancellation comments", () => {
    const projection = projectWebhookPayload("subscription/cancelled", {
      subscription: {
        id: 123,
        status: "cancelled",
        cancelled_at: "2026-11-17T13:00:00Z",
        cancellation_reason_comments: "Private",
      },
    });
    expect(
      projection?.kind === "subscription" &&
        projection.subscription.cancelled_at,
    ).toBe("2026-11-17T13:00:00.000Z");
    expect(JSON.stringify(projection)).not.toContain("Private");
  });
});
