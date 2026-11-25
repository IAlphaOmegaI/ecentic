// Loop data is read per merchant after consent; callback identity is bound to one connection generation.
import { timingSafeEqual } from "node:crypto";
import {
  LOOP_TRIGGERS,
  parseReturn,
  verifySignature,
  webhookKey,
} from "@ecentic/loop";
import { resultify } from "@zenncore/utils";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/server/database";
import * as Model from "./model";
import { type Connection, LoopLifecycleError, webhookOrigin } from "./types";

export const webhookAddress = (
  connection: Pick<
    Connection,
    "storeId" | "id" | "generation" | "callbackToken"
  >,
) => {
  if (!connection.storeId || !connection.callbackToken)
    throw new LoopLifecycleError("webhook_not_configured");
  const url = new URL("/api/integrations/loop/webhooks", webhookOrigin());
  url.search = new URLSearchParams({
    connection: connection.id,
    generation: String(connection.generation),
    token: connection.callbackToken,
  }).toString();
  return url.toString();
};
/** The locator resolves one merchant before parsing or persisting any provider data. */
export const acceptWebhook = async ({
  url,
  body,
  headers,
}: {
  url: URL;
  body: Uint8Array;
  headers: Headers;
}) => {
  const identity = url.searchParams.get("connection") ?? "";
  const generation = Number(url.searchParams.get("generation"));
  const token = url.searchParams.get("token") ?? "";
  if (
    !identity ||
    identity.length > 200 ||
    !Number.isSafeInteger(generation) ||
    !/^[a-f0-9]{64}$/.test(token)
  )
    throw new LoopLifecycleError("invalid_signature");
  const [connection] = await db
    .select()
    .from(schema.loopConnection)
    .where(
      and(
        eq(schema.loopConnection.id, identity),
        eq(schema.loopConnection.generation, generation),
      ),
    )
    .limit(1);
  if (
    !connection ||
    connection.disconnectedAt ||
    !connection.callbackToken ||
    !connection.webhookSecret ||
    !timingSafeEqual(
      Buffer.from(token, "hex"),
      Buffer.from(connection.callbackToken, "hex"),
    )
  )
    throw new LoopLifecycleError("invalid_signature");
  const secrets = [
    connection.webhookSecret,
    ...(connection.previousWebhookSecret &&
    connection.previousSecretExpiresAt &&
    connection.previousSecretExpiresAt > new Date()
      ? [connection.previousWebhookSecret]
      : []),
  ];
  if (
    !verifySignature(
      connection.storeId,
      body,
      headers.get("X-Loop-Signature"),
      secrets,
    )
  )
    throw new LoopLifecycleError("invalid_signature");
  const parsing = resultify(() =>
    parseReturn(connection.storeId, JSON.parse(new TextDecoder().decode(body))),
  );
  if (!parsing.success) throw new LoopLifecycleError("invalid_payload");
  const returned = parsing.data;
  if (
    !returned.trigger ||
    !LOOP_TRIGGERS.includes(returned.trigger) ||
    returned.topic !== "return" ||
    (returned.shop_id && returned.shop_id !== connection.shopId)
  )
    throw new LoopLifecycleError("invalid_payload");
  await Model.withActive(
    { store: connection.storeId, generation },
    async (transaction) => {
      await transaction.execute(sqlTimeout);
      await Model.enqueue(
        {
          store: connection.storeId,
          generation,
          kind: "webhook",
          key: `${generation}:event:${webhookKey(connection.storeId, returned)}`,
          payload: { returned },
        },
        transaction,
      );
    },
  );
  return { store: connection.storeId };
};

import { sql } from "drizzle-orm";

const sqlTimeout = sql`set local statement_timeout = '3000ms'`;
