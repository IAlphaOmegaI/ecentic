import * as Sentry from "@sentry/nextjs";
import { resultify } from "@zenncore/utils";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@/server/database";
import { withContext } from "@/server/utils/context";
import { Environment } from "@/server/utils/environment";
import { InvalidSignatureError, ValidationError } from "@/server/utils/error";
import * as Attribution from "../../billing/attribution";
import * as Store from "../../store";
import * as Recharge from "../recharge";
import { CHECKOUT_MARKER, verifyCheckoutMarker } from "./checkout-marker";
import { verifyWebhookHmac } from "./hmac";

/**
 * Shopify's mandatory GDPR topics plus `orders/paid` attribution.
 *
 * Deliberately NOT a `"use server"` module. Every export of one is reachable as
 * an RPC endpoint, and the whole point of the HMAC check below is that only
 * Shopify can invoke this — an action would be a second door into the same
 * work with no signature required, letting anyone forge an attributed order.
 */

const externalId = z
  .union([
    z.string().regex(/^\d+$/),
    z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  ])
  .transform(String);
const customerRequest = z.object({
  shop_domain: z.string(),
  customer: z.object({ id: externalId }),
  orders_requested: z.array(externalId).optional(),
  orders_to_redact: z.array(externalId).optional(),
});

const processCustomerRequest = async (
  shop: string,
  payload: unknown,
  redact: boolean,
) => {
  const customer = customerRequest.safeParse(payload);
  if (!customer.success || customer.data.shop_domain !== shop)
    return {
      success: false as const,
      error: new ValidationError("Malformed customer request", {
        statusCode: 400,
      }),
    };
  const stores = await Store.find(Environment.SERVER, {
    where: and(
      eq(schema.store.domain, `https://${shop}`),
      eq(schema.store.platform, "shopify"),
    ),
  });
  if (!stores.success) return stores;
  const orders =
    (redact
      ? customer.data.orders_to_redact
      : customer.data.orders_requested) ?? [];
  const result = await resultify(async () => {
    const data = [];
    for (const store of stores.data) {
      if (redact) await Recharge.redactOrders({ store: store.id, orders });
      else
        data.push(
          ...(await Recharge.getAttributionsForOrders({
            store: store.id,
            orders,
          })),
        );
    }
    return {
      shop,
      customer: customer.data.customer.id,
      data_stored: data,
      message: redact
        ? "Removed matching order and subscription attribution details."
        : "Matching order and subscription attribution details. Customer names, email addresses, and payment information are not retained by this integration.",
    };
  });
  return result.success
    ? result
    : {
        success: false as const,
        error: new Error("Could not process customer privacy request"),
      };
};

const paidOrder = z.object({
  id: externalId,
  financial_status: z.literal("paid"),
  created_at: z.string().optional(),
  current_total_price: z.string().optional(),
  total_price: z.string().optional(),
  currency: z.string().optional(),
  note_attributes: z
    .array(z.object({ name: z.string(), value: z.string() }))
    .optional(),
});
type OrdersPaidPayload = z.infer<typeof paidOrder>;

/**
 * `orders/paid` → performance-fee attribution. Maps the shop to its ecentic
 * store, converts the order total to cents, flattens `note_attributes` (where
 * the storefront tracker stamps `_ecentic_ai_ref`), and records an attributed
 * conversion when a signal is present. Idempotent downstream on (store, order).
 */
const recordPaidOrder = async (shop: string, payload: OrdersPaidPayload) => {
  // Only the app-installed row can receive this webhook. A public catalog
  // import of the same myshopify host (anyone's, from a typed URL) shares the
  // domain but must never be credited — or billed — for the order.
  const stores = await Store.find(Environment.SERVER, {
    where: and(
      eq(schema.store.domain, `https://${shop}`),
      eq(schema.store.platform, "shopify"),
    ),
    limit: 1,
  });

  if (!stores.success) return stores;

  const store = stores.data[0];
  if (!store)
    return {
      success: true as const,
      data: { shop, message: "No matching store." },
    };

  const amount = payload.current_total_price ?? payload.total_price ?? "0";
  const orderValueCents = Math.round(Number.parseFloat(amount) * 100);

  const noteAttributes = (payload.note_attributes ?? []).reduce<
    Record<string, string>
  >((accumulator, entry) => {
    accumulator[entry.name] = entry.value;
    return accumulator;
  }, {});

  const marker = noteAttributes[CHECKOUT_MARKER];
  const createdAt = new Date(payload.created_at ?? "");
  const receipt =
    marker &&
    verifyCheckoutMarker({
      marker,
      store: store.id,
      secret: process.env.SHOPIFY_API_SECRET ?? "",
      at: createdAt,
    });
  if (receipt) {
    // A valid receipt is durable before acknowledgement. Return failures so
    // Shopify retries; the receipt can credit exactly one order across retries.
    const recorded = await resultify(() =>
      Recharge.recordAiOrder({
        store: store.id,
        order: String(payload.id),
        reference: receipt.reference,
        marker,
        createdAt,
      }),
    );
    if (!recorded.success)
      return {
        success: false as const,
        error: new Error("Could not persist checkout attribution"),
      };
  }

  // The result is intentionally not propagated: a failed attribution must not
  // turn into a non-2xx, or Shopify redelivers the order and we re-run it. The
  // failure is already a Sentry event via the action's own context wrapper.
  await Attribution.recordOrderIfAttributed(Environment.SERVER, {
    store: store.id,
    user: store.userId,
    orderExternalId: String(payload.id),
    orderValueCents,
    currency: payload.currency ?? "USD",
    noteAttributes,
  });

  return {
    success: true as const,
    data: { shop, message: "Order processed." },
  };
};

const redactShop = async (shop: string) => {
  // Erase what the app install gave us — the `shopify` row. A public catalog
  // import of the same myshopify host belongs to another account (anyone can
  // make one from a typed URL, and a verified install no longer blocks it);
  // deleting it would destroy that account's own work.
  const stores = await Store.find(Environment.SERVER, {
    where: and(
      eq(schema.store.domain, `https://${shop}`),
      eq(schema.store.platform, "shopify"),
    ),
  });

  if (!stores.success) return stores;

  const destroyed = await Promise.all(
    stores.data.map((store) => Store.destroy(Environment.SERVER, store.id)),
  );

  const failed = destroyed.find((result) => !result.success);
  if (failed && !failed.success) return failed;

  return {
    success: true as const,
    data: {
      shop,
      message: `Deleted ${stores.data.length} store(s) and all associated data.`,
    },
  };
};

export const handle = withContext(
  async (
    context,
    {
      shop,
      topic,
      signature,
      body,
      webhookId,
    }: {
      shop: string;
      topic: string;
      signature: string;
      body: string;
      webhookId?: string;
    },
  ) => {
    // Recorded before anything can fail, so a rejection below arrives in Sentry
    // with the fields that tell a forged request apart from a real delivery we
    // are dropping: Shopify reuses one `webhookId` across all retries of the
    // same event, so a burst under a single id is our own signature check
    // failing on genuine traffic, while lone unidentified hits are probes.
    // Never the body — it is unverified at this point and may carry order data.
    context.span.addBreadcrumb({
      category: "shopify.webhook.received",
      data: {
        shop,
        topic,
        "webhook.id": webhookId ?? "absent",
        "body.bytes": body.length,
      },
    });

    const secret = process.env.SHOPIFY_API_SECRET;

    if (!secret)
      return {
        success: false as const,
        error: new Error("Shopify integration not configured"),
      };

    // Runs against the raw body, before anything parses it — the signature
    // covers the exact bytes Shopify sent.
    //
    // A rejection here is the control working, not a defect: anyone can POST
    // this URL, and Shopify's app review deliberately sends a bad HMAC to
    // confirm the 401. So it is recorded at `warning` and returned as an
    // expected error, which keeps `withContext` from also raising it as an
    // exception. The one case that *is* ours still surfaces in the same issue —
    // repeated rejections carrying a real `webhookId` are genuine deliveries
    // signed with a secret this deployment no longer matches.
    if (!verifyWebhookHmac(body, signature, secret)) {
      // Fields ride in `extra`, not `tags`: every one of them comes off an
      // unverified request, and an indexed tag would let a flood of forged
      // headers pollute Sentry's tag cardinality.
      Sentry.captureMessage("Shopify webhook failed HMAC verification", {
        level: "warning",
        tags: { route: "shopify-inbound" },
        extra: {
          shop,
          topic,
          webhookId: webhookId ?? "absent",
          bodyBytes: body.length,
        },
      });

      return {
        success: false as const,
        error: new InvalidSignatureError("Invalid HMAC signature"),
      };
    }

    const payload = resultify(() => JSON.parse(body) as unknown);

    if (!payload.success)
      return {
        success: false as const,
        error: new ValidationError("Malformed webhook body", {
          statusCode: 400,
        }),
      };

    switch (topic) {
      case "customers/data_request":
        return await processCustomerRequest(shop, payload.data, false);
      case "customers/redact":
        return await processCustomerRequest(shop, payload.data, true);
      case "shop/redact": {
        const request = z
          .object({ shop_id: externalId, shop_domain: z.literal(shop) })
          .strict()
          .safeParse(payload.data);
        if (!request.success)
          return {
            success: false as const,
            error: new ValidationError("Malformed shop privacy request", {
              statusCode: 400,
            }),
          };
        return await redactShop(shop);
      }
      case "orders/paid": {
        const order = paidOrder.safeParse(payload.data);
        if (!order.success)
          return {
            success: false as const,
            error: new ValidationError("Malformed paid order", {
              statusCode: 400,
            }),
          };
        return await recordPaidOrder(shop, order.data);
      }
      default:
        return {
          success: false as const,
          error: new ValidationError(`Unknown topic: ${topic}`, {
            statusCode: 400,
          }),
        };
    }
  },
  "ShopifyInbound.handle",
);
