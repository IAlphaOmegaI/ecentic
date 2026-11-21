import "server-only";

import { type Result, resultify } from "@zenncore/utils";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { normalizeDomain, senderPool, splitList } from "@/lib/outbound";
import { db, schema, type TransactionScope } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { ConflictError } from "@/server/utils/error";
import * as Providers from "@/server/utils/outbound/company-discovery";
import { repository, resultifyRead } from "@/server/utils/repository";
import * as Campaigns from "./campaigns";
import * as Store from "./store";

const CampaignRecords = repository(schema.outboundCampaign);
const Companies = repository(schema.outboundCampaignCompany);
const Jobs = repository(schema.outboundIntegrationJob);
const Runs = repository(schema.outboundCampaignRun);
const Inboxes = repository(schema.outboundInbox);
const Prospects = repository(schema.outboundProspect);
const actor = "outbound-automatic-discovery";
const PAGE_SIZE = 25;
type Campaign = typeof schema.outboundCampaign.$inferSelect;
type Provider = Pick<
  typeof Providers,
  "searchApolloCompanies" | "startClayCompanySearch" | "nextClayCompanies"
>;
const value = <Data>(result: Result<Data, Error>): Data => {
  if (!result.success) throw result.error;
  return result.data as Data;
};

/** Three days of available work; acquisition is bounded separately from delivery capacity. */
export const discoveryLimits = (input: {
  weeklyTarget: number;
  dailyCapacity: number;
  campaigns: number;
}) => {
  const daily = Math.max(
    1,
    Math.ceil(
      Math.min(input.weeklyTarget / 4, input.dailyCapacity) /
        Math.max(1, input.campaigns),
    ),
  );
  const target = Math.min(100, Math.max(PAGE_SIZE, daily * 3));
  return {
    target,
    lowWater: Math.ceil(target / 2),
    // Allows qualification attrition, while preventing an empty-result search loop.
    dailyOperations: Math.min(
      12,
      Math.max(1, Math.ceil((target * 4) / PAGE_SIZE)),
    ),
  };
};

const context = async (transaction?: TransactionScope) => {
  const policy = await Store.policy(transaction);
  const [campaigns, inboxes, credentials] = await Promise.all([
    CampaignRecords.count(
      Environment.SERVER,
      eq(schema.outboundCampaign.status, "active"),
      { tx: transaction },
    ),
    Inboxes.find(
      Environment.SERVER,
      {
        where: inArray(schema.outboundInbox.email, senderPool(policy.settings)),
      },
      { tx: transaction },
    ),
    resultifyRead(
      () =>
        (transaction ?? db)
          .select({
            provider: schema.outboundProviderCredential.provider,
            updatedAt: schema.outboundProviderCredential.updatedAt,
          })
          .from(schema.outboundProviderCredential)
          .where(
            inArray(schema.outboundProviderCredential.provider, [
              "apollo",
              "clay",
            ]),
          ),
      { tx: transaction },
    ),
  ]);
  const capacities = await Promise.all(
    value(inboxes).map((inbox) =>
      Store.inboxCapacity(inbox, policy.settings, transaction),
    ),
  );
  return {
    policy,
    activeCampaigns: value(campaigns),
    credentials: value(credentials),
    ...discoveryLimits({
      weeklyTarget: policy.settings.weeklyTarget,
      dailyCapacity: capacities.length
        ? capacities.reduce((total, capacity) => total + capacity.dailyCap, 0)
        : Math.min(15, policy.settings.dailyCap),
      campaigns: value(campaigns),
    }),
  };
};

const assess = async (
  campaign: Campaign,
  current: Awaited<ReturnType<typeof context>>,
  transaction?: TransactionScope,
) => {
  const { policy, lowWater, target, dailyOperations } = current;
  const now = Date.now();
  const [candidates, working, approved, runs] = await Promise.all([
    Companies.count(
      Environment.SERVER,
      and(
        eq(schema.outboundCampaignCompany.campaignId, campaign.id),
        eq(schema.outboundCampaignCompany.criteriaRevision, campaign.revision),
        eq(schema.outboundCampaignCompany.status, "candidate"),
        sql`not exists (
          select 1 from outbound_integration_job attempted
          where attempted.provider = 'automation'
          and attempted.input->>'operation' = 'campaignAutomation'
          and (
            (attempted.input->>'companyId' = ${schema.outboundCampaignCompany.id}
              and attempted.input->>'campaignRevision' = ${String(campaign.revision)}
              and attempted.input->>'playbookRevision' = ${String(policy.revision)})
            or (attempted.input->>'companyDomain' = ${schema.outboundCampaignCompany.domain}
              and attempted.status in ('pending', 'starting', 'uncertain'))
          )
        )`,
        sql`not exists (
          select 1 from outbound_suppression excluded
          where (excluded.scope = 'domain' and excluded.value = ${schema.outboundCampaignCompany.domain})
            or (excluded.scope = 'email' and split_part(excluded.value, '@', 2) = ${schema.outboundCampaignCompany.domain})
        )`,
        sql`not exists (
          select 1 from outbound_company existing
          where existing.domain = ${schema.outboundCampaignCompany.domain}
          and (existing.last_contacted_at is not null or existing.relationship <> 'cold'
            or exists (select 1 from outbound_prospect prospect where prospect.company_id = existing.id))
        )`,
        notInArray(
          schema.outboundCampaignCompany.domain,
          splitList(policy.settings.excludedDomains).map(normalizeDomain),
        ),
      ),
      { tx: transaction },
    ),
    Jobs.count(
      Environment.SERVER,
      and(
        eq(schema.outboundIntegrationJob.provider, "automation"),
        sql`${schema.outboundIntegrationJob.input}->>'operation' = 'campaignAutomation'`,
        sql`${schema.outboundIntegrationJob.input}->>'campaignId' = ${campaign.id}`,
        sql`${schema.outboundIntegrationJob.input}->>'campaignRevision' = ${String(campaign.revision)}`,
        sql`${schema.outboundIntegrationJob.input}->>'playbookRevision' = ${String(policy.revision)}`,
        inArray(schema.outboundIntegrationJob.status, ["pending", "starting"]),
      ),
      { tx: transaction },
    ),
    Prospects.count(
      Environment.SERVER,
      and(
        eq(schema.outboundProspect.campaignId, campaign.id),
        eq(schema.outboundProspect.sentStep, 0),
        eq(schema.outboundProspect.status, "approved"),
        eq(schema.outboundProspect.playbookRevision, policy.revision),
      ),
      { tx: transaction },
    ),
    Runs.find(
      Environment.SERVER,
      {
        where: eq(schema.outboundCampaignRun.campaignId, campaign.id),
        orderBy: [
          { column: schema.outboundCampaignRun.startedAt, direction: "desc" },
        ],
        limit: 200,
      },
      { tx: transaction },
    ),
  ]);
  const history = value(runs);
  const latest = history[0];
  const provider = campaign.discoveryState.apolloExhausted ? "clay" : "apollo";
  const failure = history.find(
    (run) =>
      run.provider === provider && run.criteriaRevision === campaign.revision,
  );
  const credential = current.credentials.find(
    (item) => item.provider === provider,
  );
  const providerConfigured = Boolean(
    credential ||
      (provider === "apollo"
        ? process.env.OUTBOUND_APOLLO_API_KEY?.trim()
        : process.env.OUTBOUND_CLAY_API_KEY?.trim()),
  );
  const changedCredential =
    credential && failure && credential.updatedAt > failure.startedAt;
  const failedDelay =
    failure?.error === "provider-rate-limit" ? 15 * 60_000 : 24 * 60 * 60_000;
  const failuresUntil =
    failure?.status === "failed" && !changedCredential
      ? failure.startedAt.getTime() + failedDelay
      : 0;
  const recentUntil = latest ? latest.startedAt.getTime() + 5 * 60_000 : 0;
  const operations = history.filter(
    (run) => run.startedAt.getTime() > now - 24 * 60 * 60_000,
  ).length;
  const backlog = value(candidates) + value(working) + value(approved);
  const reason = (() => {
    if (!policy.settings.automationEnabled) return "automation-paused";
    if (campaign.status !== "active") return "campaign-paused";
    if (history.some((run) => ["starting", "uncertain"].includes(run.status)))
      return "campaign-run-unresolved";
    if (
      campaign.discoveryState.apolloExhausted &&
      campaign.discoveryState.clayExhausted
    )
      return "campaign-source-exhausted";
    if (backlog >= lowWater) return "backlog-ready";
    if (!providerConfigured) return "provider-not-configured";
    if (failuresUntil > now) return "provider-backoff";
    if (operations >= dailyOperations) return "daily-discovery-limit";
    if (recentUntil > now) return "discovery-cooldown";
    return null;
  })();
  return {
    campaignId: campaign.id,
    name: campaign.name,
    revision: campaign.revision,
    provider,
    providerConfigured,
    lastError: failure?.error ?? null,
    backlog,
    target,
    lowWater,
    dailyOperations,
    operations,
    lastAttemptAt: latest?.startedAt.toISOString() ?? null,
    nextAttemptAt:
      Math.max(failuresUntil, recentUntil) > now
        ? new Date(Math.max(failuresUntil, recentUntil)).toISOString()
        : null,
    reason,
  };
};

export const getStatus = () =>
  resultify(async () => {
    const current = await context();
    // A rotating bounded scan prevents full or held campaigns from starving later ones.
    const scanSize = 50;
    const pages = Math.max(1, Math.ceil(current.activeCampaigns / scanSize));
    const offset = (Math.floor(Date.now() / 60_000) % pages) * scanSize;
    const campaigns = value(
      await CampaignRecords.find(Environment.SERVER, {
        where: eq(schema.outboundCampaign.status, "active"),
        limit: scanSize,
        offset,
        orderBy: [
          { column: schema.outboundCampaign.createdAt, direction: "asc" },
          { column: schema.outboundCampaign.id, direction: "asc" },
        ],
      }),
    );
    const rows = await Promise.all(
      campaigns.map((campaign) => assess(campaign, current)),
    );
    return {
      enabled: current.policy.settings.automationEnabled,
      totalCampaigns: current.activeCampaigns,
      campaigns: rows.sort(
        (first, second) =>
          (first.lastAttemptAt ?? "").localeCompare(
            second.lastAttemptAt ?? "",
          ) || first.campaignId.localeCompare(second.campaignId),
      ),
    };
  });

/** One durable provider operation per selected campaign; Clay creation resumes on a later tick. */
export const run = (
  input: { deadline?: number; maxCampaigns?: number } = {},
  providers: Provider = Providers,
) =>
  resultify(async () => {
    const options = z
      .object({
        deadline: z
          .number()
          .finite()
          .default(Date.now() + 90_000),
        maxCampaigns: z.number().int().min(1).max(5).default(2),
      })
      .parse(input);
    const status = value(await getStatus());
    const results = [] as Array<{
      campaignId: string;
      status: "completed" | "failed" | "uncertain" | "held";
      added: number;
      reason: string | null;
    }>;
    if (!status.enabled) return { ...status, processed: 0, added: 0, results };
    for (const candidate of status.campaigns.filter(
      (campaign) => !campaign.reason,
    )) {
      if (
        results.length >= options.maxCampaigns ||
        Date.now() >= options.deadline - 30_000
      )
        break;
      const discovered = await Campaigns.discover(
        actor,
        {
          id: candidate.campaignId,
          expectedRevision: candidate.revision,
          provider: "auto",
        },
        providers,
        {
          deadline: options.deadline,
          singleOperation: true,
          guard: async (transaction, campaign) => {
            const readiness = await assess(
              campaign,
              await context(transaction),
              transaction,
            );
            if (readiness.reason) throw new ConflictError(readiness.reason);
          },
        },
      );
      results.push(
        discovered.success
          ? {
              campaignId: candidate.campaignId,
              status:
                discovered.data.run.status === "starting"
                  ? "held"
                  : discovered.data.run.status,
              added: discovered.data.added,
              reason: discovered.data.run.error,
            }
          : {
              campaignId: candidate.campaignId,
              status: "held",
              added: 0,
              reason:
                discovered.error.name === ConflictError.errorName
                  ? discovered.error.message
                  : "discovery-failed",
            },
      );
    }
    return {
      ...status,
      processed: results.length,
      added: results.reduce((total, result) => total + result.added, 0),
      results,
    };
  });
