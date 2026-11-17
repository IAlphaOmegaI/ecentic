import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { identifier, record } from "./http";

export type RechargeOrder = {
  id?: string | number;
  external_order_id?: { ecommerce?: string | number | null };
  customer?: {
    id?: string | number;
    external_customer_id?: { ecommerce?: string | number | null };
  };
  created_at?: string | null;
  updated_at?: string | null;
  status?: string | null;
  type?: string | null;
  line_items?: {
    purchase_item_id?: string | number | null;
    purchase_item_type?: string | null;
    external_product_id?: { ecommerce?: string | number | null };
    external_variant_id?: { ecommerce?: string | number | null };
  }[];
};

export type RechargeSubscription = {
  id?: string | number;
  customer_id?: string | number | null;
  external_product_id?: { ecommerce?: string | number | null };
  external_variant_id?: { ecommerce?: string | number | null };
  created_at?: string | null;
  updated_at?: string | null;
  cancelled_at?: string | null;
  status?: string | null;
};

const constantTimeHex = (actual: string, expected: string) => {
  if (!/^[a-f\d]{64}$/i.test(actual)) return false;
  return timingSafeEqual(
    Buffer.from(actual, "hex"),
    Buffer.from(expected, "hex"),
  );
};

export const verifyRechargeWebhook = ({
  body,
  headers,
  secret,
  now = Date.now(),
}: {
  body: Uint8Array;
  headers: Headers;
  secret: string;
  now?: number;
}) => {
  if (!secret) return false;
  const signed = headers.get("X-Recharge-Webhook-Signature");
  // Presence of the modern scheme commits the request to that scheme. An
  // invalid modern signature cannot fall back to a replayable legacy signature.
  if (signed !== null) {
    const entries = signed.split(",").map((entry) => entry.trim().split("="));
    const timestamps = entries.filter(([key]) => key === "t");
    const signatures = entries.filter(([key]) => key === "v1");
    const timestamp = timestamps[0]?.[1];
    if (
      timestamps.length !== 1 ||
      timestamps[0]?.length !== 2 ||
      signatures.length === 0 ||
      !timestamp ||
      !/^\d+$/.test(timestamp)
    )
      return false;
    const seconds = Number(timestamp);
    if (
      !Number.isSafeInteger(seconds) ||
      Math.abs(now / 1000 - seconds) > 172800
    )
      return false;
    const timestampHeader = headers.get("X-Recharge-Webhook-Timestamp");
    if (timestampHeader !== null && timestampHeader !== timestamp) return false;
    const digest = createHmac("sha256", secret)
      .update(`${timestamp}.`)
      .update(body)
      .digest("hex");
    return signatures.some(
      (entry) => entry.length === 2 && constantTimeHex(entry[1] ?? "", digest),
    );
  }
  const signature = headers.get("X-Recharge-Hmac-Sha256");
  if (!signature) return false;
  const digest = createHash("sha256").update(secret).update(body).digest("hex");
  return constantTimeHex(signature, digest);
};

export const rechargeTimestamp = (value: unknown): string | null => {
  if (
    typeof value !== "string" ||
    value.length > 40 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:?\d{2})?$/i.test(
      value,
    )
  )
    return null;
  // Recharge timestamps are UTC; some payloads omit the zone. Never interpret
  // those using the worker host's local timezone.
  const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  return Number.isFinite(Date.parse(zoned))
    ? new Date(zoned).toISOString()
    : null;
};
const external = (value: unknown) => ({
  ecommerce: identifier(record(value)["ecommerce"]),
});
const boundedString = (value: unknown) =>
  typeof value === "string" && value.length <= 40 ? value : null;

export const projectOrder = (value: unknown): RechargeOrder | null => {
  const order = record(value);
  const id = identifier(order["id"]);
  if (!id) return null;
  const customer = record(order["customer"]);
  return {
    id,
    external_order_id: external(order["external_order_id"]),
    customer: {
      ...(identifier(customer["id"])
        ? { id: identifier(customer["id"]) ?? undefined }
        : {}),
      external_customer_id: external(customer["external_customer_id"]),
    },
    created_at: rechargeTimestamp(order["created_at"]),
    updated_at: rechargeTimestamp(order["updated_at"]),
    status: boundedString(order["status"]),
    type: boundedString(order["type"]),
    line_items: (Array.isArray(order["line_items"])
      ? order["line_items"]
      : []
    ).map((value) => {
      const item = record(value);
      return {
        purchase_item_id: identifier(item["purchase_item_id"]),
        purchase_item_type: boundedString(item["purchase_item_type"]),
        external_product_id: external(item["external_product_id"]),
        external_variant_id: external(item["external_variant_id"]),
      };
    }),
  };
};

export const projectSubscription = (
  value: unknown,
): RechargeSubscription | null => {
  const subscription = record(value);
  const id = identifier(subscription["id"]);
  if (!id) return null;
  return {
    id,
    customer_id: identifier(subscription["customer_id"]),
    external_product_id: external(subscription["external_product_id"]),
    external_variant_id: external(subscription["external_variant_id"]),
    created_at: rechargeTimestamp(subscription["created_at"]),
    updated_at: rechargeTimestamp(subscription["updated_at"]),
    cancelled_at: rechargeTimestamp(subscription["cancelled_at"]),
    status: boundedString(subscription["status"]),
  };
};

export type RechargeWebhookProjection =
  | { kind: "order"; order: RechargeOrder }
  | { kind: "subscription"; subscription: RechargeSubscription }
  | { kind: "uninstall" };

/** Persist only this projection, never the raw webhook (which contains PII). */
export const projectWebhookPayload = (
  topic: string,
  payload: unknown,
): RechargeWebhookProjection | null => {
  const body = record(payload);
  if (topic === "recharge/uninstalled") return { kind: "uninstall" };
  if (topic.startsWith("order/")) {
    const order = projectOrder(body["order"]);
    return order ? { kind: "order", order } : null;
  }
  if (topic.startsWith("subscription/")) {
    const subscription = projectSubscription(body["subscription"]);
    return subscription ? { kind: "subscription", subscription } : null;
  }
  return null;
};

export const webhookDigest = (topic: string, body: Uint8Array) =>
  createHash("sha256").update(topic).update("\0").update(body).digest("hex");

/** Never match by email, name, product title or time proximity. */
export const mapOrderSubscriptions = (order: RechargeOrder) => {
  const rechargeOrderId = identifier(order["id"]);
  const shopifyOrderId = identifier(order["external_order_id"]?.ecommerce);
  if (!rechargeOrderId || !shopifyOrderId) return [];
  const subscriptions = [
    ...new Set(
      (order["line_items"] ?? []).flatMap((item) => {
        const id = identifier(item["purchase_item_id"]);
        return item["purchase_item_type"] === "subscription" && id ? [id] : [];
      }),
    ),
  ];
  return subscriptions.map((subscriptionId) => ({
    shopifyOrderId,
    rechargeOrderId,
    subscriptionId,
    createdAt: rechargeTimestamp(order["created_at"]),
    orderType: order["type"] ?? null,
  }));
};
