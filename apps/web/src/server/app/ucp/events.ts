import { createHmac, timingSafeEqual } from "node:crypto";
import { resultify } from "@zenncore/utils";
import { withContext } from "@/server/utils/context";
import { Environment } from "@/server/utils/environment";
import {
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "@/server/utils/error";
import * as Orders from "./orders";
import { resolveStoreContext } from "./store-context";
import { invalidateStorefrontInfo } from "./store-info";

/**
 * Order lifecycle events relayed by the store's thin plugin (WooCommerce
 * `woocommerce_order_status_changed`). Authenticated with the per-store bridge
 * secret minted at connect time.
 *
 * Deliberately NOT a `"use server"` module — the bridge signature is the only
 * thing standing between this and anyone relaying forged order events, and an
 * action export would be a way in that never presents one.
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
}) => {
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > MAX_TIMESTAMP_SKEW_SECONDS) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  if (expected.length !== signature.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

export const record = withContext(
  async (
    _context,
    {
      store,
      body,
      signature,
      timestamp,
    }: {
      store: string;
      body: string;
      signature: string;
      timestamp: string;
    },
  ) => {
    const context = await resolveStoreContext(store);

    if (!context?.bridgeSecret)
      return {
        success: false as const,
        error: new NotFoundError("Unknown store"),
      };

    if (
      signature === "" ||
      timestamp === "" ||
      !verifySignature({
        secret: context.bridgeSecret,
        timestamp,
        body,
        signature,
      })
    )
      return {
        success: false as const,
        error: new UnauthenticatedError("Invalid signature"),
      };

    const payload = resultify(
      () => JSON.parse(body) as { event?: unknown; order_id?: unknown },
    );

    const event = payload.success ? payload.data.event : undefined;
    const orderId = payload.success ? payload.data.order_id : undefined;

    // Settings changed on the store (e.g. the require-signatures toggle):
    // drop the cached store facts so the next request re-fetches them.
    if (event === "settings.updated") {
      await invalidateStorefrontInfo(context.store.id);
      return {
        success: true as const,
        data: { received: true, invalidated: true },
      };
    }

    if (
      (event !== "order.updated" && event !== "order.created") ||
      (typeof orderId !== "number" && typeof orderId !== "string")
    )
      return {
        success: false as const,
        // 400 rather than the class default of 422 — the plugin has coded
        // against this response since it shipped.
        error: new ValidationError("Invalid payload", { statusCode: 400 }),
      };

    const relay = await Orders.relayStoreEvent(Environment.SERVER, {
      store: context,
      event,
      externalOrderId: String(orderId),
    });

    return {
      success: true as const,
      data: {
        received: true,
        relayed: relay.success ? relay.data.relayed : false,
      },
    };
  },
  "UcpEvents.record",
);
