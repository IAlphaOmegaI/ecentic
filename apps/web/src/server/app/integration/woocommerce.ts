"use server";

import { resultify } from "@zenncore/utils";
import { type TransactionScope, withTransaction } from "../../database";
import { withAuthentication } from "../../utils/authentication";
import { withContext } from "../../utils/context";
import { Environment } from "../../utils/environment";
import { NotFoundError, RequestError } from "../../utils/error";
import * as HTTP from "../../utils/http";
import * as Product from "../product";
import * as Store from "../store";

type Type = {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  status: string;
  images: { id: number; src: string; alt: string }[];
};

const Utils = {
  credentials: (key: string, secret: string) =>
    `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
  normalize: (url: string) => {
    const trimmed = url.replace(/\/+$/, "");
    if (trimmed.startsWith("http")) return trimmed;
    return `https://${trimmed}`;
  },
};

/**
 * Imports products from the WooCommerce REST API. Used by {@link connect}
 * (inside a transaction) and by {@link syncProducts} (authenticated).
 */
export const syncWooCommerceCatalog = withContext(
  async (
    context,
    {
      user: userId,
      store: storeId,
      tx,
    }: {
      user: string;
      store: string;
      tx?: TransactionScope;
    },
  ) => {
    const store = await Store.get(Environment.SERVER, storeId, { tx });
    if (!store.success) return store;

    if (!store.data)
      return { success: false, error: new NotFoundError("Store not found") };

    if (store.data.platform !== "woocommerce")
      return {
        success: false,
        error: new Error("Store is not a WooCommerce store"),
      };

    const { domain, consumerKey, consumerSecret } = store.data;

    if (!consumerKey || !consumerSecret)
      return {
        success: false,
        error: new Error("Missing WooCommerce credentials"),
      };

    const update = await Store.update(
      Environment.SERVER,
      storeId,
      { status: "syncing" },
      { tx },
    );

    if (!update.success) return update;

    const all: Type[] = [];

    const limit = 100;
    const maximum = 20;

    for (const page of Array.from({ length: maximum }, (_, i) => i + 1)) {
      const response = await HTTP.request(
        `${domain}/wp-json/wc/v3/products?per_page=${limit}&page=${page}`,
        {
          method: "GET",
          headers: {
            Authorization: Utils.credentials(consumerKey, consumerSecret),
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.success) break;

      const parsed = await HTTP.parse<Type[]>(response);
      if (!parsed.success) break;

      all.push(...parsed.data);

      const totalPages = Number(
        response.data.headers.get("X-WP-TotalPages") ?? "1",
      );

      if (page >= totalPages) break;
    }

    const results = await Promise.all(
      all.map((item) =>
        Product.create(
          Environment.SERVER,
          {
            storeId,
            userId,
            externalId: item.id.toString(),
            title: item.name,
            description: item.short_description || item.description,
            price: item.price,
            compareAtPrice:
              item.regular_price !== item.price ? item.regular_price : null,
            currency: "USD",
            images: JSON.stringify(item.images.map((image) => image.src)),
            url: item.permalink,
            sku: item.sku || null,
            status: item.status === "publish" ? "active" : "draft",
            rawData: JSON.stringify(item),
            syncedAt: new Date(),
          },
          { tx },
        ),
      ),
    );

    const imported = results.filter((result) => result.success).length;

    context.span.addBreadcrumb({
      category: "woocommerce.catalog.sync",
      data: { "store.id": storeId, "products.fetched": all.length, "products.imported": imported },
    });

    const insertion = await Store.update(
      Environment.SERVER,
      storeId,
      { status: "connected", lastSyncedAt: new Date() },
      { tx },
    );

    if (!insertion.success) return insertion;

    return { success: true, data: imported };
  },
  "WooCommerce.syncWooCommerceCatalog",
);

export const connect = withAuthentication(
  async (
    context,
    {
      domain,
      consumerKey,
      consumerSecret,
    }: { domain: string; consumerKey: string; consumerSecret: string },
  ) => {
    const host = Utils.normalize(domain);

    const probe = await HTTP.request(
      `${host}/wp-json/wc/v3/products?per_page=1`,
      {
        method: "GET",
        headers: {
          Authorization: Utils.credentials(consumerKey, consumerSecret),
          "Content-Type": "application/json",
        },
      },
    );

    if (!probe.success)
      return {
        success: false,
        error: new RequestError(
          "Could not reach the WooCommerce store. Check the URL and try again.",
        ),
      };

    if (!probe.data.ok)
      return {
        success: false,
        error: new RequestError(
          probe.data.status === 401
            ? "Invalid API credentials. Double-check your consumer key and secret."
            : `WooCommerce returned ${probe.data.status}`,
        ),
      };

    context.span.addBreadcrumb({ category: "woocommerce.probe", data: { "store.host": host } });

    const transaction = await resultify(() =>
      withTransaction(async (tx) => {
        const store = await Store.create(
          Environment.SERVER,
          {
            userId: context.session.user.id,
            platform: "woocommerce",
            name: new URL(host).hostname,
            domain: host,
            consumerKey,
            consumerSecret,
            status: "connected",
          },
          { tx },
        );

        if (!store.success) throw store.error;
        if (!store.data) throw new Error("Store creation returned no data");

        const sync = await syncWooCommerceCatalog(Environment.SERVER, {
          user: context.session.user.id,
          store: store.data.id,
          tx,
        });

        if (!sync.success) throw sync.error;

        return store.data;
      }),
    );

    if (transaction.success) {
      context.span.addBreadcrumb({
        category: "woocommerce.connect.complete",
        data: { "store.id": transaction.data.id, "store.host": host },
      });
    }

    return transaction;
  },
  "WooCommerce.connect",
);

export const syncProducts = withAuthentication(
  async (context, { storeId }: { storeId: string }) => {
    return syncWooCommerceCatalog(Environment.SERVER, {
      user: context.session.user.id,
      store: storeId,
    });
  },
  "WooCommerce.syncProducts",
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

    if (store.data.platform !== "woocommerce")
      return {
        success: false,
        error: new Error("Store is not a WooCommerce store"),
      };

    const { domain, consumerKey, consumerSecret } = store.data;

    if (!consumerKey || !consumerSecret)
      return {
        success: false,
        error: new Error("Missing WooCommerce credentials"),
      };

    if (!product.data.externalId)
      return { success: false, error: new Error("Product has no external ID") };

    const body: Record<string, string> = {};
    if (data.title !== undefined) body.name = data.title;
    if (data.body_html !== undefined) body.description = data.body_html;

    if (Object.keys(body).length === 0)
      return {
        success: false,
        error: new RequestError("No fields to update"),
      };

    const url = `${domain}/wp-json/wc/v3/products/${product.data.externalId}.json`;

    const response = await HTTP.request(url, {
      method: "PUT",
      headers: {
        Authorization: Utils.credentials(consumerKey, consumerSecret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.success) return response;

    const parsed = await HTTP.parse<Type>(response);
    if (!parsed.success) return parsed;

    const updated = parsed.data;

    await Product.update(Environment.SERVER, id, {
      title: updated.name,
      description: updated.short_description || updated.description,
      rawData: JSON.stringify(updated),
      syncedAt: new Date(),
    });

    return { success: true, data: updated };
  },
  "WooCommerce.updateProduct",
);
