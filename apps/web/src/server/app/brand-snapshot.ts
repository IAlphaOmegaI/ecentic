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
 * Mirrors {@link import("./intelligence/brand").analyze}'s staleness window: a
 * `running` row older than this is a dead run, not one in flight.
 */
const RUNNING_STALE_MS = 10 * 60 * 1000;

const isFresh = (snapshot: Type) =>
  Date.now() - snapshot.createdAt.getTime() < RUNNING_STALE_MS;

/**
 * Everything the brand page needs in one query: the latest completed report,
 * the run currently in flight (if any), and the newest failure when it is more
 * recent than the shown report. Scoped to the current user so a guessed store
 * id resolves to nothing.
 */
export const overviewForStore = withAuthentication(
  async (context, { store }: { store: string }) => {
    const result = await find(Environment.SERVER, {
      where: and(
        eq(schema.brandSnapshot.storeId, store),
        eq(schema.brandSnapshot.userId, context.session.user.id),
      ),
      orderBy: [
        { column: schema.brandSnapshot.createdAt, direction: "desc" as const },
      ],
      limit: 10,
    });
    if (!result.success) return result;

    const complete =
      result.data.find(
        (snapshot) => snapshot.status === "complete" && snapshot.report,
      ) ?? null;
    const running =
      result.data.find(
        (snapshot) => snapshot.status === "running" && isFresh(snapshot),
      ) ?? null;
    const newestFailure =
      result.data.find((snapshot) => snapshot.status === "failed") ?? null;
    const failed =
      newestFailure &&
      (!complete || newestFailure.createdAt > complete.createdAt)
        ? newestFailure
        : null;

    return { success: true as const, data: { complete, running, failed } };
  },
  "BrandSnapshot.overviewForStore",
);

/**
 * Lightweight poll target for the in-progress banner — a boolean instead of
 * full rows so polling every few seconds never ships a stored report.
 */
export const isRunning = withAuthentication(
  async (context, { store }: { store: string }) => {
    const result = await find(Environment.SERVER, {
      where: and(
        eq(schema.brandSnapshot.storeId, store),
        eq(schema.brandSnapshot.userId, context.session.user.id),
        eq(schema.brandSnapshot.status, "running"),
      ),
      orderBy: [
        { column: schema.brandSnapshot.createdAt, direction: "desc" as const },
      ],
      limit: 1,
    });
    if (!result.success) return result;

    const [latest] = result.data;
    return { success: true as const, data: Boolean(latest && isFresh(latest)) };
  },
  "BrandSnapshot.isRunning",
);
