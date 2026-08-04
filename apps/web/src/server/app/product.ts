"use server";

import { unique } from "@zenncore/utils";
import { and, eq, inArray } from "drizzle-orm";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { dedupe } from "../utils/dedupe";
import { Environment } from "../utils/environment";
import type { Pager } from "../utils/pagination";
import type { Document, ExecuteOptions, Insertable } from "../utils/repository";
import { repository } from "../utils/repository";
import { themeEmbedDeepLink } from "../utils/shopify";
import * as Competitor from "./competitor";
import {
  checkProductPageSchema,
  NO_PAGE_URL,
  resolveStructuredDataStatus,
} from "./intelligence/page-schema";
import * as Scan from "./scan";
import * as Simulation from "./simulation";

export const {
  get,
  paginate,
  create,
  update,
  destroy,
  exists,
  count,
  find,
  upsert,
} = repository(schema.product);

/**
 * Insert a synced product, or refresh the existing row when the store already
 * has a product with the same `externalId`. Keyed on the store's
 * `(storeId, externalId)` unique index so re-syncs update in place instead of
 * duplicating the catalog — which keeps `product.id` stable and preserves the
 * simulations/optimizations that reference it. Products without an `externalId`
 * (some feed/CSV rows) always insert, since NULLs don't collide.
 */
export const sync = async (
  environment: Environment,
  data: Insertable<typeof schema.product>,
  options?: ExecuteOptions,
) =>
  upsert(
    environment,
    { ...data, updatedAt: new Date() },
    {
      target: [schema.product.storeId, schema.product.externalId],
      ...options,
    },
  );

const stores = repository(schema.store);

const PUBLISHABLE_PLATFORMS = new Set(["shopify", "woocommerce"]);

export type Type = Document<typeof schema.product>;

export const skimForCurrentUser = withAuthentication(
  async (context, { store }: { store?: string } = {}) => {
    return find(Environment.SERVER, {
      where: store
        ? and(
            eq(schema.product.userId, context.session.user.id),
            eq(schema.product.storeId, store),
          )
        : eq(schema.product.userId, context.session.user.id),
      limit: 10,
    });
  },
  "Product.skimForCurrentUser",
);

/**
 * Total product count for the current user, optionally scoped to a store. Use
 * this for count-only surfaces (e.g. the sidebar "Products" badge) instead of
 * `skimForCurrentUser().length`, which caps at the 10-row preview limit and
 * undercounts larger catalogs.
 */
export const countForCurrentUser = withAuthentication(
  async (context, { store }: { store?: string } = {}) => {
    return count(
      Environment.SERVER,
      store
        ? and(
            eq(schema.product.userId, context.session.user.id),
            eq(schema.product.storeId, store),
          )
        : eq(schema.product.userId, context.session.user.id),
    );
  },
  "Product.countForCurrentUser",
);

// `images` is a JSON-encoded string array; feed imports occasionally leave it
// malformed, so parse defensively instead of trusting the column.
const firstImage = (images: string | null) => {
  try {
    const parsed = JSON.parse(images ?? "[]");
    return Array.isArray(parsed) && typeof parsed[0] === "string"
      ? parsed[0]
      : null;
  } catch {
    return null;
  }
};

export type Candidate = {
  id: string;
  title: string;
  price: string | null;
  image: string | null;
};

/**
 * Full (uncapped) product list trimmed to display fields, for selection
 * surfaces like the scan setup roster. Use `paginateWithIntelligence` for the
 * products table and `skimForCurrentUser` for 10-row previews.
 */
export const listForCurrentUser = withAuthentication(
  async (context, { store }: { store?: string } = {}) => {
    const result = await find(Environment.SERVER, {
      where: store
        ? and(
            eq(schema.product.userId, context.session.user.id),
            eq(schema.product.storeId, store),
          )
        : eq(schema.product.userId, context.session.user.id),
      orderBy: [{ column: schema.product.title, direction: "asc" }],
    });
    if (!result.success) return result;

    return {
      success: true as const,
      data: result.data.map(
        (product): Candidate => ({
          id: product.id,
          title: product.title,
          price: product.price,
          image: firstImage(product.images),
        }),
      ),
    };
  },
  "Product.listForCurrentUser",
);

/**
 * Maps the onboarding `?connected=` query value to the store platforms it can
 * produce. A Shopify connect lands as either `shopify` (OAuth) or
 * `shopify-public` (public storefront), so both must be considered.
 */
type StorePlatform = (typeof schema.store.$inferSelect)["platform"];

const CONNECTED_PLATFORMS: Record<string, StorePlatform[]> = {
  shopify: ["shopify", "shopify-public"],
  woocommerce: ["woocommerce"],
};

/**
 * Full product catalog for the store the user just connected during onboarding,
 * scoping the product picker to that store so a previously-connected store's
 * catalog doesn't bleed in. Returns the whole catalog (no preview cap) so the
 * selector can offer every product to choose from — the free-tier scan limit is
 * enforced separately in the picker.
 *
 * Prefer the `connected` platform from the redirect (`?connected=shopify`) when
 * available: reconnecting a store issues a `Store.update` that preserves the
 * original `createdAt`, so "newest store overall" can resolve to a different,
 * older-platform store (e.g. a WooCommerce store connected after Shopify). When
 * no platform is given (CSV/feed flows redirect without the param), fall back to
 * the newest store — `find` defaults to `createdAt desc`, so limit 1 yields it.
 */
export const listForConnectedStore = withAuthentication(
  async (context, { connected }: { connected?: string } = {}) => {
    const userId = context.session.user.id;

    const platforms = connected ? CONNECTED_PLATFORMS[connected] : undefined;

    const latest = await stores.find(Environment.SERVER, {
      where: platforms
        ? and(
            eq(schema.store.userId, userId),
            inArray(schema.store.platform, platforms),
          )
        : eq(schema.store.userId, userId),
      limit: 1,
    });

    if (!latest.success) return latest;

    const store = latest.data[0];
    if (!store) return { success: true as const, data: [] as Type[] };

    return find(Environment.SERVER, {
      where: and(
        eq(schema.product.userId, userId),
        eq(schema.product.storeId, store.id),
      ),
    });
  },
  "Product.listForConnectedStore",
);

/**
 * The store a product selection belongs to. Onboarding steps carry product ids
 * in the URL rather than a store id, but competitors and scans are both
 * store-scoped — this resolves one from the other so the rivals detected during
 * onboarding land on the same catalog the products came from.
 *
 * Falls back to the newest store when the step is opened without a selection
 * (the "Skip" path), matching how the rest of onboarding resolves its store.
 * Returns null only when the account has no store at all.
 */
export const resolveStoreForSelection = withAuthentication(
  async (context, { products: ids }: { products?: string[] } = {}) => {
    const userId = context.session.user.id;

    if (ids && ids.length > 0) {
      const owned = await find(Environment.SERVER, {
        where: and(
          eq(schema.product.userId, userId),
          inArray(schema.product.id, ids),
        ),
        limit: 1,
      });
      if (!owned.success) return owned;

      const first = owned.data[0];
      if (first) return { success: true as const, data: first.storeId };
    }

    const latest = await stores.find(Environment.SERVER, {
      where: eq(schema.store.userId, userId),
      limit: 1,
    });
    if (!latest.success) return latest;

    return { success: true as const, data: latest.data[0]?.id ?? null };
  },
  "Product.resolveStoreForSelection",
);

const keys = [
  "title",
  "description",
  "price",
  "images",
  "sku",
  "structuredData",
] as const;

const computeDataQuality = (product: Type): number => {
  const filled = keys.filter((field) => {
    const value = product[field];
    if (!value) return false;

    if (field === "images") return value !== "[]";
    return true;
  }).length;

  return Math.round((filled / keys.length) * 100);
};

type Tally = { total: number; wins: number };

// Mirrors `computeModelWinRate`: no simulations for that model reads as 0.
const rateFromTally = (tally?: Tally): number =>
  tally && tally.total > 0 ? Math.round((tally.wins / tally.total) * 100) : 0;

const computeModelWinRate = (
  simulations: Simulation.Summary[],
  model: string,
): number => {
  const modelSimulations = simulations.filter(
    (simulation) => simulation.model === model,
  );
  if (modelSimulations.length === 0) return 0;

  const wins = modelSimulations.filter(
    (simulation) => simulation.winner === "product",
  ).length;

  return Math.round((wins / modelSimulations.length) * 100);
};

export const gatherIntelligence = dedupe(
  withAuthentication(async (context, { store }: { store?: string } = {}) => {
    const userId = context.session.user.id;

    // Powers the store dashboard's aggregate stats (total products, win-rate
    // averages, quality/optimization breakdowns), so it must cover the whole
    // catalog — not the 10-row preview `skimForCurrentUser` returns, which would
    // undercount totals and skew every average.
    // The product rows are needed whole (quality scoring reads the listing
    // itself), but the win rates are pure counting, so Postgres groups those
    // into one row per (product, model) instead of shipping every simulation.
    const [catalog, tallies, scan] = await Promise.all([
      find(Environment.SERVER, {
        where: store
          ? and(
              eq(schema.product.userId, userId),
              eq(schema.product.storeId, store),
            )
          : eq(schema.product.userId, userId),
      }),
      Simulation.tallyByProductModel(Environment.SERVER, { store }),
      Scan.getLatest(Environment.SERVER, { store }),
    ]);

    if (!catalog.success) return catalog;
    if (!tallies.success) return tallies;
    if (!scan.success) return scan;

    const products = catalog.data;

    // (product, model) tallies folded into a per-product view: an all-model
    // total plus the per-model breakdown the dashboard shows.
    const byProduct = new Map<
      string,
      { total: number; wins: number; models: Map<string, Tally> }
    >();

    for (const tally of tallies.data) {
      const entry = byProduct.get(tally.productId) ?? {
        total: 0,
        wins: 0,
        models: new Map<string, Tally>(),
      };
      const total = Number(tally.total);
      const wins = Number(tally.wins);

      entry.total += total;
      entry.wins += wins;
      entry.models.set(tally.model, { total, wins });
      byProduct.set(tally.productId, entry);
    }

    if (products.length === 0) {
      return {
        success: true,
        data: {
          products: [],
          total: 0,
          scan: scan.data[0],
        },
      };
    }

    const rows = products.map((product) => {
      const entry = byProduct.get(product.id);
      const total = entry?.total ?? 0;
      const wins = entry?.wins ?? 0;

      return {
        _id: product.id,
        title: product.title,
        price: product.price,
        currency: product.currency,
        sku: product.sku,
        winRate: {
          total: total > 0 ? Math.round((wins / total) * 100) : 0,
          gpt4: rateFromTally(entry?.models.get("gpt4")),
          claude: rateFromTally(entry?.models.get("claude")),
          gemini: rateFromTally(entry?.models.get("gemini")),
        },
        simulations: total,
        quality: computeDataQuality(product),
        updatedAt: product.updatedAt,
      };
    });

    return {
      success: true,
      data: {
        products: rows,
        total: products.length,
        scan: scan.data[0],
      },
    };
  }, "Product.gatherIntelligence"),
);

const enrichProduct = (product: Type, simulations: Simulation.Type[]) => {
  const productSimulations = simulations.filter(
    (simulation) => simulation.productId === product.id,
  );

  const wins = productSimulations.filter(
    (simulation) => simulation.winner === "product",
  ).length;
  const total = productSimulations.length;

  return {
    _id: product.id,
    title: product.title,
    price: product.price,
    currency: product.currency,
    sku: product.sku,
    winRate: {
      total: total > 0 ? Math.round((wins / total) * 100) : 0,
      gpt4: computeModelWinRate(productSimulations, "gpt4"),
      claude: computeModelWinRate(productSimulations, "claude"),
      gemini: computeModelWinRate(productSimulations, "gemini"),
    },
    simulations: total,
    quality: computeDataQuality(product),
    updatedAt: product.updatedAt,
  };
};

export const paginateWithIntelligence = withAuthentication(
  async (context, { page, size, store }: Pager & { store?: string }) => {
    const result = await paginate(Environment.SERVER, page, size, {
      where: store
        ? and(
            eq(schema.product.userId, context.session.user.id),
            eq(schema.product.storeId, store),
          )
        : eq(schema.product.userId, context.session.user.id),
    });

    if (!result.success) return result;

    const { items, pagination } = result.data;

    const simulations = await Simulation.getForProducts(Environment.SERVER, {
      products: items.map((product) => product.id),
    });

    if (!simulations.success) return simulations;

    const rows = items.map((product) =>
      enrichProduct(product, simulations.data),
    );

    return {
      success: true,
      data: {
        items: rows,
        pagination,
      },
    };
  },
  "Product.paginateWithIntelligence",
);

const Model = {
  ChatGPT: ["ChatGPT", "gpt4"],
  Claude: ["Claude", "claude"],
  GEMINI: ["Gemini", "gemini"],
} as const;

export const getDetail = withAuthentication(
  async (context, { id, store: storeId }: { id: string; store?: string }) => {
    const product = await get(Environment.SERVER, id);

    if (!product.success) return product;
    if (!product.data)
      return { success: false, error: new Error("Product not found") };

    if (product.data.userId !== context.session.user.id)
      return { success: false, error: new Error("Not authorized") };

    if (storeId && product.data.storeId !== storeId)
      return { success: false, error: new Error("Product not found") };

    // Live truth: whether AI agents actually see schema.org markup on the
    // rendered storefront — distinct from the `structuredData` we generated and
    // hold locally. Cached hourly, so this doesn't slow repeat loads.
    const liveSchema = product.data.url
      ? await checkProductPageSchema(product.data.url)
      : NO_PAGE_URL;

    const store = product.data.storeId
      ? await stores.get(Environment.SERVER, product.data.storeId)
      : null;
    const canPublish = Boolean(
      store?.success &&
        store.data &&
        PUBLISHABLE_PLATFORMS.has(store.data.platform),
    );

    // Only Shopify has an app embed to switch on, so only Shopify gets the
    // deep link that fixes a `missing` + embed-off page in one click.
    const themeEditorUrl =
      store?.success && store.data && store.data.platform === "shopify"
        ? themeEmbedDeepLink(store.data.domain)
        : null;

    const simulations = await Simulation.getForProducts(Environment.SERVER, {
      products: [id],
    });
    if (!simulations.success) return simulations;

    const competitorIds = unique(
      simulations.data.map((simulation) => simulation.competitorId),
    );

    const results = await Competitor.find(Environment.SERVER, {
      where: inArray(schema.competitor.id, competitorIds),
    });

    if (!results.success) return results;

    const map = new Map(
      results.data.map((competitor) => [competitor.id, competitor]),
    );

    const models = Object.values(Model).map(([label, id]) => {
      const modelSimulations = simulations.data.filter(
        (simulation) => simulation.model === id,
      );
      const wins = modelSimulations.filter(
        (simulation) => simulation.winner === "product",
      ).length;

      return {
        model: id,
        label: label,
        rate:
          modelSimulations.length > 0
            ? Math.round((wins / modelSimulations.length) * 100)
            : 0,
        wins,
        losses: modelSimulations.length - wins,
        total: modelSimulations.length,
      };
    });

    const competitors = competitorIds.map((competitorId) => {
      const competitor = map.get(competitorId);

      const competitorSimulations = simulations.data.filter(
        (simulation) => simulation.competitorId === competitorId,
      );
      const wins = competitorSimulations.filter(
        (simulation) => simulation.winner === "product",
      ).length;

      return {
        id: competitorId,
        title: competitor?.title ?? "Unknown",
        brand: competitor?.brand ?? null,
        image: competitor?.image ?? null,
        rate:
          competitorSimulations.length > 0
            ? Math.round((wins / competitorSimulations.length) * 100)
            : 0,
        wins,
        total: competitorSimulations.length,
      };
    });

    const wins = simulations.data.filter(
      (simulation) => simulation.winner === "product",
    ).length;

    const winRate =
      simulations.data.length > 0
        ? Math.round((wins / simulations.data.length) * 100)
        : 0;

    const enriched = simulations.data.map((simulation) => ({
      ...simulation,
      competitorTitle: map.get(simulation.competitorId)?.title ?? "Unknown",
    }));

    return {
      success: true,
      data: {
        product: {
          ...product.data,
          quality: computeDataQuality(product.data),
          structuredDataStatus: resolveStructuredDataStatus(
            liveSchema,
            Boolean(product.data.structuredData),
          ),
        },
        winRate,
        canPublish,
        themeEditorUrl,
        models,
        competitors,
        simulations: enriched,
      },
    };
  },
  "Product.getDetail",
);

/**
 * Store-level structured-data posture for the products list: whether the
 * ecentic app embed renders on the storefront at all. Enabling the embed is a
 * one-time, store-wide action, so the products page surfaces it once instead
 * of per product. Sampled from one product page (check cached hourly by URL).
 */
export const getStoreEmbedStatus = withAuthentication(
  async (context, { store: storeId }: { store: string }) => {
    const store = await stores.get(Environment.SERVER, storeId);
    if (!store.success) return store;
    if (!store.data || store.data.userId !== context.session.user.id)
      return { success: false as const, error: new Error("Store not found") };

    if (
      store.data.platform !== "shopify" &&
      store.data.platform !== "shopify-public"
    )
      return {
        success: true as const,
        data: { embedOff: false, themeEditorUrl: null },
      };

    const products = await find(Environment.SERVER, {
      where: eq(schema.product.storeId, storeId),
      limit: 10,
    });
    if (!products.success) return products;

    const sample = products.data.find((product) => product.url);
    if (!sample?.url)
      return {
        success: true as const,
        data: { embedOff: false, themeEditorUrl: null },
      };

    const check = await checkProductPageSchema(sample.url);
    return {
      success: true as const,
      data: {
        embedOff: check.embed === "inactive",
        themeEditorUrl: themeEmbedDeepLink(store.data.domain),
      },
    };
  },
  "Product.getStoreEmbedStatus",
);
