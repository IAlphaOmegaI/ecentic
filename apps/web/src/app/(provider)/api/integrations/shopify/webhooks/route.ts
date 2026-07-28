import crypto from "node:crypto";
import { unwrapResult } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse as Response } from "next/server";
import * as Attribution from "@/server/app/billing/attribution";
import * as Store from "@/server/app/store";
import { schema } from "@/server/database";
import { Environment } from "@/server/utils/environment";

const TOPIC_HEADER = "x-shopify-topic";
const HMAC_HEADER = "x-shopify-hmac-sha256";
const SHOP_HEADER = "x-shopify-shop-domain";

const verifyWebhookHmac = (body: string, hmac: string, secret: string) => {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(digest, "base64"),
    Buffer.from(hmac, "base64"),
  );
};

const handleCustomersDataRequest = (
  shop: string,
  payload: {
    shop_domain: string;
    customer: { id: number; email: string };
    orders_requested: number[];
  },
) =>
  Response.json({
    shop,
    customer: payload.customer.id,
    data_stored: [],
    message:
      "ecentic does not collect or store any customer personal data. Only product catalog information is accessed via the Shopify Admin API.",
  });

const handleCustomersRedact = (
  shop: string,
  _payload: {
    shop_domain: string;
    customer: { id: number; email: string };
    orders_to_redact: number[];
  },
) =>
  Response.json({
    shop,
    message: "No customer data stored. Nothing to redact.",
  });

/**
 * `orders/paid` → performance-fee attribution. Maps the shop to its ecentic
 * store, converts the order total to cents, flattens `note_attributes` (where
 * the storefront tracker stamps `_ecentic_ai_ref`), and records an attributed
 * conversion when a signal is present. Idempotent downstream on (store, order).
 */
const handleOrdersPaid = async (
  shop: string,
  payload: {
    id: number;
    current_total_price?: string;
    total_price?: string;
    currency?: string;
    note_attributes?: { name: string; value: string }[];
  },
) => {
  const stores = await unwrapResult(
    Store.find(Environment.SERVER, {
      where: eq(schema.store.domain, `https://${shop}`),
      limit: 1,
    }),
  );

  const store = stores[0];
  if (!store) return Response.json({ shop, message: "No matching store." });

  const amount = payload.current_total_price ?? payload.total_price ?? "0";
  const orderValueCents = Math.round(Number.parseFloat(amount) * 100);

  const noteAttributes = (payload.note_attributes ?? []).reduce<
    Record<string, string>
  >((accumulator, entry) => {
    accumulator[entry.name] = entry.value;
    return accumulator;
  }, {});

  await Attribution.recordOrderIfAttributed(Environment.SERVER, {
    store: store.id,
    user: store.userId,
    orderExternalId: String(payload.id),
    orderValueCents,
    currency: payload.currency ?? "USD",
    noteAttributes,
  });

  return Response.json({ shop, message: "Order processed." });
};

const handleShopRedact = async (
  shop: string,
  _payload: { shop_domain: string },
) => {
  const domain = `https://${shop}`;

  const stores = await unwrapResult(
    Store.find(Environment.SERVER, {
      where: eq(schema.store.domain, domain),
    }),
  );

  await Promise.all(
    stores.map((record) => Store.destroy(Environment.SERVER, record.id)),
  );

  return Response.json({
    shop,
    message: `Deleted ${stores.length} store(s) and all associated data.`,
  });
};

export const POST = async (request: NextRequest) => {
  const secret = process.env.SHOPIFY_API_SECRET;

  if (!secret)
    return Response.json(
      { error: "Shopify integration not configured" },
      { status: 500 },
    );

  const hmac = request.headers.get(HMAC_HEADER);
  const topic = request.headers.get(TOPIC_HEADER);
  const shop = request.headers.get(SHOP_HEADER);

  if (!hmac || !topic || !shop)
    return Response.json({ error: "Missing webhook headers" }, { status: 400 });

  const body = await request.text();

  if (!verifyWebhookHmac(body, hmac, secret))
    return Response.json({ error: "Invalid HMAC signature" }, { status: 401 });

  const payload = JSON.parse(body);

  switch (topic) {
    case "customers/data_request":
      return handleCustomersDataRequest(shop, payload);
    case "customers/redact":
      return handleCustomersRedact(shop, payload);
    case "shop/redact":
      return handleShopRedact(shop, payload);
    case "orders/paid":
      return handleOrdersPaid(shop, payload);
    default:
      return Response.json(
        { error: `Unknown topic: ${topic}` },
        { status: 400 },
      );
  }
};
