import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Playbook } from "@/lib/outbound";
import {
  type AutomationState,
  automationStateSchema,
} from "@/lib/outbound-automation";
import {
  CLAY_ROLE_CONTRACT_VERSION,
  clayRoleStateSchema,
} from "@/lib/outbound-clay";
import { db, schema, type TransactionScope } from "@/server/database";
import { ConflictError } from "@/server/utils/error";
import {
  clayContextHash,
  clayContinuationProblem,
  clayHash,
  clayRoleInputs,
} from "@/server/utils/outbound/clay-role";
import type { AutomationClaim } from "./automation";
import { eligibleForEnrichment } from "./enrichment-eligibility";
import * as Credentials from "./provider-credentials";
import * as Store from "./store";

const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
type Job = typeof schema.outboundIntegrationJob.$inferSelect;

/** Called under the workspace lock; provider lock also serializes manual Clay starts. */
export const reserveWithin = async (
  transaction: TransactionScope,
  job: Job,
  state: AutomationState,
  settings: Playbook,
) => {
  if (!settings.automaticClayEnabled) return { reason: "clay-paused" };
  if (state.clayRole) return { reason: "clay-already-reserved" };
  await transaction.execute(
    sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-providers'))`,
  );
  const metadata = value(await Credentials.metadata("clay", transaction, true));
  if (
    !metadata.configured ||
    !metadata.configuration.routineId ||
    !metadata.version
  )
    return { reason: "clay-not-configured" };
  const [pending] = await transaction
    .select({ id: schema.outboundIntegrationJob.id })
    .from(schema.outboundIntegrationJob)
    .where(sql`(
      (${schema.outboundIntegrationJob.provider} = 'clay' and ${schema.outboundIntegrationJob.status} in ('starting','pending','uncertain')) or
      (${schema.outboundIntegrationJob.input}->>'operation' = 'campaignAutomation' and ${schema.outboundIntegrationJob.output}->'clayRole' is not null
       and ${schema.outboundIntegrationJob.output}->'clayRole'->'reviewed' is null and ${schema.outboundIntegrationJob.status} in ('starting','pending','uncertain'))
    )`)
    .limit(1);
  if (pending) return { reason: "clay-provider-busy" };
  const prospectId = z.string().uuid().parse(state["prospectId"]);
  const [previous] = await transaction
    .select({ id: schema.outboundIntegrationJob.id })
    .from(schema.outboundIntegrationJob)
    .where(
      sql`${schema.outboundIntegrationJob.output}->'clayRole'->'request'->>'prospectId' = ${prospectId}`,
    )
    .limit(1);
  if (previous) return { reason: "clay-contact-already-reserved" };
  // Count reservations, including uncertain starts, rather than provider acknowledgements.
  const [usage] = await transaction
    .select({
      day: sql<number>`count(*) filter (where (${schema.outboundIntegrationJob.output}->'clayRole'->'request'->>'reservedAt')::timestamptz >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC')::int`,
      week: sql<number>`count(*)::int`,
    })
    .from(schema.outboundIntegrationJob)
    .where(
      sql`${schema.outboundIntegrationJob.output}->'clayRole'->'request'->>'reservedAt' is not null and (${schema.outboundIntegrationJob.output}->'clayRole'->'request'->>'reservedAt')::timestamptz >= now() - interval '7 days'`,
    );
  if (
    (usage?.day ?? 0) >= settings.dailyCompanyTarget ||
    (usage?.week ?? 0) >= settings.weeklyTarget
  )
    return { reason: "clay-reservation-cap" };
  const prospect = await eligibleForEnrichment(prospectId, true, transaction);
  if (
    prospect.revision !== state["prospectRevision"] ||
    prospect.details.automationEvidenceId !== job.id ||
    prospect.holdReason ||
    !["candidate", "draft"].includes(prospect.status)
  )
    throw new ConflictError("The Clay contact changed before reservation.");
  return {
    clayRole: clayRoleStateSchema.parse({
      request: {
        contractVersion: CLAY_ROLE_CONTRACT_VERSION,
        routineId: metadata.configuration.routineId,
        credentialVersion: metadata.version,
        prospectId,
        prospectRevision: prospect.revision,
        contextHash: clayContextHash(prospect),
        item: { id: prospectId, inputs: clayRoleInputs(prospect.details) },
        reservedAt: new Date().toISOString(),
      },
      runId: null,
      requestedAt: null,
      polls: 0,
    }),
  };
};

/** Recheck the owned reservation immediately before any provider operation. No provider work in this transaction. */
export const assertCurrent = (claimed: AutomationClaim) =>
  db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
    );
    const [job] = await transaction
      .select()
      .from(schema.outboundIntegrationJob)
      .where(eq(schema.outboundIntegrationJob.id, claimed.job.id));
    const state = automationStateSchema.parse(job?.output);
    const policy = await Store.policy(transaction);
    const [campaign] = await transaction
      .select()
      .from(schema.outboundCampaign)
      .where(
        and(
          eq(schema.outboundCampaign.id, claimed.input.campaignId),
          eq(schema.outboundCampaign.status, "active"),
        ),
      );
    if (
      !job ||
      job.status !== "starting" ||
      state.lease?.token !== claimed.state.lease.token ||
      Date.parse(state.lease.expiresAt) <= Date.now() ||
      !policy.settings.automationEnabled ||
      !policy.settings.automaticClayEnabled ||
      policy.revision !== claimed.input.playbookRevision ||
      campaign?.revision !== claimed.input.campaignRevision ||
      clayHash(state.clayRole) !== clayHash(claimed.state.clayRole)
    )
      throw new ConflictError("The automatic Clay lease or policy changed.");
    const role = clayRoleStateSchema.parse(state.clayRole);
    const prospect = await eligibleForEnrichment(
      role.request.prospectId,
      true,
      transaction,
    );
    const metadata = value(
      await Credentials.metadata("clay", transaction, true),
    );
    if (
      prospect.holdReason ||
      !["candidate", "draft"].includes(prospect.status) ||
      prospect.details.automationEvidenceId !== job.id ||
      role.request.contextHash !== clayContextHash(prospect) ||
      role.request.prospectRevision !== prospect.revision ||
      clayHash(role.request.item.inputs) !==
        clayHash(clayRoleInputs(prospect.details)) ||
      role.request.routineId !== metadata.configuration.routineId ||
      role.request.credentialVersion !== metadata.version
    )
      throw new ConflictError("The automatic Clay contact or routine changed.");
    return role;
  });

export const continuationProblem = (
  state: AutomationState,
  settings: Playbook,
  prospect: {
    id: string;
    revision: number;
    details: Parameters<typeof clayRoleInputs>[0];
  },
) => {
  if (!settings.automaticClayEnabled && !state.clayRole) return null;
  return clayContinuationProblem(state.clayRole, prospect);
};
