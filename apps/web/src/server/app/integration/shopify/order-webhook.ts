import { resultify, unwrapResult } from "@zenncore/utils";
import { z } from "zod";
import * as HTTP from "@/server/utils/http";

/** Only called after Shopify has verified the shop and the OAuth grant. */
export const ensurePaidOrderWebhook = ({
  shop,
  version,
  accessToken,
  origin,
}: {
  shop: string;
  version: string;
  accessToken: string;
  origin: string;
}) =>
  resultify(async () => {
    const endpoint = `https://${shop}/admin/api/${version}/webhooks.json`;
    const address = `${origin}/api/integrations/shopify/webhooks`;
    const headers = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    };
    const exists = async () => {
      const response = await unwrapResult(
        HTTP.request(`${endpoint}?topic=orders%2Fpaid&limit=250`, { headers }),
      );
      if (!response.ok)
        throw new Error(
          "Could not verify Shopify order notifications. Reconnect Shopify to retry.",
        );
      const payload = z
        .object({
          webhooks: z.array(
            z.object({ topic: z.string(), address: z.string() }),
          ),
        })
        .parse(await unwrapResult(HTTP.parse(response)));
      return payload.webhooks.some(
        (hook) => hook.topic === "orders/paid" && hook.address === address,
      );
    };
    if (await exists()) return { registered: true };
    const response = await unwrapResult(
      HTTP.request(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          webhook: { topic: "orders/paid", address, format: "json" },
        }),
      }),
    );
    // A concurrent reconnect may already have registered the same topic/address.
    if (!response.ok && !(response.status === 422 && (await exists())))
      throw new Error(
        "Could not register Shopify order notifications. Reconnect Shopify to retry.",
      );
    return { registered: true };
  });
