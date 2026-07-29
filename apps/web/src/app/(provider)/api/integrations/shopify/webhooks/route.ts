import type { NextRequest } from "next/server";
import * as ShopifyWebhook from "@/server/app/integration/shopify-webhook";
import { Environment } from "@/server/utils/environment";
import { respond } from "@/server/utils/http";

const TOPIC_HEADER = "x-shopify-topic";
const HMAC_HEADER = "x-shopify-hmac-sha256";
const SHOP_HEADER = "x-shopify-shop-domain";

export const POST = async (request: NextRequest) => {
  const signature = request.headers.get(HMAC_HEADER);
  const topic = request.headers.get(TOPIC_HEADER);
  const shop = request.headers.get(SHOP_HEADER);

  if (!signature || !topic || !shop)
    return Response.json({ error: "Missing webhook headers" }, { status: 400 });

  const result = await ShopifyWebhook.handle(Environment.SERVER, {
    shop,
    topic,
    signature,
    // Raw text, not `.json()`: the HMAC covers the bytes as sent, so the
    // payload can only be parsed after the signature has been checked.
    body: await request.text(),
  });

  // Success bodies go back unwrapped — the GDPR topics answer with a message a
  // merchant reads during a data request, and that is the response Shopify's
  // app review looks at. Errors still take the shared status mapping.
  return result.success ? Response.json(result.data) : respond(result);
};
