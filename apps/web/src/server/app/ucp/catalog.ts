/**
 * UCP catalog operations (search / lookup / product) served from the synced
 * `product` table — one advantage of hosting UCP centrally is that catalog
 * reads never touch the store. Products are UCP-identified by their
 * WooCommerce product id (`externalId`), matching what carts/checkout resolve
 * and what the `/checkout-link/` hand-off expects.
 *
 * Synced WooCommerce products carry their full REST payload in `rawData`;
 * variable products are represented as a single default variant until
 * per-variation sync exists.
 */

import { db } from "@/server/database";
import { toMinorUnits, ucpAmount } from "./money";
import {
  CAPABILITY,
  contextualStorefrontUrl,
  errorMessage,
  infoMessage,
  type Negotiated,
  type UcpMessage,
  ucpBlock,
  ucpEnvelope,
} from "./protocol";
import type { UcpStoreContext } from "./store-context";
import * as WcCatalog from "./wc-catalog";

type ProductRow = {
  id: string;
  storeId: string;
  externalId: string | null;
  title: string;
  description: string | null;
  price: string | null;
  compareAtPrice: string | null;
  currency: string | null;
  images: string | null;
  url: string | null;
  sku: string | null;
  status: string | null;
  rawData: string | null;
};

type RawProduct = {
  slug?: string;
  type?: string;
  stock_status?: string;
  virtual?: boolean;
  average_rating?: string;
  rating_count?: number;
  categories?: { id: number; name: string; slug: string }[];
  tags?: { id: number; name: string; slug: string }[];
  attributes?: { name: string; options?: string[] }[];
};

const MAX_LOOKUP_IDS = 100;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

// ─── Row helpers ─────────────────────────────────────────────────────────────

const parseRaw = (row: ProductRow): RawProduct => {
  if (!row.rawData) return {};
  try {
    const parsed = JSON.parse(row.rawData);
    return parsed && typeof parsed === "object" ? (parsed as RawProduct) : {};
  } catch {
    return {};
  }
};

const parseImages = (row: ProductRow): string[] => {
  if (!row.images) return [];
  try {
    const parsed = JSON.parse(row.images);
    return Array.isArray(parsed)
      ? parsed.filter((src): src is string => typeof src === "string")
      : [];
  } catch {
    return [];
  }
};

const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const availabilityStatus = (raw: RawProduct): string => {
  switch (raw.stock_status) {
    case "outofstock":
      return "out_of_stock";
    case "onbackorder":
      return "backorder";
    default:
      return "in_stock";
  }
};

/** Canonical UCP product id: the WooCommerce product id. */
export const productUcpId = (row: ProductRow): string =>
  row.externalId ?? row.id;

const loadStoreProducts = async (storeId: string): Promise<ProductRow[]> => {
  const rows = await db.query.product.findMany({
    where: { storeId },
  });
  return rows.filter((row) => (row.status ?? "active") === "active");
};

export const findByUcpIds = async (
  storeId: string,
  ids: string[],
): Promise<Map<string, ProductRow>> => {
  const rows = await loadStoreProducts(storeId);
  const matched = new Map<string, ProductRow>();
  for (const id of ids) {
    const row = rows.find(
      (candidate) =>
        productUcpId(candidate) === id ||
        (candidate.sku !== null && candidate.sku === id),
    );
    if (row) matched.set(id, row);
  }
  return matched;
};

// ─── UCP product mapping ─────────────────────────────────────────────────────

const buildVariant = (row: ProductRow): Record<string, unknown> => {
  const currency = row.currency ?? "USD";
  const price = toMinorUnits(row.price, currency) ?? 0;
  const listPrice = toMinorUnits(row.compareAtPrice, currency);
  const raw = parseRaw(row);
  const status = availabilityStatus(raw);
  const images = parseImages(row);

  return {
    id: productUcpId(row),
    title: row.title,
    description: row.description ? stripHtml(row.description) : row.title,
    price: ucpAmount(price, currency),
    ...(listPrice !== null && listPrice > price
      ? { list_price: ucpAmount(listPrice, currency) }
      : {}),
    availability: {
      available: status === "in_stock" || status === "backorder",
      status,
    },
    ...(row.sku ? { sku: row.sku } : {}),
    ...(row.url ? { url: row.url } : {}),
    ...(images.length > 0
      ? { media: [{ type: "image", url: images[0], alt_text: row.title }] }
      : {}),
    requires: { shipping: raw.virtual !== true },
  };
};

export const formatProduct = (row: ProductRow): Record<string, unknown> => {
  const currency = row.currency ?? "USD";
  const price = toMinorUnits(row.price, currency) ?? 0;
  const listPrice = toMinorUnits(row.compareAtPrice, currency);
  const raw = parseRaw(row);
  const images = parseImages(row);
  const plain = row.description ? stripHtml(row.description) : row.title;

  const categories = (raw.categories ?? [])
    .filter((category) => category?.name)
    .map((category) => ({ value: category.name, taxonomy: "merchant" }));

  const tags = (raw.tags ?? [])
    .filter((tag) => tag?.name)
    .map((tag) => tag.name);

  const rating = (() => {
    const value = Number.parseFloat(raw.average_rating ?? "");
    if (!Number.isFinite(value) || value <= 0 || !raw.rating_count) return null;
    return {
      value,
      scale_min: 1,
      scale_max: 5,
      count: raw.rating_count,
    };
  })();

  return {
    id: productUcpId(row),
    handle: raw.slug ?? productUcpId(row),
    title: row.title,
    description: {
      plain,
      ...(row.description && row.description !== plain
        ? { html: row.description }
        : {}),
    },
    ...(row.url ? { url: row.url } : {}),
    price_range: {
      min: ucpAmount(price, currency),
      max: ucpAmount(price, currency),
    },
    ...(listPrice !== null && listPrice > price
      ? {
          list_price_range: {
            min: ucpAmount(listPrice, currency),
            max: ucpAmount(listPrice, currency),
          },
        }
      : {}),
    ...(categories.length > 0 ? { categories } : {}),
    ...(images.length > 0
      ? {
          media: images.map((url) => ({
            type: "image",
            url,
            alt_text: row.title,
          })),
        }
      : {}),
    variants: [buildVariant(row)],
    ...(tags.length > 0 ? { tags } : {}),
    ...(rating ? { rating } : {}),
  };
};

// ─── Requests ────────────────────────────────────────────────────────────────

const matchesFilters = (
  row: ProductRow,
  filters: WcCatalog.CatalogFilters,
): boolean => {
  const raw = parseRaw(row);
  const currency = row.currency ?? "USD";

  if (filters.categories.length > 0) {
    const names = (raw.categories ?? []).map((category) =>
      category.name.toLowerCase(),
    );
    if (
      !filters.categories.some((wanted) => names.includes(wanted.toLowerCase()))
    ) {
      return false;
    }
  }

  if (filters.priceMin !== null || filters.priceMax !== null) {
    const price = toMinorUnits(row.price, currency);
    if (price === null) return false;
    if (filters.priceMin !== null && price < filters.priceMin) return false;
    if (filters.priceMax !== null && price > filters.priceMax) return false;
  }

  if (filters.inStock === true) {
    if (availabilityStatus(parseRaw(row)) === "out_of_stock") return false;
  }

  return true;
};

const searchScore = (row: ProductRow, query: string): number => {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 1;
  const title = row.title.toLowerCase();
  const description = (row.description ?? "").toLowerCase();
  const sku = (row.sku ?? "").toLowerCase();

  const score = tokens.reduce((accumulated, token) => {
    switch (true) {
      case title.includes(token):
        return accumulated + 3;
      case sku === token:
        return accumulated + 3;
      case description.includes(token):
        return accumulated + 1;
      default:
        return accumulated;
    }
  }, 0);

  return score;
};

const decodeCursor = (cursor: string | undefined): number => {
  if (!cursor) return 1;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString()) as {
      page?: number;
    };
    return parsed.page && parsed.page > 0 ? parsed.page : 1;
  } catch {
    return 1;
  }
};

const encodeCursor = (page: number): string =>
  Buffer.from(JSON.stringify({ page })).toString("base64url");

export type CatalogResult = {
  status: number;
  body: Record<string, unknown>;
};

/** Normalizes the UCP Search Filters payload (prices stay in minor units). */
const parseCatalogFilters = (payload: unknown): WcCatalog.CatalogFilters => {
  const filters = WcCatalog.emptyFilters();
  if (!payload || typeof payload !== "object") return filters;
  const source = payload as {
    categories?: unknown;
    price?: { min?: unknown; max?: unknown };
    availability?: { in_stock?: unknown };
  };

  if (Array.isArray(source.categories)) {
    filters.categories = source.categories
      .filter((value): value is string => typeof value === "string")
      .filter((value) => value !== "");
  }
  if (typeof source.price?.min === "number") {
    filters.priceMin = Math.trunc(source.price.min);
  }
  if (typeof source.price?.max === "number") {
    filters.priceMax = Math.trunc(source.price.max);
  }
  if (typeof source.availability?.in_stock === "boolean") {
    filters.inStock = source.availability.in_stock;
  }
  return filters;
};

/** Whether the parsed filters carry at least one recognized search input. */
const hasSearchInput = (filters: WcCatalog.CatalogFilters): boolean =>
  filters.categories.length > 0 ||
  filters.priceMin !== null ||
  filters.priceMax !== null ||
  filters.inStock !== null;

/** Advisory buyer context: only the currency is meaningful hosted-side. */
const parseContextCurrency = (payload: unknown): string => {
  if (!payload || typeof payload !== "object") return "";
  const currency = (payload as { currency?: unknown }).currency;
  return typeof currency === "string" ? currency.toUpperCase() : "";
};

/**
 * `POST /catalog/search`. Live-first: results come from the store's
 * WooCommerce REST API v3 (current prices/stock, redis-cached); the synced
 * `product` table only answers when the store is unreachable.
 */
export const search = async ({
  context,
  negotiated,
  payload,
}: {
  context: UcpStoreContext;
  negotiated: Negotiated | null;
  payload: {
    query?: string;
    filters?: unknown;
    context?: unknown;
    pagination?: { limit?: number; cursor?: string };
  };
}): Promise<CatalogResult> => {
  const store = context.store;
  const relevant = [CAPABILITY.CATALOG_SEARCH];
  const query = (payload.query ?? "").trim();
  const filters = parseCatalogFilters(payload.filters);

  // Conformance: a valid request MUST carry at least one recognized input —
  // a query or a filter. Filter-only (browse) requests are accepted.
  if (query === "" && !hasSearchInput(filters)) {
    return {
      status: 400,
      body: {
        ucp: ucpBlock(relevant, negotiated, "error"),
        messages: [
          errorMessage(
            "invalid_request",
            "Provide a query or at least one filter.",
          ),
        ],
        continue_url: contextualStorefrontUrl(
          store.domain,
          "catalog.search",
          context.storefront?.urls,
        ),
      },
    };
  }

  const limitLive = Math.min(
    Math.max(payload.pagination?.limit ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );
  const pageLive = decodeCursor(payload.pagination?.cursor);

  const live = await WcCatalog.liveSearch({
    context,
    query,
    filters,
    contextCurrency: parseContextCurrency(payload.context),
    page: pageLive,
    limit: limitLive,
  });

  if (live) {
    return {
      status: 200,
      body: ucpEnvelope(
        {
          products: live.products,
          pagination: {
            has_next_page: live.hasNextPage,
            total_count: live.totalCount,
            ...(live.hasNextPage ? { cursor: encodeCursor(pageLive + 1) } : {}),
          },
          ...(live.messages.length > 0 ? { messages: live.messages } : {}),
        },
        relevant,
        negotiated,
      ),
    };
  }

  const rows = await loadStoreProducts(store.id);
  const scored = rows
    .filter((row) => matchesFilters(row, filters))
    .map((row) => ({ row, score: searchScore(row, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const limit = Math.min(
    Math.max(payload.pagination?.limit ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );
  const page = decodeCursor(payload.pagination?.cursor);
  const offset = (page - 1) * limit;
  const slice = scored.slice(offset, offset + limit);
  const hasNextPage = offset + limit < scored.length;

  return {
    status: 200,
    body: ucpEnvelope(
      {
        products: slice.map((entry) => formatProduct(entry.row)),
        pagination: {
          has_next_page: hasNextPage,
          total_count: scored.length,
          ...(hasNextPage ? { cursor: encodeCursor(page + 1) } : {}),
        },
      },
      relevant,
      negotiated,
    ),
  };
};

/** `POST /catalog/lookup` — batch by id, live-first with synced fallback. */
export const lookup = async ({
  context,
  negotiated,
  payload,
}: {
  context: UcpStoreContext;
  negotiated: Negotiated | null;
  payload: { ids?: unknown; filters?: unknown; context?: unknown };
}): Promise<CatalogResult> => {
  const store = context.store;
  const relevant = [CAPABILITY.CATALOG_LOOKUP];
  // Conformance: duplicate identifiers MUST be deduplicated (Batch Lookup).
  const ids = [
    ...new Set(
      Array.isArray(payload.ids)
        ? payload.ids
            .filter((id): id is string => typeof id === "string")
            .filter((id) => id !== "")
        : [],
    ),
  ];

  if (ids.length === 0) {
    return {
      status: 400,
      body: {
        ucp: ucpBlock(relevant, negotiated, "error"),
        messages: [errorMessage("invalid_request", "Provide ids to look up.")],
        continue_url: contextualStorefrontUrl(
          store.domain,
          "catalog.lookup",
          context.storefront?.urls,
        ),
      },
    };
  }

  if (ids.length > MAX_LOOKUP_IDS) {
    return {
      status: 400,
      body: {
        ucp: ucpBlock(relevant, negotiated, "error"),
        messages: [
          errorMessage(
            "request_too_large",
            `Lookup supports at most ${MAX_LOOKUP_IDS} ids per request.`,
          ),
        ],
        continue_url: contextualStorefrontUrl(
          store.domain,
          "catalog.lookup",
          context.storefront?.urls,
        ),
      },
    };
  }

  const live = await WcCatalog.liveLookup({
    context,
    ids,
    filters: parseCatalogFilters(payload.filters),
    contextCurrency: parseContextCurrency(payload.context),
  });

  const { products, missing, extraMessages } = await (async () => {
    if (live) {
      return {
        products: live.products,
        missing: live.missing,
        extraMessages: live.messages,
      };
    }
    const matched = await findByUcpIds(store.id, ids);
    return {
      products: [...new Set(matched.values())].map((row) => formatProduct(row)),
      missing: ids.filter((id) => !matched.has(id)),
      extraMessages: [] as UcpMessage[],
    };
  })();

  // Unresolved identifiers surface as info messages carrying the id itself,
  // mirroring the reference implementation.
  const messages: UcpMessage[] = [
    ...extraMessages,
    ...missing.map((id) => infoMessage("not_found", id)),
  ];

  return {
    status: 200,
    body: ucpEnvelope(
      {
        products,
        ...(messages.length > 0 ? { messages } : {}),
      },
      relevant,
      negotiated,
    ),
  };
};

/** Parses the agent's `selected: [{name, label, id?}]` option choices. */
const parseSelected = (payload: unknown): WcCatalog.SelectedOption[] => {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter(
      (entry): entry is { name: string; label: string; id?: string } =>
        !!entry &&
        typeof entry === "object" &&
        typeof (entry as { name?: unknown }).name === "string" &&
        typeof (entry as { label?: unknown }).label === "string",
    )
    .map((entry) => ({
      name: entry.name,
      label: entry.label,
      ...(typeof entry.id === "string" ? { id: entry.id } : {}),
    }));
};

/** Parses the buyer's option-name `preferences` (relaxation priority order). */
const parsePreferences = (payload: unknown): string[] =>
  Array.isArray(payload)
    ? payload
        .filter((entry): entry is string => typeof entry === "string")
        .filter((entry) => entry !== "")
    : [];

/** `POST /catalog/product` — single detail with full variations, live-first. */
export const productDetail = async ({
  context,
  negotiated,
  payload,
}: {
  context: UcpStoreContext;
  negotiated: Negotiated | null;
  payload: {
    id?: unknown;
    selected?: unknown;
    preferences?: unknown;
    filters?: unknown;
    context?: unknown;
  };
}): Promise<CatalogResult> => {
  const store = context.store;
  const relevant = [CAPABILITY.CATALOG_LOOKUP];
  const id = typeof payload.id === "string" ? payload.id : "";

  if (id === "") {
    return {
      status: 400,
      body: {
        ucp: ucpBlock(relevant, negotiated, "error"),
        messages: [errorMessage("invalid_request", "Provide a product id.")],
        continue_url: contextualStorefrontUrl(
          store.domain,
          "catalog.product",
          context.storefront?.urls,
        ),
      },
    };
  }

  // Miss is a business outcome: HTTP 200 with a UCP error envelope.
  const notFound: CatalogResult = {
    status: 200,
    body: {
      ucp: ucpBlock(relevant, negotiated, "error"),
      messages: [
        errorMessage(
          "not_found",
          `No product matches "${id}".`,
          "unrecoverable",
        ),
      ],
      continue_url: contextualStorefrontUrl(
        store.domain,
        "catalog.product",
        context.storefront?.urls,
      ),
    },
  };

  const live = await WcCatalog.liveProduct({
    context,
    id,
    selected: parseSelected(payload.selected),
    preferences: parsePreferences(payload.preferences),
    filters: parseCatalogFilters(payload.filters),
    contextCurrency: parseContextCurrency(payload.context),
  });
  if (live) {
    if (live.status === "not_found") return notFound;
    return {
      status: 200,
      body: ucpEnvelope(
        {
          product: live.product,
          ...(live.messages.length > 0 ? { messages: live.messages } : {}),
        },
        relevant,
        negotiated,
      ),
    };
  }

  const matched = await findByUcpIds(store.id, [id]);
  const row = matched.get(id);
  if (!row) return notFound;

  return {
    status: 200,
    body: ucpEnvelope({ product: formatProduct(row) }, relevant, negotiated),
  };
};
