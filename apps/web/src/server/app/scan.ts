"use server";

import { and, eq, inArray } from "drizzle-orm";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { withContext } from "../utils/context";
import { Environment } from "../utils/environment";
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

export const getLatest = withAuthentication(async (context) => {
  return find(Environment.SERVER, {
    where: eq(schema.scan.userId, context.session.user.id),
    orderBy: [{ column: schema.scan.createdAt, direction: "desc" as const }],
  });
}, "Scan.getLatest");

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
