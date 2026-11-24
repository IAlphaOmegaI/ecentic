import { randomUUID } from "node:crypto";
import {
  type CatalogVariant,
  createRechargeClient,
  identifier,
  mapOrderSubscriptions,
  normalizeSubscriptionOffers,
  projectOrder,
  projectSubscription,
  type RechargeClient,
  RechargeError,
  type RechargeOrder,
  type RechargeProduct,
  type RechargeSubscription,
  type RechargeWebhookProjection,
  rechargeTimestamp,
  record,
  refreshToken,
} from "@ecentic/recharge";
import { resultify } from "@zenncore/utils";
import { and, asc, eq, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/server/database";
import * as Model from "./model";
import {
  configuration,
  type Lease,
  RechargeLifecycleError,
  safeError,
} from "./types";
import { TOPICS, webhookAddress } from "./webhooks";

const timestamp = (value: string | null | undefined) => {
  const normalized = rechargeTimestamp(value);
  return normalized ? new Date(normalized) : null;
};

class Deferred extends Error {
  constructor(readonly delay = 0) {
    super("worker_deadline");
  }
}

const clientFor = (lease: Lease, deadline: number): RechargeClient => {
  const beforeRequest = async () => {
    if (Date.now() + 30_000 > deadline) throw new Deferred();
    await Model.beforeRequest(lease);
  };
  const state: { token?: string; expiry?: Date | null } = {};
  const refresh = async () => {
    await beforeRequest();
    const connection = await Model.fenced(
      lease,
      async (_, connection) => connection,
    );
    if (!connection.refreshToken)
      throw new RechargeLifecycleError("reconnect_required");
    const config = configuration();
    const grant = await refreshToken({
      refreshToken: connection.refreshToken,
      clientId: config.clientId,
    });
    await Model.fenced(lease, async (transaction, current) => {
      await transaction
        .update(schema.rechargeConnection)
        .set({
          accessToken: grant.accessToken,
          refreshToken: grant.refreshToken ?? current.refreshToken,
          accessTokenExpiresAt: grant.expiresAt
            ? new Date(grant.expiresAt)
            : null,
          ...(grant.scopes.length > 0 ? { scopes: grant.scopes } : {}),
          updatedAt: new Date(),
        })
        .where(eq(schema.rechargeConnection.id, current.id));
    });
    Object.assign(state, {
      token: grant.accessToken,
      expiry: grant.expiresAt ? new Date(grant.expiresAt) : null,
    });
    return grant.accessToken;
  };
  return createRechargeClient({
    beforeRequest,
    sleep: async (delay) => {
      if (Date.now() + delay + 30_000 > deadline) throw new Deferred(delay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    },
    refreshAccessToken: refresh,
    getAccessToken: async () => {
      if (!state.token) {
        const connection = await Model.fenced(
          lease,
          async (_, connection) => connection,
        );
        if (!connection.accessToken)
          throw new RechargeLifecycleError("reconnect_required");
        Object.assign(state, {
          token: connection.accessToken,
          expiry: connection.accessTokenExpiresAt,
        });
      }
      if (state.expiry && state.expiry.getTime() - Date.now() < 300_000)
        return refresh();
      return state.token!;
    },
  });
};

const saveSubscription = async (lease: Lease, input: RechargeSubscription) => {
  const subscription = projectSubscription(input);
  if (!subscription?.id) return;
  await Model.fenced(lease, async (transaction) => {
    const rows = await transaction
      .select()
      .from(schema.aiOrderAttribution)
      .where(
        and(
          eq(schema.aiOrderAttribution.storeId, lease.store),
          eq(schema.aiOrderAttribution.subscriptionId, String(subscription.id)),
        ),
      );
    const updated = timestamp(subscription.updated_at);
    for (const row of rows) {
      if (updated && row.sourceUpdatedAt && updated < row.sourceUpdatedAt)
        continue;
      await transaction
        .update(schema.aiOrderAttribution)
        .set({
          status: subscription.status ?? "unknown",
          subscribedAt: timestamp(subscription.created_at) ?? row.subscribedAt,
          cancelledAt: timestamp(subscription.cancelled_at),
          sourceUpdatedAt: updated ?? row.sourceUpdatedAt,
          updatedAt: new Date(),
        })
        .where(eq(schema.aiOrderAttribution.id, row.id));
    }
  });
};

const linkOrder = async (
  lease: Lease,
  client: RechargeClient,
  input: RechargeOrder,
) => {
  const order = projectOrder(input);
  if (!order || order.type !== "checkout" || order.status !== "success")
    return false;
  const shopifyOrderId = identifier(order.external_order_id?.ecommerce);
  if (!shopifyOrderId) return false;
  const matches = mapOrderSubscriptions(order);
  const [attribution] = await Model.read(() =>
    db
      .select()
      .from(schema.aiOrderAttribution)
      .where(
        and(
          eq(schema.aiOrderAttribution.storeId, lease.store),
          eq(schema.aiOrderAttribution.shopifyOrderId, shopifyOrderId),
        ),
      )
      .limit(1),
  );
  if (!attribution) return false;
  if (matches.length === 0) {
    await Model.fenced(lease, async (transaction) => {
      await transaction
        .update(schema.aiOrderAttribution)
        .set({
          status: "not_subscription",
          rechargeOrderId: String(order.id),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.aiOrderAttribution.storeId, lease.store),
            eq(schema.aiOrderAttribution.shopifyOrderId, shopifyOrderId),
            eq(schema.aiOrderAttribution.subscriptionId, ""),
          ),
        );
    });
    return true;
  }
  for (const match of matches) {
    const subscription = projectSubscription(
      await client.getSubscription(match.subscriptionId),
    );
    if (!subscription) throw new RechargeLifecycleError("invalid_subscription");
    await Model.fenced(lease, async (transaction) => {
      // The cancellation/active status is read from Recharge now, never from an
      // older event arriving out of order. A renewal cannot create attribution.
      const [stillTracked] = await transaction
        .select({ id: schema.aiOrderAttribution.id })
        .from(schema.aiOrderAttribution)
        .where(
          and(
            eq(schema.aiOrderAttribution.storeId, lease.store),
            eq(schema.aiOrderAttribution.shopifyOrderId, match.shopifyOrderId),
          ),
        )
        .limit(1);
      if (!stillTracked) return;
      const values = {
        storeId: lease.store,
        shopifyOrderId: match.shopifyOrderId,
        rechargeOrderId: match.rechargeOrderId,
        marker: attribution.marker,
        subscriptionId: match.subscriptionId,
        orderedAt: attribution.orderedAt,
        subscribedAt:
          timestamp(subscription.created_at) ?? timestamp(match.createdAt),
        cancelledAt: timestamp(subscription.cancelled_at),
        status: subscription.status ?? "unknown",
        sourceUpdatedAt: timestamp(subscription.updated_at),
        updatedAt: new Date(),
      };
      const [existing] = await transaction
        .select()
        .from(schema.aiOrderAttribution)
        .where(
          and(
            eq(schema.aiOrderAttribution.storeId, lease.store),
            eq(schema.aiOrderAttribution.shopifyOrderId, match.shopifyOrderId),
            eq(schema.aiOrderAttribution.subscriptionId, match.subscriptionId),
          ),
        );
      if (
        !existing?.sourceUpdatedAt ||
        !values.sourceUpdatedAt ||
        values.sourceUpdatedAt >= existing.sourceUpdatedAt
      )
        await transaction
          .insert(schema.aiOrderAttribution)
          .values(values)
          .onConflictDoUpdate({
            target: [
              schema.aiOrderAttribution.storeId,
              schema.aiOrderAttribution.shopifyOrderId,
              schema.aiOrderAttribution.subscriptionId,
            ],
            set: values,
          });
      await transaction
        .delete(schema.aiOrderAttribution)
        .where(
          and(
            eq(schema.aiOrderAttribution.storeId, lease.store),
            eq(schema.aiOrderAttribution.shopifyOrderId, match.shopifyOrderId),
            eq(schema.aiOrderAttribution.subscriptionId, ""),
          ),
        );
    });
  }
  return true;
};

const applyOrder = async (
  lease: Lease,
  client: RechargeClient,
  input: RechargeOrder,
) => {
  const order = projectOrder(input);
  if (!order || order.type !== "checkout" || order.status !== "success")
    return false;
  const orderId = identifier(order.external_order_id?.ecommerce);
  if (!orderId) return false;
  const matches = mapOrderSubscriptions(order);
  if (!matches.length) return linkOrder(lease, client, order);
  return Model.fenced(lease, async (transaction, connection) => {
    const [tracked] = await transaction
      .select({ id: schema.aiOrderAttribution.id })
      .from(schema.aiOrderAttribution)
      .where(
        and(
          eq(schema.aiOrderAttribution.storeId, lease.store),
          eq(schema.aiOrderAttribution.shopifyOrderId, orderId),
        ),
      )
      .limit(1);
    if (!tracked) return false;
    // Each durable link makes one subscription lookup. A large order or slow
    // provider cannot restart hundreds of lookups after every function timeout.
    const jobs = matches.map((match) => ({
      storeId: lease.store,
      generation: lease.generation,
      kind: "link",
      key: `${connection.id}:${lease.generation}:link:${match.rechargeOrderId}:${match.subscriptionId}`,
      payload: {
        order: {
          id: match.rechargeOrderId,
          external_order_id: { ecommerce: orderId },
          type: "checkout",
          status: "success",
          created_at: order.created_at,
          line_items: [
            {
              purchase_item_id: match.subscriptionId,
              purchase_item_type: "subscription",
            },
          ],
        },
      },
    }));
    await transaction
      .insert(schema.rechargeJob)
      .values(jobs)
      .onConflictDoNothing({ target: schema.rechargeJob.key });
    return true;
  });
};

const nextStage = async (lease: Lease, kind: string, run: string) =>
  Model.fenced(lease, async (transaction, connection) => {
    await Model.enqueue(
      {
        store: lease.store,
        generation: lease.generation,
        kind,
        key: `${connection.id}:${lease.generation}:${kind}:${run}`,
        payload: { run },
      },
      transaction,
    );
  });

const productProjection = (product: RechargeProduct): RechargeProduct => ({
  external_product_id: identifier(product.external_product_id) ?? undefined,
  variants: (product.variants ?? []).flatMap((variant) => {
    const identifierValue = identifier(variant.external_variant_id);
    return identifierValue
      ? [
          {
            external_variant_id: identifierValue,
            prices: { unit_price: variant.prices?.unit_price ?? null },
          },
        ]
      : [];
  }),
});

const catalogVariants = (
  products: {
    externalId: string | null;
    rawData: string | null;
    currency: string | null;
  }[],
): CatalogVariant[] =>
  products.flatMap((product) => {
    const parsed = resultify(
      () => JSON.parse(product.rawData ?? "{}") as unknown,
    );
    const raw = parsed.success ? record(parsed.data) : {};
    const externalProductId = identifier(product.externalId);
    if (
      !externalProductId ||
      !product.currency ||
      !Array.isArray(raw["variants"])
    )
      return [];
    return raw["variants"].flatMap((input) => {
      const variant = record(input);
      const externalVariantId = identifier(variant["id"]);
      return externalVariantId &&
        (typeof variant["price"] === "string" ||
          typeof variant["price"] === "number")
        ? [
            {
              externalProductId,
              externalVariantId,
              price: String(variant["price"]),
              currency: product.currency!,
            },
          ]
        : [];
    });
  });

const processJob = async (
  lease: Lease,
  deadline: number,
): Promise<Record<string, unknown> | "uninstalled" | undefined> => {
  const client = clientFor(lease, deadline);
  const payload = lease.job.payload;
  const cursor =
    typeof payload["cursor"] === "string" ? payload["cursor"] : undefined;
  const run =
    typeof payload["run"] === "string" ? payload["run"] : lease.job.id;
  const continuation = (next: string) => {
    // Fail rather than spinning forever when a provider repeats a cursor.
    if (next === cursor) throw new RechargeLifecycleError("repeated_cursor");
    return { ...payload, cursor: next };
  };
  switch (lease.job.kind) {
    case "products": {
      const page = await client.listProducts({ cursor, limit: 100 });
      const values = page.items.flatMap((product) => {
        const data = productProjection(product);
        return data.external_product_id
          ? [
              {
                storeId: lease.store,
                externalId: String(data.external_product_id),
                syncRunId: run,
                data: data as Record<string, unknown>,
              },
            ]
          : [];
      });
      await Model.fenced(lease, async (transaction) => {
        if (values.length)
          await transaction
            .insert(schema.rechargeCatalogItem)
            .values(values)
            .onConflictDoUpdate({
              target: [
                schema.rechargeCatalogItem.storeId,
                schema.rechargeCatalogItem.externalId,
              ],
              set: {
                data: sql`excluded."data"`,
                syncRunId: sql`excluded."syncRunId"`,
              },
            });
      });
      if (page.nextCursor) return continuation(page.nextCursor);
      await nextStage(lease, "plans", run);
      return;
    }
    case "plans": {
      const page = await client.listPlans({ cursor, limit: 100 });
      const [cached, products, connection] = await Promise.all([
        Model.read(() =>
          db
            .select()
            .from(schema.rechargeCatalogItem)
            .where(
              and(
                eq(schema.rechargeCatalogItem.storeId, lease.store),
                eq(schema.rechargeCatalogItem.syncRunId, run),
              ),
            ),
        ),
        Model.read(() =>
          db
            .select({
              id: schema.product.id,
              externalId: schema.product.externalId,
              rawData: schema.product.rawData,
              currency: schema.product.currency,
            })
            .from(schema.product)
            .where(eq(schema.product.storeId, lease.store)),
        ),
        Model.getConnection(lease.store),
      ]);
      const offers = normalizeSubscriptionOffers({
        products: cached.map((row) => row.data as RechargeProduct),
        plans: page.items,
        catalog: catalogVariants(products),
        currency: connection?.currency ?? undefined,
      });
      const productIds = new Map(
        products.map((product) => [product.externalId, product.id]),
      );
      const values = offers.map(({ discountAmount, ...offer }) => ({
        ...offer,
        storeId: lease.store,
        productId: productIds.get(offer.externalProductId) ?? null,
        discountValue: discountAmount,
        syncRunId: run,
        syncedAt: new Date(),
      }));
      const columns = [
        "productId",
        "sellingPlanId",
        "planType",
        "discountType",
        "discountValue",
        "price",
        "currency",
        "orderIntervalUnit",
        "orderIntervalFrequency",
        "chargeIntervalFrequency",
        "pricingStatus",
        "unavailableReason",
        "syncRunId",
        "syncedAt",
      ] as const;
      const updates = Object.fromEntries(
        columns.map((column) => [column, sql.raw(`excluded."${column}"`)]),
      );
      // A variant-heavy page must not hold the webhook's connection lock through
      // thousands of sequential statements. Commit bounded, idempotent batches.
      for (const offset of Array.from(
        { length: Math.ceil(values.length / 100) },
        (_, index) => index * 100,
      ))
        await Model.fenced(lease, async (transaction) => {
          await transaction
            .insert(schema.rechargeSubscriptionOffer)
            .values(values.slice(offset, offset + 100))
            .onConflictDoUpdate({
              target: [
                schema.rechargeSubscriptionOffer.storeId,
                schema.rechargeSubscriptionOffer.externalProductId,
                schema.rechargeSubscriptionOffer.externalVariantId,
                schema.rechargeSubscriptionOffer.planId,
              ],
              set: updates,
            });
        });
      if (!page.nextCursor)
        await Model.fenced(lease, async (transaction) => {
          await transaction
            .delete(schema.rechargeSubscriptionOffer)
            .where(
              and(
                eq(schema.rechargeSubscriptionOffer.storeId, lease.store),
                ne(schema.rechargeSubscriptionOffer.syncRunId, run),
              ),
            );
          await transaction
            .delete(schema.rechargeCatalogItem)
            .where(eq(schema.rechargeCatalogItem.storeId, lease.store));
        });
      if (page.nextCursor) return continuation(page.nextCursor);
      await nextStage(lease, "orders", run);
      return;
    }
    case "orders":
    case "match": {
      const page = await client.listOrders({
        cursor,
        limit: 25,
        ...(lease.job.kind === "match"
          ? { external_order_id: String(payload["order"]) }
          : {}),
      });
      const matched = [];
      for (const order of page.items)
        matched.push(await applyOrder(lease, client, order));
      if (page.nextCursor) return continuation(page.nextCursor);
      if (lease.job.kind === "orders")
        await nextStage(lease, "subscriptions", run);
      if (lease.job.kind === "match" && !matched.some(Boolean))
        throw new RechargeLifecycleError("awaiting_order");
      return;
    }
    case "subscriptions": {
      const page = await client.listSubscriptions({ cursor, limit: 100 });
      for (const subscription of page.items)
        await saveSubscription(lease, subscription);
      if (page.nextCursor) return continuation(page.nextCursor);
      await Model.fenced(lease, async (transaction, connection) => {
        await transaction
          .update(schema.rechargeConnection)
          .set({
            status: "connected",
            lastSyncedAt: new Date(),
            error: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.rechargeConnection.id, connection.id));
      });
      return;
    }
    case "webhook": {
      const event = payload as unknown as RechargeWebhookProjection;
      if (event.kind === "uninstall") {
        await Model.disconnect({
          store: lease.store,
          generation: lease.generation,
        });
        return "uninstalled";
      }
      if (event.kind === "subscription" && event.subscription.id) {
        const [known] = await Model.read(() =>
          db
            .select({ id: schema.aiOrderAttribution.id })
            .from(schema.aiOrderAttribution)
            .where(
              and(
                eq(schema.aiOrderAttribution.storeId, lease.store),
                eq(
                  schema.aiOrderAttribution.subscriptionId,
                  String(event.subscription.id),
                ),
              ),
            )
            .limit(1),
        );
        if (known)
          await saveSubscription(
            lease,
            await client.getSubscription(event.subscription.id),
          );
      }
      if (event.kind === "order") await applyOrder(lease, client, event.order);
      return;
    }
    case "link": {
      await linkOrder(lease, client, payload["order"] as RechargeOrder);
      return;
    }
    case "uninstall": {
      await Model.disconnect({
        store: lease.store,
        generation: lease.generation,
      });
      return "uninstalled";
    }
    case "hooks": {
      const connection = await Model.fenced(
        lease,
        async (_, connection) => connection,
      );
      const page = await client.listWebhooks({ cursor, limit: 250 });
      const found = new Set(
        Array.isArray(payload["found"])
          ? payload["found"].filter(
              (value): value is string => typeof value === "string",
            )
          : [],
      );
      const obsolete = new Set(
        Array.isArray(payload["obsolete"])
          ? payload["obsolete"].filter(
              (value): value is string => typeof value === "string",
            )
          : [],
      );
      for (const hook of page.items) {
        const parsed = resultify(() => new URL(hook.address));
        if (!parsed.success) continue;
        const address = parsed.data;
        if (
          address.origin === configuration().origin &&
          address.pathname === "/api/integrations/recharge/webhooks" &&
          address.searchParams.get("connection") === connection.id &&
          address.searchParams.get("generation") !==
            String(connection.generation)
        )
          obsolete.add(String(hook.id));
      }
      for (const topic of TOPICS)
        if (
          page.items.some(
            (hook) =>
              hook.topic === topic &&
              hook.address ===
                webhookAddress(connection.id, connection.generation, topic),
          )
        )
          found.add(topic);
      if (page.nextCursor)
        return {
          ...continuation(page.nextCursor),
          found: [...found],
          obsolete: [...obsolete],
        };
      for (const topic of TOPICS)
        if (!found.has(topic))
          await client.createWebhook({
            topic,
            address: webhookAddress(
              connection.id,
              connection.generation,
              topic,
            ),
          });
      for (const hook of obsolete) await client.deleteWebhook(hook);
      return;
    }
    default:
      throw new RechargeLifecycleError("unknown_job");
  }
};

/** Page-sized checkpoints mean a terminated process resumes safely on the next tick. */
export const drain = async ({
  limit = 10,
  budgetMilliseconds = 240_000,
}: {
  limit?: number;
  budgetMilliseconds?: number;
} = {}) => {
  await Model.cleanup();
  const start = Date.now();
  const outcomes: string[] = [];
  for (const _ of Array.from({ length: Math.min(50, Math.max(1, limit)) })) {
    if (Date.now() - start >= budgetMilliseconds) break;
    const lease = await Model.claim();
    if (!lease) break;
    const result = await resultify(() =>
      processJob(lease, start + budgetMilliseconds),
    );
    if (result.success) {
      if (result.data !== "uninstalled") await Model.finish(lease, result.data);
      outcomes.push("processed");
    } else {
      if (result.error instanceof Deferred) {
        await Model.finish(lease, lease.job.payload, result.error.delay);
        break;
      }
      const reason =
        result.error instanceof RechargeError &&
        (result.error.status === 401 || result.error.status === 403)
          ? "reconnect_required"
          : safeError(result.error);
      const saved = await resultify(() => Model.fail(lease, reason));
      if (!saved.success && safeError(saved.error) !== "superseded")
        throw saved.error;
      outcomes.push(reason);
    }
  }
  return {
    processed: outcomes.filter((outcome) => outcome === "processed").length,
    failed: outcomes.filter((outcome) => outcome !== "processed").length,
  };
};

export const maintain = async ({ limit = 100 }: { limit?: number } = {}) => {
  await Model.cleanup();
  const connections = await Model.read(() =>
    db
      .select({ storeId: schema.rechargeConnection.storeId })
      .from(schema.rechargeConnection)
      .where(
        and(
          isNull(schema.rechargeConnection.uninstalledAt),
          inArray(schema.rechargeConnection.status, [
            "connected",
            "syncing",
            "error",
          ]),
          or(
            isNull(schema.rechargeConnection.lastMaintenanceAt),
            lt(
              schema.rechargeConnection.lastMaintenanceAt,
              new Date(Date.now() - 23 * 3600_000),
            ),
          ),
        ),
      )
      .orderBy(asc(schema.rechargeConnection.lastMaintenanceAt))
      .limit(limit),
  );
  for (const candidate of connections)
    await db.transaction(async (transaction) => {
      const [connection] = await transaction
        .select()
        .from(schema.rechargeConnection)
        .where(
          and(
            eq(schema.rechargeConnection.storeId, candidate.storeId),
            isNull(schema.rechargeConnection.uninstalledAt),
          ),
        )
        .for("update");
      if (
        !connection ||
        (connection.lastMaintenanceAt &&
          connection.lastMaintenanceAt.getTime() > Date.now() - 23 * 3600_000)
      )
        return;
      const run = randomUUID();
      await Model.enqueue(
        {
          store: connection.storeId,
          generation: connection.generation,
          kind: "hooks",
          key: `${connection.id}:${connection.generation}:hooks:${run}`,
        },
        transaction,
      );
      const [syncing] = await transaction
        .select({ id: schema.rechargeJob.id })
        .from(schema.rechargeJob)
        .where(
          and(
            eq(schema.rechargeJob.storeId, connection.storeId),
            eq(schema.rechargeJob.generation, connection.generation),
            inArray(schema.rechargeJob.kind, [
              "products",
              "plans",
              "orders",
              "subscriptions",
            ]),
            inArray(schema.rechargeJob.status, ["pending", "running"]),
          ),
        )
        .limit(1);
      if (!syncing)
        await Model.enqueue(
          {
            store: connection.storeId,
            generation: connection.generation,
            kind: "products",
            key: `${connection.id}:${connection.generation}:products:${run}`,
            payload: { run },
          },
          transaction,
        );
      await transaction
        .update(schema.rechargeConnection)
        .set({ lastMaintenanceAt: new Date() })
        .where(eq(schema.rechargeConnection.id, connection.id));
    });
  return { scheduled: connections.length };
};
