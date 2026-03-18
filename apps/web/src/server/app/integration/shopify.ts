"use server";

import { withAuthentication } from "../../utils/authentication";
import { Environment } from "../../utils/environment";
import * as HTTP from "../../utils/http";
import * as Product from "../product";
import * as Store from "../store";

type Type = {
  id: number;
  title: string;
  body_html: string;
  handle: string;
  status: string;
  variants: {
    id: number;
    price: string;
    compare_at_price: string | null;
    sku: string;
  }[];
  images: { id: number; src: string }[];
};

const API_VERSION = "2024-10";

export const syncProducts = withAuthentication(
  async (context, { storeId }: { storeId: string }) => {
    const store = await Store.get(Environment.SERVER, storeId);
    if (!store.success) return store;

    if (!store.data)
      return { success: false, error: new Error("Store not found") };

    const { domain, accessToken } = store.data;

    if (!accessToken)
      return {
        success: false,
        error: new Error("Missing Shopify access token"),
      };

    await Store.update(Environment.SERVER, storeId, { status: "syncing" });

    const all: Type[] = [];

    const limit = 250;
    const maximum = 10;

    let url: string | null =
      `${domain}/admin/api/${API_VERSION}/products.json?limit=${limit}`;

    for (const _ of Array.from({ length: maximum })) {
      if (!url) break;

      const response = await HTTP.request(url, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.success) break;

      const parsed = await HTTP.parse<{
        products: Type[];
      }>(response);

      if (!parsed.success) break;

      all.push(...parsed.data.products);

      url = (() => {
        const link = response.data.headers.get("Link") ?? "";
        const next = link.match(/<([^>]+)>;\s*rel="next"/);
        return next?.[1] ?? null;
      })();
    }

    const results = await Promise.all(
      all.map((item) => {
        const variant = item.variants[0];

        return Product.create(Environment.SERVER, {
          storeId,
          userId: context.session.user.id,
          externalId: item.id.toString(),
          title: item.title,
          description: item.body_html,
          price: variant?.price ?? null,
          compareAtPrice: variant?.compare_at_price ?? null,
          currency: "USD",
          images: JSON.stringify(item.images.map((image) => image.src)),
          url: `${domain}/products/${item.handle}`,
          sku: variant?.sku || null,
          status: item.status === "active" ? "active" : "draft",
          rawData: JSON.stringify(item),
          syncedAt: new Date(),
        });
      }),
    );

    const imported = results.filter((result) => result.success).length;

    await Store.update(Environment.SERVER, storeId, {
      status: "connected",
      lastSyncedAt: new Date(),
    });

    return { success: true, data: imported };
  },
  "Shopify.syncProducts",
);

export const updateProduct = withAuthentication(
  async (
    _context,
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

    const store = await Store.get(Environment.SERVER, product.data.storeId);
    if (!store.success) return store;

    if (!store.data)
      return { success: false, error: new Error("Store not found") };

    if (store.data.platform !== "shopify")
      return {
        success: false,
        error: new Error("Store is not a Shopify store"),
      };

    const { domain, accessToken } = store.data;

    if (!accessToken)
      return {
        success: false,
        error: new Error("Missing Shopify access token"),
      };

    if (!product.data.externalId)
      return { success: false, error: new Error("Product has no external ID") };

    const url = `${domain}/admin/api/${API_VERSION}/products/${product.data.externalId}.json`;

    const response = await HTTP.request(url, {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ product: data }),
    });

    if (!response.success) return response;

    const parsed = await HTTP.parse<{ product: Type }>(response);
    if (!parsed.success) return parsed;

    const updated = parsed.data.product;

    await Product.update(Environment.SERVER, id, {
      title: updated.title,
      description: updated.body_html,
      rawData: JSON.stringify(updated),
      syncedAt: new Date(),
    });

    return { success: true, data: updated };
  },
  "Shopify.updateProduct",
);
