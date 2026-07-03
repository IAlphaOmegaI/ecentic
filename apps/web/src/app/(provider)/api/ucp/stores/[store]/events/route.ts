import { createHmac, timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse as Response } from "next/server";
import * as Orders from "@/server/app/ucp/orders";
import { resolveStoreContext } from "@/server/app/ucp/store-context";
import { Environment } from "@/server/utils/environment";

/**
 * Order lifecycle events relayed by the store's thin plugin (WooCommerce
 * `woocommerce_order_status_changed`). Authenticated with the per-store
 * bridge secret minted at connect time: the plugin sends
 * `X-Ecentic-Signature: hex(hmac_sha256(bridgeSecret, "{timestamp}.{body}"))`
 * plus `X-Ecentic-Timestamp`; stale timestamps are rejected to stop replays.
 * Ecentic then fans the event out to the agent platform's webhook (signed per
 * RFC 9421) for orders created through the hosted checkout.
 */

const MAX_TIMESTAMP_SKEW_SECONDS = 300;

const verifySignature = ({
  secret,
  timestamp,
  body,
  signature,
}: {
  secret: string;
  timestamp: string;
  body: string;
  signature: string;
}): boolean => {
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > MAX_TIMESTAMP_SKEW_SECONDS) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

export const POST = async (
  request: NextRequest,
  routeContext: { params: Promise<{ store: string }> },
) => {
  const { store } = await routeContext.params;

  const context = await resolveStoreContext(store);
  if (!context || !context.bridgeSecret) {
    return Response.json({ error: "Unknown store" }, { status: 404 });
  }

  const body = await request.text();
  const signature = request.headers.get("x-ecentic-signature") ?? "";
  const timestamp = request.headers.get("x-ecentic-timestamp") ?? "";

  if (
    signature === "" ||
    timestamp === "" ||
    !verifySignature({
      secret: context.bridgeSecret,
      timestamp,
      body,
      signature,
    })
  ) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = (() => {
    try {
      return JSON.parse(body) as { event?: unknown; order_id?: unknown };
    } catch {
      return null;
    }
  })();

  const event = payload?.event;
  const orderId = payload?.order_id;

  if (
    (event !== "order.updated" && event !== "order.created") ||
    (typeof orderId !== "number" && typeof orderId !== "string")
  ) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const relay = await Orders.relayStoreEvent(Environment.SERVER, {
    store: context,
    event,
    externalOrderId: String(orderId),
  });

  return Response.json({
    received: true,
    relayed: relay.success ? relay.data.relayed : false,
  });
};
