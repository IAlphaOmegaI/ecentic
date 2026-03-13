"use server";

import { eq } from "drizzle-orm";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { Environment } from "../utils/environment";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";
import * as Feed from "./integration/feed";
import * as Shopify from "./integration/shopify";
import * as WooCommerce from "./integration/woocommerce";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.store);

export type Type = Document<typeof schema.store>;

export const getForCurrentUser = withAuthentication(async (context) => {
  return find(Environment.SERVER, {
    where: eq(schema.store.userId, context.session.user.id),
  });
}, "Store.getForCurrentUser");

export const syncProducts = withAuthentication(
  async (_, { storeId }: { storeId: string }) => {
    const store = await get(Environment.SERVER, storeId);
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
  "Store.syncProducts",
);
