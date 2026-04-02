"use server";

import crypto from "node:crypto";
import { resultify } from "@zenncore/utils";
import { type TransactionScope, withTransaction } from "../../database";
import { withAuthentication } from "../../utils/authentication";
import { withContext } from "../../utils/context";
import { Environment } from "../../utils/environment";
import * as HTTP from "../../utils/http";
import {
  normalizeHostname,
  resolveTrackerPublicOrigin,
} from "../../utils/tracking";
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

const storefrontHostsFromShop = (record: {
  domain: string;
  myshopify_domain: string;
}) => {
  const hosts = new Set<string>();
  hosts.add(normalizeHostname(record.domain));
  hosts.add(normalizeHostname(record.myshopify_domain));
  return [...hosts];
};

const fetchShopCurrency = async (
  domain: string,
  accessToken: string,
): Promise<string | null> => {
  const response = await HTTP.request(
    `${domain}/admin/api/${API_VERSION}/shop.json`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    },
  );

  if (!response.success) return null;

  const parsed = await HTTP.parse<{ shop: { currency: string } }>(response);
  if (!parsed.success) return null;

  return parsed.data.shop.currency;
};

/**
 * Imports products from Shopify Admin API. Used by OAuth callback (no session
 * wrapper) and by {@link syncProducts} (authenticated).
 *
 * Accepts an optional `currency` (ISO 4217) and `tx` (transaction scope).
 * When `currency` is omitted the shop's configured currency is fetched from
 * the Shopify Admin API.
 */
export const syncShopifyCatalog = withContext(
  async (
    context,
    {
      user: userId,
      store: storeId,
      currency: override,
      tx,
    }: {
      user: string;
      store: string;
      currency?: string;
      tx?: TransactionScope;
    },
  ) => {
    const options = tx ? { tx } : undefined;

    const store = await Store.get(Environment.SERVER, storeId, options);
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

    const currency =
      override ?? (await fetchShopCurrency(domain, accessToken)) ?? null;

    const update = await Store.update(
      Environment.SERVER,
      storeId,
      { status: "syncing" },
      options,
    );

    if (!update.success) return update;

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

        return Product.create(
          Environment.SERVER,
          {
            storeId,
            userId,
            externalId: item.id.toString(),
            title: item.title,
            description: item.body_html,
            price: variant?.price ?? null,
            compareAtPrice: variant?.compare_at_price ?? null,
            currency,
            images: JSON.stringify(item.images.map((image) => image.src)),
            url: `${domain}/products/${item.handle}`,
            sku: variant?.sku ?? null,
            status: item.status === "active" ? "active" : "draft",
            rawData: JSON.stringify(item),
            syncedAt: new Date(),
          },
          options,
        );
      }),
    );

    const imported = results.filter((result) => result.success).length;

    context.span.addBreadcrumb({
      category: "shopify.catalog.sync",
      data: {
        "store.id": storeId,
        "products.fetched": all.length,
        "products.imported": imported,
      },
    });

    const insertion = await Store.update(
      Environment.SERVER,
      storeId,
      { status: "connected", lastSyncedAt: new Date() },
      options,
    );

    if (!insertion.success) return insertion;

    return { success: true, data: imported };
  },
);

export const syncProducts = withAuthentication(
  async (context, { storeId }: { storeId: string }) => {
    return syncShopifyCatalog(Environment.SERVER, {
      user: context.session.user.id,
      store: storeId,
    });
  },
  "Shopify.syncProducts",
);

export const handleOAuthCallback = withContext(
  async (
    context,
    {
      code,
      shop,
      userId,
    }: {
      code: string;
      shop: string;
      userId: string;
    },
  ) => {
    const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET } = process.env;

    if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
      return {
        success: false,
        error: new Error("Shopify integration not configured"),
      };
    }

    const token = await HTTP.request(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: SHOPIFY_API_KEY,
          client_secret: SHOPIFY_API_SECRET,
          code,
        }),
      },
    );

    if (!token.success) {
      return { success: false, error: token.error };
    }

    const t = await HTTP.parse<{ access_token: string }>(token);

    if (!t.success) {
      return { success: false, error: t.error };
    }

    const accessToken = t.data.access_token;

    context.span.addBreadcrumb({
      category: "shopify.oauth.exchange",
      data: { shop },
    });

    const shopResponse = await HTTP.request(
      `https://${shop}/admin/api/${API_VERSION}/shop.json`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
      },
    );

    const shopParsed = await HTTP.parse<{
      shop: { domain: string; myshopify_domain: string; currency: string };
    }>(shopResponse);

    const storefrontHosts = (() => {
      if (!shopParsed.success) return [normalizeHostname(`https://${shop}`)];
      return storefrontHostsFromShop(shopParsed.data.shop);
    })();

    const _currency = shopParsed.success
      ? shopParsed.data.shop.currency
      : undefined;

    const trackerApiKey = crypto.randomUUID();

    const transaction = await resultify(() =>
      withTransaction(async (tx) => {
        const creation = await Store.create(
          Environment.SERVER,
          {
            userId,
            platform: "shopify",
            name: shop.replace(".myshopify.com", ""),
            domain: `https://${shop}`,
            accessToken,
            trackerApiKey,
            storefrontHosts,
            status: "connected",
          },
          { tx },
        );

        if (!creation.success) throw creation.error;
        if (!creation.data)
          throw new Error("Store creation returned no data");

        await syncShopifyCatalog(Environment.SERVER, {
          user: userId,
          store: creation.data.id,
          tx,
        });

        return storeResult.data;
      }),
    );

    if (!transaction.success) {
      return { success: false, error: transaction.error };
    }

    context.span.addBreadcrumb({
      category: "shopify.store.created",
      data: { "store.id": transaction.data.id, shop },
    });

    const storeData = transaction.data;

    const origin = resolveTrackerPublicOrigin();

    const probe =
      process.env.ECENTIC_TRACKER_PROBE === "true" ? "&probe=1" : "";

    const src = `${origin}/tracker.js?sid=${encodeURIComponent(
      storeData.id,
    )}&k=${encodeURIComponent(trackerApiKey)}${probe}`;

    await HTTP.request(
      `https://${shop}/admin/api/${API_VERSION}/script_tags.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          script_tag: {
            event: "onload",
            src,
            display_scope: "all",
          },
        }),
      },
    );

    context.span.addBreadcrumb({
      category: "shopify.script_tag.installed",
      data: { "store.id": storeData.id, shop },
    });

    return { success: true, data: { storeId: storeData.id } };
  },
  "Shopify.handleOAuthCallback",
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
