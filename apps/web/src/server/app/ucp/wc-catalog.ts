/**
 * Live catalog source backed by the store's WooCommerce REST API v3
 * (`/wp-json/wc/v3/`), authenticated with the consumer key/secret provisioned
 * during connect. Agent-facing catalog reads get current prices, stock, and
 * real product variations instead of the connect-time snapshot; a short redis
 * cache absorbs agent traffic so the store isn't hammered. Callers fall back
 * to the synced `product` table when this source is unavailable.
 *
 * The behavior ports the woo-ucp reference implementation (`WOO_UCP_Catalog`):
 * search is in-stock-only by default with category/price push-down; lookup
 * resolves product ids, variation ids, SKUs and handles to purchasable units
 * grouped under their parent with `inputs` correlation; detail derives an
 * effective selection (client `selected` → requested variation → relaxed via
 * `preferences` → default-attributes variation), annotates option values with
 * `available`/`exists`, and narrows variants to the selection (featured
 * first, never empty). Known wc/v3 limitations: no taxonomy term slugs in the
 * payload (option values carry labels only, matching is label-based), no
 * image dimensions, and no `relevance` ordering.
 */

import { createHash } from "node:crypto";
import { redis } from "@/server/utils/durable";
import * as HTTP from "@/server/utils/http";
import { authorizedRequest } from "@/server/app/integration/woocommerce/http";
import { currencyExponent, toMinorUnits, ucpAmount } from "./money";
import type { UcpMessage } from "./protocol";
import { infoMessage } from "./protocol";
import { storefrontOrigin, type UcpStoreContext } from "./store-context";

const SEARCH_CACHE_TTL = 60;
const PRODUCT_CACHE_TTL = 60;
const VARIANT_CACHE_TTL = 3600;
const CURRENCY_CACHE_TTL = 3600;
const SETTINGS_CACHE_TTL = 3600;
const CATEGORY_CACHE_TTL = 300;

/** Variable products whose variations are fetched per operation. */
const MAX_VARIATION_FETCHES = 10;

// ─── WooCommerce REST v3 payloads ────────────────────────────────────────────

type WcImage = { src: string; alt?: string };

type WcAttribute = {
  id?: number;
  name: string;
  slug?: string;
  options?: string[];
  option?: string;
  variation?: boolean;
};

type WcDimensions = { length?: string; width?: string; height?: string };

type WcProduct = {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  description: string;
  short_description: string;
  sku: string;
  global_unique_id?: string;
  price: string;
  regular_price: string;
  status: string;
  type: string;
  stock_status: string;
  virtual: boolean;
  downloadable?: boolean;
  featured?: boolean;
  sold_individually?: boolean;
  backorders?: string;
  shipping_class?: string;
  weight?: string;
  dimensions?: WcDimensions;
  images: WcImage[];
  categories: { id: number; name: string; slug: string }[];
  tags: { id: number; name: string }[];
  brands?: { id: number; name: string }[];
  attributes: WcAttribute[];
  default_attributes?: { name: string; option: string }[];
  average_rating: string;
  rating_count: number;
  variations: number[];
};

type WcVariation = {
  id: number;
  sku: string;
  global_unique_id?: string;
  price: string;
  regular_price: string;
  description: string;
  status: string;
  stock_status: string;
  virtual: boolean;
  downloadable?: boolean;
  backorders?: string;
  weight?: string;
  dimensions?: WcDimensions;
  permalink: string;
  image: WcImage | null;
  attributes: WcAttribute[];
};

/** An option selection: `{name, label, id?}` — matching is label-based. */
export type SelectedOption = { name: string; label: string; id?: string };

/** Normalized search/lookup filters; prices in minor units. */
export type CatalogFilters = {
  categories: string[];
  priceMin: number | null;
  priceMax: number | null;
  inStock: boolean | null;
};

export const emptyFilters = (): CatalogFilters => ({
  categories: [],
  priceMin: null,
  priceMax: null,
  inStock: null,
});

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

/** The store's weight/dimension units (metadata parity with the reference). */
const storeMeasurementUnits = async (
  context: UcpStoreContext,
): Promise<{ weight: string; dimension: string }> => {
  const units = await cached<{ weight: string; dimension: string }>(
    `ucp:wc:units:${context.store.id}`,
    SETTINGS_CACHE_TTL,
    async () => {
      const [weight, dimension] = await Promise.all([
        wcRequest<{ value: string }>(
          context,
          "/settings/products/woocommerce_weight_unit",
        ),
        wcRequest<{ value: string }>(
          context,
          "/settings/products/woocommerce_dimension_unit",
        ),
      ]);
      if (!weight && !dimension) return null;
      return {
        weight: weight?.data.value || "kg",
        dimension: dimension?.data.value || "cm",
      };
    },
  );
  return units ?? { weight: "kg", dimension: "cm" };
};

/** Product categories, cached, for category-name → id push-down. */
const storeCategories = async (
  context: UcpStoreContext,
): Promise<{ id: number; name: string; slug: string }[]> => {
  const categories = await cached<{ id: number; name: string; slug: string }[]>(
    `ucp:wc:categories:${context.store.id}`,
    CATEGORY_CACHE_TTL,
    async () => {
      const response = await wcRequest<
        { id: number; name: string; slug: string }[]
      >(context, "/products/categories", { per_page: "100" });
      return response?.data ?? null;
    },
  );
  return categories ?? [];
};

// ─── Variant resolution cache ────────────────────────────────────────────────

/**
 * Every variant served through the catalog is remembered here so cart line
 * items (and lookups) referencing a variation id resolve without a parent
 * scan. The bridge quote remains the authority — this only seeds session
 * line items.
 */
export type VariantSource = {
  externalId: string;
  /** Parent product id when the unit is a variation; equals externalId otherwise. */
  parentId: string;
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

const recallVariant = async (
  storeId: string,
  id: string,
): Promise<VariantSource | null> => {
  try {
    return (await redis.get<VariantSource>(variantKey(storeId, id))) ?? null;
  } catch {
    return null;
  }
};

// ─── Mapping to UCP shapes ───────────────────────────────────────────────────

const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * UCP Description with plain and (when present) html formats. wc/v3 payloads
 * are already-rendered HTML.
 */
const description = (raw: string): Record<string, unknown> => {
  const html = raw.trim();
  if (html === "") return { plain: "" };
  return { plain: stripHtml(html), html };
};

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

/** `available` stays true for backorders, mirroring WC's is_in_stock(). */
const availabilityOf = (stockStatus: string) => {
  const status = availabilityStatus(stockStatus);
  return { available: status !== "out_of_stock", status };
};

/** Variation option selections as [{name, label}] (labels only via wc/v3). */
const variationOptions = (variation: WcVariation): SelectedOption[] =>
  (variation.attributes ?? [])
    .filter((attribute) => attribute.name && attribute.option)
    .map((attribute) => ({
      name: attribute.name,
      label: attribute.option as string,
    }));

/** Comma-joined option labels, mirroring the reference variation title. */
const variationTitle = (product: WcProduct, variation: WcVariation): string => {
  const labels = variationOptions(variation).map((option) => option.label);
  return labels.length > 0 ? labels.join(", ") : product.name;
};

/**
 * Direct WooCommerce add-to-cart link for a purchasable unit, so an agent can
 * hand the buyer straight to checkout for this exact unit.
 */
const checkoutUrl = (
  origin: string,
  product: WcProduct,
  variation?: WcVariation,
): string => {
  const url = new URL(`${origin}/cart/`);
  url.searchParams.set("add-to-cart", String(product.id));
  if (variation) {
    url.searchParams.set("variation_id", String(variation.id));
    for (const attribute of variation.attributes ?? []) {
      if (!attribute.option) continue;
      const slug =
        attribute.slug ?? attribute.name.toLowerCase().replace(/\s+/g, "-");
      url.searchParams.set(`attribute_${slug}`, attribute.option);
    }
  }
  return url.toString();
};

const weightMeta = (
  weight: string | undefined,
  units: { weight: string },
): Record<string, unknown> | null => {
  if (!weight || weight === "") return null;
  return { value: Number.parseFloat(weight), unit: units.weight };
};

const dimensionsMeta = (
  dimensions: WcDimensions | undefined,
  units: { dimension: string },
): Record<string, unknown> | null => {
  const entries = Object.entries({
    length: dimensions?.length,
    width: dimensions?.width,
    height: dimensions?.height,
  }).filter(([, value]) => value !== undefined && value !== "");
  if (entries.length === 0) return null;
  return {
    ...Object.fromEntries(
      entries.map(([key, value]) => [key, Number.parseFloat(value as string)]),
    ),
    unit: units.dimension,
  };
};

/** GTIN barcode from WooCommerce 9.2+'s native global unique id field. */
const barcodes = (unit: {
  global_unique_id?: string;
}): Record<string, unknown>[] =>
  unit.global_unique_id ? [{ type: "gtin", value: unit.global_unique_id }] : [];

/**
 * Product-level metadata, mirroring the reference format_metadata: custom
 * (non-variation) attributes, weight/dimensions for non-variable products,
 * shipping class, brand, and merchandising/purchase-constraint flags.
 */
const productMetadata = (
  product: WcProduct,
  units: { weight: string; dimension: string },
): Record<string, unknown> => {
  const meta: Record<string, unknown> = {};

  const attributes = Object.fromEntries(
    (product.attributes ?? [])
      .filter(
        (attribute) =>
          !attribute.variation &&
          attribute.name &&
          (attribute.options ?? []).length > 0,
      )
      .map((attribute) => [attribute.name, attribute.options]),
  );
  if (Object.keys(attributes).length > 0) meta.attributes = attributes;

  // Variable products carry weight/dimensions per variant; simple products
  // surface them here.
  if (product.type !== "variable") {
    const weight = weightMeta(product.weight, units);
    if (weight) meta.weight = weight;
    const dimensions = dimensionsMeta(product.dimensions, units);
    if (dimensions) meta.dimensions = dimensions;
  }

  if (product.shipping_class) meta.shipping_class = product.shipping_class;
  if (product.brands?.[0]?.name) meta.brand = product.brands[0].name;
  if (product.featured) meta.featured = true;
  if (product.sold_individually) meta.sold_individually = true;
  if (product.virtual) meta.virtual = true;
  if (product.downloadable) meta.downloadable = true;
  if (product.backorders && product.backorders !== "no") {
    meta.backorders = product.backorders;
  }

  return meta;
};

/** Per-variant metadata (true variations only), mirroring variant_metadata. */
const variantMetadata = (
  variation: WcVariation,
  units: { weight: string; dimension: string },
): Record<string, unknown> => {
  const meta: Record<string, unknown> = {};
  const weight = weightMeta(variation.weight, units);
  if (weight) meta.weight = weight;
  const dimensions = dimensionsMeta(variation.dimensions, units);
  if (dimensions) meta.dimensions = dimensions;
  if (variation.backorders && variation.backorders !== "no") {
    meta.backorders = variation.backorders;
  }
  if (variation.virtual) meta.virtual = true;
  if (variation.downloadable) meta.downloadable = true;
  return meta;
};

type MappingContext = {
  origin: string;
  currency: string;
  units: { weight: string; dimension: string };
};

/**
 * Builds a UCP Variant from a purchasable unit — a variation, or a simple
 * product acting as its own single "Default" variant. Mirrors the reference
 * build_variant: variation SKUs inherit the parent's, list_price only when
 * strictly above price, url/media only on variations (the parent covers the
 * simple case), empty lists omitted.
 */
const buildVariant = ({
  mapping,
  product,
  variation,
}: {
  mapping: MappingContext;
  product: WcProduct;
  variation?: WcVariation;
}): Record<string, unknown> => {
  const { origin, currency, units } = mapping;
  const unit = variation ?? product;
  const price = toMinorUnits(unit.price, currency) ?? 0;
  const regular = toMinorUnits(unit.regular_price, currency);

  const rawDescription =
    (variation?.description ?? "").trim() !== ""
      ? (variation?.description as string)
      : product.description || product.short_description;

  const options = variation ? variationOptions(variation) : [];
  const sku = unit.sku || (variation ? product.sku : "");
  const codes = barcodes(unit);
  const meta = variation ? variantMetadata(variation, units) : {};

  return {
    id: String(unit.id),
    title: variation ? variationTitle(product, variation) : "Default",
    description: description(rawDescription),
    price: ucpAmount(price, currency),
    availability: availabilityOf(unit.stock_status),
    ...(options.length > 0 ? { options } : {}),
    ...(sku ? { sku } : {}),
    ...(regular !== null && regular > price
      ? { list_price: ucpAmount(regular, currency) }
      : {}),
    ...(codes.length > 0 ? { barcodes: codes } : {}),
    ...(variation?.permalink ? { url: variation.permalink } : {}),
    ...(variation?.image?.src
      ? {
          media: [
            {
              type: "image",
              url: variation.image.src,
              alt_text: variation.image.alt || product.name,
            },
          ],
        }
      : {}),
    requires: { shipping: unit.virtual !== true },
    checkout_url: checkoutUrl(origin, product, variation),
    ...(Object.keys(meta).length > 0 ? { metadata: meta } : {}),
  };
};

/** Base option declarations (no signals): variable-axis attributes only. */
const formatOptions = (product: WcProduct): Record<string, unknown>[] =>
  (product.attributes ?? [])
    .filter((attribute) => attribute.variation && attribute.name)
    .map((attribute) => ({
      name: attribute.name,
      values: (attribute.options ?? []).map((label) => ({ label })),
    }));

/**
 * Whether a variation satisfies a selection. An axis missing from the
 * variation's attributes is "Any" and matches every value; otherwise labels
 * must match (case-insensitive — wc/v3 carries no stable term ids).
 */
const variationMatches = (
  variation: WcVariation,
  selection: SelectedOption[],
): boolean => {
  for (const selected of selection) {
    const axis = (variation.attributes ?? []).find(
      (attribute) =>
        attribute.name.toLowerCase() === selected.name.toLowerCase(),
    );
    if (!axis?.option) continue; // "Any" matches anything
    if (axis.option.toLowerCase() !== selected.label.toLowerCase()) {
      return false;
    }
  }
  return true;
};

/** Options annotated with `available` / `exists` relative to the selection. */
const formatOptionsWithSignals = (
  product: WcProduct,
  variations: WcVariation[],
  selection: SelectedOption[],
): Record<string, unknown>[] =>
  (product.attributes ?? [])
    .filter((attribute) => attribute.variation && attribute.name)
    .map((attribute) => ({
      name: attribute.name,
      values: (attribute.options ?? []).map((label) => {
        const candidate = [
          ...selection.filter(
            (selected) =>
              selected.name.toLowerCase() !== attribute.name.toLowerCase(),
          ),
          { name: attribute.name, label },
        ];

        const matching = variations.filter((variation) =>
          variationMatches(variation, candidate),
        );
        const exists = matching.length > 0;
        const available = matching.some(
          (variation) => availabilityOf(variation.stock_status).available,
        );

        return { label, available, exists };
      }),
    }));

/** Whether a purchasable unit satisfies the normalized price/stock filters. */
const unitPassesFilters = (
  unit: { price: string; stock_status: string },
  filters: CatalogFilters,
  currency: string,
): boolean => {
  if (filters.priceMin !== null || filters.priceMax !== null) {
    const price = toMinorUnits(unit.price, currency) ?? 0;
    if (filters.priceMin !== null && price < filters.priceMin) return false;
    if (filters.priceMax !== null && price > filters.priceMax) return false;
  }
  if (
    filters.inStock === true &&
    !availabilityOf(unit.stock_status).available
  ) {
    return false;
  }
  return true;
};

/** Whether a product belongs to any requested category (name or slug, OR). */
const categoryMatch = (product: WcProduct, wanted: string[]): boolean => {
  if (wanted.length === 0) return true;
  const lowered = wanted.map((value) => value.toLowerCase());
  return (product.categories ?? []).some(
    (category) =>
      lowered.includes(category.name.toLowerCase()) ||
      lowered.includes(category.slug.toLowerCase()),
  );
};

/**
 * Picks the representative variation: the default-attributes match when the
 * product declares defaults, else the first published variation.
 */
const featuredVariation = (
  product: WcProduct,
  variations: WcVariation[],
): WcVariation | undefined => {
  const defaults = product.default_attributes ?? [];
  if (defaults.length > 0) {
    const selection = defaults
      .filter((entry) => entry.name && entry.option)
      .map((entry) => ({ name: entry.name, label: entry.option }));
    const match = variations.find((variation) =>
      variationMatches(variation, selection),
    );
    if (match) return match;
  }
  return variations[0];
};

/**
 * Relaxes the selection by dropping the least-preferred option (unlisted
 * options first, then from the end of `preferences`) until at least one
 * variation matches — the reference relax_selection.
 */
const relaxSelection = (
  variations: WcVariation[],
  selected: SelectedOption[],
  preferences: string[],
): SelectedOption[] => {
  const matchesAny = (selection: SelectedOption[]) =>
    variations.some((variation) => variationMatches(variation, selection));

  const rank = new Map(preferences.map((name, index) => [name, index]));

  const relax = (current: SelectedOption[]): SelectedOption[] => {
    if (current.length === 0 || matchesAny(current)) return current;

    const scored = current.map((option, index) => ({
      index,
      score: rank.has(option.name)
        ? (rank.get(option.name) as number)
        : Number.MAX_SAFE_INTEGER,
    }));
    const drop = scored.reduce((worst, candidate) =>
      candidate.score >= worst.score ? candidate : worst,
    );

    return relax(current.filter((_, index) => index !== drop.index));
  };

  return relax(selected);
};

/** Regular (pre-discount) price range across units, or null when unset. */
const listPriceRange = (
  product: WcProduct,
  variations: WcVariation[],
  currency: string,
): [number, number] | null => {
  const regulars = (
    variations.length > 0
      ? variations.map(
          (variation) => variation.regular_price || variation.price,
        )
      : [product.regular_price]
  )
    .map((value) => toMinorUnits(value, currency))
    .filter((value): value is number => value !== null);
  if (regulars.length === 0) return null;
  return [Math.min(...regulars), Math.max(...regulars)];
};

/**
 * Maps a wc/v3 product (plus its variations, when fetched) to a UCP product
 * and seeds the variant cache so those ids resolve in cart line items.
 */
const mapProduct = async (
  storeId: string,
  mapping: MappingContext,
  product: WcProduct,
  variations: WcVariation[],
): Promise<Record<string, unknown>> => {
  const { currency, units } = mapping;
  const published = variations.filter(
    (variation) => variation.status === "publish",
  );

  const variants =
    published.length > 0
      ? published.map((variation) =>
          buildVariant({ mapping, product, variation }),
        )
      : [buildVariant({ mapping, product })];

  for (const variant of variants) {
    const price = variant.price as { amount: number };
    const media = variant.media as { url: string }[] | undefined;
    await rememberVariant(storeId, {
      externalId: String(variant.id),
      parentId: String(product.id),
      title:
        variant.title === "Default"
          ? product.name
          : `${product.name} — ${variant.title}`,
      unitPrice: price.amount,
      ...(media?.[0]?.url
        ? { imageUrl: media[0].url }
        : product.images?.[0]?.src
          ? { imageUrl: product.images[0].src }
          : {}),
    });
  }

  const amounts = variants.map(
    (variant) => (variant.price as { amount: number }).amount,
  );
  const minPrice = Math.min(...amounts);
  const maxPrice = Math.max(...amounts);

  const listRange = listPriceRange(product, published, currency);
  const hasDiscount =
    listRange !== null &&
    (listRange[0] !== minPrice || listRange[1] !== maxPrice);

  const options = formatOptions(product);

  const rating = (() => {
    const value = Number.parseFloat(product.average_rating ?? "");
    if (!Number.isFinite(value) || value <= 0 || !product.rating_count)
      return null;
    return { value, scale_min: 1, scale_max: 5, count: product.rating_count };
  })();

  // Exclude WooCommerce's auto-assigned "Uncategorized" placeholder.
  const categories = (product.categories ?? [])
    .filter((category) => category?.name && category.slug !== "uncategorized")
    .map((category) => ({ value: category.name, taxonomy: "merchant" }));

  const tags = (product.tags ?? [])
    .filter((tag) => tag?.name)
    .map((tag) => tag.name);

  const metadata = productMetadata(product, units);

  return {
    id: String(product.id),
    handle: product.slug || String(product.id),
    title: product.name,
    description: description(product.description || product.short_description),
    ...(product.permalink ? { url: product.permalink } : {}),
    price_range: {
      min: ucpAmount(minPrice, currency),
      max: ucpAmount(maxPrice, currency),
    },
    ...(hasDiscount
      ? {
          list_price_range: {
            min: ucpAmount(listRange[0], currency),
            max: ucpAmount(listRange[1], currency),
          },
        }
      : {}),
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
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
};

const fetchVariations = async (
  context: UcpStoreContext,
  productId: number,
): Promise<WcVariation[]> => {
  const response = await wcRequest<WcVariation[]>(
    context,
    `/products/${productId}/variations`,
    // Oldest-first so the "featured" fallback (first variation) matches the
    // storefront's natural variation order rather than wc/v3's newest-first.
    { per_page: "100", status: "publish", order: "asc" },
  );
  return (response?.data ?? []).filter(
    (variation) => variation.status === "publish",
  );
};

const mappingContext = async (
  context: UcpStoreContext,
): Promise<MappingContext> => ({
  origin: storefrontOrigin(context.store.domain),
  currency: await storeCurrency(context),
  units: await storeMeasurementUnits(context),
});

// ─── Identifier resolution ───────────────────────────────────────────────────

type ResolvedUnit = {
  parent: WcProduct;
  variations: WcVariation[];
  /** The purchasable unit the id resolved to (a variation, or the parent). */
  unit: WcVariation | WcProduct;
  match: "exact" | "featured";
};

/**
 * Resolves catalog identifiers (product id, variation id, SKU, or handle) to
 * purchasable units, mirroring the reference resolve_lookup: a variation id
 * is an exact unit; a variable product resolves to its featured variation; a
 * simple product is its own unit. Variation ids resolve through the variant
 * cache seeded by prior catalog reads (wc/v3 can't address them directly).
 */
const resolveUnits = async (
  context: UcpStoreContext,
  ids: string[],
): Promise<Map<string, ResolvedUnit> | null> => {
  if (!context.credentials || ids.length === 0) return null;

  const numeric = ids.filter((id) => /^\d+$/.test(id));
  const textual = ids.filter((id) => !/^\d+$/.test(id));

  const fetchBatch = (params: Record<string, string>) =>
    wcRequest<WcProduct[]>(context, "/products", {
      per_page: "100",
      status: "publish",
      ...params,
    });

  const batches = await Promise.all([
    numeric.length > 0
      ? fetchBatch({ include: numeric.join(",") })
      : Promise.resolve({ data: [] as WcProduct[], headers: new Headers() }),
    textual.length > 0
      ? fetchBatch({ sku: textual.join(",") })
      : Promise.resolve({ data: [] as WcProduct[], headers: new Headers() }),
  ]);
  if (batches.some((batch) => batch === null)) return null;

  const products = new Map<number, WcProduct>();
  for (const batch of batches) {
    for (const product of batch?.data ?? []) {
      products.set(product.id, product);
    }
  }

  // Handles (slugs) resolve individually — wc/v3 has no batched slug filter.
  for (const id of textual) {
    const alreadyMatched = [...products.values()].some(
      (product) => product.sku === id || product.slug === id,
    );
    if (alreadyMatched) continue;
    const bySlug = await fetchBatch({ slug: id });
    for (const product of bySlug?.data ?? []) {
      products.set(product.id, product);
    }
  }

  // Unmatched numeric ids may be variation ids — resolve parents through the
  // variant cache.
  for (const id of numeric) {
    if ([...products.values()].some((product) => String(product.id) === id)) {
      continue;
    }
    const remembered = await recallVariant(context.store.id, id);
    if (!remembered || remembered.parentId === remembered.externalId) continue;
    if (products.has(Number(remembered.parentId))) continue;
    const parentBatch = await fetchBatch({ include: remembered.parentId });
    for (const product of parentBatch?.data ?? []) {
      products.set(product.id, product);
    }
  }

  // Expand variations for variable products (bounded).
  const variationsByParent = new Map<number, WcVariation[]>();
  const budget = { remaining: MAX_VARIATION_FETCHES };
  for (const product of products.values()) {
    if (product.type !== "variable" || (product.variations ?? []).length === 0)
      continue;
    if (budget.remaining <= 0) break;
    budget.remaining -= 1;
    variationsByParent.set(
      product.id,
      await fetchVariations(context, product.id),
    );
  }

  const resolved = new Map<string, ResolvedUnit>();
  for (const id of ids) {
    const entry = (() => {
      for (const product of products.values()) {
        const variations = variationsByParent.get(product.id) ?? [];

        // Exact variation match.
        const variation = variations.find(
          (candidate) => String(candidate.id) === id,
        );
        if (variation) {
          return {
            parent: product,
            variations,
            unit: variation,
            match: "exact" as const,
          };
        }

        // Product-level match by id, SKU, or handle.
        if (
          String(product.id) === id ||
          (product.sku !== "" && product.sku === id) ||
          product.slug === id
        ) {
          if (product.type === "variable") {
            const featured = featuredVariation(product, variations);
            if (!featured) return null; // no purchasable variant to represent it
            return {
              parent: product,
              variations,
              unit: featured,
              match: "featured" as const,
            };
          }
          return {
            parent: product,
            variations,
            unit: product,
            match: "exact" as const,
          };
        }
      }
      return null;
    })();

    if (entry) resolved.set(id, entry);
  }

  return resolved;
};

// ─── Public operations ───────────────────────────────────────────────────────

export type LiveSearchResult = {
  products: Record<string, unknown>[];
  totalCount: number;
  hasNextPage: boolean;
  messages: UcpMessage[];
};

/**
 * Reconciles a price filter's denomination with the store currency: when the
 * request's context declares a different currency there is no converter
 * hosted-side, so the price filter is dropped with an info message rather
 * than mis-compared — the reference resolve_price_filter's fallback path.
 */
const resolvePriceFilter = (
  filters: CatalogFilters,
  contextCurrency: string,
  storeCurrencyCode: string,
  messages: UcpMessage[],
): CatalogFilters => {
  if (filters.priceMin === null && filters.priceMax === null) return filters;
  if (contextCurrency === "" || contextCurrency === storeCurrencyCode) {
    return filters;
  }
  messages.push(
    infoMessage(
      "price_filter_ignored",
      `Price filter ignored: cannot convert ${contextCurrency} amounts to ${storeCurrencyCode}.`,
    ),
  );
  return { ...filters, priceMin: null, priceMax: null };
};

/**
 * Live catalog search via `GET /wc/v3/products?search=…`. In-stock-only by
 * default (the reference excludes out-of-stock unless the filter explicitly
 * includes it); category names resolve to term ids and push down; price
 * bounds push down as min/max_price. Variable products expand their real
 * variations within a bounded budget.
 */
export const liveSearch = async ({
  context,
  query,
  filters,
  contextCurrency = "",
  page,
  limit,
}: {
  context: UcpStoreContext;
  query: string;
  filters: CatalogFilters;
  contextCurrency?: string;
  page: number;
  limit: number;
}): Promise<LiveSearchResult | null> => {
  if (!context.credentials) return null;

  const mapping = await mappingContext(context);
  const messages: UcpMessage[] = [];
  const resolved = resolvePriceFilter(
    filters,
    contextCurrency.toUpperCase(),
    mapping.currency,
    messages,
  );
  const exponent = 10 ** currencyExponent(mapping.currency);

  // Category push-down: resolve names/slugs to term ids. Requested categories
  // that don't exist mean an empty result, mirroring the reference's WC query.
  const categoryIds: number[] = [];
  if (resolved.categories.length > 0) {
    const known = await storeCategories(context);
    for (const wanted of resolved.categories) {
      const match = known.find(
        (category) =>
          category.name.toLowerCase() === wanted.toLowerCase() ||
          category.slug.toLowerCase() === wanted.toLowerCase(),
      );
      if (match) categoryIds.push(match.id);
    }
    if (categoryIds.length === 0) {
      return { products: [], totalCount: 0, hasNextPage: false, messages };
    }
  }

  // Stock default is the merchant's call (plugin "Catalog Stock" setting,
  // default in-stock-only); an explicit agent `in_stock` filter always wins.
  const inStockOnly =
    resolved.inStock ?? !(context.storefront?.includeOutOfStock === true);

  const params: Record<string, string> = {
    status: "publish",
    per_page: String(limit),
    page: String(page),
    ...(query !== "" ? { search: query } : {}),
    ...(inStockOnly ? { stock_status: "instock" } : {}),
    ...(categoryIds.length > 0 ? { category: categoryIds.join(",") } : {}),
    ...(resolved.priceMin !== null
      ? { min_price: String(resolved.priceMin / exponent) }
      : {}),
    ...(resolved.priceMax !== null
      ? { max_price: String(resolved.priceMax / exponent) }
      : {}),
  };

  const cacheKey = `ucp:wc:search:${context.store.id}:${createHash("md5")
    .update(JSON.stringify(params))
    .digest("hex")}`;

  const result = await cached<Omit<LiveSearchResult, "messages">>(
    cacheKey,
    SEARCH_CACHE_TTL,
    async () => {
      const response = await wcRequest<WcProduct[]>(
        context,
        "/products",
        params,
      );
      if (!response) return null;

      const budget = { remaining: MAX_VARIATION_FETCHES };
      const products = [];
      for (const row of response.data) {
        const variations =
          row.type === "variable" &&
          (row.variations ?? []).length > 0 &&
          budget.remaining > 0
            ? await (async () => {
                budget.remaining -= 1;
                return fetchVariations(context, row.id);
              })()
            : [];
        products.push(
          await mapProduct(context.store.id, mapping, row, variations),
        );
      }

      const totalCount = Number(
        response.headers.get("X-WP-Total") ?? products.length,
      );
      const totalPages = Number(
        response.headers.get("X-WP-TotalPages") ?? page,
      );

      return {
        products,
        totalCount: Number.isFinite(totalCount) ? totalCount : products.length,
        hasNextPage: Number.isFinite(totalPages) && page < totalPages,
      };
    },
  );

  if (!result) return null;
  return { ...result, messages };
};

export type LiveLookupResult = {
  products: Record<string, unknown>[];
  missing: string[];
  messages: UcpMessage[];
};

/**
 * Live batch lookup, mirroring the reference: identifiers resolve to
 * purchasable units grouped under their parent product; each returned variant
 * carries `inputs: [{id, match}]` correlation. Filters apply with AND logic —
 * categories narrow products, price/stock narrow units — and a product whose
 * matched units were all filtered out is dropped.
 */
export const liveLookup = async ({
  context,
  ids,
  filters = emptyFilters(),
  contextCurrency = "",
}: {
  context: UcpStoreContext;
  ids: string[];
  filters?: CatalogFilters;
  contextCurrency?: string;
}): Promise<LiveLookupResult | null> => {
  if (!context.credentials || ids.length === 0) return null;

  const mapping = await mappingContext(context);
  const messages: UcpMessage[] = [];
  const resolved = resolvePriceFilter(
    filters,
    contextCurrency.toUpperCase(),
    mapping.currency,
    messages,
  );

  const units = await resolveUnits(context, ids);
  if (units === null) return null;

  // Group matched units under their parent, preserving first-seen order and
  // recording which input(s) correlated to each unit.
  type Group = {
    parent: WcProduct;
    variations: WcVariation[];
    units: Map<
      number,
      {
        unit: WcVariation | WcProduct;
        isVariation: boolean;
        inputs: { id: string; match: string }[];
      }
    >;
  };
  const groups = new Map<number, Group>();
  const order: number[] = [];
  const missing: string[] = [];

  for (const id of ids) {
    const match = units.get(id);
    if (!match) {
      missing.push(id);
      continue;
    }
    const parentId = match.parent.id;
    const group = groups.get(parentId) ?? {
      parent: match.parent,
      variations: match.variations,
      units: new Map(),
    };
    if (!groups.has(parentId)) {
      groups.set(parentId, group);
      order.push(parentId);
    }
    const unitId = match.unit.id;
    const entry = group.units.get(unitId) ?? {
      unit: match.unit,
      isVariation: match.unit.id !== match.parent.id,
      inputs: [],
    };
    entry.inputs.push({ id, match: match.match });
    group.units.set(unitId, entry);
  }

  const products: Record<string, unknown>[] = [];
  for (const parentId of order) {
    const group = groups.get(parentId) as Group;
    if (!categoryMatch(group.parent, resolved.categories)) continue;

    const passing = [...group.units.values()].filter((entry) =>
      unitPassesFilters(entry.unit, resolved, mapping.currency),
    );
    if (passing.length === 0) continue; // every matched unit was filtered out

    const base = await mapProduct(
      context.store.id,
      mapping,
      group.parent,
      group.variations,
    );
    products.push({
      ...base,
      variants: passing.map((entry) => ({
        ...buildVariant({
          mapping,
          product: group.parent,
          ...(entry.isVariation
            ? { variation: entry.unit as WcVariation }
            : {}),
        }),
        inputs: entry.inputs,
      })),
    });
  }

  return { products, missing, messages };
};

export type LiveProductResult =
  | { status: "ok"; product: Record<string, unknown>; messages: UcpMessage[] }
  | { status: "not_found" };

/**
 * Live single-product detail, mirroring the reference get_product: the
 * effective selection (client `selected` → the requested variation's own
 * options → relaxed via `preferences` → the default-attributes/featured
 * variation) drives `product.selected`, the `available`/`exists` option
 * signals, and the variant subset (filter-narrowed but never empty; the
 * requested variation leads the list).
 */
export const liveProduct = async ({
  context,
  id,
  selected = [],
  preferences = [],
  filters = emptyFilters(),
  contextCurrency = "",
}: {
  context: UcpStoreContext;
  id: string;
  selected?: SelectedOption[];
  preferences?: string[];
  filters?: CatalogFilters;
  contextCurrency?: string;
}): Promise<LiveProductResult | null> => {
  if (!context.credentials) return null;

  const cacheKey = `ucp:wc:product:${context.store.id}:${createHash("md5")
    .update(
      JSON.stringify({ id, selected, preferences, filters, contextCurrency }),
    )
    .digest("hex")}`;

  return cached<LiveProductResult>(cacheKey, PRODUCT_CACHE_TTL, async () => {
    const mapping = await mappingContext(context);
    const messages: UcpMessage[] = [];
    const resolved = resolvePriceFilter(
      filters,
      contextCurrency.toUpperCase(),
      mapping.currency,
      messages,
    );

    const units = await resolveUnits(context, [id]);
    if (units === null) return null;
    const match = units.get(id);
    if (!match) return { status: "not_found" };

    const { parent, variations } = match;
    const base = await mapProduct(
      context.store.id,
      mapping,
      parent,
      variations,
    );

    if (parent.type !== "variable" || variations.length === 0) {
      return { status: "ok", product: base, messages };
    }

    const featuredId =
      match.match === "exact" && match.unit.id !== parent.id
        ? String(match.unit.id)
        : null;

    // Effective selection: client choices → the requested variation's options
    // → relaxed until a variant matches → the featured variation's defaults.
    const initial =
      selected.length > 0
        ? selected
        : featuredId
          ? variationOptions(match.unit as WcVariation)
          : [];
    const relaxed = relaxSelection(variations, initial, preferences);
    const effective =
      relaxed.length > 0
        ? relaxed
        : (() => {
            const featured = featuredVariation(parent, variations);
            return featured ? variationOptions(featured) : [];
          })();

    // Variants narrow to the selection, then to the filters (never to zero);
    // the requested variation, when any, leads the list.
    const matching = variations.filter((variation) =>
      variationMatches(variation, effective),
    );
    const pool = matching.length > 0 ? matching : variations;
    const filtered = pool.filter((variation) =>
      unitPassesFilters(variation, resolved, mapping.currency),
    );
    const subset = filtered.length > 0 ? filtered : pool;
    const ordered = featuredId
      ? [
          ...subset.filter((variation) => String(variation.id) === featuredId),
          ...subset.filter((variation) => String(variation.id) !== featuredId),
        ]
      : subset;

    return {
      status: "ok",
      product: {
        ...base,
        selected: effective,
        options: formatOptionsWithSignals(parent, variations, effective),
        variants: ordered.map((variation) =>
          buildVariant({ mapping, product: parent, variation }),
        ),
      },
      messages,
    };
  });
};

/**
 * Resolves one catalog id (product id, variation id, or SKU) to the data a
 * session line item needs. Variation ids hit the variant cache seeded by
 * catalog reads; everything else goes through a live unit resolution.
 */
export const resolveLineItemSource = async ({
  context,
  id,
}: {
  context: UcpStoreContext;
  id: string;
}): Promise<VariantSource | null> => {
  const remembered = await recallVariant(context.store.id, id);
  if (remembered) return remembered;

  const units = await resolveUnits(context, [id]);
  const match = units?.get(id);
  if (!match) return null;

  const currency = await storeCurrency(context);
  const isVariation = match.unit.id !== match.parent.id;
  const image = isVariation
    ? ((match.unit as WcVariation).image?.src ?? match.parent.images?.[0]?.src)
    : match.parent.images?.[0]?.src;

  return {
    externalId: String(match.unit.id),
    parentId: String(match.parent.id),
    title: isVariation
      ? `${match.parent.name} — ${variationTitle(match.parent, match.unit as WcVariation)}`
      : match.parent.name,
    unitPrice: toMinorUnits(match.unit.price, currency) ?? 0,
    ...(image ? { imageUrl: image } : {}),
  };
};
