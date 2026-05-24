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
import * as Product from "./product";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.store);

export type Type = Document<typeof schema.store>;

export const getForCurrentUser = withAuthentication(async (context) => {
  return find(Environment.SERVER, {
    where: eq(schema.store.userId, context.session.user.id),
  });
}, "Store.getForCurrentUser");

export const syncProducts = withAuthentication(
  async (_, { store: id }: { store: string }) => {
    const store = await get(Environment.SERVER, id);
    if (!store.success) return store;

    if (!store.data)
      return { success: false, error: new Error("Store not found") };

    switch (store.data.platform) {
      case "shopify":
        return Shopify.syncProducts({ store: id });
      case "shopify-public":
        return Shopify.syncPublicProducts({ store: id });
      case "woocommerce":
        return WooCommerce.syncProducts({ store: id });
      case "feed":
        return Feed.syncProducts({ store: id });
      default:
        return {
          success: false,
          error: new Error(`Unknown platform: ${store.data.platform}`),
        };
    }
  },
  "Store.syncProducts",
);

export const publishProductListing = withAuthentication(
  async (
    context,
    {
      product: id,
      data,
    }: {
      product: string;
      data: {
        title?: string;
        body_html?: string;
      };
    },
  ) => {
    const product = await Product.get(Environment.SERVER, id);
    if (!product.success) return product;

    if (!product.data)
      return { success: false, error: new Error("Product not found") };

    if (product.data.userId !== context.session.user.id)
      return { success: false, error: new Error("Not authorized") };

    const store = await get(Environment.SERVER, product.data.storeId);
    if (!store.success) return store;

    if (!store.data)
      return { success: false, error: new Error("Store not found") };

    if (store.data.userId !== context.session.user.id)
      return { success: false, error: new Error("Not authorized") };

    switch (store.data.platform) {
      case "shopify":
        return Shopify.updateProduct({ product: id, data });
      case "woocommerce":
        return WooCommerce.updateProduct({ product: id, data });
      default:
        return {
          success: false,
          error: new Error(
            `Listing publish is not supported for platform: ${store.data.platform}`,
          ),
        };
    }
  },
  "Store.publishProductListing",
);
