"use server";

import { and, eq, gte, inArray, or, sql } from "drizzle-orm";
import { db, schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { withContext } from "../utils/context";
import { Environment } from "../utils/environment";
import { NotFoundError } from "../utils/error";
import type { Document, ExecuteOptions } from "../utils/repository";
import { repository } from "../utils/repository";
import * as Feed from "./integration/feed";
import * as Shopify from "./integration/shopify";
import * as WooCommerce from "./integration/woocommerce";
import * as Product from "./product";

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
  "feed",
] as const;

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
 */
export const reconcileConnection = withContext(
  async (
    _,
    {
      userId,
      domain,
      storeId,
    }: { userId: string; domain: string; storeId?: string | null },
    options?: ExecuteOptions,
  ) => {
    const identity =
      storeId != null && storeId !== ""
        ? or(eq(schema.store.domain, domain), eq(schema.store.storeId, storeId))
        : eq(schema.store.domain, domain);

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

    const owned = result.data.find((store) => store.userId === userId);
    if (owned)
      return {
        success: true as const,
        data: { kind: "owned" as const, store: owned },
      };

    if (result.data.length > 0)
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

  const [storeRows, productCounts, simulationStats, visits] = await Promise.all([
    find(Environment.SERVER, {
      where: eq(schema.store.userId, userId),
      orderBy: [{ column: schema.store.createdAt, direction: "desc" }],
    }),
    db
      .select({
        storeId: schema.product.storeId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.product)
      .where(eq(schema.product.userId, userId))
      .groupBy(schema.product.storeId),
    db
      .select({
        storeId: schema.product.storeId,
        total: sql<number>`count(*)::int`,
        wins: sql<number>`count(*) filter (where ${schema.simulation.winner} = 'product')::int`,
      })
      .from(schema.simulation)
      .innerJoin(
        schema.product,
        eq(schema.simulation.productId, schema.product.id),
      )
      .where(eq(schema.product.userId, userId))
      .groupBy(schema.product.storeId),
    db
      .select({
        storeId: schema.agentVisit.storeId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.agentVisit)
      .where(
        and(
          eq(schema.agentVisit.userId, userId),
          gte(schema.agentVisit.createdAt, thirtyDaysAgo),
        ),
      )
      .groupBy(schema.agentVisit.storeId),
  ]);
  if (!storeRows.success) return storeRows;
  if (storeRows.data.length === 0)
    return { success: true as const, data: [] as Overview[] };

  const productCountByStore = new Map(
    productCounts.map((row) => [row.storeId, row.count]),
  );
  const simulationStatsByStore = new Map(
    simulationStats.map((row) => [row.storeId, row]),
  );
  const visitsByStore = new Map(visits.map((row) => [row.storeId, row.count]));

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
  async (_, { store: id }: { store: string }) => {
    const store = await get(Environment.SERVER, id);
    if (!store.success) return store;

    if (!store.data)
      return { success: false, error: new Error("Store not found") };

    switch (store.data.platform) {
      case "shopify":
        return Shopify.syncProducts({ store: id });
      case "shopify-public":
        return Shopify.syncPublicProducts({ store: id });
      case "woocommerce":
        return WooCommerce.syncProducts({ store: id });
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
