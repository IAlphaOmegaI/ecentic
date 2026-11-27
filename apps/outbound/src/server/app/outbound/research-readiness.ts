import "server-only";
import { type Result, resultify } from "@zenncore/utils";
import { inArray, sql } from "drizzle-orm";
import type { Playbook } from "@/lib/outbound";
import { db, schema } from "@/server/database";
import { confirmedBrowserCooldown } from "@/server/utils/outbound/firecrawl-cooldown";
import * as Credentials from "./provider-credentials";

const value = <Data>(result: Result<Data, Error>): Data => {
  if (!result.success) throw result.error;
  return result.data as Data;
};

/** Metadata only: checking readiness never submits a paid research request. */
export const getStatus = (
  playbook: Pick<Playbook, "requireShoppingEvidence">,
) =>
  resultify(async () => {
    const providers = ["scrapellm", "firecrawl"] as const;
    const statuses = await Promise.all(
      providers.map(async (provider) => ({
        provider,
        configured: value(await Credentials.metadata(provider)).configured,
      })),
    );
    const missing = statuses
      .filter((status) => !status.configured)
      .map((status) => status.provider);
    // A rejected key or exhausted account must not trigger fresh company/contact spending each minute.
    const failures = await db
      .select({
        provider: sql<string>`output->>'failureProvider'`,
        updatedAt: schema.outboundIntegrationJob.updatedAt,
        error: schema.outboundIntegrationJob.error,
        receipt: sql<unknown>`output->'failureReceipt'`,
        checkedAt:
          sql<number>`extract(epoch from current_timestamp) * 1000`.mapWith(
            Number,
          ),
      })
      .from(schema.outboundIntegrationJob)
      .where(sql`provider = 'automation' and input->>'operation' = 'campaignAutomation'
        and status = 'failed' and output->>'failureProvider' in ('scrapellm','firecrawl')
        and error in ('provider-access','provider-quota','provider-rate-limit')
        and updated_at > (current_timestamp at time zone 'UTC') -
          case when error = 'provider-rate-limit' then interval '1 hour' else interval '24 hours' end`);
    const keys = failures.length
      ? await db
          .select({
            provider: schema.outboundProviderCredential.provider,
            updatedAt: schema.outboundProviderCredential.updatedAt,
          })
          .from(schema.outboundProviderCredential)
          .where(
            inArray(schema.outboundProviderCredential.provider, [...providers]),
          )
      : [];
    const blocked = [
      ...new Set(
        failures
          .filter(
            (failure) =>
              !keys.some(
                (key) =>
                  key.provider === failure.provider &&
                  key.updatedAt > failure.updatedAt,
              ) &&
              (failure.error !== "provider-rate-limit" ||
                (() => {
                  const retryAt =
                    failure.provider === "firecrawl"
                      ? confirmedBrowserCooldown(
                          failure.receipt,
                          failure.checkedAt,
                        )
                      : null;
                  return (
                    (retryAt
                      ? Date.parse(retryAt)
                      : failure.updatedAt.getTime() + 15 * 60_000) >
                    failure.checkedAt
                  );
                })()),
          )
          .map((failure) => failure.provider),
      ),
    ];
    return {
      required: playbook.requireShoppingEvidence,
      ready:
        !playbook.requireShoppingEvidence ||
        (missing.length === 0 && blocked.length === 0),
      missing,
      blocked,
    };
  });
