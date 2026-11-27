import "server-only";

import { eq, sql } from "drizzle-orm";
import { schema, type TransactionScope } from "@/server/database";
import { browserClaimInterval } from "@/server/utils/outbound/firecrawl-cooldown";

const requestId = "outbound-browser-provider-pacing";

/** Call under the workspace lock. Older batch owners also read this exact shared field. */
export const claimBrowserProviderSlot = async (
  scope: TransactionScope,
  now = Date.now(),
) => {
  const [observed] = await scope
    .select({
      availableAt: sql<
        string | null
      >`max(${schema.outboundIntegrationJob.output}->>'browserAvailableAt')`,
      startedAt: sql<
        number | null
      >`max(case when ${schema.outboundIntegrationJob.status}='starting' and ${schema.outboundIntegrationJob.output}->>'stage' in ('browseProduct','browseShopping','renderedProduct','browser') then extract(epoch from ${schema.outboundIntegrationJob.updatedAt}) * 1000 else null end)`.mapWith(
        Number,
      ),
    })
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.provider, "automation"));
  const availableAt = Math.max(
    observed?.availableAt ? Date.parse(observed.availableAt) : 0,
    observed?.startedAt ? observed.startedAt + browserClaimInterval : 0,
  );
  if (!Number.isFinite(availableAt) || availableAt > now) return false;
  await scope
    .insert(schema.outboundIntegrationJob)
    .values({
      provider: "automation",
      requestId,
      status: "complete",
      input: { operation: "browserProviderPacing" },
      output: {
        browserAvailableAt: new Date(now + browserClaimInterval).toISOString(),
      },
      updatedAt: new Date(now),
    })
    .onConflictDoUpdate({
      target: schema.outboundIntegrationJob.requestId,
      set: {
        output: {
          browserAvailableAt: new Date(
            now + browserClaimInterval,
          ).toISOString(),
        },
        updatedAt: new Date(now),
      },
    });
  return true;
};
