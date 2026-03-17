"use server";

import { eq, inArray } from "drizzle-orm";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { Environment } from "../utils/environment";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.simulation);

export type Type = Document<typeof schema.simulation>;

export const getForScan = withAuthentication(
  async (_, { scanId }: { scanId: string }) => {
    return find(Environment.SERVER, {
      where: eq(schema.simulation.scanId, scanId),
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
