/**
 * Hosted UCP order reads and order-lifecycle webhooks.
 *
 * Orders created through the hosted checkout are recorded in `ucp_order`;
 * reads fetch a fresh entity snapshot from the store bridge. Lifecycle
 * webhooks (`order.created` from checkout completion, `order.updated` relayed
 * from the store plugin's status hook) are signed per RFC 9421 and carry
 * Standard Webhooks headers, exactly like the reference implementation.
 */

import { randomUUID } from "node:crypto";
import { resultify } from "@zenncore/utils";
import { withContext } from "../../utils/context";
import { Environment } from "../../utils/environment";
import { RequestError } from "../../utils/error";
import * as UcpOrderRecord from "../ucp-order";
import * as Bridge from "./bridge";
import {
  CAPABILITY,
  errorMessage,
  type Negotiated,
  UCP_VERSION,
  ucpBlock,
} from "./protocol";
import { signRequest } from "./signatures";
import { storefrontOrigin, type UcpStoreContext } from "./store-context";

const RELEVANT = [CAPABILITY.ORDER];

export type OrderResult = { status: number; body: Record<string, unknown> };

// ─── Entity ──────────────────────────────────────────────────────────────────

const buildOrderEntity = (
  entity: Bridge.BridgeOrderEntity,
  negotiated: Negotiated | null,
): Record<string, unknown> => ({
  ucp: { ...ucpBlock(RELEVANT, negotiated, "success") },
  id: String(entity.id),
  label: entity.label || `Order #${entity.number}`,
  checkout_id: entity.checkout_id,
  permalink_url: entity.permalink_url,
  line_items: entity.line_items,
  ...(entity.fulfillment ? { fulfillment: entity.fulfillment } : {}),
  currency: entity.currency,
  totals: entity.totals,
  ...(entity.adjustments && entity.adjustments.length > 0
    ? { adjustments: entity.adjustments }
    : {}),
  ...(entity.attribution && Object.keys(entity.attribution).length > 0
    ? { attribution: entity.attribution }
    : {}),
});

/**
 * `GET /orders/{id}` — only orders created through the hosted UCP checkout
 * resolve; anything else is 404 (existence privacy).
 */
export const get = async ({
  context,
  negotiated,
  id,
}: {
  context: UcpStoreContext;
  negotiated: Negotiated | null;
  id: string;
}): Promise<OrderResult> => {
  const notFound: OrderResult = {
    status: 404,
    body: {
      ucp: ucpBlock(RELEVANT, negotiated, "error"),
      messages: [
        errorMessage("not_found", "Order not found.", "unrecoverable"),
      ],
    },
  };

  if (!/^\d+$/.test(id) || !context.credentials) return notFound;

  const record = await UcpOrderRecord.getForStoreOrder({
    store: context.store.id,
    externalOrderId: id,
  });
  if (!record.success || !record.data) return notFound;

  const entity = await Bridge.getOrder(
    {
      domain: context.store.domain,
      consumerKey: context.credentials.consumerKey,
      consumerSecret: context.credentials.consumerSecret,
    },
    id,
  );
  if (!entity.success) {
    return {
      status: 502,
      body: {
        ucp: ucpBlock(RELEVANT, negotiated, "error"),
        messages: [
          errorMessage(
            "store_unavailable",
            "The store could not be reached for the order snapshot.",
          ),
        ],
      },
    };
  }

  return { status: 200, body: buildOrderEntity(entity.data, negotiated) };
};

// ─── Webhooks ────────────────────────────────────────────────────────────────

export type OrderEventName = "order.created" | "order.updated";

/**
 * Sends a signed order lifecycle webhook to the agent platform. Fetches a
 * fresh entity snapshot from the store, then POSTs it with Standard Webhooks
 * headers and an RFC 9421 signature. Callers fire-and-forget — a delivery
 * failure is a Sentry-captured Result, never a blocked checkout.
 */
export const sendOrderEvent = withContext(
  async (
    context,
    {
      store,
      event,
      externalOrderId,
      webhookUrl,
      entity,
    }: {
      store: UcpStoreContext;
      event: OrderEventName;
      externalOrderId: string;
      webhookUrl: string;
      entity?: Bridge.BridgeOrderEntity;
    },
  ) => {
    context.span.addBreadcrumb({
      category: "ucp.order.webhook",
      data: {
        "store.id": store.store.id,
        "order.external_id": externalOrderId,
        event,
      },
    });

    if (!/^https:\/\//.test(webhookUrl)) {
      return {
        success: false as const,
        error: new RequestError("Order webhook target is not HTTPS"),
      };
    }

    const snapshot = await (async () => {
      if (entity) return entity;
      if (!store.credentials) return null;
      const fetched = await Bridge.getOrder(
        {
          domain: store.store.domain,
          consumerKey: store.credentials.consumerKey,
          consumerSecret: store.credentials.consumerSecret,
        },
        externalOrderId,
      );
      return fetched.success ? fetched.data : null;
    })();

    if (!snapshot) {
      return {
        success: false as const,
        error: new RequestError(
          "Could not fetch the order snapshot for the webhook",
        ),
      };
    }

    const body = JSON.stringify(buildOrderEntity(snapshot, null));

    // The business identifies itself with its own discovery profile — the
    // store's well-known URL, which proxies the hosted profile.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "UCP-Agent": `profile="${storefrontOrigin(store.store.domain)}/.well-known/ucp"; version="${UCP_VERSION}"`,
      "Idempotency-Key": `evt_${randomUUID()}`,
      "Webhook-Id": `msg_${randomUUID()}`,
      "Webhook-Timestamp": String(Math.floor(Date.now() / 1000)),
      "X-UCP-Event": event,
    };

    const signature = signRequest("POST", webhookUrl, body, headers);

    const delivery = await resultify(() =>
      fetch(webhookUrl, {
        method: "POST",
        headers: { ...headers, ...signature },
        body,
        signal: AbortSignal.timeout(10_000),
      }),
    );

    if (!delivery.success) return delivery;
    if (!delivery.data.ok) {
      return {
        success: false as const,
        error: new RequestError("Order webhook delivery failed", {
          statusCode: delivery.data.status,
        }),
      };
    }

    return { success: true as const, data: { delivered: true } };
  },
  "UcpOrders.sendEvent",
);

/**
 * Handles an order event relayed by the store plugin (order status changed).
 * Looks up the durable order record for the agent webhook target and fans the
 * event out. Unknown orders are ignored — only UCP-originated orders relay.
 */
export const relayStoreEvent = withContext(
  async (
    context,
    {
      store,
      event,
      externalOrderId,
    }: {
      store: UcpStoreContext;
      event: OrderEventName;
      externalOrderId: string;
    },
  ) => {
    context.span.addBreadcrumb({
      category: "ucp.order.relay",
      data: {
        "store.id": store.store.id,
        "order.external_id": externalOrderId,
        event,
      },
    });

    const record = await UcpOrderRecord.getForStoreOrder({
      store: store.store.id,
      externalOrderId,
    });
    if (!record.success) return record;

    if (!record.data?.webhookUrl) {
      return { success: true as const, data: { relayed: false } };
    }

    const sent = await sendOrderEvent(Environment.SERVER, {
      store,
      event,
      externalOrderId,
      webhookUrl: record.data.webhookUrl,
    });

    return { success: true as const, data: { relayed: sent.success } };
  },
  "UcpOrders.relayStoreEvent",
);
