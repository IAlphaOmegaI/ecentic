/**
 * Google Shopping–spec product feed generation. One feed serves two ingestion
 * rails: Google Merchant Center (the only gate into the Shopping Graph that
 * powers AI Mode) and the Perplexity Merchant Program (which ingests the same
 * spec). Served publicly per store at `/api/feeds/google/{store}?token=...` —
 * the token is derived, not stored, so no schema change is needed.
 */

import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { schema } from "../database";
import { Environment } from "../utils/environment";
import * as Product from "./product";
import * as Store from "./store";

const FEED_TOKEN_BYTES = 16;

const feedSecret = () => {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not configured");
  return secret;
};

export const feedToken = (storeId: string) =>
  crypto
    .createHmac("sha256", feedSecret())
    .update(`product-feed:${storeId}`)
    .digest("hex")
    .slice(0, FEED_TOKEN_BYTES * 2);

export const verifyFeedToken = (storeId: string, token: string) => {
  const expected = feedToken(storeId);
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
};

export const feedUrl = (storeId: string) => {
  const origin =
    process.env.APP_HOST ??
    process.env.BETTER_AUTH_BASE_URL ??
    "http://localhost:3000";
  return `${origin.replace(/\/+$/, "")}/api/feeds/google/${storeId}?token=${feedToken(storeId)}`;
};

/**
 * Offer-identity and categorization facts mined from the platform's raw
 * product payload. GTIN is the field that decides whether the offer enters the
 * cross-retailer product cluster on Google AI Mode and Perplexity — both key
 * offers by it — so it is worth digging out of variants even though the
 * `product` table doesn't model it.
 */
export type CatalogFacts = {
  brand: string | null;
  gtin: string | null;
  mpn: string | null;
  productType: string | null;
  handle: string | null;
  availability: "in_stock" | "out_of_stock";
};

const GTIN_PATTERN = /^\d{8}(\d{4,6})?$/;

/** Loose shape of the platform's raw product payload (Shopify or WooCommerce). */
type RawVariant = {
  barcode?: unknown;
  sku?: unknown;
  inventory_quantity?: unknown;
  inventory_policy?: unknown;
};

type RawProductPayload = {
  vendor?: unknown;
  brand?: unknown;
  product_type?: unknown;
  handle?: unknown;
  categories?: unknown;
  variants?: unknown;
};

export const extractCatalogFacts = (
  rawData: string | null | undefined,
): CatalogFacts => {
  const empty: CatalogFacts = {
    brand: null,
    gtin: null,
    mpn: null,
    productType: null,
    handle: null,
    availability: "in_stock",
  };

  if (!rawData) return empty;

  const parsed = (() => {
    try {
      return JSON.parse(rawData) as RawProductPayload;
    } catch {
      return null;
    }
  })();

  if (!parsed) return empty;

  const asString = (value: unknown): string | null =>
    typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

  const variants = Array.isArray(parsed.variants)
    ? (parsed.variants as RawVariant[])
    : [];
  const firstVariant = variants[0];

  const barcode = asString(firstVariant?.barcode);
  const gtin = barcode && GTIN_PATTERN.test(barcode) ? barcode : null;

  const availability = (() => {
    if (!firstVariant) return "in_stock" as const;
    const quantity = firstVariant.inventory_quantity;
    const policy = asString(firstVariant.inventory_policy);
    if (typeof quantity === "number" && quantity <= 0 && policy === "deny")
      return "out_of_stock" as const;
    return "in_stock" as const;
  })();

  const wooCategories = Array.isArray(parsed.categories)
    ? (parsed.categories as { name?: unknown }[])
    : [];

  return {
    brand: asString(parsed.vendor) ?? asString(parsed.brand),
    gtin,
    mpn: asString(firstVariant?.sku),
    productType:
      asString(parsed.product_type) ?? asString(wooCategories[0]?.name),
    handle: asString(parsed.handle),
    availability,
  };
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatPrice = (value: string | null, currency: string | null) => {
  if (!value) return null;
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount) || amount <= 0) return null;
  return `${amount.toFixed(2)} ${currency ?? "USD"}`;
};

const productLink = (
  product: { url: string | null },
  facts: CatalogFacts,
  store: { platform: string; domain: string },
) => {
  if (product.url) return product.url;
  if (!facts.handle) return null;
  const host = store.domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${host}/products/${facts.handle}`;
};

export type FeedBuildResult = {
  xml: string;
  itemCount: number;
  skippedCount: number;
};

/**
 * Builds the RSS 2.0 / `g:` namespace feed for a store from its synced
 * products. Products missing the hard-required attributes (link, image,
 * positive price) are skipped rather than emitted invalid — Merchant Center
 * disapproves items instead of ignoring bad fields.
 */
export const buildGoogleFeed = async (
  storeId: string,
): Promise<
  { success: true; data: FeedBuildResult } | { success: false; error: Error }
> => {
  const store = await Store.get(Environment.SERVER, storeId);
  if (!store.success) return store;
  if (!store.data)
    return { success: false, error: new Error("Store not found") };

  const products = await Product.find(Environment.SERVER, {
    where: and(
      eq(schema.product.storeId, storeId),
      eq(schema.product.status, "active"),
    ),
  });
  if (!products.success) return products;

  const items: string[] = [];
  const skipped: string[] = [];

  for (const product of products.data) {
    const facts = extractCatalogFacts(product.rawData);
    const link = productLink(product, facts, store.data);
    const price = formatPrice(product.price, product.currency);
    const compareAt = formatPrice(product.compareAtPrice, product.currency);

    const images = (() => {
      try {
        const parsed = JSON.parse(product.images ?? "[]");
        return Array.isArray(parsed)
          ? parsed.filter((entry): entry is string => typeof entry === "string")
          : [];
      } catch {
        return [];
      }
    })();

    if (!link || !price || images.length === 0) {
      skipped.push(product.id);
      continue;
    }

    // compare_at_price is the pre-discount price: when it exceeds the current
    // price, Google expects it as `price` with the live price as `sale_price`.
    const onSale =
      compareAt !== null &&
      Number.parseFloat(compareAt) > Number.parseFloat(price);

    const description = stripHtml(product.description ?? product.title).slice(
      0,
      5000,
    );

    const lines = [
      `<g:id>${escapeXml(product.externalId ?? product.id)}</g:id>`,
      `<title>${escapeXml(product.title.slice(0, 150))}</title>`,
      `<description>${escapeXml(description)}</description>`,
      `<link>${escapeXml(link)}</link>`,
      `<g:image_link>${escapeXml(images[0] as string)}</g:image_link>`,
      ...images
        .slice(1, 11)
        .map(
          (image) =>
            `<g:additional_image_link>${escapeXml(image)}</g:additional_image_link>`,
        ),
      `<g:price>${escapeXml(onSale ? (compareAt as string) : price)}</g:price>`,
      ...(onSale ? [`<g:sale_price>${escapeXml(price)}</g:sale_price>`] : []),
      `<g:availability>${facts.availability === "in_stock" ? "in stock" : "out of stock"}</g:availability>`,
      "<g:condition>new</g:condition>",
      ...(facts.brand ? [`<g:brand>${escapeXml(facts.brand)}</g:brand>`] : []),
      ...(facts.gtin ? [`<g:gtin>${escapeXml(facts.gtin)}</g:gtin>`] : []),
      ...(!facts.gtin && facts.mpn
        ? [`<g:mpn>${escapeXml(facts.mpn)}</g:mpn>`]
        : []),
      ...(!facts.gtin && !facts.mpn
        ? ["<g:identifier_exists>false</g:identifier_exists>"]
        : []),
      ...(facts.productType
        ? [`<g:product_type>${escapeXml(facts.productType)}</g:product_type>`]
        : []),
    ];

    items.push(`<item>${lines.join("")}</item>`);
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "<channel>",
    `<title>${escapeXml(store.data.name)}</title>`,
    `<link>${escapeXml(`https://${store.data.domain.replace(/^https?:\/\//, "")}`)}</link>`,
    `<description>${escapeXml(`Product feed for ${store.data.name}, generated by ecentic`)}</description>`,
    ...items,
    "</channel>",
    "</rss>",
  ].join("\n");

  return {
    success: true,
    data: { xml, itemCount: items.length, skippedCount: skipped.length },
  };
};
