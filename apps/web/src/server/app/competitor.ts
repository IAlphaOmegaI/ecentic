"use server";

import { unique } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { cache as dedupe } from "react";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { Environment } from "../utils/environment";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";
import * as Scan from "./scan";
import * as Simulation from "./simulation";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.competitor);

export type Type = Document<typeof schema.competitor>;

export const getForCurrentUser = withAuthentication(async (context) => {
  return find(Environment.SERVER, {
    where: eq(schema.competitor.userId, context.session.user.id),
  });
}, "Competitor.getForCurrentUser");

export const removeForUser = withAuthentication(
  async (context, { id }: { id: string }) => {
    const record = await get(Environment.SERVER, id);
    if (!record.success) return record;
    if (!record.data)
      return {
        success: false as const,
        error: new Error("Competitor not found"),
      };
    if (record.data.userId !== context.session.user.id)
      return { success: false as const, error: new Error("Not authorized") };

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
        success: false as const,
        error: new Error("Competitor not found"),
      };
    if (record.data.userId !== context.session.user.id)
      return { success: false as const, error: new Error("Not authorized") };

    return update(Environment.SERVER, id, { selected });
  },
  "Competitor.toggleSelection",
);

export const gatherIntelligence = dedupe(
  withAuthentication(async () => {
    const [competitors, scan] = await Promise.all([
      getForCurrentUser(),
      Scan.getLatest(),
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

    const simulations = await Simulation.getForCompetitors({
      competitors: competitors.data.map((competitor) => competitor.id),
    });

    if (!simulations.success) return simulations;

    const brands = unique(
      competitors.data.map((c) => c.brand ?? c.title),
    ).flatMap((brand) => {
      const group = competitors.data.filter(
        (c) => (c.brand ?? c.title) === brand,
      );

      const first = group[0];
      if (!first) return [];

      const ids = unique(group.map((competitor) => competitor.id));

      const brandSimulations = simulations.data.filter((simulation) =>
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
