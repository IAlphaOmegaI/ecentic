import { createHmac, timingSafeEqual } from "node:crypto";
import {
  projectWebhookPayload,
  verifyRechargeWebhook,
  webhookDigest,
} from "@ecentic/recharge";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/server/database";
import * as Model from "./model";
import { configuration, RechargeLifecycleError } from "./types";

export const TOPICS = [
  "subscription/created",
  "subscription/cancelled",
  "order/created",
  "recharge/uninstalled",
] as const;
export type Topic = (typeof TOPICS)[number];

const callbackToken = (connection: string, generation: number, topic: string) =>
  createHmac("sha256", configuration().clientSecret)
    .update(`ecentic/recharge/webhook/v1:${connection}:${generation}:${topic}`)
    .digest("hex");

export const webhookAddress = (
  connection: string,
  generation: number,
  topic: Topic,
) => {
  const url = new URL(
    "/api/integrations/recharge/webhooks",
    configuration().origin,
  );
  url.searchParams.set("connection", connection);
  url.searchParams.set("generation", String(generation));
  url.searchParams.set("topic", topic);
  url.searchParams.set("token", callbackToken(connection, generation, topic));
  return url.toString();
};

export const acceptWebhook = async ({
  url,
  body,
  headers,
}: {
  url: URL;
  body: Uint8Array;
  headers: Headers;
}) => {
  const connection = url.searchParams.get("connection") ?? "";
  const generation = Number(url.searchParams.get("generation"));
  const topic = url.searchParams.get("topic") ?? "";
  const token = url.searchParams.get("token") ?? "";
  // Neither topic nor shop headers are authenticated by Recharge's body signature.
  // Bind both to our unguessable per-connection/generation/topic callback URL.
  if (
    !connection ||
    !Number.isSafeInteger(generation) ||
    !TOPICS.includes(topic as Topic) ||
    !/^[a-f0-9]{64}$/.test(token) ||
    !timingSafeEqual(
      Buffer.from(token, "hex"),
      Buffer.from(callbackToken(connection, generation, topic), "hex"),
    )
  )
    throw new RechargeLifecycleError("invalid_signature");
  if (
    !verifyRechargeWebhook({
      body,
      headers,
      secret: configuration().clientSecret,
    })
  )
    throw new RechargeLifecycleError("invalid_signature");
  const projection = projectWebhookPayload(
    topic,
    JSON.parse(new TextDecoder().decode(body)),
  );
  if (!projection) throw new RechargeLifecycleError("invalid_payload");
  await db.transaction(async (transaction) => {
    await transaction.execute(sql`set local lock_timeout = '1500ms'`);
    await transaction.execute(sql`set local statement_timeout = '2500ms'`);
    const [row] = await transaction
      .select({ storeId: schema.rechargeConnection.storeId })
      .from(schema.rechargeConnection)
      .where(
        and(
          eq(schema.rechargeConnection.id, connection),
          eq(schema.rechargeConnection.generation, generation),
          isNull(schema.rechargeConnection.uninstalledAt),
        ),
      )
      .for("update");
    if (!row) return;
    // Digest of signed bytes is stable across retries and independent of unsigned IDs.
    const digest = webhookDigest(topic, body);
    await Model.enqueue(
      {
        store: row.storeId,
        generation,
        kind: projection.kind === "uninstall" ? "uninstall" : "webhook",
        key: `${connection}:${generation}:event:${digest}`,
        payload: projection as unknown as Record<string, unknown>,
      },
      transaction,
    );
  });
};
