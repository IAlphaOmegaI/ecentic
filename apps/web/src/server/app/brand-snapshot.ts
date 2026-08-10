"use server";

import { and, eq } from "drizzle-orm";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { Environment } from "../utils/environment";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";

export const { get, create, update, destroy, find, exists, count } = repository(
  schema.brandSnapshot,
);

export type Type = Document<typeof schema.brandSnapshot>;

/**
 * Latest completed brand analysis for a store, or null when none has run yet.
 * Scoped to the current user so a guessed store id resolves to nothing.
 */
export const latestForStore = withAuthentication(
  async (context, { store }: { store: string }) => {
    const result = await find(Environment.SERVER, {
      where: and(
        eq(schema.brandSnapshot.storeId, store),
        eq(schema.brandSnapshot.userId, context.session.user.id),
        eq(schema.brandSnapshot.status, "complete"),
      ),
      orderBy: [
        { column: schema.brandSnapshot.createdAt, direction: "desc" as const },
      ],
      limit: 1,
    });
    if (!result.success) return result;

    return { success: true as const, data: result.data[0] ?? null };
  },
  "BrandSnapshot.latestForStore",
);
