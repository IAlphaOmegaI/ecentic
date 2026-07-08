"use server";

import { type Result, resultify } from "@zenncore/utils";
import { withAuthentication } from "../../utils/authentication";
import { withContext } from "../../utils/context";
import { Environment } from "../../utils/environment";
import { NotFoundError, RequestError } from "../../utils/error";
import * as HTTP from "../../utils/http";
import { detect, Parser } from "../parsers/feed";
import * as Product from "../product";
import * as Store from "../store";

const FEED_BYTE_LIMIT = 10 * 1024 * 1024;

export const connect = withAuthentication(
  async (
    context,
    { feedUrl }: { feedUrl: string },
  ): Promise<Result<Store.Type, RequestError | Error>> => {
    return connectForUser(Environment.SERVER, {
      user: context.session.user.id,
      feedUrl,
    });
  },
  "Feed.connect",
);

export const connectForUser = withContext(
  async (
    _,
    { user, feedUrl }: { user: string; feedUrl: string },
  ): Promise<Result<Store.Type, RequestError | Error>> => {
    const response = await HTTP.request(feedUrl, { method: "GET" });

    if (!response.success)
      return {
        success: false,
        error: new RequestError(
          "Could not reach the feed URL. Check the URL and try again.",
        ),
      };

    if (!response.data.ok)
      return {
        success: false,
        error: new RequestError(`Feed returned status ${response.data.status}`),
      };

    const text = await resultify(() => response.data.text());

    if (!text.success)
      return {
        success: false,
        error: new RequestError("Failed to read feed response"),
      };

    if (text.data.length > FEED_BYTE_LIMIT)
      return {
        success: false,
        error: new RequestError("feed-too-large"),
      };

    const format = detect(text.data);

    const products =
      format === "xml" ? Parser.xml(text.data) : Parser.json(text.data);

    if (products.length === 0)
      return {
        success: false,
        error: new RequestError(
          "No products found in the feed. Check the URL or format.",
        ),
      };

    const hostname = (() => {
      const result = resultify(() => new URL(feedUrl));
      return result.success ? result.data.hostname : "custom-feed";
    })();

    const reconciliation = await Store.reconcileConnection(Environment.SERVER, {
      userId: user,
      domain: feedUrl,
    });
    if (!reconciliation.success) return reconciliation;

    if (reconciliation.data.kind === "claimed")
      return {
        success: false,
        error: new RequestError(
          "This store is already connected to another écentic account.",
        ),
      };

    if (reconciliation.data.kind === "owned") {
      const refreshed = await Store.update(
        Environment.SERVER,
        reconciliation.data.store.id,
        { platform: "feed", name: hostname, feedUrl, status: "connected" },
      );
      if (!refreshed.success) return refreshed;
      return {
        success: true as const,
        data: refreshed.data ?? reconciliation.data.store,
      };
    }

    const store = await Store.create(Environment.SERVER, {
      userId: user,
      platform: "feed",
      name: hostname,
      domain: feedUrl,
      feedUrl,
      status: "connected",
    });

    if (!store.success) return store;

    return store;
  },
  "Feed.connectForUser",
);

export const syncProducts = withAuthentication(
  async (context, { store: id }: { store: string }) => {
    const store = await Store.get(Environment.SERVER, id);
    if (!store.success) return store;

    if (!store.data)
      return { success: false, error: new NotFoundError("Store not found") };

    const { feedUrl } = store.data;

    if (!feedUrl)
      return { success: false, error: new Error("Missing feed URL") };

    await Store.update(Environment.SERVER, id, { status: "syncing" });

    const response = await HTTP.request(feedUrl, { method: "GET" });

    if (!response.success) {
      await Store.update(Environment.SERVER, id, { status: "error" });
      return { success: false, error: response.error };
    }

    const text = await resultify(() => response.data.text());

    if (!text.success) {
      await Store.update(Environment.SERVER, id, { status: "error" });
      return { success: false, error: text.error };
    }

    if (text.data.length > FEED_BYTE_LIMIT) {
      await Store.update(Environment.SERVER, id, { status: "error" });
      return {
        success: false,
        error: new RequestError("feed-too-large"),
      };
    }

    const format = detect(text.data);
    const products =
      format === "xml" ? Parser.xml(text.data) : Parser.json(text.data);

    const results = await Promise.all(
      products.map((item) =>
        Product.sync(Environment.SERVER, {
          storeId: id,
          userId: context.session.user.id,
          externalId: item.id || null,
          title: item.title,
          description: item.description || null,
          price: item.price || null,
          currency: item.currency || "USD",
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

    await Store.update(Environment.SERVER, id, {
      status: "connected",
      lastSyncedAt: new Date(),
    });

    return { success: true, data: imported };
  },
  "Feed.syncProducts",
);
