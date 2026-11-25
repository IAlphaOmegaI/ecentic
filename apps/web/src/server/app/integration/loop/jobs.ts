// Scheduler selects consenting connection IDs only; each worker processes exactly one merchant.
import { randomUUID } from "node:crypto";
import {
  LOOP_TRIGGERS,
  LoopClient,
  LoopError,
  type LoopReturnState,
  parseReturn,
} from "@ecentic/loop";
import { resultify } from "@zenncore/utils";
import { and, asc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema } from "@/server/database";
import * as Model from "./model";
import { refreshConnection } from "./oauth";
import {
  type Connection,
  connectionAuth,
  type Lease,
  LoopLifecycleError,
  safeError,
} from "./types";
import { webhookAddress } from "./webhooks";

class Deferred extends Error {
  constructor(readonly delay: number) {
    super("loop_deferred");
  }
}

const clientFor = async (lease: Lease) => {
  const connection = await Model.fenced(
    lease,
    async (_, connection) => connection,
  );
  return new LoopClient({
    store: lease.store,
    auth: connectionAuth(connection),
    expectedShopId: connection.shopId ?? undefined,
    ownedWebhookIds: connection.webhookIds,
    webhookUrl: webhookAddress(connection),
    beforeRequest: async ({ bucket }) => {
      await Model.fenced(lease, async () => {});
      await Model.reserveRequest({ ...lease, bucket });
      await Model.fenced(lease, async () => {});
    },
    refresh: (auth) => refreshConnection(lease, auth),
    wait: async (milliseconds) => {
      if (milliseconds > 30_000) throw new Deferred(milliseconds);
      await new Promise((resolve) => setTimeout(resolve, milliseconds));
    },
  });
};
const processJob = async (
  lease: Lease,
): Promise<Record<string, unknown> | undefined> => {
  const payload = lease.job.payload;
  switch (lease.job.kind) {
    case "backfill":
    case "reconcile": {
      const client = await clientFor(lease);
      const next = typeof payload["next"] === "string" ? payload["next"] : null;
      const seen = Array.isArray(payload["seen"])
        ? payload["seen"].filter(
            (value): value is string => typeof value === "string",
          )
        : [];
      if (next && (seen.includes(next) || seen.length >= 10_000))
        throw new LoopLifecycleError("pagination_repeated");
      const page = next
        ? await client.next(next)
        : await client.list({
            from: String(payload["from"]),
            to: String(payload["to"]),
            filter:
              payload["filter"] === "updated_at" ? "updated_at" : "created_at",
            state: payload["state"] as LoopReturnState,
          });
      await Model.ingest({ ...lease, lease, returns: page.returns });
      if (page.nextPageUrl)
        return {
          ...payload,
          next: page.nextPageUrl,
          seen: [...seen, ...(next ? [next] : [])],
        };
      await Model.enqueue({
        ...lease,
        kind: "analysis",
        key: `${lease.generation}:analysis:${lease.job.id}`,
      });
      return;
    }
    case "webhook": {
      const returned = parseReturn(lease.store, payload["returned"]);
      await Model.ingest({ ...lease, lease, returns: [returned] });
      await Model.enqueue({
        ...lease,
        kind: "analysis",
        key: `${lease.generation}:analysis:${lease.job.id}`,
      });
      return;
    }
    case "hooks": {
      const connection = await Model.fenced(
        lease,
        async (_, connection) => connection,
      );
      if (!connection.webhookSecret)
        throw new LoopLifecycleError("webhook_secret_required");
      const client = await clientFor(lease);
      const hooks = await client.webhooks();
      // The connector returns only exact callback/topic matches. Never touch other subscriptions.
      const owned = new Set(connection.webhookIds);
      for (const hook of hooks) owned.add(hook.id);
      const cleanup = new LoopClient({
        store: lease.store,
        auth: connectionAuth(connection),
        expectedShopId: connection.shopId ?? undefined,
        ownedWebhookIds: [...owned],
        webhookUrl: webhookAddress(connection),
        beforeRequest: ({ bucket }) =>
          Model.reserveRequest({ ...lease, bucket }),
        refresh: (auth) => refreshConnection(lease, auth),
      });
      for (const trigger of LOOP_TRIGGERS) {
        if (
          !hooks.some(
            (hook) => hook.trigger === trigger && hook.status === "active",
          )
        ) {
          const created = await client.createWebhook(trigger);
          owned.add(created.id);
          // Persist after each creation: a later failure cannot orphan earlier known subscriptions.
          await Model.fenced(lease, async (transaction) => {
            await transaction
              .update(schema.loopConnection)
              .set({ webhookIds: [...owned] })
              .where(eq(schema.loopConnection.storeId, lease.store));
          });
        }
      }
      for (const hook of hooks.filter((hook) => hook.status !== "active")) {
        await cleanup.deleteWebhook(hook.id);
        owned.delete(hook.id);
      }
      await Model.fenced(lease, async (transaction) => {
        await transaction
          .update(schema.loopConnection)
          .set({ webhookIds: [...owned], cleanupRequired: false })
          .where(eq(schema.loopConnection.storeId, lease.store));
      });
      return;
    }
    case "analysis": {
      const { processReturnSignals } = await import("./analysis");
      await processReturnSignals({
        store: lease.store,
        generation: lease.generation,
        lease,
      });
      return;
    }
    case "signal-check": {
      const { runNextCheck } = await import("./checks");
      await runNextCheck({
        store: lease.store,
        generation: lease.generation,
        lease,
      });
      return;
    }
    default:
      throw new LoopLifecycleError("unknown_job");
  }
};
export const drain = async ({
  store,
  limit = 10,
  budgetMilliseconds = 220_000,
}: {
  store: string;
  limit?: number;
  budgetMilliseconds?: number;
}) => {
  const start = Date.now();
  const outcomes: string[] = [];
  for (const _ of Array.from({ length: Math.min(30, Math.max(1, limit)) })) {
    if (Date.now() - start > budgetMilliseconds) break;
    const lease = await Model.claim({ store });
    if (!lease) break;
    const execution = await resultify(() => processJob(lease));
    if (execution.success) {
      const finished = await resultify(() =>
        Model.finish(lease, execution.data),
      );
      if (!finished.success && safeError(finished.error) !== "superseded")
        throw finished.error;
      outcomes.push("processed");
    } else {
      if (execution.error instanceof Deferred) {
        await Model.finish(lease, lease.job.payload, execution.error.delay);
        break;
      }
      const reason =
        execution.error instanceof LoopError &&
        [401, 403].includes(execution.error.status ?? 0)
          ? "reconnect_required"
          : safeError(execution.error);
      const failed = await resultify(() => Model.fail(lease, reason));
      if (!failed.success && safeError(failed.error) !== "superseded")
        throw failed.error;
      outcomes.push(reason);
    }
  }
  return {
    processed: outcomes.filter((outcome) => outcome === "processed").length,
  };
};
/** Scheduling-only exception: enumerate IDs, never returns, comments, products or model data. */
export const dispatch = async () => {
  // Minute ticks also advance bounded due maintenance, so a large roster
  // cannot exceed the daily batch or a merchant retention deadline.
  await maintain();
  const candidates = await db
    .select({ store: schema.loopConnection.storeId })
    .from(schema.loopConnection)
    .where(
      and(
        isNull(schema.loopConnection.disconnectedAt),
        inArray(schema.loopConnection.status, [
          "syncing",
          "connected",
          "error",
        ]),
        or(
          isNull(schema.loopConnection.leaseUntil),
          lt(schema.loopConnection.leaseUntil, new Date()),
        ),
        sql`exists (select 1 from ${schema.loopJob} where ${schema.loopJob.storeId} = ${schema.loopConnection.storeId} and ${schema.loopJob.generation} = ${schema.loopConnection.generation} and ${schema.loopJob.status} in ('pending','running') and ${schema.loopJob.availableAt} <= ${new Date().toISOString()}::timestamp)`,
      ),
    )
    .orderBy(asc(schema.loopConnection.updatedAt))
    .limit(30);
  const start = Date.now();
  for (const candidate of candidates) {
    const remaining = 220_000 - (Date.now() - start);
    if (remaining <= 0) break;
    await drain({
      store: candidate.store,
      limit: 10,
      budgetMilliseconds: remaining,
    });
  }
};
export const maintainStore = async ({ store }: { store: string }) => {
  const connection = await Model.getConnection({ store });
  if (!connection) return;
  const expired = await db
    .delete(schema.loopInstallation)
    .where(
      and(
        eq(schema.loopInstallation.storeId, store),
        lt(schema.loopInstallation.expiresAt, new Date()),
      ),
    )
    .returning({ generation: schema.loopInstallation.generation });
  if (
    connection.status === "connecting" &&
    expired.some(
      (installation) => installation.generation === connection.generation,
    )
  ) {
    await Model.markFailedConnect(
      { store, generation: connection.generation },
      "installation_expired",
    );
    return;
  }
  if (connection.disconnectedAt) {
    if (connection.purgeAfter && connection.purgeAfter <= new Date())
      await Model.purge({ store });
    return;
  }
  if (!connection.apiKey && !connection.accessToken) return;
  if (
    connection.lastMaintenanceAt &&
    Date.now() - connection.lastMaintenanceAt.getTime() < 23 * 3600_000
  )
    return;
  await Model.withActive(
    { store, generation: connection.generation },
    async (transaction) => {
      const run = randomUUID();
      const end = new Date();
      for (const state of ["open", "closed", "expired", "review", "cancelled"])
        await Model.enqueue(
          {
            store,
            generation: connection.generation,
            kind: "reconcile",
            key: `${connection.generation}:daily:${run}:${state}`,
            payload: {
              from: new Date(end.getTime() - 48 * 3600_000).toISOString(),
              to: end.toISOString(),
              filter: "updated_at",
              state,
            },
          },
          transaction,
        );
      await Model.enqueue(
        {
          store,
          generation: connection.generation,
          kind: "hooks",
          key: `${connection.generation}:hooks:${run}`,
        },
        transaction,
      );
      await transaction
        .update(schema.loopConnection)
        .set({
          lastMaintenanceAt: end,
          ...(connection.previousSecretExpiresAt &&
          connection.previousSecretExpiresAt < end
            ? { previousWebhookSecret: null, previousSecretExpiresAt: null }
            : {}),
        })
        .where(eq(schema.loopConnection.storeId, store));
      await transaction
        .delete(schema.loopJob)
        .where(
          and(
            eq(schema.loopJob.storeId, store),
            eq(schema.loopJob.status, "complete"),
            lt(
              schema.loopJob.updatedAt,
              new Date(Date.now() - 30 * 86_400_000),
            ),
          ),
        );
      await transaction
        .delete(schema.loopInstallation)
        .where(
          and(
            eq(schema.loopInstallation.storeId, store),
            lt(schema.loopInstallation.expiresAt, end),
          ),
        );
    },
  );
};
/** Scheduling metadata only; each maintenance operation remains merchant-scoped. */
export const maintain = async () => {
  const candidates = await db
    .select({ store: schema.loopConnection.storeId })
    .from(schema.loopConnection)
    .where(
      or(
        and(
          isNull(schema.loopConnection.disconnectedAt),
          inArray(schema.loopConnection.status, [
            "connected",
            "syncing",
            "error",
          ]),
          sql`(${schema.loopConnection.apiKey} is not null or ${schema.loopConnection.accessToken} is not null)`,
          or(
            isNull(schema.loopConnection.lastMaintenanceAt),
            lt(
              schema.loopConnection.lastMaintenanceAt,
              new Date(Date.now() - 23 * 3600_000),
            ),
          ),
        ),
        lt(schema.loopConnection.purgeAfter, new Date()),
        sql`exists (select 1 from ${schema.loopInstallation} where ${schema.loopInstallation.storeId} = ${schema.loopConnection.storeId} and ${schema.loopInstallation.expiresAt} <= ${new Date().toISOString()}::timestamp)`,
      ),
    )
    .orderBy(asc(schema.loopConnection.lastMaintenanceAt))
    .limit(100);
  for (const candidate of candidates) await maintainStore(candidate);
};
export const deleteRemoteWebhooks = async (connection: Connection) => {
  const store = connection.storeId;
  const auth = resultify(() => connectionAuth(connection));
  if (
    !auth.success ||
    !connection.callbackToken ||
    !connection.webhookIds.length
  )
    return;
  const deletion = await resultify(async () => {
    const client = new LoopClient({
      store,
      auth: auth.data,
      ownedWebhookIds: connection.webhookIds,
      webhookUrl: webhookAddress(connection),
      expectedShopId: connection.shopId ?? undefined,
      maxRetries: 0,
      fetch: (input, options) =>
        fetch(input, { ...options, signal: AbortSignal.timeout(8000) }),
      beforeRequest: ({ bucket }) =>
        Model.reserveRequest({
          store,
          generation: connection.generation + 1,
          bucket,
          allowDisconnected: true,
        }),
    });
    for (const id of connection.webhookIds) await client.deleteWebhook(id);
  });
  await db
    .update(schema.loopConnection)
    .set({
      cleanupRequired: !deletion.success,
      ...(deletion.success ? { webhookIds: [] } : {}),
      lastError: deletion.success ? null : "webhook_cleanup_required",
    })
    .where(
      and(
        eq(schema.loopConnection.storeId, store),
        eq(schema.loopConnection.generation, connection.generation + 1),
        eq(schema.loopConnection.status, "disconnected"),
      ),
    );
};
