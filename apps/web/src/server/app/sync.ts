"use server";

import type { Result } from "@zenncore/utils";
import { withAuthentication } from "../utils/authentication";
import { Environment } from "../utils/environment";
import * as Feed from "./integration/feed";
import * as Shopify from "./integration/shopify";
import * as WooCommerce from "./integration/woocommerce";
import * as Store from "./store";

export const syncStore = withAuthentication(
  async (
    _context,
    { storeId }: { storeId: string },
  ): Promise<Result<number, Error>> => {
    const store = await Store.get(Environment.SERVER, storeId);
    if (!store.success) return store;
    if (!store.data)
      return { success: false, error: new Error("Store not found") };

    switch (store.data.platform) {
      case "shopify":
        return Shopify.syncProducts({ storeId });
      case "woocommerce":
        return WooCommerce.syncProducts({ storeId });
      case "feed":
        return Feed.syncProducts({ storeId });
      default:
        return {
          success: false,
          error: new Error(`Unknown platform: ${store.data.platform}`),
        };
    }
  },
  "Sync.syncStore",
);
