"use server";

import type { Result } from "@zenncore/utils";
import { withAuthentication } from "../../utils/authentication";
import { Environment } from "../../utils/environment";
import { RequestError } from "../../utils/error";
import * as Product from "../product";
import * as Store from "../store";

type CsvProduct = {
  title: string;
  description?: string;
  price?: string;
  image?: string;
  url?: string;
  sku?: string;
  id?: string;
};

export const connect = withAuthentication(
  async (
    context,
    { products, filename }: { products: CsvProduct[]; filename: string },
  ): Promise<Result<Store.Type, RequestError | Error>> => {
    if (products.length === 0)
      return {
        success: false,
        error: new RequestError("No products found in the CSV file."),
      };

    const storeName = filename.replace(/\.csv$/i, "") || "csv-import";

    const store = await Store.create(Environment.SERVER, {
      userId: context.session.user.id,
      platform: "csv",
      name: storeName,
      domain: storeName,
      feedUrl: null,
      status: "connected",
    });

    if (!store.success) return store;

    return store;
  },
  "Csv.connect",
);

export const syncProducts = withAuthentication(
  async (
    context,
    { storeId, products }: { storeId: string; products: CsvProduct[] },
  ) => {
    await Store.update(Environment.SERVER, storeId, { status: "syncing" });

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
  "Csv.syncProducts",
);
