import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { schema } from "@/server/database";
import { withContext } from "@/server/utils/context";
import { Environment } from "@/server/utils/environment";
import { UnauthenticatedError, ValidationError } from "@/server/utils/error";
import { verifyWebhookHmac } from "@/server/utils/shopify";
import * as Attribution from "../billing/attribution";
import * as Store from "../store";

/**
 * Shopify's mandatory GDPR topics plus `orders/paid` attribution.
 *
 * Deliberately NOT a `"use server"` module. Every export of one is reachable as
 * an RPC endpoint, and the whole point of the HMAC check below is that only
 * Shopify can invoke this — an action would be a second door into the same
 * work with no signature required, letting anyone forge an attributed order.
 */

type CustomerPayload = {
  shop_domain: string;
  customer: { id: number; email: string };
  orders_requested?: number[];
  orders_to_redact?: number[];
};

type OrdersPaidPayload = {
  id: number;
  current_total_price?: string;
  total_price?: string;
  currency?: string;
  note_attributes?: { name: string; value: string }[];
};

/**
 * `orders/paid` → performance-fee attribution. Maps the shop to its ecentic
 * store, converts the order total to cents, flattens `note_attributes` (where
 * the storefront tracker stamps `_ecentic_ai_ref`), and records an attributed
 * conversion when a signal is present. Idempotent downstream on (store, order).
 */
const recordPaidOrder = async (shop: string, payload: OrdersPaidPayload) => {
  const stores = await Store.find(Environment.SERVER, {
    where: eq(schema.store.domain, `https://${shop}`),
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
  const stores = await Store.find(Environment.SERVER, {
    where: eq(schema.store.domain, `https://${shop}`),
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
    _context,
    {
      shop,
      topic,
      signature,
      body,
    }: { shop: string; topic: string; signature: string; body: string },
  ) => {
    const secret = process.env.SHOPIFY_API_SECRET;

    if (!secret)
      return {
        success: false as const,
        error: new Error("Shopify integration not configured"),
      };

    // Runs against the raw body, before anything parses it — the signature
    // covers the exact bytes Shopify sent.
    if (!verifyWebhookHmac(body, signature, secret))
      return {
        success: false as const,
        error: new UnauthenticatedError("Invalid HMAC signature"),
      };

    const payload = resultify(() => JSON.parse(body) as unknown);

    if (!payload.success)
      return {
        success: false as const,
        error: new ValidationError("Malformed webhook body", {
          statusCode: 400,
        }),
      };

    switch (topic) {
      case "customers/data_request": {
        const customer = payload.data as CustomerPayload;

        return {
          success: true as const,
          data: {
            shop,
            customer: customer.customer.id,
            data_stored: [],
            message:
              "ecentic does not collect or store any customer personal data. Only product catalog information is accessed via the Shopify Admin API.",
          },
        };
      }
      case "customers/redact":
        return {
          success: true as const,
          data: {
            shop,
            message: "No customer data stored. Nothing to redact.",
          },
        };
      case "shop/redact":
        return await redactShop(shop);
      case "orders/paid":
        return await recordPaidOrder(shop, payload.data as OrdersPaidPayload);
      default:
        return {
          success: false as const,
          error: new ValidationError(`Unknown topic: ${topic}`, {
            statusCode: 400,
          }),
        };
    }
  },
  "ShopifyWebhook.handle",
);
