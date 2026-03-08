"use server";

import type { Result } from "@zenncore/utils";
import { withAuthentication } from "../../utils/authentication";
import { Environment } from "../../utils/environment";
import { RequestError } from "../../utils/error";
import { parse, request } from "../../utils/http";
import * as Product from "../product";
import * as Store from "../store";

type WooCommerceProduct = {
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

const credentials = (key: string, secret: string) =>
  `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;

const normalize = (url: string) => {
  const trimmed = url.replace(/\/+$/, "");
  if (trimmed.startsWith("http")) return trimmed;
  return `https://${trimmed}`;
};

export const connect = withAuthentication(
  async (
    context,
    {
      domain,
      consumerKey,
      consumerSecret,
    }: { domain: string; consumerKey: string; consumerSecret: string },
  ): Promise<Result<Store.Type, RequestError | Error>> => {
    const base = normalize(domain);

    const probe = await request(
      `${base}/wp-json/wc/v3/products?per_page=1`,
      {
        method: "GET",
        headers: {
          Authorization: credentials(consumerKey, consumerSecret),
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

    const store = await Store.create(Environment.SERVER, {
      userId: context.session.user.id,
      platform: "woocommerce",
      name: new URL(base).hostname,
      domain: base,
      consumerKey,
      consumerSecret,
      status: "connected",
    });

    if (!store.success) return store;

    return store;
  },
  "WooCommerce.connect",
);

export const syncProducts = withAuthentication(
  async (
    context,
    { storeId }: { storeId: string },
  ): Promise<Result<number, Error>> => {
    const store = await Store.get(Environment.SERVER, storeId);
    if (!store.success) return store;
    if (!store.data)
      return { success: false, error: new Error("Store not found") };

    const { domain, consumerKey, consumerSecret } = store.data;
    if (!consumerKey || !consumerSecret)
      return { success: false, error: new Error("Missing WooCommerce credentials") };

    await Store.update(Environment.SERVER, storeId, { status: "syncing" });

    const all: WooCommerceProduct[] = [];
    const pageSize = 100;
    const maxPages = 20;

    for (const page of Array.from({ length: maxPages }, (_, i) => i + 1)) {
      const response = await request(
        `${domain}/wp-json/wc/v3/products?per_page=${pageSize}&page=${page}`,
        {
          method: "GET",
          headers: {
            Authorization: credentials(consumerKey, consumerSecret),
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.success) break;

      const parsed = await parse<WooCommerceProduct[]>(response);
      if (!parsed.success) break;

      all.push(...parsed.data);

      const totalPages = Number(response.data.headers.get("X-WP-TotalPages") ?? "1");
      if (page >= totalPages) break;
    }

    const results = await Promise.all(
      all.map((item) =>
        Product.create(Environment.SERVER, {
          storeId,
          userId: context.session.user.id,
          externalId: String(item.id),
          title: item.name,
          description: item.short_description || item.description,
          price: item.price,
          compareAtPrice: item.regular_price !== item.price ? item.regular_price : null,
          currency: "USD",
          images: JSON.stringify(item.images.map((image) => image.src)),
          url: item.permalink,
          sku: item.sku || null,
          status: item.status === "publish" ? "active" : "draft",
          rawData: JSON.stringify(item),
          syncedAt: new Date(),
        }),
      ),
    );

    const imported = results.filter((result) => result.success).length;

    await Store.update(Environment.SERVER, storeId, {
      status: "connected",
      lastSyncedAt: new Date(),
    });

    return { success: true, data: imported };
  },
  "WooCommerce.syncProducts",
);
