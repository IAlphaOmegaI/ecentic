"use server";

import { unique } from "@zenncore/utils";
import { and, eq, inArray } from "drizzle-orm";
import { cache as dedupe } from "react";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { Environment } from "../utils/environment";
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../utils/error";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";
import * as Detection from "./intelligence/detect";
import * as Scan from "./scan";
import * as Simulation from "./simulation";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.competitor);

const products = repository(schema.product);

export type Type = Document<typeof schema.competitor>;

/**
 * Competitors relevant to a single store — derived, since competitors carry no
 * storeId. A competitor "belongs" to a store when it appears in a simulation
 * against one of that store's products. Returns the competitor rows plus the
 * store-scoped simulations so callers can aggregate win rates from the same set.
 */
const collectForStore = async (userId: string, store: string) => {
  const storeProducts = await products.find(Environment.SERVER, {
    where: and(
      eq(schema.product.userId, userId),
      eq(schema.product.storeId, store),
    ),
  });
  if (!storeProducts.success) return storeProducts;

  const productIds = storeProducts.data.map((product) => product.id);
  if (productIds.length === 0)
    return {
      success: true as const,
      data: { competitors: [] as Type[], simulations: [] as Simulation.Type[] },
    };

  const simulations = await Simulation.getForProducts(Environment.SERVER, {
    products: productIds,
  });
  if (!simulations.success) return simulations;

  const competitorIds = unique(
    simulations.data.map((simulation) => simulation.competitorId),
  );
  if (competitorIds.length === 0)
    return {
      success: true as const,
      data: { competitors: [] as Type[], simulations: simulations.data },
    };

  const competitors = await find(Environment.SERVER, {
    where: inArray(schema.competitor.id, competitorIds),
  });
  if (!competitors.success) return competitors;

  return {
    success: true as const,
    data: { competitors: competitors.data, simulations: simulations.data },
  };
};

export const skimForCurrentUser = withAuthentication(async (context) => {
  return find(Environment.SERVER, {
    where: eq(schema.competitor.userId, context.session.user.id),
    limit: 10,
  });
}, "Competitor.skimForCurrentUser");

export type Candidate = {
  id: string;
  title: string;
  brand: string | null;
  price: string | null;
  image: string | null;
  selected: boolean;
};

/**
 * Full (uncapped) competitor list trimmed to display fields, for selection
 * surfaces like the scan setup roster.
 */
export const listForCurrentUser = withAuthentication(async (context) => {
  const result = await find(Environment.SERVER, {
    where: eq(schema.competitor.userId, context.session.user.id),
    orderBy: [{ column: schema.competitor.title, direction: "asc" }],
  });
  if (!result.success) return result;

  return {
    success: true as const,
    data: result.data.map(
      (competitor): Candidate => ({
        id: competitor.id,
        title: competitor.title,
        brand: competitor.brand,
        price: competitor.price,
        image: competitor.image,
        selected: competitor.selected,
      }),
    ),
  };
}, "Competitor.listForCurrentUser");

/**
 * Total and selected competitor counts for the current user. Use this for
 * count surfaces (e.g. the simulation estimate) instead of measuring
 * `skimForCurrentUser()`, which caps at a 10-row preview and undercounts.
 */
export const countForCurrentUser = withAuthentication(async (context) => {
  const user = context.session.user.id;

  const [total, selected] = await Promise.all([
    count(Environment.SERVER, eq(schema.competitor.userId, user)),
    count(
      Environment.SERVER,
      and(
        eq(schema.competitor.userId, user),
        eq(schema.competitor.selected, true),
      ),
    ),
  ]);
  if (!total.success) return total;
  if (!selected.success) return selected;

  return {
    success: true as const,
    data: { total: total.data, selected: selected.data },
  };
}, "Competitor.countForCurrentUser");

export const removeForUser = withAuthentication(
  async (context, { id }: { id: string }) => {
    const record = await get(Environment.SERVER, id);
    if (!record.success) return record;
    if (!record.data)
      return {
        success: false,
        error: new NotFoundError("Competitor not found"),
      };

    if (record.data.userId !== context.session.user.id)
      return { success: false, error: new UnauthorizedError("Not authorized") };

    return destroy(Environment.SERVER, id);
  },
  "Competitor.removeForUser",
);

export const toggleSelection = withAuthentication(
  async (context, { id, selected }: { id: string; selected: boolean }) => {
    const record = await get(Environment.SERVER, id);
    if (!record.success) return record;
    if (!record.data)
      return {
        success: false,
        error: new NotFoundError("Competitor not found"),
      };
    if (record.data.userId !== context.session.user.id)
      return { success: false, error: new UnauthorizedError("Not authorized") };

    return update(Environment.SERVER, id, { selected });
  },
  "Competitor.toggleSelection",
);

// Stream competitor detection back to the client. Runs in one request — the
// model names real competitors and each is persisted and pushed the moment it
// lands, so the UI fills in live. Returns a streamable the client reads with
// readStreamableValue; see Detection.stream for the engine and event shape.
export const streamDetection = withAuthentication(
  async (context, { products }: { products: string[] }) => {
    if (products.length === 0)
      return {
        success: false as const,
        error: new ValidationError("No products selected"),
      };

    return {
      success: true as const,
      data: Detection.stream({ user: context.session.user.id, products }),
    };
  },
  "Competitor.streamDetection",
);

const aggregateBrands = (
  competitors: Type[],
  simulations: Simulation.Type[],
) => {
  return unique(competitors.map((c) => c.brand ?? c.title)).flatMap((brand) => {
    const group = competitors.filter((c) => (c.brand ?? c.title) === brand);

    const first = group[0];
    if (!first) return [];

    const ids = unique(group.map((competitor) => competitor.id));

    const brandSimulations = simulations.filter((simulation) =>
      ids.includes(simulation.competitorId),
    );

    const wins = brandSimulations.filter(
      (simulation) => simulation.winner === "product",
    ).length;

    const total = brandSimulations.length;

    const latestUpdate = group.reduce(
      (latest, competitor) =>
        competitor.updatedAt > latest ? competitor.updatedAt : latest,
      first.updatedAt,
    );

    return {
      _id: first.id,
      brand,
      products: group.length,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
      simulations: total,
      updatedAt: latestUpdate,
    };
  });
};

export const gatherIntelligence = dedupe(
  withAuthentication(async (context, { store }: { store?: string } = {}) => {
    const scan = await Scan.getLatest(Environment.SERVER, { store });
    if (!scan.success) return scan;

    if (store) {
      const collected = await collectForStore(context.session.user.id, store);
      if (!collected.success) return collected;

      const brands = aggregateBrands(
        collected.data.competitors,
        collected.data.simulations,
      );

      return {
        success: true,
        data: {
          brands,
          competitors: collected.data.competitors.length,
          scan: scan.data[0],
        },
      };
    }

    const competitors = await skimForCurrentUser(Environment.SERVER);
    if (!competitors.success) return competitors;

    if (competitors.data.length === 0)
      return {
        success: true,
        data: {
          brands: [],
          competitors: 0,
          scan: scan.data[0],
        },
      };

    const simulations = await Simulation.getForCompetitors(Environment.SERVER, {
      competitors: competitors.data.map((competitor) => competitor.id),
    });

    if (!simulations.success) return simulations;

    const brands = aggregateBrands(competitors.data, simulations.data);

    return {
      success: true,
      data: {
        brands,
        competitors: competitors.data.length,
        scan: scan.data[0],
      },
    };
  }, "Competitor.gatherIntelligence"),
);

export const gatherPaginatedIntelligence = withAuthentication(
  async (
    context,
    { page, size, store }: { page: number; size: number; store?: string },
  ) => {
    const scan = await Scan.getLatest(Environment.SERVER, { store });
    if (!scan.success) return scan;

    if (store) {
      const collected = await collectForStore(context.session.user.id, store);
      if (!collected.success) return collected;

      const allBrands = aggregateBrands(
        collected.data.competitors,
        collected.data.simulations,
      );
      const total = allBrands.length;
      const offset = (page - 1) * size;
      const brands = allBrands.slice(offset, offset + size);

      return {
        success: true,
        data: {
          brands,
          scan: scan.data[0],
          pagination: { total, page, size },
        },
      };
    }

    const competitors = await paginate(Environment.SERVER, page, size, {
      where: eq(schema.competitor.userId, context.session.user.id),
    });
    if (!competitors.success) return competitors;

    const simulations = await Simulation.getForCompetitors(Environment.SERVER, {
      competitors: competitors.data.items.map((competitor) => competitor.id),
    });

    if (!simulations.success) return simulations;

    const allBrands = aggregateBrands(competitors.data.items, simulations.data);
    const total = allBrands.length;
    const offset = (page - 1) * size;
    const brands = allBrands.slice(offset, offset + size);

    return {
      success: true,
      data: {
        brands,
        scan: scan.data[0],
        pagination: { total, page, size },
      },
    };
  },
  "Competitor.gatherPaginatedIntelligence",
);
