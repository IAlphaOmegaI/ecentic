"use server";

import { eq } from "drizzle-orm";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
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
