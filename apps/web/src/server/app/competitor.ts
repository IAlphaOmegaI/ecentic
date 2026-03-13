"use server";

import { eq } from "drizzle-orm";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { Environment } from "../utils/environment";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";

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
