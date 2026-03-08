"use server";

import { type Result, resultify } from "@zenncore/utils";
import { XMLParser } from "fast-xml-parser";
import { withAuthentication } from "../../utils/authentication";
import { Environment } from "../../utils/environment";
import { RequestError } from "../../utils/error";
import { request } from "../../utils/http";
import * as Product from "../product";
import * as Store from "../store";

type FeedProduct = {
  title: string;
  description?: string;
  price?: string;
  image?: string;
  url?: string;
  sku?: string;
  id?: string;
};

const parseXml = (text: string): FeedProduct[] => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
  });

  const parsed = parser.parse(text);

  const channel = parsed?.rss?.channel ?? parsed?.feed ?? parsed;
  const raw: unknown[] = (() => {
    if (Array.isArray(channel?.item)) return channel.item;
    if (channel?.item) return [channel.item];
    if (Array.isArray(channel?.entry)) return channel.entry;
    if (channel?.entry) return [channel.entry];
    return [];
  })();

  return raw.map((item: Record<string, unknown>) => ({
    title: String(item.title ?? item["g:title"] ?? "Untitled"),
    description: String(item.description ?? item["g:description"] ?? ""),
    price: String(item.price ?? item["g:price"] ?? ""),
    image: String(
      item.image_link ?? item["g:image_link"] ?? item.image ?? "",
    ),
    url: String(item.link ?? item["g:link"] ?? ""),
    sku: String(item.id ?? item["g:id"] ?? item.sku ?? ""),
    id: String(item.id ?? item["g:id"] ?? ""),
  })) as FeedProduct[];
};

const parseJson = (text: string): FeedProduct[] => {
  const result = resultify(() => JSON.parse(text));
  if (!result.success) return [];

  const data = Array.isArray(result.data) ? result.data : result.data?.products ?? result.data?.items ?? [];
  if (!Array.isArray(data)) return [];

  return data.map((item: Record<string, unknown>) => ({
    title: String(item.title ?? item.name ?? "Untitled"),
    description: String(item.description ?? ""),
    price: String(item.price ?? ""),
    image: String(item.image ?? item.image_url ?? item.imageUrl ?? ""),
    url: String(item.url ?? item.link ?? ""),
    sku: String(item.sku ?? item.id ?? ""),
    id: String(item.id ?? ""),
  }));
};

const detect = (text: string): "xml" | "json" => {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<")) return "xml";
  return "json";
};

export const connect = withAuthentication(
  async (
    context,
    { feedUrl }: { feedUrl: string },
  ): Promise<Result<Store.Type, RequestError | Error>> => {
    const response = await request(feedUrl, { method: "GET" });

    if (!response.success)
      return {
        success: false,
        error: new RequestError("Could not reach the feed URL. Check the URL and try again."),
      };

    if (!response.data.ok)
      return {
        success: false,
        error: new RequestError(`Feed returned status ${response.data.status}`),
      };

    const text = await resultify(() => response.data.text());
    if (!text.success)
      return { success: false, error: new RequestError("Failed to read feed response") };

    const format = detect(text.data);
    const products = format === "xml" ? parseXml(text.data) : parseJson(text.data);

    if (products.length === 0)
      return {
        success: false,
        error: new RequestError("No products found in the feed. Check the URL or format."),
      };

    const hostname = (() => {
      const result = resultify(() => new URL(feedUrl));
      return result.success ? result.data.hostname : "custom-feed";
    })();

    const store = await Store.create(Environment.SERVER, {
      userId: context.session.user.id,
      platform: "feed",
      name: hostname,
      domain: feedUrl,
      feedUrl,
      status: "connected",
    });

    if (!store.success) return store;

    return store;
  },
  "Feed.connect",
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

    const { feedUrl } = store.data;
    if (!feedUrl)
      return { success: false, error: new Error("Missing feed URL") };

    await Store.update(Environment.SERVER, storeId, { status: "syncing" });

    const response = await request(feedUrl, { method: "GET" });
    if (!response.success) {
      await Store.update(Environment.SERVER, storeId, { status: "error" });
      return { success: false, error: response.error };
    }

    const text = await resultify(() => response.data.text());
    if (!text.success) {
      await Store.update(Environment.SERVER, storeId, { status: "error" });
      return { success: false, error: text.error };
    }

    const format = detect(text.data);
    const products = format === "xml" ? parseXml(text.data) : parseJson(text.data);

    const results = await Promise.all(
      products.map((item) =>
        Product.create(Environment.SERVER, {
          storeId,
          userId: context.session.user.id,
          externalId: item.id || null,
          title: item.title,
          description: item.description || null,
          price: item.price || null,
          currency: "USD",
          images: item.image ? JSON.stringify([item.image]) : "[]",
          url: item.url || null,
          sku: item.sku || null,
          status: "active",
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
  "Feed.syncProducts",
);
