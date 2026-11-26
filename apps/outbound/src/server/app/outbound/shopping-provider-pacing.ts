import "server-only";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { schema, type TransactionScope } from "@/server/database";
import { shoppingClaimInterval } from "@/server/utils/outbound/scrapellm-cooldown";

const requestId = "outbound-shopping-provider-pacing";
const pacingSchema = z.object({ availableAt: z.string().datetime() });

/** Call under the workspace transaction lock, immediately before a query/poll claim. */
export const claimShoppingProviderSlot = async (
  transaction: TransactionScope,
  now = Date.now(),
) => {
  const [gate] = await transaction
    .select()
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.requestId, requestId))
    .limit(1);
  const [legacy] = await transaction
    .select({
      batchAvailableAt: sql<
        string | null
      >`max(${schema.outboundIntegrationJob.output}->>'scrapellmAvailableAt')`,
      startedAt: sql<Date | null>`max(case when ${schema.outboundIntegrationJob.status} = 'starting' and ${schema.outboundIntegrationJob.output}->>'stage' in ('query','poll','startShoppingQuery','pollShoppingQuery') then ${schema.outboundIntegrationJob.updatedAt} else null end)`,
    })
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.provider, "automation"));
  const blockedUntil = Math.max(
    gate ? Date.parse(pacingSchema.parse(gate.output).availableAt) : 0,
    legacy?.batchAvailableAt ? Date.parse(legacy.batchAvailableAt) : 0,
    legacy?.startedAt
      ? new Date(legacy.startedAt).getTime() + shoppingClaimInterval
      : 0,
  );
  if (!Number.isFinite(blockedUntil) || blockedUntil > now) return false;
  const output = pacingSchema.parse({
    availableAt: new Date(now + shoppingClaimInterval).toISOString(),
  });
  if (gate)
    await transaction
      .update(schema.outboundIntegrationJob)
      .set({ output, updatedAt: new Date(now) })
      .where(eq(schema.outboundIntegrationJob.id, gate.id));
  else
    await transaction.insert(schema.outboundIntegrationJob).values({
      provider: "automation",
      requestId,
      status: "complete",
      input: { operation: "shoppingProviderPacing" },
      output,
    });
  return true;
};
