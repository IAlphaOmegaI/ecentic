"use server";

import { resultify } from "@zenncore/utils";
import { and, eq, inArray } from "drizzle-orm";
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
