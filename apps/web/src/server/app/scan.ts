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

export type ShareData = {
  scan: Type;
  modelRates: Record<string, { wins: number; losses: number; rate: number }>;
};

export const getShareData = withContext(async (_, { id }: { id: string }) => {
  const scan = await get(Environment.SERVER, id);
  if (!scan.success) return scan;

  if (!scan.data || scan.data.status !== "complete") {
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
