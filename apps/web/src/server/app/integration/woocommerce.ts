"use server";

import { createHmac, randomBytes } from "node:crypto";
import { resultify } from "@zenncore/utils";
import { type TransactionScope, withTransaction } from "../../database";
import { withAuthentication } from "../../utils/authentication";
import { withContext } from "../../utils/context";
import { Environment } from "../../utils/environment";
import { NotFoundError, RequestError } from "../../utils/error";
import * as HTTP from "../../utils/http";
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
};

// RFC 3986 percent-encoding, as OAuth 1.0a requires — encodeURIComponent leaves
// !*'() unescaped, so encode those too.
const percentEncode = (value: string) =>
  encodeURIComponent(value).replace(
    /[!*'()]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

const Utils = {
  credentials: (key: string, secret: string) =>
    `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
  normalize: (url: string) => {
    const trimmed = url.replace(/\/+$/, "");
    // Preserve an explicit scheme — http is needed for local dev stores like
    // http://ecentic-test.local — and default bare domains to https.
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  },
  withQueryAuth: (url: string, key: string, secret: string) => {
    const target = new URL(url);
    target.searchParams.set("consumer_key", key);
    target.searchParams.set("consumer_secret", secret);
    return target.toString();
  },
  /**
   * Signs a request with OAuth 1.0a one-legged auth and returns the URL with the
   * `oauth_*` parameters (including the signature) appended to the query string.
   * This is WooCommerce's required scheme over plain HTTP — it ignores Basic /
   * key-secret auth on non-SSL requests.
   *
   * Mind the WooCommerce-specific quirks the signature depends on: wc/v3 signs
   * with HMAC-SHA256, the HMAC key is `consumerSecret&` (secret + `&` + an empty
   * token secret, per OAuth 1.0a), `oauth_version` is omitted, and the base URL
   * is scheme + host + path with the query string excluded.
   */
  withOAuthSignature: (
    url: string,
    method: string,
    consumerKey: string,
    consumerSecret: string,
  ) => {
    const target = new URL(url);

    const oauth: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: randomBytes(16).toString("hex"),
      oauth_signature_method: "HMAC-SHA256",
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    };

    // Sign over the oauth params plus any existing query params (e.g. per_page).
    const params: Record<string, string> = { ...oauth };
    for (const [key, value] of target.searchParams) params[key] = value;

    const parameterString = Object.entries(params)
      .map(([key, value]) => [percentEncode(key), percentEncode(value)] as const)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    const baseString = [
      method.toUpperCase(),
      percentEncode(`${target.origin}${target.pathname}`),
      percentEncode(parameterString),
    ].join("&");

    const signature = createHmac("sha256", `${consumerSecret}&`)
      .update(baseString)
      .digest("base64");

    for (const [key, value] of Object.entries(oauth))
      target.searchParams.set(key, value);
    target.searchParams.set("oauth_signature", signature);

    return target.toString();
  },
};

/**
 * Performs an authenticated WooCommerce REST request.
 *
 * Over HTTPS, sends the consumer key/secret via HTTP Basic Auth — WooCommerce's
 * primary documented method. Many hosts (Apache + PHP-CGI/FastCGI on shared
 * hosting) strip the `Authorization` header, which surfaces as a `401 "Consumer
 * key is missing"` even for valid credentials, so on a 401 this retries once
 * with the credentials as query-string parameters.
 *
 * Over plain HTTP, WooCommerce ignores key/secret auth altogether and requires
 * OAuth 1.0a one-legged signing, so those requests are signed instead. This is
 * mainly for local dev stores (e.g. http://ecentic-test.local).
 */
const authorizedRequest = async (
  url: string,
  consumerKey: string,
  consumerSecret: string,
  options: RequestInit = {},
) => {
  if (new URL(url).protocol === "http:") {
    const signed = Utils.withOAuthSignature(
      url,
      options.method ?? "GET",
      consumerKey,
      consumerSecret,
    );
    return HTTP.request(signed, options);
  }

  const primary = await HTTP.request(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: Utils.credentials(consumerKey, consumerSecret),
    },
  });

  if (!primary.success || primary.data.status !== 401) return primary;

  return HTTP.request(
    Utils.withQueryAuth(url, consumerKey, consumerSecret),
    options,
  );
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
    const host = Utils.normalize(domain);

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

    const transaction = await resultify(() =>
      withTransaction(async (tx) => {
        const store = await Store.create(
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

        const storeAccount = await StoreAccount.create(
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

    if (transaction.success) {
      context.span.addBreadcrumb({
        category: "woocommerce.connect.complete",
        data: { "store.id": transaction.data.id, "store.host": host },
      });
    }

    return transaction;
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

    const body: Record<string, string> = {};
    if (data.title !== undefined) body.name = data.title;
    if (data.body_html !== undefined) body.description = data.body_html;

    if (Object.keys(body).length === 0)
      return {
        success: false,
        error: new RequestError("No fields to update"),
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
