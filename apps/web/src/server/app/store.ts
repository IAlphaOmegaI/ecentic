"use server";

import { resultify } from "@zenncore/utils";
import { and, eq, inArray, or } from "drizzle-orm";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { withContext } from "../utils/context";
import { Environment } from "../utils/environment";
import { NotFoundError, ValidationError } from "../utils/error";
import type { Document, ExecuteOptions } from "../utils/repository";
import { repository } from "../utils/repository";
import * as Feed from "./integration/feed";
import * as Shopify from "./integration/shopify";
import * as WooCommerce from "./integration/woocommerce";
import * as Product from "./product";
import * as Simulation from "./simulation";
import * as Tracking from "./tracking";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.store);

export type Type = Document<typeof schema.store>;

export const getForCurrentUser = withAuthentication(async (context) => {
  return find(Environment.SERVER, {
    where: eq(schema.store.userId, context.session.user.id),
    orderBy: [{ column: schema.store.createdAt, direction: "desc" }],
  });
}, "Store.getForCurrentUser");

/**
 * Loads a single store and asserts it belongs to the current user. Guards the
 * per-store dashboard routes (`/dashboard/[store]/*`) so a user can't view
 * another account's store by guessing its id.
 */
export const resolveForUser = withAuthentication(
  async (context, { store }: { store: string }) => {
    const result = await get(Environment.SERVER, store);
    if (!result.success) return result;

    if (!result.data || result.data.userId !== context.session.user.id)
      return { success: false as const, error: new NotFoundError("Store") };

    return { success: true as const, data: result.data };
  },
  "Store.resolveForUser",
);

/**
 * Platforms that represent a persistent, externally-identifiable storefront —
 * the ones a duplicate connection can be detected for. `csv` is excluded: its
 * `domain` is just the uploaded filename, so two unrelated uploads could share
 * one and must not be treated as the same store.
 */
const CONNECTABLE_PLATFORMS = [
  "shopify",
  "shopify-public",
  "woocommerce",
  "woocommerce-public",
  "feed",
] as const;

/**
 * Imports of a storefront's public catalog. Anyone can make one — it takes a
 * URL, not credentials — so none of them proves who owns the store.
 */
const PUBLIC_PLATFORMS = new Set<Type["platform"]>([
  "shopify-public",
  "woocommerce-public",
]);

export type Reconciliation =
  | { kind: "new" }
  | { kind: "owned"; store: Type }
  | { kind: "claimed" };

/**
 * Decides how to handle a connect attempt for a storefront that may already
 * exist in ecentic. A store is identified by its normalized `domain` and, for
 * OAuth platforms, its external `storeId`.
 *
 * - `new`     → nobody has it; create it.
 * - `owned`   → the same user already connected it; refresh that row in place.
 * - `claimed` → another account already connected it; the caller must reject.
 *
 * `verified` marks a connect that proves ownership (Shopify OAuth, WooCommerce
 * keys or the plugin's one-click). Such a connect looks past *other* accounts'
 * public imports: a visitor who typed a brand's URL into the landing hero must
 * never lock the real merchant out of connecting their own store. Public
 * imports keep the strict rule — any other account's row claims the store.
 */
export const reconcileConnection = withContext(
  async (
    _,
    {
      userId,
      domain,
      storeId,
      verified = false,
    }: {
      userId: string;
      domain: string;
      storeId?: string | null;
      verified?: boolean;
    },
    options?: ExecuteOptions,
  ) => {
    // `https://www.acme.com` and `https://acme.com` are one storefront: the
    // hero keeps what the merchant typed, a keyed connect keeps what they
    // pasted, and the two rarely agree on the `www.`.
    const domains = (() => {
      const parsed = resultify(() => new URL(domain));
      if (!parsed.success) return [domain];

      const { protocol, host } = parsed.data;
      const twin = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
      return [domain, `${protocol}//${twin}`];
    })();

    const identity =
      storeId != null && storeId !== ""
        ? or(
            inArray(schema.store.domain, domains),
            eq(schema.store.storeId, storeId),
          )
        : inArray(schema.store.domain, domains);

    const result = await find(
      Environment.SERVER,
      {
        where: and(
          identity,
          inArray(schema.store.platform, [...CONNECTABLE_PLATFORMS]),
        ),
      },
      options,
    );

    if (!result.success) return result;

    const stores = verified
      ? result.data.filter(
          (store) =>
            store.userId === userId || !PUBLIC_PLATFORMS.has(store.platform),
        )
      : result.data;

    const owned = stores.find((store) => store.userId === userId);
    if (owned)
      return {
        success: true as const,
        data: { kind: "owned" as const, store: owned },
      };

    if (stores.length > 0)
      return { success: true as const, data: { kind: "claimed" as const } };

    return { success: true as const, data: { kind: "new" as const } };
  },
  "Store.reconcileConnection",
);

export type Overview = Type & {
  productCount: number;
  simulations: number;
  winRate: number;
  agentVisits: number;
};

/**
 * All of the current user's stores, each enriched with the headline metrics the
 * `/dashboard` hub cards show: product count, overall win rate (derived from
 * simulations on the store's products), simulation volume, and 30-day agent
 * visits. Everything is aggregated in SQL — the hub only needs counts, so
 * pulling full product/simulation rows across the wire for it would ship the
 * whole catalog (and every simulation's reasoning prose) to count them.
 */
export const overviewForCurrentUser = withAuthentication(async (context) => {
  const userId = context.session.user.id;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [storeRows, productCounts, simulationStats, visits] = await Promise.all(
    [
      find(Environment.SERVER, {
        where: eq(schema.store.userId, userId),
        orderBy: [{ column: schema.store.createdAt, direction: "desc" }],
      }),
      Product.countByStoreForUser(Environment.SERVER, { user: userId }),
      Simulation.winStatsByStoreForUser(Environment.SERVER, { user: userId }),
      Tracking.countByStoreForUser(Environment.SERVER, {
        user: userId,
        since: thirtyDaysAgo,
      }),
    ],
  );
  if (!storeRows.success) return storeRows;
  if (!productCounts.success) return productCounts;
  if (!simulationStats.success) return simulationStats;
  if (!visits.success) return visits;
  if (storeRows.data.length === 0)
    return { success: true as const, data: [] as Overview[] };

  const productCountByStore = new Map(
    productCounts.data.map((row) => [row.storeId, row.count]),
  );
  const simulationStatsByStore = new Map(
    simulationStats.data.map((row) => [row.storeId, row]),
  );
  const visitsByStore = new Map(
    visits.data.map((row) => [row.storeId, row.count]),
  );

  const data = storeRows.data.map((store) => {
    const stats = simulationStatsByStore.get(store.id);
    const total = stats?.total ?? 0;
    const wins = stats?.wins ?? 0;

    return {
      ...store,
      productCount: productCountByStore.get(store.id) ?? 0,
      simulations: total,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
      agentVisits: visitsByStore.get(store.id) ?? 0,
    } satisfies Overview;
  });

  return { success: true as const, data };
}, "Store.overviewForCurrentUser");

export const syncProducts = withAuthentication(
  async (context, { store: id }: { store: string }) => {
    const store = await get(Environment.SERVER, id);
    if (!store.success) return store;

    // The platform syncs upsert every product with the *caller's* user id, so
    // syncing a store you don't own would move its catalog into your account.
    if (!store.data || store.data.userId !== context.session.user.id)
      return { success: false, error: new NotFoundError("Store") };

    switch (store.data.platform) {
      case "shopify":
        return Shopify.syncProducts({ store: id });
      case "shopify-public":
        return Shopify.syncPublicProducts({ store: id });
      case "woocommerce":
        return WooCommerce.syncProducts({ store: id });
      case "woocommerce-public":
        return WooCommerce.syncPublicProducts({ store: id });
      case "feed":
        return Feed.syncProducts({ store: id });
      default:
        return {
          success: false,
          error: new Error(`Unknown platform: ${store.data.platform}`),
        };
    }
  },
  "Store.syncProducts",
);

export const publishProductListing = withAuthentication(
  async (
    context,
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

    if (product.data.userId !== context.session.user.id)
      return { success: false, error: new Error("Not authorized") };

    const store = await get(Environment.SERVER, product.data.storeId);
    if (!store.success) return store;

    if (!store.data)
      return { success: false, error: new Error("Store not found") };

    if (store.data.userId !== context.session.user.id)
      return { success: false, error: new Error("Not authorized") };

    switch (store.data.platform) {
      case "shopify":
        return Shopify.updateProduct({ product: id, data });
      case "woocommerce":
        return WooCommerce.updateProduct({ product: id, data });
      case "shopify-public":
      case "woocommerce-public":
        return {
          success: false,
          error: new ValidationError(
            "This store was imported from its public catalog. Connect it with Shopify or the WooCommerce plugin to publish listings.",
          ),
        };
      default:
        return {
          success: false,
          error: new Error(
            `Listing publish is not supported for platform: ${store.data.platform}`,
          ),
        };
    }
  },
  "Store.publishProductListing",
);
