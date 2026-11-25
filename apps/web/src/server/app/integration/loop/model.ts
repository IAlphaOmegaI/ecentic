// Loop data is read per merchant, only after consent, and never combined across merchants.
// Internal repository only: credentials must never be returned from server actions.
import { randomBytes, randomUUID } from "node:crypto";
import {
  assertMerchant,
  dateWindows,
  type LoopAuth,
  type LoopReturn,
  parseReturn,
} from "@ecentic/loop";
import { and, asc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema, type TransactionScope } from "@/server/database";
import { resultifyRead } from "@/server/utils/repository";
import {
  type Connection,
  LEASE_MILLISECONDS,
  type Lease,
  LoopLifecycleError,
  type Status,
} from "./types";

const read = async <T>(query: () => PromiseLike<T>): Promise<T> => {
  const result = await resultifyRead(async () => await query());
  if (!result.success) throw result.error;
  return result.data as T;
};
export const requireStore = async ({
  store,
  user,
}: {
  store: string;
  user: string;
}) => {
  assertMerchant(store);
  const [owned] = await read(() =>
    db
      .select()
      .from(schema.store)
      .where(and(eq(schema.store.id, store), eq(schema.store.userId, user)))
      .limit(1),
  );
  if (!owned) throw new LoopLifecycleError("store_not_found");
  return owned;
};
export const getConnection = async ({ store }: { store: string }) => {
  assertMerchant(store);
  const [connection] = await read(() =>
    db
      .select()
      .from(schema.loopConnection)
      .where(eq(schema.loopConnection.storeId, store))
      .limit(1),
  );
  return connection;
};
export const requireActive = async ({
  store,
  generation,
}: {
  store: string;
  generation?: number;
}) => {
  const connection = await getConnection({ store });
  if (
    !connection ||
    connection.disconnectedAt ||
    !["connected", "syncing", "error"].includes(connection.status) ||
    (!connection.apiKey && !connection.accessToken) ||
    (generation !== undefined && connection.generation !== generation)
  )
    throw new LoopLifecycleError("superseded");
  return connection;
};
export const withActive = async <T>(
  input: { store: string; generation: number; allowConnecting?: boolean },
  callback: (
    transaction: TransactionScope,
    connection: Connection,
  ) => Promise<T>,
): Promise<T> => {
  assertMerchant(input.store);
  return db.transaction(async (transaction) => {
    await transaction.execute(sql`set local lock_timeout = '1500ms'`);
    await transaction.execute(sql`set local statement_timeout = '5000ms'`);
    const [connection] = await transaction
      .select()
      .from(schema.loopConnection)
      .where(
        and(
          eq(schema.loopConnection.storeId, input.store),
          eq(schema.loopConnection.generation, input.generation),
          isNull(schema.loopConnection.disconnectedAt),
        ),
      )
      .for("update");
    if (
      !connection ||
      connection.status === "disconnected" ||
      (!input.allowConnecting &&
        (!["connected", "syncing", "error"].includes(connection.status) ||
          (!connection.apiKey && !connection.accessToken)))
    )
      throw new LoopLifecycleError("superseded");
    return callback(transaction, connection);
  });
};
export const fenced = async <T>(
  lease: Lease,
  callback: (
    transaction: TransactionScope,
    connection: Connection,
  ) => Promise<T>,
): Promise<T> =>
  withActive(lease, async (transaction, connection) => {
    if (
      connection.lease !== lease.token ||
      !connection.leaseUntil ||
      connection.leaseUntil.getTime() <= Date.now()
    )
      throw new LoopLifecycleError("superseded");
    return callback(transaction, connection);
  });
export const getStatus = async (input: {
  store: string;
  user: string;
}): Promise<Status> => {
  const owned = await requireStore(input);
  const connection = await getConnection(input);
  const [rows] = await read(() =>
    db
      .select({
        count: sql<number>`count(distinct ${schema.loopReturnLine.loopReturnId})`,
      })
      .from(schema.loopReturnLine)
      .where(
        and(
          eq(schema.loopReturnLine.storeId, input.store),
          sql`${schema.loopReturnLine.returnState} <> 'cancelled'`,
        ),
      ),
  );
  return {
    supported: owned.platform === "shopify" && owned.status === "connected",
    configured: Boolean(
      process.env.CREDENTIAL_ENCRYPTION_KEY && process.env.APP_HOST,
    ),
    connected: Boolean(
      connection &&
        !connection.disconnectedAt &&
        connection.status !== "disconnected" &&
        (connection.apiKey || connection.accessToken),
    ),
    status: connection?.status ?? "not_connected",
    lastSyncedAt: connection?.lastSyncedAt ?? null,
    lastError:
      connection?.lastError ??
      (connection &&
      !connection.disconnectedAt &&
      (connection.apiKey || connection.accessToken) &&
      !connection.webhookSecret
        ? "webhook_secret_required"
        : null),
    cleanupRequired: connection?.cleanupRequired ?? false,
    oauthEnabled: process.env["LOOP_OAUTH_ENABLED"] === "1",
    returnCount: Number(rows?.count ?? 0),
  };
};
export const enqueue = async (
  input: {
    store: string;
    generation: number;
    kind: string;
    key: string;
    payload?: Record<string, unknown>;
    availableAt?: Date;
  },
  transaction?: TransactionScope,
) => {
  assertMerchant(input.store);
  const insert = async (database: TransactionScope) =>
    database
      .insert(schema.loopJob)
      .values({
        storeId: input.store,
        generation: input.generation,
        kind: input.kind,
        key: input.key,
        payload: input.payload ?? {},
        availableAt: input.availableAt ?? new Date(),
      })
      .onConflictDoNothing({
        target: [schema.loopJob.storeId, schema.loopJob.key],
      });
  if (transaction) {
    await insert(transaction);
    return;
  }
  await withActive(input, (database) => insert(database));
};
export const prepare = async (input: {
  store: string;
  user: string;
  webhookSecret?: string;
}) => {
  await requireStore(input);
  return db.transaction(async (transaction) => {
    const [owned] = await transaction
      .select()
      .from(schema.store)
      .where(
        and(
          eq(schema.store.id, input.store),
          eq(schema.store.userId, input.user),
        ),
      )
      .for("update");
    if (!owned || owned.platform !== "shopify" || owned.status !== "connected")
      throw new LoopLifecycleError("connect_shopify_first");
    const [previous] = await transaction
      .select()
      .from(schema.loopConnection)
      .where(eq(schema.loopConnection.storeId, input.store))
      .for("update");
    if (
      previous &&
      !previous.disconnectedAt &&
      (previous.apiKey || previous.accessToken)
    )
      throw new LoopLifecycleError("already_connected");
    const values = {
      storeId: input.store,
      generation: (previous?.generation ?? 0) + 1,
      status: "connecting" as const,
      shopId: null,
      apiKey: null,
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      webhookSecret: input.webhookSecret ?? null,
      previousWebhookSecret: null,
      previousSecretExpiresAt: null,
      callbackToken: randomBytes(32).toString("hex"),
      disconnectedAt: null,
      purgeAfter: null,
      lease: null,
      leaseUntil: null,
      lastError: null,
      updatedAt: new Date(),
    };
    const [connection] = await transaction
      .insert(schema.loopConnection)
      .values(values)
      .onConflictDoUpdate({
        target: schema.loopConnection.storeId,
        set: values,
      })
      .returning();
    if (!connection) throw new LoopLifecycleError("connect_failed");
    // An abandoned/failed reconnect must not cancel the old generation's erasure deadline.
    for (const table of [
      schema.loopReturnLine,
      schema.loopReturnVersion,
      schema.loopReasonMapping,
      schema.loopSignalCheck,
      schema.loopProposal,
    ])
      await transaction.delete(table).where(eq(table.storeId, input.store));
    await transaction
      .delete(schema.loopJob)
      .where(eq(schema.loopJob.storeId, input.store));
    return connection;
  });
};
export const reserveRequest = async (input: {
  store: string;
  generation: number;
  bucket: "api" | "auth";
  allowDisconnected?: boolean;
}) => {
  assertMerchant(input.store);
  const delay = await db.transaction(async (transaction) => {
    const [connection] = await transaction
      .select()
      .from(schema.loopConnection)
      .where(
        and(
          eq(schema.loopConnection.storeId, input.store),
          eq(schema.loopConnection.generation, input.generation),
        ),
      )
      .for("update");
    if (!connection || (!input.allowDisconnected && connection.disconnectedAt))
      throw new LoopLifecycleError("superseded");
    const now = Date.now();
    const at = Math.max(
      now,
      connection.nextRequestAt?.getTime() ?? 0,
      input.bucket === "auth"
        ? (connection.nextAuthRequestAt?.getTime() ?? 0)
        : 0,
    );
    await transaction
      .update(schema.loopConnection)
      .set({
        nextRequestAt: new Date(at + 210),
        ...(input.bucket === "auth"
          ? { nextAuthRequestAt: new Date(at + 3100) }
          : {}),
      })
      .where(eq(schema.loopConnection.storeId, input.store));
    return at - now;
  });
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  const current = await getConnection(input);
  if (
    !current ||
    current.generation !== input.generation ||
    (!input.allowDisconnected && current.disconnectedAt)
  )
    throw new LoopLifecycleError("superseded");
};
export const activate = async (input: {
  store: string;
  generation: number;
  auth: LoopAuth;
  shopId: string;
  scopes: string[];
}) =>
  withActive(
    { ...input, allowConnecting: true },
    async (transaction, connection) => {
      // A new consent generation cannot blend a previous merchant's imported lines.
      for (const table of [
        schema.loopSignalCheck,
        schema.loopProposal,
        schema.returnExpectationGap,
        schema.loopReturnLine,
        schema.loopReturnVersion,
        schema.loopReasonMapping,
      ])
        await transaction.delete(table).where(eq(table.storeId, input.store));
      const auth = input.auth;
      await transaction
        .update(schema.loopConnection)
        .set({
          authMode: auth.mode,
          apiKey: auth.mode === "api_key" ? auth.apiKey : null,
          accessToken: auth.mode === "oauth" ? auth.accessToken : null,
          refreshToken: auth.mode === "oauth" ? auth.refreshToken : null,
          accessTokenExpiresAt:
            auth.mode === "oauth" ? new Date(auth.expiresAt) : null,
          shopId: input.shopId,
          scopes: input.scopes,
          webhookIds: [],
          status: "syncing",
          connectedAt: new Date(),
          cleanupRequired: false,
          updatedAt: new Date(),
        })
        .where(eq(schema.loopConnection.storeId, input.store));
      await enqueue(
        { ...input, kind: "hooks", key: `${input.generation}:hooks:connect` },
        transaction,
      );
      const end = new Date();
      const windows = dateWindows(
        input.store,
        new Date(end.getTime() - 180 * 86_400_000),
        end,
        30,
      );
      for (const window of windows)
        for (const state of ["open", "closed", "expired", "review"])
          await enqueue(
            {
              store: input.store,
              generation: input.generation,
              kind: "backfill",
              key: `${input.generation}:backfill:${window.from}:${state}`,
              payload: { ...window, state, filter: "created_at" },
            },
            transaction,
          );
      return connection.id;
    },
  );
export const markFailedConnect = async (
  input: { store: string; generation: number },
  reason: string,
) =>
  withActive({ ...input, allowConnecting: true }, async (transaction) => {
    await transaction
      .update(schema.loopConnection)
      .set({
        status: "error",
        apiKey: null,
        accessToken: null,
        refreshToken: null,
        webhookSecret: null,
        callbackToken: null,
        lastError: reason,
        updatedAt: new Date(),
      })
      .where(eq(schema.loopConnection.storeId, input.store));
  });
export const requestSync = async (input: { store: string; user: string }) => {
  await requireStore(input);
  const connection = await requireActive(input);
  const run = randomUUID();
  await withActive(
    { store: input.store, generation: connection.generation },
    async (transaction) => {
      const to = new Date();
      const from = new Date(to.getTime() - 48 * 3600_000);
      for (const state of ["open", "closed", "expired", "review", "cancelled"])
        await enqueue(
          {
            store: input.store,
            generation: connection.generation,
            kind: "reconcile",
            key: `${connection.generation}:reconcile:${run}:${state}`,
            payload: {
              from: from.toISOString(),
              to: to.toISOString(),
              filter: "updated_at",
              state,
            },
          },
          transaction,
        );
      await enqueue(
        {
          store: input.store,
          generation: connection.generation,
          kind: "hooks",
          key: `${connection.generation}:hooks:${run}`,
        },
        transaction,
      );
    },
  );
};
const withIngestion = async <T>(
  input: { store: string; generation: number; lease?: Lease },
  callback: (
    transaction: TransactionScope,
    connection: Connection,
  ) => Promise<T>,
): Promise<T> => {
  if (
    input.lease &&
    (input.lease.store !== input.store ||
      input.lease.generation !== input.generation)
  )
    throw new LoopLifecycleError("superseded");
  return input.lease
    ? fenced(input.lease, callback)
    : withActive(input, callback);
};
export const ingest = async (input: {
  store: string;
  generation: number;
  returns: LoopReturn[];
  lease?: Lease;
}) =>
  withIngestion(input, async (transaction, connection) => {
    for (const source of input.returns) {
      if (source.store !== input.store)
        throw new LoopLifecycleError("shop_mismatch");
      const item = parseReturn(input.store, source);
      if (
        item.store !== input.store ||
        (item.shop_id && item.shop_id !== connection.shopId)
      )
        throw new LoopLifecycleError("shop_mismatch");
      const version = new Date(
        Math.max(
          Date.parse(item.updated_at),
          item.edited_at ? Date.parse(item.edited_at) : 0,
        ),
      );
      const [previous] = await transaction
        .select()
        .from(schema.loopReturnVersion)
        .where(
          and(
            eq(schema.loopReturnVersion.storeId, input.store),
            eq(schema.loopReturnVersion.loopReturnId, item.id),
          ),
        );
      if (
        previous &&
        (previous.updatedAt > version ||
          (previous.updatedAt.getTime() === version.getTime() &&
            previous.state === "cancelled"))
      )
        continue;
      await transaction
        .insert(schema.loopReturnVersion)
        .values({
          storeId: input.store,
          generation: input.generation,
          loopReturnId: item.id,
          updatedAt: version,
          state: item.state,
        })
        .onConflictDoUpdate({
          target: [
            schema.loopReturnVersion.storeId,
            schema.loopReturnVersion.loopReturnId,
          ],
          set: {
            updatedAt: version,
            state: item.state,
            generation: input.generation,
          },
        });
      // Each delivery is a return snapshot. Removed lines and cancellation cannot survive it.
      await transaction
        .delete(schema.loopReturnLine)
        .where(
          and(
            eq(schema.loopReturnLine.storeId, input.store),
            eq(schema.loopReturnLine.loopReturnId, item.id),
          ),
        );
      if (item.state === "cancelled") continue;
      for (const line of item.line_items) {
        const [product] = line.product_id
          ? await transaction
              .select({ id: schema.product.id })
              .from(schema.product)
              .where(
                and(
                  eq(schema.product.storeId, input.store),
                  eq(schema.product.externalId, line.product_id),
                ),
              )
              .limit(1)
          : [];
        const values = {
          storeId: input.store,
          generation: input.generation,
          loopReturnId: item.id,
          lineItemId: line.line_item_id,
          providerLineItemId: line.provider_line_item_id,
          providerOrderId: item.provider_order_id,
          orderName: item.order_name,
          productId: product?.id ?? null,
          externalProductId: line.product_id,
          variantId: line.variant_id,
          sku: line.sku,
          title: line.title,
          price: line.price,
          refund: line.refund,
          currency: item.currency || null,
          returnReason: line.return_reason,
          parentReturnReason: line.parent_return_reason,
          redactedComment: line.return_comment,
          outcome: item.outcome,
          lineOutcome: line.outcome,
          exchangeVariant: line.exchange_variant,
          returnState: item.state,
          createdAt: new Date(item.created_at),
          updatedAt: version,
          returnedAt: line.returned_at ? new Date(line.returned_at) : null,
        };
        await transaction
          .insert(schema.loopReturnLine)
          .values(values)
          .onConflictDoUpdate({
            target: [
              schema.loopReturnLine.storeId,
              schema.loopReturnLine.lineItemId,
            ],
            set: values,
            setWhere: sql`${schema.loopReturnLine.updatedAt} <= ${version.toISOString()}::timestamp`,
          });
      }
    }
    await transaction
      .update(schema.loopConnection)
      .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.loopConnection.storeId, input.store));
  });
export const claim = async ({
  store,
}: {
  store: string;
}): Promise<Lease | null> => {
  assertMerchant(store);
  return db.transaction(async (transaction) => {
    const now = new Date();
    const [connection] = await transaction
      .select()
      .from(schema.loopConnection)
      .where(
        and(
          eq(schema.loopConnection.storeId, store),
          isNull(schema.loopConnection.disconnectedAt),
          inArray(schema.loopConnection.status, [
            "connected",
            "syncing",
            "error",
          ]),
          or(
            isNull(schema.loopConnection.leaseUntil),
            lt(schema.loopConnection.leaseUntil, now),
          ),
        ),
      )
      .for("update", { skipLocked: true });
    if (!connection || (!connection.apiKey && !connection.accessToken))
      return null;
    const [job] = await transaction
      .select()
      .from(schema.loopJob)
      .where(
        and(
          eq(schema.loopJob.storeId, store),
          eq(schema.loopJob.generation, connection.generation),
          inArray(schema.loopJob.status, ["pending", "running"]),
          lt(schema.loopJob.availableAt, new Date(Date.now() + 1)),
        ),
      )
      .orderBy(asc(schema.loopJob.availableAt), asc(schema.loopJob.createdAt))
      .limit(1)
      .for("update", { skipLocked: true });
    if (!job) return null;
    const token = randomUUID();
    await transaction
      .update(schema.loopConnection)
      .set({
        lease: token,
        leaseUntil: new Date(Date.now() + LEASE_MILLISECONDS),
      })
      .where(eq(schema.loopConnection.storeId, store));
    await transaction
      .update(schema.loopJob)
      .set({
        lease: token,
        status: "running",
        attempts: job.attempts + 1,
        updatedAt: now,
      })
      .where(
        and(eq(schema.loopJob.storeId, store), eq(schema.loopJob.id, job.id)),
      );
    return {
      store,
      generation: connection.generation,
      token,
      job: { ...job, attempts: job.attempts + 1 },
    };
  });
};
export const finish = async (
  lease: Lease,
  next?: Record<string, unknown>,
  delay = 0,
) =>
  fenced(lease, async (transaction) => {
    await transaction
      .update(schema.loopJob)
      .set({
        status: next ? "pending" : "complete",
        availableAt: new Date(
          Date.now() + Math.min(1800_000, Math.max(0, delay)),
        ),
        payload: next ?? {},
        attempts: next ? 0 : lease.job.attempts,
        lease: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.loopJob.storeId, lease.store),
          eq(schema.loopJob.id, lease.job.id),
        ),
      );
    await transaction
      .update(schema.loopConnection)
      .set({
        lease: null,
        leaseUntil: null,
        status: "connected",
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.loopConnection.storeId, lease.store));
  });
export const fail = async (lease: Lease, reason: string) =>
  fenced(lease, async (transaction) => {
    await transaction
      .update(schema.loopJob)
      .set({
        status: lease.job.attempts >= 8 ? "failed" : "pending",
        error: reason,
        lease: null,
        availableAt: new Date(
          Date.now() + Math.min(3600_000, 2000 * 2 ** lease.job.attempts),
        ),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.loopJob.storeId, lease.store),
          eq(schema.loopJob.id, lease.job.id),
        ),
      );
    await transaction
      .update(schema.loopConnection)
      .set({
        status:
          reason === "reconnect_required" ? "reconnect_required" : "error",
        lastError: reason,
        lease: null,
        leaseUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.loopConnection.storeId, lease.store));
  });
const eraseEvidence = async (transaction: TransactionScope, store: string) => {
  for (const table of [
    schema.loopSignalCheck,
    schema.loopProposal,
    schema.loopReasonMapping,
  ])
    await transaction.delete(table).where(eq(table.storeId, store));
  await transaction
    .update(schema.loopMeasurement)
    .set({
      baseline: sql`${schema.loopMeasurement.baseline} - 'mappings' - 'perControl'`,
      snapshot: sql`(${schema.loopMeasurement.snapshot} - 'eligibleControlIds') || '{"collecting":false}'::jsonb`,
      controlProductIds: [],
    })
    .where(eq(schema.loopMeasurement.storeId, store));
  await transaction
    .update(schema.returnExpectationGap)
    .set({
      evidence: sql`jsonb_build_object('refundEstimated', coalesce(${schema.returnExpectationGap.evidence}->'refundEstimated', 'false'::jsonb))`,
      checkRunId: null,
      optimizationId: null,
    })
    .where(eq(schema.returnExpectationGap.storeId, store));
};
export const disconnect = async (input: { store: string; user: string }) => {
  await requireStore(input);
  return db.transaction(async (transaction) => {
    const [connection] = await transaction
      .select()
      .from(schema.loopConnection)
      .where(eq(schema.loopConnection.storeId, input.store))
      .for("update");
    if (!connection || connection.disconnectedAt) return null;
    await eraseEvidence(transaction, input.store);
    for (const table of [schema.loopJob, schema.loopInstallation])
      await transaction.delete(table).where(eq(table.storeId, input.store));
    await transaction
      .update(schema.loopConnection)
      .set({
        apiKey: null,
        accessToken: null,
        refreshToken: null,
        accessTokenExpiresAt: null,
        webhookSecret: null,
        previousWebhookSecret: null,
        previousSecretExpiresAt: null,
        callbackToken: null,
        generation: connection.generation + 1,
        status: "disconnected",
        disconnectedAt: new Date(),
        purgeAfter: new Date(Date.now() + 29 * 86_400_000),
        lease: null,
        leaseUntil: null,
        cleanupRequired: connection.webhookIds.length > 0,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.loopConnection.storeId, input.store));
    // The caller may use this one in-memory grant for bounded hook deletion. It is erased from storage already.
    return connection;
  });
};
export const purge = async ({ store }: { store: string }) => {
  assertMerchant(store);
  await db.transaction(async (transaction) => {
    const [connection] = await transaction
      .select({ disconnectedAt: schema.loopConnection.disconnectedAt })
      .from(schema.loopConnection)
      .where(eq(schema.loopConnection.storeId, store))
      .for("update");
    if (connection && !connection.disconnectedAt)
      throw new LoopLifecycleError("disconnect_first");
    await eraseEvidence(transaction, store);
    for (const table of [
      schema.loopReturnLine,
      schema.loopReturnVersion,
      schema.loopJob,
      schema.loopInstallation,
    ])
      await transaction.delete(table).where(eq(table.storeId, store));
    await transaction
      .update(schema.loopConnection)
      .set({ purgeAfter: null })
      .where(eq(schema.loopConnection.storeId, store));
  });
};
export const rotateSecret = async (input: {
  store: string;
  user: string;
  webhookSecret: string;
}) => {
  await requireStore(input);
  const connection = await requireActive(input);
  await withActive(
    { ...input, generation: connection.generation },
    async (transaction, current) => {
      await transaction
        .update(schema.loopConnection)
        .set({
          previousWebhookSecret: current.webhookSecret,
          previousSecretExpiresAt: new Date(Date.now() + 24 * 3600_000),
          webhookSecret: input.webhookSecret,
          updatedAt: new Date(),
        })
        .where(eq(schema.loopConnection.storeId, input.store));
    },
  );
};
