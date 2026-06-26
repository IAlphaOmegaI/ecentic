"use server";

import { unique } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { cache as dedupe } from "react";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { Environment } from "../utils/environment";
import { NotFoundError, RequestError, UnauthorizedError } from "../utils/error";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";
import * as Detection from "./intelligence/detect";
import * as Scan from "./scan";
import * as Simulation from "./simulation";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.competitor);

export type Type = Document<typeof schema.competitor>;

export const skimForCurrentUser = withAuthentication(async (context) => {
  return find(Environment.SERVER, {
    where: eq(schema.competitor.userId, context.session.user.id),
    limit: 10,
  });
}, "Competitor.skimForCurrentUser");

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
        error: new RequestError("No products selected"),
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
  withAuthentication(async () => {
    const [competitors, scan] = await Promise.all([
      skimForCurrentUser(Environment.SERVER),
      Scan.getLatest(Environment.SERVER),
    ]);

    if (!competitors.success) return competitors;
    if (!scan.success) return scan;

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
  async (context, { page, size }: { page: number; size: number }) => {
    const [competitors, scan] = await Promise.all([
      paginate(Environment.SERVER, page, size, {
        where: eq(schema.competitor.userId, context.session.user.id),
      }),
      Scan.getLatest(Environment.SERVER),
    ]);

    if (!competitors.success) return competitors;
    if (!scan.success) return scan;

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
