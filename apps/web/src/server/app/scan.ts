"use server";

import { and, eq, inArray } from "drizzle-orm";
import { cache as dedupe } from "react";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { withContext } from "../utils/context";
import { Environment } from "../utils/environment";
import { NotFoundError } from "../utils/error";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.scan);

export type Type = Document<typeof schema.scan>;

export const getForCurrentUser = withAuthentication(async (context) => {
  return find(Environment.SERVER, {
    where: eq(schema.scan.userId, context.session.user.id),
  });
}, "Scan.getForCurrentUser");

export const getLatest = dedupe(
  withAuthentication(
    async (context, { limit }: { limit?: number } = { limit: 10 }) => {
      return find(Environment.SERVER, {
        where: eq(schema.scan.userId, context.session.user.id),
        orderBy: [
          { column: schema.scan.createdAt, direction: "desc" as const },
        ],
        limit,
      });
    },
    "Scan.getLatest",
  ),
);

export const findPending = withContext(async (_context) => {
  return find(Environment.SERVER, {
    where: inArray(schema.scan.status, ["pending"]),
    orderBy: [{ column: schema.scan.createdAt, direction: "asc" as const }],
  });
}, "Scan.findPending");

export const findRunningForUser = withContext(
  async (_context, { userId }: { userId: string }) => {
    return find(Environment.SERVER, {
      where: and(
        eq(schema.scan.userId, userId),
        inArray(schema.scan.status, ["running"]),
      ),
    });
  },
  "Scan.findRunningForUser",
);

export type ShareData = {
  scan: Type;
  modelRates: Record<string, { wins: number; losses: number; rate: number }>;
};

export const getShareData = withContext(
  async (context, { id }: { id: string }) => {
    const scanResult = await get(Environment.SERVER, id);
    if (!scanResult.success) return scanResult;
    if (!scanResult.data || scanResult.data.status !== "complete") {
      return { success: false as const, error: new NotFoundError("Scan") };
    }

    const simulations = await context.durable.db
      .select()
      .from(schema.simulation)
      .where(eq(schema.simulation.scanId, id));

    const modelMap = new Map<string, { wins: number; losses: number }>();
    for (const simulation of simulations) {
      const current = modelMap.get(simulation.model) ?? { wins: 0, losses: 0 };
      if (simulation.winner === "product") current.wins++;
      else current.losses++;
      modelMap.set(simulation.model, current);
    }

    const modelRates = Object.fromEntries(
      Array.from(modelMap.entries()).map(([model, { wins, losses }]) => [
        model,
        {
          wins,
          losses,
          rate:
            wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0,
        },
      ]),
    );

    return {
      success: true as const,
      data: { scan: scanResult.data, modelRates } satisfies ShareData,
    };
  },
  "Scan.getShareData",
);
