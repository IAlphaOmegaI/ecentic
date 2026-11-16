"use server";

import { and, eq } from "drizzle-orm";
import { schema } from "../database";
import {
  isBrandSnapshotRunning,
  resolveBrandSnapshotState,
} from "../utils/brand-snapshot-state";
import { withSubscription } from "../utils/entitlement";
import { Environment } from "../utils/environment";
import type { Document } from "../utils/repository";
import { repository } from "../utils/repository";

export const { get, create, update, destroy, find, exists, count } = repository(
  schema.brandSnapshot,
);

export type Type = Document<typeof schema.brandSnapshot>;

/**
 * Everything the brand page needs: the latest completed report,
 * the run currently in flight (if any), and the newest failure when it is more
 * recent than the shown report. Scoped to the current user so a guessed store
 * id resolves to nothing. Fetch each status independently so repeated failed runs
 * cannot push the last completed report outside a fixed history window.
 */
export const overviewForStore = withSubscription(
  async (context, { store }: { store: string }) => {
    const latest = (status: Type["status"]) =>
      find(Environment.SERVER, {
        where: and(
          eq(schema.brandSnapshot.storeId, store),
          eq(schema.brandSnapshot.userId, context.session.user.id),
          eq(schema.brandSnapshot.status, status),
        ),
        orderBy: [
          {
            column: schema.brandSnapshot.createdAt,
            direction: "desc" as const,
          },
        ],
        limit: 1,
      });
    const [complete, running, failed] = await Promise.all([
      latest("complete"),
      latest("running"),
      latest("failed"),
    ]);
    if (!complete.success) return complete;
    if (!running.success) return running;
    if (!failed.success) return failed;

    return {
      success: true as const,
      data: resolveBrandSnapshotState(
        {
          complete: complete.data[0]?.report ? complete.data[0] : null,
          running: running.data[0] ?? null,
          failed: failed.data[0] ?? null,
        },
        Date.now(),
      ),
    };
  },
  "BrandSnapshot.overviewForStore",
);

/**
 * Lightweight poll target for the in-progress banner — a boolean instead of
 * full rows so polling every few seconds never ships a stored report.
 */
export const isRunning = withSubscription(
  async (context, { store }: { store: string }) => {
    const result = await find(Environment.SERVER, {
      where: and(
        eq(schema.brandSnapshot.storeId, store),
        eq(schema.brandSnapshot.userId, context.session.user.id),
      ),
      orderBy: [
        { column: schema.brandSnapshot.createdAt, direction: "desc" as const },
      ],
      limit: 1,
    });
    if (!result.success) return result;

    const [latest] = result.data;
    return {
      success: true as const,
      data: isBrandSnapshotRunning(latest, Date.now()),
    };
  },
  "BrandSnapshot.isRunning",
);
