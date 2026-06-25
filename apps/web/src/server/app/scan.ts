"use server";

import { and, eq, inArray, lt } from "drizzle-orm";
import { cache as dedupe } from "react";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { withContext } from "../utils/context";
import { Environment } from "../utils/environment";
import { NotFoundError } from "../utils/error";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";
import * as Simulation from "./simulation";

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
        orderBy: [{ column: schema.scan.createdAt, direction: "desc" }],
        limit,
      });
    },
    "Scan.getLatest",
  ),
);

export const findPending = withContext(async (_context) => {
  return find(Environment.SERVER, {
    where: inArray(schema.scan.status, ["pending"]),
    orderBy: [{ column: schema.scan.createdAt, direction: "asc" }],
  });
}, "Scan.findPending");

export const findRunningForUser = withContext(
  async (_context, { user }: { user: string }) => {
    return find(Environment.SERVER, {
      where: and(
        eq(schema.scan.userId, user),
        inArray(schema.scan.status, ["running"]),
      ),
    });
  },
  "Scan.findRunningForUser",
);

export const getInFlight = withAuthentication(async (context) => {
  const scans = await find(Environment.SERVER, {
    where: and(
      eq(schema.scan.userId, context.session.user.id),
      inArray(schema.scan.status, ["pending", "running"]),
    ),
    orderBy: [{ column: schema.scan.createdAt, direction: "desc" }],
    limit: 1,
  });
  if (!scans.success) return scans;
  return { success: true as const, data: scans.data[0] ?? null };
}, "Scan.getInFlight");

export const findStaleRunning = withContext(
  async (_context, { before }: { before: Date }) => {
    return find(Environment.SERVER, {
      where: and(
        inArray(schema.scan.status, ["running"]),
        lt(schema.scan.updatedAt, before),
      ),
    });
  },
  "Scan.findStaleRunning",
);

export type Progress = {
  status: Type["status"];
  totalSimulations: number;
  completed: number;
  wins: number;
  losses: number;
  perModel: Record<string, { wins: number; losses: number; total: number }>;
  topFinding: Type["topFinding"];
  productCount: number;
  recent: { model: string; winner: string; reasoning: string }[];
};

export const getProgress = withAuthentication(
  async (context, { id }: { id: string }) => {
    const scan = await get(Environment.SERVER, id);
    if (!scan.success) return scan;
    if (!scan.data || scan.data.userId !== context.session.user.id)
      return { success: false as const, error: new NotFoundError("Scan") };

    const simulations = await Simulation.find(Environment.SERVER, {
      where: eq(schema.simulation.scanId, id),
    });
    if (!simulations.success) return simulations;

    const rows = simulations.data;
    const wins = rows.filter((row) => row.winner === "product").length;

    const models = [...new Set(rows.map((row) => row.model))];
    const perModel = Object.fromEntries(
      models.map((model) => {
        const owned = rows.filter((row) => row.model === model);
        const won = owned.filter((row) => row.winner === "product").length;
        return [
          model,
          { wins: won, losses: owned.length - won, total: owned.length },
        ];
      }),
    );

    const recent = [...rows]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(-12)
      .map((row) => ({
        model: row.model,
        winner: row.winner,
        reasoning: row.reasoning ?? "",
      }));

    return {
      success: true as const,
      data: {
        status: scan.data.status,
        totalSimulations: scan.data.totalSimulations,
        completed: rows.length,
        wins,
        losses: rows.length - wins,
        perModel,
        topFinding: scan.data.topFinding ?? null,
        productCount: new Set(rows.map((row) => row.productId)).size,
        recent,
      } satisfies Progress,
    };
  },
  "Scan.getProgress",
);

export type ShareData = {
  scan: Type;
  modelRates: Record<string, { wins: number; losses: number; rate: number }>;
};

export const getShareData = withContext(async (_, { id }: { id: string }) => {
  const scan = await get(Environment.SERVER, id);
  if (!scan.success) return scan;

  if (scan.data?.status !== "complete") {
    return { success: false, error: new NotFoundError("Scan") };
  }

  const simulations = await Simulation.getForScan(Environment.SERVER, {
    scan: id,
  });

  if (!simulations.success) return simulations;

  const models = [
    ...new Set(simulations.data.map((simulation) => simulation.model)),
  ];

  const modelRates = Object.fromEntries(
    models.map((model) => {
      const rows = simulations.data.filter(
        (simulation) => simulation.model === model,
      );
      const wins = rows.filter(
        (simulation) => simulation.winner === "product",
      ).length;
      const losses = rows.length - wins;
      return [
        model,
        {
          wins,
          losses,
          rate: rows.length > 0 ? Math.round((wins / rows.length) * 100) : 0,
        },
      ];
    }),
  );

  return {
    success: true,
    data: { scan: scan.data, modelRates },
  };
}, "Scan.getShareData");
