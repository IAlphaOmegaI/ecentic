"use server";

import type { Result } from "@zenncore/utils";
import { withAuthentication } from "../../utils/authentication";
import { Environment } from "../../utils/environment";
import { NotFoundError, RequestError } from "../../utils/error";
import * as Product from "../product";
import * as Store from "../store";

export type Type = {
  title: string;
  description?: string;
  price?: string;
  currency?: string;
  image?: string;
  url?: string;
  sku?: string;
  id?: string;
};

const parsePrice = (
  raw: string,
): { price: string | null; currency: string | null } => {
  const trimmed = raw.trim();

  const trailingCode = trimmed.match(/^([\d.,]+)\s+([A-Z]{3})$/);
  if (trailingCode)
    return {
      price: trailingCode[1] ?? null,
      currency: trailingCode[2] ?? null,
    };

  const leadingCode = trimmed.match(/^([A-Z]{3})\s+([\d.,]+)$/);
  if (leadingCode)
    return { price: leadingCode[2] ?? null, currency: leadingCode[1] ?? null };

  const numeric = trimmed.replace(/^[^\d]*/, "");
  return { price: numeric || trimmed, currency: null };
};

export const connect = withAuthentication(
  async (
    context,
    { products, filename }: { products: Type[]; filename: string },
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

/**
 * Imports parsed CSV rows into an existing store. The store id no longer comes
 * only from the row `connect` just created — the per-store "Add products"
 * screen passes the store the merchant is looking at — so ownership is verified
 * here rather than trusted from the caller.
 */
export const syncProducts = withAuthentication(
  async (
    context,
    { store: id, products }: { store: string; products: Type[] },
  ) => {
    const target = await Store.get(Environment.SERVER, id);
    if (!target.success) return target;

    if (!target.data || target.data.userId !== context.session.user.id)
      return { success: false, error: new NotFoundError("Store") };

    await Store.update(Environment.SERVER, id, { status: "syncing" });

    const results = await Promise.all(
      products.map((item) => {
        const parsed = item.price
          ? parsePrice(item.price)
          : { price: null, currency: null };
        const currency = item.currency || parsed.currency || "USD";

        return Product.sync(Environment.SERVER, {
          storeId: id,
          userId: context.session.user.id,
          externalId: item.id || null,
          title: item.title,
          description: item.description || null,
          price: parsed.price || null,
          currency,
          images: item.image ? JSON.stringify([item.image]) : "[]",
          url: item.url || null,
          sku: item.sku || null,
          status: "active",
          rawData: JSON.stringify(item),
          syncedAt: new Date(),
        });
      }),
    );

    const imported = results.filter((result) => result.success).length;

    await Store.update(Environment.SERVER, id, {
      status: "connected",
      lastSyncedAt: new Date(),
    });

    return { success: true, data: imported };
  },
  "Csv.syncProducts",
);
