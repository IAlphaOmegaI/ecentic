"use server";

import { resultify } from "@zenncore/utils";
import { type TransactionScope, withTransaction } from "../../database";
import { withAuthentication } from "../../utils/authentication";
import { withContext } from "../../utils/context";
import { Environment } from "../../utils/environment";
import {
  ConflictError,
  NotFoundError,
  RequestError,
  ValidationError,
} from "../../utils/error";
import * as HTTP from "../../utils/http";
import { authorizedRequest, normalizeStoreUrl } from "../../utils/woocommerce";
import * as Product from "../product";
import * as Store from "../store";
import * as StoreAccount from "../store-account";

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
  meta_data?: { id?: number; key: string; value: unknown }[];
};

/**
 * Product meta keys the Ecentic WooCommerce bridge reads to render structured
 * data into the storefront `<head>`. Underscore-prefixed so WooCommerce treats
 * them as internal/hidden meta (mirrors Shopify's `ecentic` metafield namespace).
 */
const STRUCTURED_DATA_META_KEY = "_ecentic_structured_data";
const AGENTIC_SUMMARY_META_KEY = "_ecentic_agentic_summary";

// Compact agent-facing summary written alongside the full JSON-LD, matching the
// `agentic_summary` metafield produced for Shopify.
const buildAgenticSummary = (
  structuredJson: string,
  product: {
    title: string;
    sku: string | null;
    price: string | null;
    currency: string | null;
  },
): string => {
  const name = (() => {
    try {
      const parsed = JSON.parse(structuredJson) as { name?: unknown };
      return typeof parsed.name === "string" ? parsed.name : product.title;
    } catch {
      return product.title;
    }
  })();

  return JSON.stringify({
    name,
    sku: product.sku,
    price: product.price,
    currency: product.currency,
  });
};

const fetchStoreCurrency = async (
  domain: string,
  consumerKey: string,
  consumerSecret: string,
): Promise<string | null> => {
  const response = await authorizedRequest(
    `${domain}/wp-json/wc/v3/data/currencies/current`,
    consumerKey,
    consumerSecret,
    { method: "GET" },
  );

  if (!response.success) return null;

  const parsed = await HTTP.parse<{ code: string }>(response);
  if (!parsed.success) return null;

  return parsed.data.code;
};

/**
 * Resolves the WooCommerce consumer key/secret for a store from its
 * {@link StoreAccount}. During {@link connect} the account row is created inside
 * an uncommitted transaction, so callers pass its id (+ `tx`) to read it back;
 * re-syncs omit both and look it up by store.
 */
const resolveCredentials = async (
  storeId: string,
  options: { storeAccount?: string; tx?: TransactionScope },
): Promise<
  | { success: true; consumerKey: string; consumerSecret: string }
  | { success: false; error: Error }
> => {
  const account = options.storeAccount
    ? await StoreAccount.get(
        Environment.SERVER,
        options.storeAccount,
        options.tx ? { tx: options.tx } : undefined,
      )
    : await StoreAccount.getForStore(Environment.SERVER, { store: storeId });

  if (!account.success) return { success: false, error: account.error };

  const consumerKey = account.data?.consumerKey;
  const consumerSecret = account.data?.consumerSecret;

  if (!consumerKey || !consumerSecret)
    return {
      success: false,
      error: new Error("Missing WooCommerce credentials"),
    };

  return { success: true, consumerKey, consumerSecret };
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
      storeAccount: storeAccountId,
      tx,
    }: {
      user: string;
      store: string;
      storeAccount?: string;
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

    const { domain } = store.data;

    const resolved = await resolveCredentials(storeId, {
      storeAccount: storeAccountId,
      tx,
    });
    if (!resolved.success) return resolved;

    const { consumerKey, consumerSecret } = resolved;

    const currency =
      (await fetchStoreCurrency(domain, consumerKey, consumerSecret)) ?? "USD";

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
      const response = await authorizedRequest(
        `${domain}/wp-json/wc/v3/products?per_page=${limit}&page=${page}`,
        consumerKey,
        consumerSecret,
        { method: "GET" },
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
        Product.sync(
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
            currency,
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
    return connectForUser(Environment.SERVER, {
      user: context.session.user.id,
      domain,
      consumerKey,
      consumerSecret,
    });
  },
  "WooCommerce.connect",
);

export const connectForUser = withContext(
  async (
    context,
    {
      user: id,
      domain,
      consumerKey,
      consumerSecret,
    }: {
      user: string;
      domain: string;
      consumerKey: string;
      consumerSecret: string;
    },
  ) => {
    const host = normalizeStoreUrl(domain);

    const probe = await authorizedRequest(
      `${host}/wp-json/wc/v3/products?per_page=1`,
      consumerKey,
      consumerSecret,
      { method: "GET" },
    );

    if (!probe.success)
      return {
        success: false,
        error: new RequestError(
          "Could not reach the WooCommerce store. Check the URL and try again.",
        ),
      };

    if (!probe.data.ok) {
      console.log(probe.data);
      return {
        success: false,
        error: new RequestError(
          probe.data.status === 401
            ? "Invalid API credentials. Double-check your consumer key and secret."
            : `WooCommerce returned ${probe.data.status}`,
        ),
      };
    }

    context.span.addBreadcrumb({
      category: "woocommerce.probe",
      data: { "store.host": host },
    });

    const reconciliation = await Store.reconcileConnection(Environment.SERVER, {
      userId: id,
      domain: host,
    });
    if (!reconciliation.success) return reconciliation;

    if (reconciliation.data.kind === "claimed")
      return {
        success: false,
        error: new ConflictError(
          "This store is already connected to another écentic account.",
        ),
      };

    const existing =
      reconciliation.data.kind === "owned" ? reconciliation.data.store : null;

    const transaction = await resultify(() =>
      withTransaction(async (tx) => {
        const store = existing
          ? await Store.update(
              Environment.SERVER,
              existing.id,
              {
                platform: "woocommerce",
                name: new URL(host).hostname,
                domain: host,
                status: "connected",
              },
              { tx },
            )
          : await Store.create(
              Environment.SERVER,
              {
                userId: id,
                platform: "woocommerce",
                name: new URL(host).hostname,
                domain: host,
                status: "connected",
              },
              { tx },
            );

        if (!store.success) throw store.error;
        if (!store.data) throw new Error("Store creation returned no data");

        const storeAccount = await StoreAccount.sync(
          Environment.SERVER,
          {
            storeId: store.data.id,
            consumerKey,
            consumerSecret,
            // TODO: also add scope
          },
          { tx },
        );

        if (!storeAccount.success) throw storeAccount.error;
        if (!storeAccount.data)
          throw new Error("Store account creation returned no data");

        const sync = await syncWooCommerceCatalog(Environment.SERVER, {
          user: id,
          store: store.data.id,
          storeAccount: storeAccount.data.id,
          tx,
        });

        if (!sync.success) throw sync.error;

        return store.data;
      }),
    );

    if (!transaction.success) return transaction;

    context.span.addBreadcrumb({
      category: "woocommerce.connect.complete",
      data: { "store.id": transaction.data.id, "store.host": host },
    });

    // `reconnected` marks a credential refresh for a store this user already
    // onboarded. Callers use it to skip the onboarding product picker, which
    // would otherwise let them select past their plan's product limit.
    return {
      success: true as const,
      data: { store: transaction.data, reconnected: Boolean(existing) },
    };
  },
  "WooCommerce.connectForUser",
);

export const syncProducts = withAuthentication(
  async (context, { store: id }: { store: string }) => {
    return syncWooCommerceCatalog(Environment.SERVER, {
      user: context.session.user.id,
      store: id,
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

    const { domain } = store.data;

    const resolved = await resolveCredentials(store.data.id, {});
    if (!resolved.success) return resolved;

    const { consumerKey, consumerSecret } = resolved;

    if (!product.data.externalId)
      return { success: false, error: new Error("Product has no external ID") };

    const body: { name?: string; description?: string } = {};
    if (data.title !== undefined) body.name = data.title;
    if (data.body_html !== undefined) body.description = data.body_html;

    if (Object.keys(body).length === 0)
      return {
        success: false,
        error: new ValidationError("No fields to update"),
      };

    const url = `${domain}/wp-json/wc/v3/products/${product.data.externalId}`;

    const response = await authorizedRequest(url, consumerKey, consumerSecret, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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

/**
 * Writes schema.org Product JSON-LD to a WooCommerce product as protected
 * `meta_data`, so the Ecentic bridge can render it into the storefront for AI
 * shopping agents. Parallels {@link Shopify.pushProductUcpMetafields}.
 */
export const pushProductStructuredData = withContext(
  async (
    context,
    {
      product: id,
      structuredJson,
    }: { product: string; structuredJson: string },
  ) => {
    const product = await Product.get(Environment.SERVER, id);
    if (!product.success) return product;
    if (!product.data)
      return { success: false as const, error: new NotFoundError("Product") };
    if (!product.data.externalId)
      return {
        success: false as const,
        error: new RequestError("Product has no external ID"),
      };

    const store = await Store.get(Environment.SERVER, product.data.storeId);
    if (!store.success) return store;
    if (!store.data)
      return { success: false as const, error: new NotFoundError("Store") };
    if (store.data.platform !== "woocommerce")
      return {
        success: false as const,
        error: new RequestError("Store is not a WooCommerce store"),
      };

    const resolved = await resolveCredentials(store.data.id, {});
    if (!resolved.success) return resolved;

    const { consumerKey, consumerSecret } = resolved;
    const { domain } = store.data;

    const summary = buildAgenticSummary(structuredJson, {
      title: product.data.title,
      sku: product.data.sku,
      price: product.data.price,
      currency: product.data.currency,
    });

    const body = {
      meta_data: [
        { key: STRUCTURED_DATA_META_KEY, value: structuredJson },
        { key: AGENTIC_SUMMARY_META_KEY, value: summary },
      ],
    };

    const url = `${domain}/wp-json/wc/v3/products/${product.data.externalId}`;

    const response = await authorizedRequest(url, consumerKey, consumerSecret, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.success) return response;

    const parsed = await HTTP.parse<Type>(response);
    if (!parsed.success) return parsed;

    await Product.update(Environment.SERVER, id, {
      structuredData: structuredJson,
      syncedAt: new Date(),
    });

    context.span.addBreadcrumb({
      category: "woocommerce.ucp.product.meta",
      data: { "product.id": id, "store.id": store.data.id },
    });

    return { success: true as const, data: { written: 2 } };
  },
  "WooCommerce.pushProductStructuredData",
);
