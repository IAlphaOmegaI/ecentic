/**
 * A product read straight off a public storefront, for the staff claim-check
 * demo (`/dev/claim-check`): no store connection, nothing stored. Shopify's
 * public product JSON and WooCommerce's Store API expose what a synced catalog
 * row holds — mapped the way the public importers map them — so the check runs
 * exactly as it would on a connected product.
 *
 * Kept off the `"use server"` rail so the spec can drive the mappers directly.
 */

import { resultify } from "@zenncore/utils";
import { ValidationError } from "../../utils/error";
import * as HTTP from "../../utils/http";
import {
  advertisedRestRoot,
  decodeEntities,
  restUrl,
  type StoreApiProduct,
  toMajor,
} from "../integration/woocommerce/http";
import type { ProductInput } from "./claim-check-rules";

const TIMEOUT_MS = 8000;

export type DemoSource = {
  platform: "shopify" | "woocommerce";
  product: ProductInput;
  store: { domain: string; storefrontHosts: string[] | null };
};

type ShopifyProduct = {
  id: number;
  title: string;
  body_html: string | null;
  handle: string;
  vendor?: string;
  variants: {
    price?: string | null;
    compare_at_price?: string | null;
    sku?: string | null;
    barcode?: string | null;
  }[];
};

const parse = <T>(body: string): T | null => {
  const parsed = resultify(() => JSON.parse(body) as unknown);
  return parsed.success ? (parsed.data as T) : null;
};

const readJson = async <T>(url: string): Promise<T | null> => {
  const response = await HTTP.page(url, {
    timeout: TIMEOUT_MS,
    accept: "application/json",
  });
  return response.success && response.data.status === 200
    ? parse<T>(response.data.body)
    : null;
};

/**
 * Shopify's public product JSON as a catalog row: first variant's price and
 * SKU, as the Shopify import stores them. The payload carries the variants'
 * barcodes (read as the GTIN) but no inventory, so stock stays unknown.
 */
export const shopifyProductInput = (
  product: ShopifyProduct,
  origin: string,
  currency: string | null,
): ProductInput => {
  const [variant] = product.variants;
  return {
    id: `demo-shopify-${product.id}`,
    title: product.title,
    description: product.body_html,
    price: variant?.price ?? null,
    compareAtPrice: variant?.compare_at_price ?? null,
    currency,
    sku: variant?.sku || null,
    gtin: null,
    url: `${origin}/products/${product.handle}`,
    rawData: JSON.stringify(product),
    syncedAt: new Date(),
  };
};

/**
 * A Store API product as a catalog row, the way the `woocommerce-public`
 * import maps it: entity-decoded title, minor-unit prices converted by string,
 * short description preferred.
 */
export const wooProductInput = (item: StoreApiProduct): ProductInput => {
  const digits = item.prices?.currency_minor_unit ?? 2;
  const price = toMajor(item.prices?.price, digits);
  const regular = toMajor(item.prices?.regular_price, digits);
  return {
    id: `demo-woocommerce-${item.id}`,
    title: decodeEntities(item.name),
    description: item.short_description || item.description,
    price,
    compareAtPrice:
      price && regular && Number(regular) > Number(price) ? regular : null,
    currency: item.prices?.currency_code || null,
    sku: item.sku || null,
    gtin: null,
    url: item.permalink,
    rawData: JSON.stringify({
      is_in_stock: item.is_in_stock,
      brands: item.brands,
    }),
    syncedAt: new Date(),
  };
};

const shopify = async (url: URL): Promise<DemoSource | null> => {
  const handle = url.pathname
    .match(/\/products\/([^/?#]+)/)?.[1]
    ?.replace(/\.(json|js)$/, "");
  if (!handle) return null;

  const [body, meta] = await Promise.all([
    readJson<{ product?: ShopifyProduct }>(
      `${url.origin}/products/${handle}.json`,
    ),
    // The storefront's identity card: its currency, and the myshopify host the
    // check must treat as the merchant's own.
    readJson<{ currency?: string; myshopify_domain?: string }>(
      `${url.origin}/meta.json`,
    ),
  ]);
  if (!body?.product) return null;

  return {
    platform: "shopify",
    product: shopifyProductInput(
      body.product,
      url.origin,
      meta?.currency ?? null,
    ),
    store: {
      domain: url.hostname,
      storefrontHosts: meta?.myshopify_domain ? [meta.myshopify_domain] : null,
    },
  };
};

const woocommerce = async (url: URL): Promise<DemoSource | null> => {
  const slug = url.pathname.match(/\/product\/([^/?#]+)/)?.[1];
  if (!slug) return null;

  // The REST root the site advertises — `/wp-json/` is only the usual case.
  const home = await HTTP.page(url.origin, { timeout: TIMEOUT_MS });
  const root =
    (home.success ? advertisedRestRoot(home.data) : null) ??
    `${url.origin}/wp-json/`;
  const items = await readJson<StoreApiProduct[]>(
    restUrl(root, "wc/store/v1/products", { slug: decodeURIComponent(slug) }),
  );
  const [item] = Array.isArray(items) ? items : [];
  if (!item) return null;

  return {
    platform: "woocommerce",
    product: wooProductInput(item),
    store: { domain: url.hostname, storefrontHosts: null },
  };
};

/**
 * Reads the product behind a pasted storefront URL. Every fetch is guarded
 * (`HTTP.page`): the URL is whatever a rep pasted.
 */
export const loadDemoProduct = async (raw: string) => {
  const trimmed = raw.trim();
  const url = resultify(
    () =>
      new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`),
  );
  if (!url.success || !/^https?:$/.test(url.data.protocol))
    return {
      success: false as const,
      error: new ValidationError("Paste a full product page URL."),
    };

  const source = (await shopify(url.data)) ?? (await woocommerce(url.data));
  return source
    ? { success: true as const, data: source }
    : {
        success: false as const,
        error: new ValidationError(
          "Couldn't read that product. Paste a Shopify (…/products/…) or WooCommerce (…/product/…) product page URL from a public store.",
        ),
      };
};
