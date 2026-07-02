/**
 * Live catalog source backed by the store's WooCommerce REST API v3
 * (`/wp-json/wc/v3/`), authenticated with the consumer key/secret provisioned
 * during connect. Agent-facing catalog reads get current prices, stock, and
 * real product variations instead of the connect-time snapshot; a short redis
 * cache absorbs agent traffic so the store isn't hammered. Callers fall back
 * to the synced `product` table when this source is unavailable.
 */

import { createHash } from "node:crypto";
import { redis } from "@/server/utils/durable";
import * as HTTP from "@/server/utils/http";
import { authorizedRequest } from "@/server/utils/woocommerce";
import { currencyExponent, toMinorUnits, ucpAmount } from "./money";
import { storefrontOrigin, type UcpStoreContext } from "./store-context";

const SEARCH_CACHE_TTL = 60;
const PRODUCT_CACHE_TTL = 60;
const VARIANT_CACHE_TTL = 3600;
const CURRENCY_CACHE_TTL = 3600;

/** Variable products whose variations are fetched per lookup call. */
const MAX_VARIATION_FETCHES = 10;

// ─── WooCommerce REST v3 payloads ────────────────────────────────────────────

type WcImage = { src: string; alt?: string };

type WcAttribute = {
  name: string;
  options?: string[];
  option?: string;
  variation?: boolean;
};

type WcProduct = {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  status: string;
  type: string;
  stock_status: string;
  virtual: boolean;
  images: WcImage[];
  categories: { id: number; name: string; slug: string }[];
  tags: { id: number; name: string }[];
  attributes: WcAttribute[];
  average_rating: string;
  rating_count: number;
  variations: number[];
};

type WcVariation = {
  id: number;
  sku: string;
  price: string;
  regular_price: string;
  status: string;
  stock_status: string;
  virtual: boolean;
  permalink: string;
  image: WcImage | null;
  attributes: WcAttribute[];
};

// ─── HTTP + caching plumbing ─────────────────────────────────────────────────

const wcRequest = async <T>(
  context: UcpStoreContext,
  path: string,
  params: Record<string, string> = {},
): Promise<{ data: T; headers: Headers } | null> => {
  if (!context.credentials) return null;

  const url = new URL(
    `${storefrontOrigin(context.store.domain)}/wp-json/wc/v3${path}`,
  );
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await authorizedRequest(
    url.toString(),
    context.credentials.consumerKey,
    context.credentials.consumerSecret,
    { method: "GET" },
  );
  if (!response.success) return null;

  const headers = response.data.headers;
  const parsed = await HTTP.parse<T>(response);
  if (!parsed.success || !("data" in parsed) || parsed.data === undefined) {
    return null;
  }

  return { data: parsed.data, headers };
};

const cached = async <T>(
  key: string,
  ttlSeconds: number,
  produce: () => Promise<T | null>,
): Promise<T | null> => {
  const hit = await (async () => {
    try {
      return await redis.get<T>(key);
    } catch {
      return null;
    }
  })();
  if (hit !== null && hit !== undefined) return hit;

  const produced = await produce();
  if (produced !== null) {
    try {
      await redis.set(key, produced, { ex: ttlSeconds });
    } catch {
      // Cache write failures only cost an extra upstream call.
    }
  }
  return produced;
};

/** The store's active currency (needed because wc/v3 prices carry no currency). */
const storeCurrency = async (context: UcpStoreContext): Promise<string> => {
  const currency = await cached<string>(
    `ucp:wc:currency:${context.store.id}`,
    CURRENCY_CACHE_TTL,
    async () => {
      const response = await wcRequest<{ code: string }>(
        context,
        "/data/currencies/current",
      );
      return response?.data.code ?? null;
    },
  );
  return currency ?? "USD";
};

// ─── Variant resolution cache ────────────────────────────────────────────────

/**
 * Every variant served through the catalog is remembered here so cart line
 * items referencing a variation id resolve without a parent lookup. The
 * bridge quote remains the authority — this only seeds session line items.
 */
export type VariantSource = {
  externalId: string;
  title: string;
  unitPrice: number;
  imageUrl?: string;
};

const variantKey = (storeId: string, id: string) =>
  `ucp:wc:variant:${storeId}:${id}`;

const rememberVariant = async (
  storeId: string,
  source: VariantSource,
): Promise<void> => {
  try {
    await redis.set(variantKey(storeId, source.externalId), source, {
      ex: VARIANT_CACHE_TTL,
    });
  } catch {
    // Best-effort.
  }
};

// ─── Mapping to UCP shapes ───────────────────────────────────────────────────

const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const availabilityStatus = (stockStatus: string): string => {
  switch (stockStatus) {
    case "outofstock":
      return "out_of_stock";
    case "onbackorder":
      return "backorder";
    default:
      return "in_stock";
  }
};

const availabilityOf = (stockStatus: string) => {
  const status = availabilityStatus(stockStatus);
  return { available: status !== "out_of_stock", status };
};

const mapSimpleVariant = (
  product: WcProduct,
  currency: string,
): Record<string, unknown> => {
  const price = toMinorUnits(product.price, currency) ?? 0;
  const listPrice = toMinorUnits(product.regular_price, currency);

  return {
    id: String(product.id),
    title: product.name,
    description:
      stripHtml(product.short_description || product.description) ||
      product.name,
    price: ucpAmount(price, currency),
    ...(listPrice !== null && listPrice !== price
      ? { list_price: ucpAmount(listPrice, currency) }
      : {}),
    availability: availabilityOf(product.stock_status),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.permalink ? { url: product.permalink } : {}),
    ...(product.images?.[0]?.src
      ? {
          media: [
            {
              type: "image",
              url: product.images[0].src,
              alt_text: product.images[0].alt || product.name,
            },
          ],
        }
      : {}),
    requires: { shipping: product.virtual !== true },
  };
};

const variationTitle = (product: WcProduct, variation: WcVariation): string => {
  const options = (variation.attributes ?? [])
    .map((attribute) => attribute.option)
    .filter((option): option is string => !!option);
  return options.length > 0
    ? `${product.name} — ${options.join(" / ")}`
    : product.name;
};

const mapVariation = (
  product: WcProduct,
  variation: WcVariation,
  currency: string,
): Record<string, unknown> => {
  const price = toMinorUnits(variation.price, currency) ?? 0;
  const listPrice = toMinorUnits(variation.regular_price, currency);
  const image = variation.image?.src ?? product.images?.[0]?.src;

  return {
    id: String(variation.id),
    title: variationTitle(product, variation),
    description:
      stripHtml(product.short_description || product.description) ||
      product.name,
    price: ucpAmount(price, currency),
    ...(listPrice !== null && listPrice !== price
      ? { list_price: ucpAmount(listPrice, currency) }
      : {}),
    availability: availabilityOf(variation.stock_status),
    options: (variation.attributes ?? [])
      .filter((attribute) => attribute.name && attribute.option)
      .map((attribute) => ({ name: attribute.name, label: attribute.option })),
    ...(variation.sku ? { sku: variation.sku } : {}),
    ...(variation.permalink ? { url: variation.permalink } : {}),
    ...(image
      ? { media: [{ type: "image", url: image, alt_text: product.name }] }
      : {}),
    requires: { shipping: variation.virtual !== true },
  };
};

/**
 * Maps a wc/v3 product (plus its variations, when fetched) to a UCP product
 * and seeds the variant cache so those ids resolve in cart line items.
 */
const mapProduct = async (
  storeId: string,
  product: WcProduct,
  variations: WcVariation[],
  currency: string,
): Promise<Record<string, unknown>> => {
  const plain =
    stripHtml(product.short_description || product.description) || product.name;

  const variants =
    variations.length > 0
      ? variations
          .filter((variation) => variation.status === "publish")
          .map((variation) => mapVariation(product, variation, currency))
      : [mapSimpleVariant(product, currency)];

  for (const variant of variants) {
    const price = variant["price"] as { amount: number };
    const media = variant["media"] as { url: string }[] | undefined;
    await rememberVariant(storeId, {
      externalId: String(variant["id"]),
      title: String(variant["title"]),
      unitPrice: price.amount,
      ...(media?.[0]?.url ? { imageUrl: media[0].url } : {}),
    });
  }

  const amounts = variants.map(
    (variant) => (variant["price"] as { amount: number }).amount,
  );
  const minPrice = Math.min(...amounts);
  const maxPrice = Math.max(...amounts);

  const options = (product.attributes ?? [])
    .filter((attribute) => attribute.variation && attribute.name)
    .map((attribute) => ({
      name: attribute.name,
      values: (attribute.options ?? []).map((label) => ({ label })),
    }));

  const rating = (() => {
    const value = Number.parseFloat(product.average_rating ?? "");
    if (!Number.isFinite(value) || value <= 0 || !product.rating_count)
      return null;
    return { value, scale_min: 0, scale_max: 5, count: product.rating_count };
  })();

  const categories = (product.categories ?? [])
    .filter((category) => category?.name)
    .map((category) => ({ value: category.name, taxonomy: "merchant" }));

  const tags = (product.tags ?? [])
    .filter((tag) => tag?.name)
    .map((tag) => tag.name);

  return {
    id: String(product.id),
    handle: product.slug || String(product.id),
    title: product.name,
    description: {
      plain,
      ...(product.description ? { html: product.description } : {}),
    },
    ...(product.permalink ? { url: product.permalink } : {}),
    price_range: {
      min: ucpAmount(minPrice, currency),
      max: ucpAmount(maxPrice, currency),
    },
    ...(categories.length > 0 ? { categories } : {}),
    ...(product.images?.length
      ? {
          media: product.images
            .filter((image) => image.src)
            .map((image) => ({
              type: "image",
              url: image.src,
              alt_text: image.alt || product.name,
            })),
        }
      : {}),
    ...(options.length > 0 ? { options } : {}),
    variants,
    ...(tags.length > 0 ? { tags } : {}),
    ...(rating ? { rating } : {}),
  };
};

const fetchVariations = async (
  context: UcpStoreContext,
  productId: number,
): Promise<WcVariation[]> => {
  const response = await wcRequest<WcVariation[]>(
    context,
    `/products/${productId}/variations`,
    { per_page: "100", status: "publish" },
  );
  return response?.data ?? [];
};

// ─── Public operations ───────────────────────────────────────────────────────

export type LiveSearchResult = {
  products: Record<string, unknown>[];
  totalCount: number;
  hasNextPage: boolean;
};

export type SearchFilters = {
  categories?: string[];
  price?: { min?: number; max?: number };
  availability?: { in_stock?: boolean };
};

/**
 * Live catalog search via `GET /wc/v3/products?search=…`. Stock and price
 * constraints are pushed to WooCommerce; category names filter within the
 * page (wc/v3 filters categories by id, not name). Variable products carry a
 * price-range summary variant here — full variations are expanded on the
 * detail/lookup operations to keep search to one upstream call.
 */
export const liveSearch = async ({
  context,
  query,
  filters,
  page,
  limit,
}: {
  context: UcpStoreContext;
  query: string;
  filters: SearchFilters;
  page: number;
  limit: number;
}): Promise<LiveSearchResult | null> => {
  if (!context.credentials) return null;

  const currency = await storeCurrency(context);
  const exponent = 10 ** currencyExponent(currency);

  const params: Record<string, string> = {
    status: "publish",
    per_page: String(limit),
    page: String(page),
    ...(query !== "" ? { search: query } : {}),
    ...(filters.availability?.in_stock ? { stock_status: "instock" } : {}),
    ...(filters.price?.min !== undefined
      ? { min_price: String(filters.price.min / exponent) }
      : {}),
    ...(filters.price?.max !== undefined
      ? { max_price: String(filters.price.max / exponent) }
      : {}),
  };

  const cacheKey = `ucp:wc:search:${context.store.id}:${createHash("md5")
    .update(JSON.stringify(params) + JSON.stringify(filters.categories ?? []))
    .digest("hex")}`;

  return cached<LiveSearchResult>(cacheKey, SEARCH_CACHE_TTL, async () => {
    const response = await wcRequest<WcProduct[]>(context, "/products", params);
    if (!response) return null;

    const wanted = (filters.categories ?? []).map((name) => name.toLowerCase());
    const rows = response.data.filter((product) => {
      if (wanted.length === 0) return true;
      const names = (product.categories ?? []).map((category) =>
        category.name.toLowerCase(),
      );
      return wanted.some((name) => names.includes(name));
    });

    const products = [];
    for (const row of rows) {
      products.push(await mapProduct(context.store.id, row, [], currency));
    }

    const totalCount = Number(
      response.headers.get("X-WP-Total") ?? products.length,
    );
    const totalPages = Number(response.headers.get("X-WP-TotalPages") ?? page);

    return {
      products,
      totalCount: Number.isFinite(totalCount) ? totalCount : products.length,
      hasNextPage: Number.isFinite(totalPages) && page < totalPages,
    };
  });
};

/**
 * Live batch lookup: numeric ids via `products?include=…`, the rest via
 * `products?sku=…`. Variations are expanded for the first
 * {@link MAX_VARIATION_FETCHES} variable products.
 */
export const liveLookup = async ({
  context,
  ids,
}: {
  context: UcpStoreContext;
  ids: string[];
}): Promise<Map<string, Record<string, unknown>> | null> => {
  if (!context.credentials || ids.length === 0) return null;

  const currency = await storeCurrency(context);
  const numeric = ids.filter((id) => /^\d+$/.test(id));
  const skus = ids.filter((id) => !/^\d+$/.test(id));

  const batches = await Promise.all([
    numeric.length > 0
      ? wcRequest<WcProduct[]>(context, "/products", {
          include: numeric.join(","),
          per_page: "100",
          status: "publish",
        })
      : Promise.resolve({ data: [] as WcProduct[], headers: new Headers() }),
    skus.length > 0
      ? wcRequest<WcProduct[]>(context, "/products", {
          sku: skus.join(","),
          per_page: "100",
          status: "publish",
        })
      : Promise.resolve({ data: [] as WcProduct[], headers: new Headers() }),
  ]);

  if (batches.some((batch) => batch === null)) return null;

  const byWcId = new Map<number, WcProduct>();
  for (const batch of batches) {
    for (const product of batch?.data ?? []) {
      byWcId.set(product.id, product);
    }
  }

  const mapped = new Map<number, Record<string, unknown>>();
  const variationBudget = { remaining: MAX_VARIATION_FETCHES };
  for (const product of byWcId.values()) {
    const variations =
      product.type === "variable" &&
      product.variations?.length > 0 &&
      variationBudget.remaining > 0
        ? await (async () => {
            variationBudget.remaining -= 1;
            return fetchVariations(context, product.id);
          })()
        : [];
    mapped.set(
      product.id,
      await mapProduct(context.store.id, product, variations, currency),
    );
  }

  const matched = new Map<string, Record<string, unknown>>();
  for (const id of ids) {
    const product = [...byWcId.values()].find(
      (candidate) =>
        String(candidate.id) === id ||
        (candidate.sku !== "" && candidate.sku === id),
    );
    const ucpProduct = product ? mapped.get(product.id) : undefined;
    if (ucpProduct) matched.set(id, ucpProduct);
  }

  return matched;
};

export type LiveProductResult =
  | { status: "ok"; product: Record<string, unknown> }
  | { status: "not_found" };

/** Live single-product detail with full variations. */
export const liveProduct = async ({
  context,
  id,
}: {
  context: UcpStoreContext;
  id: string;
}): Promise<LiveProductResult | null> => {
  if (!context.credentials) return null;

  const cacheKey = `ucp:wc:product:${context.store.id}:${createHash("md5")
    .update(id)
    .digest("hex")}`;

  return cached<LiveProductResult>(cacheKey, PRODUCT_CACHE_TTL, async () => {
    const matched = await liveLookup({ context, ids: [id] });
    if (matched === null) return null;

    const product = matched.get(id);
    if (!product) return { status: "not_found" };

    // Lookup caps variation expansion; detail always expands.
    return { status: "ok", product };
  });
};

/**
 * Resolves one catalog id (product id, variation id, or SKU) to the data a
 * session line item needs. Variation ids hit the variant cache seeded by
 * catalog reads; everything else goes through a live product lookup.
 */
export const resolveLineItemSource = async ({
  context,
  id,
}: {
  context: UcpStoreContext;
  id: string;
}): Promise<VariantSource | null> => {
  const remembered = await (async () => {
    try {
      return await redis.get<VariantSource>(variantKey(context.store.id, id));
    } catch {
      return null;
    }
  })();
  if (remembered) return remembered;

  const matched = await liveLookup({ context, ids: [id] });
  const product = matched?.get(id);
  if (!product) return null;

  const variants = product["variants"] as
    | {
        id: unknown;
        title: unknown;
        price?: { amount: number };
        media?: { url: string }[];
      }[]
    | undefined;
  const variant =
    variants?.find((candidate) => String(candidate.id) === id) ?? variants?.[0];
  if (!variant) return null;

  return {
    externalId: String(variant.id),
    title: String(variant.title),
    unitPrice: variant.price?.amount ?? 0,
    ...(variant.media?.[0]?.url ? { imageUrl: variant.media[0].url } : {}),
  };
};
