import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse as Response } from "next/server";
import { schema } from "@/server/database";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { unwrapResult } from "@zenncore/utils";

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
      "écentic does not collect or store any customer personal data. Only product catalog information is accessed via the Shopify Admin API.",
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
    default:
      return Response.json(
        { error: `Unknown topic: ${topic}` },
        { status: 400 },
      );
  }
};
