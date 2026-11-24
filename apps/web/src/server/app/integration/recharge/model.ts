// Server-internal repositories. No decrypted credentials are Server Action results.
// Transactions here own the queue's row locks and uninstall generation fencing.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  and,
  asc,
  count,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { db, schema, type TransactionScope } from "@/server/database";
import { resultifyRead } from "@/server/utils/repository";
import {
  type Connection,
  type Installation,
  LEASE_MILLISECONDS,
  type Lease,
  type Metrics,
  type Offer,
  RechargeLifecycleError,
  type Status,
} from "./types";

const active = (
  connection: Pick<Connection, "status" | "uninstalledAt"> | undefined,
) =>
  connection &&
  !connection.uninstalledAt &&
  connection.status !== "disconnected";

export const read = async <T>(query: () => PromiseLike<T>): Promise<T> => {
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
  const [owned] = await read(() =>
    db
      .select()
      .from(schema.store)
      .where(and(eq(schema.store.id, store), eq(schema.store.userId, user)))
      .limit(1),
  );
  if (!owned) throw new RechargeLifecycleError("store_not_found");
  return owned;
};

export const getConnection = async (store: string) => {
  const [connection] = await read(() =>
    db
      .select()
      .from(schema.rechargeConnection)
      .where(eq(schema.rechargeConnection.storeId, store))
      .limit(1),
  );
  return connection;
};

export const getStatus = async (input: {
  store: string;
  user: string;
}): Promise<Status> => {
  const store = await requireStore(input);
  const [connection] = await read(() =>
    db
      .select({
        status: schema.rechargeConnection.status,
        lastSyncedAt: schema.rechargeConnection.lastSyncedAt,
        uninstalledAt: schema.rechargeConnection.uninstalledAt,
      })
      .from(schema.rechargeConnection)
      .where(eq(schema.rechargeConnection.storeId, input.store)),
  );
  const [offers] = await read(() =>
    db
      .select({ count: count() })
      .from(schema.rechargeSubscriptionOffer)
      .where(eq(schema.rechargeSubscriptionOffer.storeId, input.store)),
  );
  return {
    supported: store.platform === "shopify" && store.status === "connected",
    configured: Boolean(
      process.env.RECHARGE_CLIENT_ID &&
        process.env.RECHARGE_CLIENT_SECRET &&
        process.env.RECHARGE_REDIRECT_URI,
    ),
    connected: Boolean(
      connection &&
        !connection.uninstalledAt &&
        connection.status !== "disconnected",
    ),
    status: connection?.status ?? "not_connected",
    lastSyncedAt: connection?.lastSyncedAt ?? null,
    offerCount: Number(offers?.count ?? 0),
  };
};

const liveMetrics = async (
  database: typeof db | TransactionScope,
  store: string,
): Promise<Metrics> => {
  const table = schema.aiOrderAttribution;
  const query = () =>
    database
      .select({
        aiFirstOrders: sql<number>`count(distinct ${table.shopifyOrderId})`,
        convertedSubscriptions: sql<number>`count(distinct ${table.shopifyOrderId}) filter (where ${table.subscribedAt} is not null)`,
        activeSubscriptions: sql<number>`count(distinct ${table.subscriptionId}) filter (where ${table.status} = 'active' and ${table.subscriptionId} <> '')`,
      })
      .from(table)
      .where(eq(table.storeId, store));
  const [metrics] = database === db ? await read(query) : await query();
  return {
    aiFirstOrders: Number(metrics?.aiFirstOrders ?? 0),
    convertedSubscriptions: Number(metrics?.convertedSubscriptions ?? 0),
    activeSubscriptions: Number(metrics?.activeSubscriptions ?? 0),
    asOf: null,
  };
};

export const getMetrics = async (input: { store: string; user: string }) => {
  await requireStore(input);
  const [connection] = await read(() =>
    db
      .select({ uninstalledAt: schema.rechargeConnection.uninstalledAt })
      .from(schema.rechargeConnection)
      .where(eq(schema.rechargeConnection.storeId, input.store)),
  );
  if (connection?.uninstalledAt) {
    const [aggregate] = await read(() =>
      db
        .select()
        .from(schema.rechargeAggregate)
        .where(eq(schema.rechargeAggregate.storeId, input.store)),
    );
    if (aggregate) return aggregate;
  }
  return liveMetrics(db, input.store);
};

export const listOffersForProducts = async ({
  store,
  products,
}: {
  store: string;
  products?: string[];
}): Promise<Offer[]> => {
  if (products?.length === 0) return [];
  return read(() =>
    db
      .select()
      .from(schema.rechargeSubscriptionOffer)
      .where(
        and(
          eq(schema.rechargeSubscriptionOffer.storeId, store),
          products
            ? inArray(schema.rechargeSubscriptionOffer.productId, products)
            : undefined,
        ),
      ),
  );
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
  database: typeof db | TransactionScope = db,
) => {
  await database
    .insert(schema.rechargeJob)
    .values({
      storeId: input.store,
      generation: input.generation,
      kind: input.kind,
      key: input.key,
      payload: input.payload ?? {},
      availableAt: input.availableAt ?? new Date(),
    })
    .onConflictDoNothing({ target: schema.rechargeJob.key });
};

export const requestSync = async (input: { store: string; user: string }) => {
  const store = await requireStore(input);
  if (store.platform !== "shopify" || store.status !== "connected")
    throw new RechargeLifecycleError("connect_shopify_first");
  await db.transaction(async (transaction) => {
    const [connection] = await transaction
      .select()
      .from(schema.rechargeConnection)
      .where(eq(schema.rechargeConnection.storeId, input.store))
      .for("update");
    if (!active(connection) || !connection?.accessToken)
      throw new RechargeLifecycleError("reconnect_required");
    const [pending] = await transaction
      .select({ id: schema.rechargeJob.id })
      .from(schema.rechargeJob)
      .where(
        and(
          eq(schema.rechargeJob.storeId, input.store),
          eq(schema.rechargeJob.generation, connection.generation),
          inArray(schema.rechargeJob.status, ["pending", "running"]),
          inArray(schema.rechargeJob.kind, [
            "products",
            "plans",
            "orders",
            "subscriptions",
          ]),
        ),
      )
      .limit(1);
    if (pending) return;
    const run = randomUUID();
    await enqueue(
      {
        store: input.store,
        generation: connection.generation,
        kind: "products",
        key: `${connection.id}:${connection.generation}:sync:${run}`,
        payload: { run },
      },
      transaction,
    );
    await transaction
      .update(schema.rechargeConnection)
      .set({ status: "syncing", error: null, updatedAt: new Date() })
      .where(eq(schema.rechargeConnection.id, connection.id));
  });
};

export const claim = async (): Promise<Lease | null> =>
  db.transaction(async (transaction) => {
    const now = new Date();
    const connectionTable = schema.rechargeConnection;
    const jobs = schema.rechargeJob;
    const [connection] = await transaction
      .select({
        id: connectionTable.id,
        storeId: connectionTable.storeId,
        generation: connectionTable.generation,
        status: connectionTable.status,
      })
      .from(connectionTable)
      .where(
        and(
          isNull(connectionTable.uninstalledAt),
          inArray(connectionTable.status, [
            "connected",
            "syncing",
            "error",
            "reconnect_required",
          ]),
          or(
            isNull(connectionTable.leaseUntil),
            lt(connectionTable.leaseUntil, now),
          ),
          sql`exists (select 1 from ${jobs} where ${jobs.storeId} = ${connectionTable.storeId} and ${jobs.generation} = ${connectionTable.generation} and ${jobs.status} in ('pending','running') and ${jobs.availableAt} <= ${now.toISOString()}::timestamp and (${connectionTable.status} <> 'reconnect_required' or ${jobs.kind} = 'uninstall'))`,
        ),
      )
      .orderBy(asc(connectionTable.updatedAt))
      .limit(1)
      .for("update", { skipLocked: true });
    if (!connection) return null;
    const [job] = await transaction
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.storeId, connection.storeId),
          eq(jobs.generation, connection.generation),
          inArray(jobs.status, ["pending", "running"]),
          lt(jobs.availableAt, new Date(Date.now() + 1)),
          connection.status === "reconnect_required"
            ? eq(jobs.kind, "uninstall")
            : undefined,
        ),
      )
      .orderBy(
        sql`case when ${jobs.kind} = 'uninstall' then 0 else 1 end`,
        asc(jobs.availableAt),
        asc(jobs.createdAt),
      )
      .limit(1)
      .for("update", { skipLocked: true });
    if (!job) return null;
    const token = randomUUID();
    await transaction
      .update(connectionTable)
      .set({
        lease: token,
        leaseUntil: new Date(Date.now() + LEASE_MILLISECONDS),
        updatedAt: now,
      })
      .where(eq(connectionTable.id, connection.id));
    await transaction
      .update(jobs)
      .set({
        lease: token,
        status: "running",
        attempts: job.attempts + 1,
        updatedAt: now,
      })
      .where(eq(jobs.id, job.id));
    return {
      store: connection.storeId,
      generation: connection.generation,
      token,
      job: {
        ...job,
        attempts: job.attempts + 1,
        lease: token,
        status: "running",
      },
    };
  });

export const fenced = async <T>(
  lease: Lease,
  callback: (
    transaction: TransactionScope,
    connection: Connection,
  ) => Promise<T>,
): Promise<T> =>
  db.transaction(async (transaction) => {
    const [connection] = await transaction
      .select()
      .from(schema.rechargeConnection)
      .where(
        and(
          eq(schema.rechargeConnection.storeId, lease.store),
          eq(schema.rechargeConnection.generation, lease.generation),
          eq(schema.rechargeConnection.lease, lease.token),
          gt(schema.rechargeConnection.leaseUntil, new Date()),
          isNull(schema.rechargeConnection.uninstalledAt),
        ),
      )
      .for("update");
    if (!connection) throw new RechargeLifecycleError("superseded");
    return callback(transaction, connection);
  });

/** Conservative leaky-bucket use: reserve one slot every 500ms, globally per shop. */
export const beforeRequest = async (lease: Lease) => {
  const wait = await fenced(lease, async (transaction, connection) => {
    const now = Date.now();
    const at = Math.max(now, connection.nextRequestAt?.getTime() ?? 0);
    await transaction
      .update(schema.rechargeConnection)
      .set({
        nextRequestAt: new Date(at + 500),
        leaseUntil: new Date(at + LEASE_MILLISECONDS),
      })
      .where(eq(schema.rechargeConnection.id, connection.id));
    return at - now;
  });
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
};

export const finish = async (
  lease: Lease,
  next?: Record<string, unknown>,
  delay = 0,
) =>
  fenced(lease, async (transaction, connection) => {
    await transaction
      .update(schema.rechargeJob)
      .set({
        status: next ? "pending" : "done",
        payload: next ?? {},
        attempts: next ? 0 : lease.job.attempts,
        lease: null,
        error: null,
        availableAt: new Date(Date.now() + delay),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.rechargeJob.id, lease.job.id),
          eq(schema.rechargeJob.lease, lease.token),
        ),
      );
    await transaction
      .update(schema.rechargeConnection)
      .set({ lease: null, leaseUntil: null })
      .where(eq(schema.rechargeConnection.id, connection.id));
  });

export const fail = async (lease: Lease, reason: string) =>
  fenced(lease, async (transaction, connection) => {
    const terminal =
      lease.job.attempts >= 10 || reason === "reconnect_required";
    const awaiting = reason === "awaiting_order";
    await transaction
      .update(schema.rechargeJob)
      .set({
        status: terminal ? (awaiting ? "done" : "failed") : "pending",
        error: awaiting ? null : reason,
        lease: null,
        availableAt: new Date(
          Date.now() +
            Math.min(3_600_000, 2 ** Math.min(lease.job.attempts, 10) * 2000),
        ),
        updatedAt: new Date(),
      })
      .where(eq(schema.rechargeJob.id, lease.job.id));
    await transaction
      .update(schema.rechargeConnection)
      .set({
        lease: null,
        leaseUntil: null,
        error: awaiting ? null : reason,
        ...(terminal && !awaiting
          ? {
              status:
                reason === "reconnect_required"
                  ? ("reconnect_required" as const)
                  : ("error" as const),
            }
          : {}),
      })
      .where(eq(schema.rechargeConnection.id, connection.id));
  });

export const disconnect = async ({
  store,
  user,
  generation,
}: {
  store: string;
  user?: string;
  generation?: number;
}) => {
  if (user) await requireStore({ store, user });
  await db.transaction(async (transaction) => {
    const [connection] = await transaction
      .select({
        generation: schema.rechargeConnection.generation,
        status: schema.rechargeConnection.status,
        uninstalledAt: schema.rechargeConnection.uninstalledAt,
      })
      .from(schema.rechargeConnection)
      .where(eq(schema.rechargeConnection.storeId, store))
      .for("update");
    if (
      !active(connection) ||
      (generation !== undefined && generation !== connection?.generation)
    )
      return;
    const metrics = await liveMetrics(transaction, store);
    const aggregate = {
      storeId: store,
      aiFirstOrders: metrics.aiFirstOrders,
      convertedSubscriptions: metrics.convertedSubscriptions,
      activeSubscriptions: metrics.activeSubscriptions,
      asOf: new Date(),
    };
    await transaction
      .insert(schema.rechargeAggregate)
      .values(aggregate)
      .onConflictDoUpdate({
        target: schema.rechargeAggregate.storeId,
        set: aggregate,
      });
    for (const table of [
      schema.rechargeJob,
      schema.rechargeOfferCheck,
      schema.rechargeSubscriptionOffer,
      schema.rechargeCatalogItem,
      schema.aiOrderAttribution,
      schema.rechargeCheckoutIntent,
      schema.rechargeInstallation,
    ])
      await transaction.delete(table).where(eq(table.storeId, store));
    await transaction
      .update(schema.rechargeConnection)
      .set({
        accessToken: null,
        refreshToken: null,
        accessTokenExpiresAt: null,
        scopes: [],
        externalStoreId: null,
        domain: null,
        currency: null,
        generation: connection!.generation + 1,
        status: "disconnected",
        uninstalledAt: new Date(),
        lastSyncedAt: null,
        lease: null,
        leaseUntil: null,
        nextRequestAt: null,
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.rechargeConnection.storeId, store));
  });
};

export const createCheckoutIntent = async ({
  store,
  reference,
  expiresAt,
}: {
  store: string;
  reference: string;
  expiresAt: Date;
}) =>
  db.transaction(async (transaction) => {
    const [connection] = await transaction
      .select()
      .from(schema.rechargeConnection)
      .where(eq(schema.rechargeConnection.storeId, store))
      .for("update");
    if (
      !active(connection) ||
      !connection?.accessToken ||
      connection.status === "reconnect_required"
    )
      throw new RechargeLifecycleError("reconnect_required");
    await transaction.insert(schema.rechargeCheckoutIntent).values({
      id: reference,
      storeId: store,
      generation: connection.generation,
      expiresAt,
    });
    return { reference };
  });

/** Internal-only: caller must validate the signed marker on the authenticated Shopify webhook. */
export const recordAiOrder = async ({
  store,
  order,
  reference,
  marker,
  createdAt,
}: {
  store: string;
  order: string;
  reference: string;
  marker: string;
  createdAt: Date;
}): Promise<boolean> =>
  db.transaction(async (transaction) => {
    const [connection] = await transaction
      .select()
      .from(schema.rechargeConnection)
      .where(eq(schema.rechargeConnection.storeId, store))
      .for("update");
    if (!active(connection)) return false;
    const [intent] = await transaction
      .select()
      .from(schema.rechargeCheckoutIntent)
      .where(
        and(
          eq(schema.rechargeCheckoutIntent.id, reference),
          eq(schema.rechargeCheckoutIntent.storeId, store),
        ),
      )
      .for("update");
    if (
      !intent ||
      intent.generation !== connection!.generation ||
      (intent.consumedOrderId && intent.consumedOrderId !== order)
    )
      return false;
    // Shopify timestamps have second precision; our receipt records milliseconds.
    if (
      !intent.consumedOrderId &&
      (intent.expiresAt < createdAt ||
        createdAt.getTime() + 1000 < intent.createdAt.getTime())
    )
      return false;
    await transaction
      .update(schema.rechargeCheckoutIntent)
      .set({ consumedOrderId: order })
      .where(eq(schema.rechargeCheckoutIntent.id, reference));
    const [exists] = await transaction
      .select({ id: schema.aiOrderAttribution.id })
      .from(schema.aiOrderAttribution)
      .where(
        and(
          eq(schema.aiOrderAttribution.storeId, store),
          eq(schema.aiOrderAttribution.shopifyOrderId, order),
        ),
      )
      .limit(1);
    if (!exists)
      await transaction
        .insert(schema.aiOrderAttribution)
        .values({
          storeId: store,
          shopifyOrderId: order,
          marker,
          orderedAt: createdAt,
        })
        .onConflictDoNothing();
    await enqueue(
      {
        store,
        generation: connection!.generation,
        kind: "match",
        key: `${connection!.id}:${connection!.generation}:match:${order}`,
        payload: { order },
      },
      transaction,
    );
    return true;
  });

export const installationHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newInstallation = async (input: {
  store?: string;
  user?: string;
  returnTo?: string;
  code?: string;
}) => {
  const token = randomBytes(32).toString("base64url");
  await db.insert(schema.rechargeInstallation).values({
    id: installationHash(token),
    storeId: input.store,
    userId: input.user,
    returnTo: input.returnTo,
    code: input.code,
    expiresAt: new Date(Date.now() + 10 * 60_000),
  });
  return token;
};

export const captureCode = async (code: string, token?: string) => {
  if (!code || code.length > 4096)
    throw new RechargeLifecycleError("invalid_code");
  if (token) {
    const rows = await db
      .update(schema.rechargeInstallation)
      .set({ code })
      .where(
        and(
          eq(schema.rechargeInstallation.id, installationHash(token)),
          eq(schema.rechargeInstallation.state, "pending"),
          isNull(schema.rechargeInstallation.code),
          gt(schema.rechargeInstallation.expiresAt, new Date()),
        ),
      )
      .returning({ id: schema.rechargeInstallation.id });
    if (rows.length > 0) return token;
    // Never replace an in-progress browser-bound install with another callback.
    throw new RechargeLifecycleError("expired");
  }
  return newInstallation({ code });
};

export const claimInstallation = async (
  token: string,
  user: string,
): Promise<Installation> => {
  const rows = await db
    .update(schema.rechargeInstallation)
    .set({ state: "redeeming", lease: randomUUID() })
    .where(
      and(
        eq(schema.rechargeInstallation.id, installationHash(token)),
        eq(schema.rechargeInstallation.state, "pending"),
        gt(schema.rechargeInstallation.expiresAt, new Date()),
        or(
          isNull(schema.rechargeInstallation.userId),
          eq(schema.rechargeInstallation.userId, user),
        ),
      ),
    )
    .returning();
  if (!rows[0]) throw new RechargeLifecycleError("expired");
  return rows[0];
};

export const saveGrant = async (installation: Installation, grant: string) => {
  await db
    .update(schema.rechargeInstallation)
    .set({ grant, code: null })
    .where(
      and(
        eq(schema.rechargeInstallation.id, installation.id),
        eq(schema.rechargeInstallation.lease, installation.lease!),
      ),
    );
};

/** Complete the Marketplace → sign-up → verified Shopify connect handoff. */
export const bindPendingStore = async ({
  cookie,
  store,
  user,
  returnTo,
}: {
  cookie: string;
  store: string;
  user: string;
  returnTo: string;
}) => {
  await db
    .update(schema.rechargeInstallation)
    .set({ storeId: store, userId: user, returnTo })
    .where(
      and(
        eq(schema.rechargeInstallation.id, installationHash(cookie)),
        eq(schema.rechargeInstallation.state, "pending"),
        gt(schema.rechargeInstallation.expiresAt, new Date()),
        or(
          isNull(schema.rechargeInstallation.userId),
          eq(schema.rechargeInstallation.userId, user),
        ),
        or(
          isNull(schema.rechargeInstallation.storeId),
          eq(schema.rechargeInstallation.storeId, store),
        ),
      ),
    );
};

export const reserveInstallationCall = async (installation: Installation) => {
  // A settings reconnect shares the exact same reservation clock as workers.
  // A Marketplace install has no authenticated shop identity until GET /store;
  // its one claimed installation serializes that bounded bootstrap request.
  const wait = installation.storeId
    ? await db.transaction(async (transaction) => {
        const [connection] = await transaction
          .select({
            id: schema.rechargeConnection.id,
            nextRequestAt: schema.rechargeConnection.nextRequestAt,
          })
          .from(schema.rechargeConnection)
          .where(eq(schema.rechargeConnection.storeId, installation.storeId!))
          .for("update");
        if (!connection) return 500;
        const at = Math.max(
          Date.now(),
          connection.nextRequestAt?.getTime() ?? 0,
        );
        await transaction
          .update(schema.rechargeConnection)
          .set({ nextRequestAt: new Date(at + 500) })
          .where(eq(schema.rechargeConnection.id, connection.id));
        return Math.max(0, at - Date.now());
      })
    : 500;
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
};

export const cleanup = async () => {
  await db
    .delete(schema.rechargeInstallation)
    .where(lt(schema.rechargeInstallation.expiresAt, new Date()));
  await db
    .delete(schema.rechargeCheckoutIntent)
    .where(
      and(
        lt(
          schema.rechargeCheckoutIntent.expiresAt,
          new Date(Date.now() - 7 * 86400_000),
        ),
        isNull(schema.rechargeCheckoutIntent.consumedOrderId),
      ),
    );
  await db
    .delete(schema.rechargeJob)
    .where(
      and(
        eq(schema.rechargeJob.status, "done"),
        lt(schema.rechargeJob.updatedAt, new Date(Date.now() - 7 * 86400_000)),
      ),
    );
};

/** Called only by Shopify's verified compliance webhook, never a browser action. */
export const getAttributionsForOrders = async ({
  store,
  orders,
}: {
  store: string;
  orders: string[];
}) => {
  if (orders.length === 0) return [];
  const table = schema.aiOrderAttribution;
  return read(() =>
    db
      .select({
        shopifyOrderId: table.shopifyOrderId,
        rechargeOrderId: table.rechargeOrderId,
        subscriptionId: table.subscriptionId,
        status: table.status,
        subscribedAt: table.subscribedAt,
        cancelledAt: table.cancelledAt,
        orderedAt: table.orderedAt,
      })
      .from(table)
      .where(
        and(eq(table.storeId, store), inArray(table.shopifyOrderId, orders)),
      ),
  );
};

export const redactOrders = async ({
  store,
  orders,
}: {
  store: string;
  orders: string[];
}) => {
  if (orders.length === 0) return;
  await db.transaction(async (transaction) => {
    // Match the worker lock order so a late worker cannot recreate removed links.
    await transaction
      .select({ id: schema.rechargeConnection.id })
      .from(schema.rechargeConnection)
      .where(eq(schema.rechargeConnection.storeId, store))
      .for("update");
    await transaction
      .delete(schema.aiOrderAttribution)
      .where(
        and(
          eq(schema.aiOrderAttribution.storeId, store),
          inArray(schema.aiOrderAttribution.shopifyOrderId, orders),
        ),
      );
    await transaction
      .delete(schema.rechargeCheckoutIntent)
      .where(
        and(
          eq(schema.rechargeCheckoutIntent.storeId, store),
          inArray(schema.rechargeCheckoutIntent.consumedOrderId, orders),
        ),
      );
    const jobs = await transaction
      .select()
      .from(schema.rechargeJob)
      .where(eq(schema.rechargeJob.storeId, store));
    const matching = jobs.filter((job) => {
      const payloadOrder = job.payload["order"];
      if (typeof payloadOrder === "string")
        return orders.includes(payloadOrder);
      if (!payloadOrder || typeof payloadOrder !== "object") return false;
      const external = (
        payloadOrder as { external_order_id?: { ecommerce?: string } }
      ).external_order_id?.ecommerce;
      return Boolean(external && orders.includes(external));
    });
    if (matching.length)
      await transaction.delete(schema.rechargeJob).where(
        inArray(
          schema.rechargeJob.id,
          matching.map((job) => job.id),
        ),
      );
  });
};

/** Paid-answer budget is aggregate connection state, retained when details are erased. */
export const reserveAnswerCaptures = async ({
  store,
  day,
  requested,
  transaction,
}: {
  store: string;
  day: string;
  requested: number;
  transaction: TransactionScope;
}) => {
  const table = schema.rechargeConnection;
  const [connection] = await transaction
    .select({
      id: table.id,
      status: table.status,
      uninstalledAt: table.uninstalledAt,
      answerCaptureDay: table.answerCaptureDay,
      answerCaptureCount: table.answerCaptureCount,
    })
    .from(table)
    .where(eq(table.storeId, store))
    .for("update");
  if (
    !connection ||
    connection.uninstalledAt ||
    !["connected", "syncing"].includes(connection.status)
  )
    return 0;
  const used =
    connection.answerCaptureDay === day ? connection.answerCaptureCount : 0;
  const allowed = Math.min(
    Math.max(0, Math.floor(requested)),
    Math.max(0, 10 - used),
  );
  if (allowed > 0)
    await transaction
      .update(table)
      .set({ answerCaptureDay: day, answerCaptureCount: used + allowed })
      .where(eq(table.id, connection.id));
  return allowed;
};
