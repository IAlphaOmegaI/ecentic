"use server";

import { resultify } from "@zenncore/utils";
import { and, count as countRows, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { dedupe } from "../utils/dedupe";
import { Environment } from "../utils/environment";
import { DatabaseError } from "../utils/error";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.simulation);

const products = repository(schema.product);

export type Type = Document<typeof schema.simulation>;

/**
 * A simulation row without its `reasoning` prose. Aggregation surfaces (win
 * rates, brand rollups, scan rescoping) only count winners per model, so they
 * should never pull each simulation's LLM paragraph over the wire.
 */
export type Summary = Omit<Type, "reasoning">;

/**
 * The products a tally covers: the signed-in user's catalog, narrowed to one
 * store when given. Kept as a subquery so the tallies never round-trip a list
 * of product ids.
 */
const productScope = (userId: string, store?: string) =>
  db
    .select({ id: schema.product.id })
    .from(schema.product)
    .where(
      store
        ? and(
            eq(schema.product.userId, userId),
            eq(schema.product.storeId, store),
          )
        : eq(schema.product.userId, userId),
    );

// `count(*) filter (...)` counts winners in the same pass as the total, so a
// tally costs one scan rather than a second query or a JS filter.
const winsExpression = sql<number>`count(${schema.simulation.id}) filter (where ${schema.simulation.winner} = 'product')`;

/**
 * Per-product, per-model win tallies computed by Postgres.
 *
 * Callers used to pull every simulation row for the catalog and re-filter the
 * whole array once per product per model — quadratic in the catalog, and
 * thousands of rows over the wire to produce a handful of percentages. This
 * returns one row per (product, model) pair instead.
 */
export const tallyByProductModel = dedupe(
  withAuthentication(async (context, { store }: { store?: string } = {}) => {
    const rows = await resultify(async () =>
      db
        .select({
          productId: schema.simulation.productId,
          model: schema.simulation.model,
          total: countRows(schema.simulation.id),
          wins: winsExpression,
        })
        .from(schema.simulation)
        .where(
          inArray(
            schema.simulation.productId,
            productScope(context.session.user.id, store),
          ),
        )
        .groupBy(schema.simulation.productId, schema.simulation.model),
    );

    if (!rows.success)
      return {
        success: false as const,
        error: new DatabaseError("Failed to tally simulations by product", {
          cause: rows.error,
        }),
      };

    return { success: true as const, data: rows.data };
  }, "Simulation.tallyByProductModel"),
);

/**
 * Per-scan win tallies for one store, for rescoping a scan's headline numbers
 * to just the products that store owns.
 */
export const tallyByScan = dedupe(
  withAuthentication(async (context, { store }: { store?: string } = {}) => {
    const rows = await resultify(async () =>
      db
        .select({
          scanId: schema.simulation.scanId,
          total: countRows(schema.simulation.id),
          wins: winsExpression,
        })
        .from(schema.simulation)
        .where(
          inArray(
            schema.simulation.productId,
            productScope(context.session.user.id, store),
          ),
        )
        .groupBy(schema.simulation.scanId),
    );

    if (!rows.success)
      return {
        success: false as const,
        error: new DatabaseError("Failed to tally simulations by scan", {
          cause: rows.error,
        }),
      };

    return { success: true as const, data: rows.data };
  }, "Simulation.tallyByScan"),
);

export const getForScan = withAuthentication(
  async (_, { scan: id }: { scan: string }) => {
    return find(Environment.SERVER, {
      where: eq(schema.simulation.scanId, id),
    });
  },
  "Simulation.getForScan",
);

export const getForCompetitors = withAuthentication(
  async (_, { competitors }: { competitors: string[] }) => {
    if (competitors.length === 0)
      return { success: true as const, data: [] as Type[] };

    return find(Environment.SERVER, {
      where: inArray(schema.simulation.competitorId, competitors),
    });
  },
  "Simulation.getForCompetitorIds",
);

export const getForProducts = withAuthentication(
  async (_, { products }: { products: string[] }) => {
    if (products.length === 0)
      return { success: true as const, data: [] as Type[] };

    return find(Environment.SERVER, {
      where: inArray(schema.simulation.productId, products),
    });
  },
  "Simulation.getForProducts",
);

/**
 * The store dashboard's shared data spine: one store's product rows plus every
 * simulation that judged them. `Product.gatherIntelligence`, `Scan.getLatest`,
 * and `Competitor.gatherIntelligence` all derive from this same pair, so it is
 * deduped — one render pass fetches it once no matter how many sections ask.
 */
export const getForStore = dedupe(
  withAuthentication(async (context, { store }: { store: string }) => {
    const storeProducts = await products.find(Environment.SERVER, {
      where: and(
        eq(schema.product.userId, context.session.user.id),
        eq(schema.product.storeId, store),
      ),
    });
    if (!storeProducts.success) return storeProducts;

    const productIds = storeProducts.data.map((product) => product.id);
    if (productIds.length === 0)
      return {
        success: true as const,
        data: { products: storeProducts.data, simulations: [] as Summary[] },
      };

    // The async wrapper matters: `resultify` only awaits real Promise
    // instances, and Drizzle's query builder is a bare thenable.
    const simulations = await resultify(async () =>
      db
        .select({
          id: schema.simulation.id,
          scanId: schema.simulation.scanId,
          productId: schema.simulation.productId,
          competitorId: schema.simulation.competitorId,
          model: schema.simulation.model,
          winner: schema.simulation.winner,
          productScore: schema.simulation.productScore,
          competitorScore: schema.simulation.competitorScore,
          createdAt: schema.simulation.createdAt,
        })
        .from(schema.simulation)
        .where(inArray(schema.simulation.productId, productIds)),
    );
    if (!simulations.success)
      return {
        success: false as const,
        error: new DatabaseError("Failed to load simulations for store", {
          cause: simulations.error,
        }),
      };

    return {
      success: true as const,
      data: {
        products: storeProducts.data,
        simulations: simulations.data as Summary[],
      },
    };
  }, "Simulation.getForStore"),
);
