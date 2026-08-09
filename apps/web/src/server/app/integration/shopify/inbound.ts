import * as Sentry from "@sentry/nextjs";
import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { schema } from "@/server/database";
import { withContext } from "@/server/utils/context";
import { Environment } from "@/server/utils/environment";
import { InvalidSignatureError, ValidationError } from "@/server/utils/error";
import * as Attribution from "../../billing/attribution";
import * as Store from "../../store";
import { verifyWebhookHmac } from "./hmac";

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
  "ShopifyInbound.handle",
);
