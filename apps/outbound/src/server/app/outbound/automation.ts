import "server-only";

import { randomUUID } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { prospectSchema } from "@/lib/outbound";
import {
  type AutomationInput,
  type AutomationJobSummary,
  type AutomationState,
  type AutomationStatus,
  type AutomationTick,
  automationInputSchema,
  automationStateSchema,
} from "@/lib/outbound-automation";
import { db, schema, type TransactionScope } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { ConflictError } from "@/server/utils/error";
import { sourceReceiptSchema } from "@/server/utils/outbound/automation-qualification";
import {
  researchRecoveryState,
  researchRecoveryVersion,
  researchStateHash,
} from "@/server/utils/outbound/automation-recovery";
import { savedApolloCompany } from "@/server/utils/outbound/company-discovery";
import { IntegrationError } from "@/server/utils/outbound/http";
import { productCategoryCorrection } from "@/server/utils/outbound/product-category";
import { repository, resultifyRead } from "@/server/utils/repository";
import * as Steps from "./automation-steps";
import * as ResearchReadiness from "./research-readiness";
import * as Store from "./store";

const Jobs = repository(schema.outboundIntegrationJob);
const Campaigns = repository(schema.outboundCampaign);
const Companies = repository(schema.outboundCampaignCompany);
const Prospects = repository(schema.outboundProspect);
const Attempts = repository(schema.outboundSendAttempt);
const ConversationSends = repository(schema.outboundConversationSend);
type Job = typeof schema.outboundIntegrationJob.$inferSelect;
const value = <Data>(result: Result<Data, Error>): Data => {
  if (!result.success) throw result.error;
  return result.data as Data;
};
const transaction = <Data>(
  operation: (transaction: TransactionScope) => Promise<Data>,
) =>
  resultify(() =>
    db.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
      );
      return operation(transaction);
    }),
  );
const view = (
  job: Pick<
    Job,
    "id" | "input" | "output" | "status" | "error" | "prospectId" | "updatedAt"
  >,
): AutomationJobSummary => {
  const input = automationInputSchema.parse(job.input);
  const state = automationStateSchema.parse(job.output);
  return {
    id: job.id,
    campaignId: input.campaignId,
    companyId: input.companyId,
    companyName: input.companyName,
    stage: state.stage,
    status:
      job.status === "pending"
        ? "queued"
        : job.status === "starting"
          ? "running"
          : job.status === "failed"
            ? "held"
            : job.status,
    reason: job.error,
    prospectId: job.prospectId,
    updatedAt: job.updatedAt.toISOString(),
  };
};
const scoped = (campaignId?: string) =>
  and(
    eq(schema.outboundIntegrationJob.provider, "automation"),
    sql`${schema.outboundIntegrationJob.input}->>'operation' = 'campaignAutomation'`,
    campaignId
      ? sql`${schema.outboundIntegrationJob.input}->>'campaignId' = ${campaignId}`
      : undefined,
  );

/** One candidate per active campaign is admitted at a time, without replaying old uncertain work. */
const enqueue = (campaignId?: string) =>
  transaction(async (transaction) => {
    const policy = await Store.policy(transaction);
    if (!policy.settings.automationEnabled) return;
    const campaigns = value(
      await Campaigns.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundCampaign.status, "active"),
            campaignId ? eq(schema.outboundCampaign.id, campaignId) : undefined,
          ),
          orderBy: [
            { column: schema.outboundCampaign.createdAt, direction: "asc" },
          ],
          limit: 50,
        },
        { tx: transaction },
      ),
    );
    for (const campaign of campaigns) {
      const queued = value(
        await Jobs.find(
          Environment.SERVER,
          {
            where: and(
              scoped(campaign.id),
              sql`${schema.outboundIntegrationJob.status} in ('pending','starting')`,
            ),
            limit: 1,
          },
          { tx: transaction },
        ),
      );
      if (queued.length) continue;
      const candidates = value(
        await Companies.find(
          Environment.SERVER,
          {
            where: and(
              eq(schema.outboundCampaignCompany.campaignId, campaign.id),
              eq(schema.outboundCampaignCompany.status, "candidate"),
              eq(
                schema.outboundCampaignCompany.criteriaRevision,
                campaign.revision,
              ),
              sql`not exists (select 1 from outbound_integration_job automation_job where automation_job.provider = 'automation' and ((automation_job.input->>'companyDomain' = ${schema.outboundCampaignCompany.domain} and automation_job.status in ('pending','starting','uncertain')) or (automation_job.input->>'companyId' = ${schema.outboundCampaignCompany.id} and automation_job.input->>'campaignRevision' = ${String(campaign.revision)} and automation_job.input->>'playbookRevision' = ${String(policy.revision)})))`,
            ),
            orderBy: [
              {
                column: schema.outboundCampaignCompany.createdAt,
                direction: "asc",
              },
              { column: schema.outboundCampaignCompany.id, direction: "asc" },
            ],
            limit: 1,
          },
          { tx: transaction },
        ),
      );
      const company = candidates[0];
      if (!company) continue;
      value(
        await Jobs.create(
          Environment.SERVER,
          {
            provider: "automation",
            status: "pending",
            requestId: `automation:${campaign.id}:${company.id}:${campaign.revision}:${policy.revision}`,
            input: {
              operation: "campaignAutomation",
              campaignId: campaign.id,
              companyId: company.id,
              companyName: company.name,
              companyDomain: company.domain,
              campaignRevision: campaign.revision,
              playbookRevision: policy.revision,
              actor: "outbound-automation",
            } satisfies AutomationInput,
            output: {
              stage: "companyFacts",
              availableAt: new Date().toISOString(),
              lease: null,
            } satisfies AutomationState,
          },
          { tx: transaction },
        ),
      );
    }
  });

const current = async (
  input: AutomationInput,
  transaction: TransactionScope,
) => {
  const policy = await Store.policy(transaction);
  const campaign = value(
    await Campaigns.get(Environment.SERVER, input.campaignId, {
      tx: transaction,
    }),
  );
  const company = value(
    await Companies.get(Environment.SERVER, input.companyId, {
      tx: transaction,
    }),
  );
  const reason = !policy.settings.automationEnabled
    ? "automation-disabled"
    : campaign?.status !== "active"
      ? "campaign-inactive"
      : campaign.revision !== input.campaignRevision
        ? "campaign-criteria-changed"
        : policy.revision !== input.playbookRevision
          ? "playbook-changed"
          : !company ||
              company.campaignId !== campaign.id ||
              company.criteriaRevision !== campaign.revision ||
              company.status === "excluded"
            ? "company-unavailable"
            : null;
  return { policy, campaign, company, reason };
};

const claim = (campaignId?: string, jobId?: string, researchReady = true) =>
  transaction(async (transaction) => {
    const policy = await Store.policy(transaction);
    if (!policy.settings.automationEnabled) return null;
    const running = value(
      await Jobs.find(
        Environment.SERVER,
        {
          where: and(
            scoped(),
            eq(schema.outboundIntegrationJob.status, "starting"),
          ),
          limit: 50,
        },
        { tx: transaction },
      ),
    );
    for (const job of running) {
      const state = automationStateSchema.safeParse(job.output);
      if (
        state.success &&
        state.data.lease &&
        Date.parse(state.data.lease.expiresAt) > Date.now()
      )
        return null;
      // A lost worker cannot prove whether its current provider operation was billed.
      value(
        await Jobs.update(
          Environment.SERVER,
          job.id,
          {
            status: "uncertain",
            error: "lease-expired",
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      );
    }
    const queued = value(
      await Jobs.find(
        Environment.SERVER,
        {
          where: and(
            scoped(campaignId),
            jobId ? eq(schema.outboundIntegrationJob.id, jobId) : undefined,
            eq(schema.outboundIntegrationJob.status, "pending"),
          ),
          orderBy: [
            {
              column: schema.outboundIntegrationJob.updatedAt,
              direction: "asc",
            },
          ],
          limit: 100,
        },
        { tx: transaction },
      ),
    );
    for (const job of queued) {
      const input = automationInputSchema.parse(job.input);
      const state = automationStateSchema.parse(job.output);
      if (Date.parse(state.availableAt) > Date.now()) continue;
      // Missing capture services must not burn company/contact credits or discard queued work.
      if (
        policy.settings.requireShoppingEvidence &&
        !researchReady &&
        !state["shoppingReceipt"] &&
        state.stage !== "assessShopping"
      )
        continue;
      const context = await current(input, transaction);
      if (context.reason === "campaign-inactive") continue;
      if (context.reason) {
        value(
          await Jobs.update(
            Environment.SERVER,
            job.id,
            { status: "failed", error: context.reason, updatedAt: new Date() },
            { tx: transaction },
          ),
        );
        continue;
      }
      const requiresApollo =
        state.stage === "enrich" ||
        state.stage === "verify" ||
        (state.stage === "companyFacts" &&
          context.company &&
          context.campaign &&
          !savedApolloCompany(context.company, context.campaign.criteria));
      if (!context.policy.settings.automaticApolloEnabled && requiresApollo) {
        if (job.error !== "apollo-paused")
          value(
            await Jobs.update(
              Environment.SERVER,
              job.id,
              { error: "apollo-paused", updatedAt: new Date() },
              { tx: transaction },
            ),
          );
        continue;
      }
      const output: AutomationState & {
        lease: { token: string; expiresAt: string };
      } = {
        ...state,
        lease: {
          token: randomUUID(),
          expiresAt: new Date(Date.now() + 180000).toISOString(),
        },
      };
      const claimed = value(
        await Jobs.update(
          Environment.SERVER,
          job.id,
          { status: "starting", output, error: null, updatedAt: new Date() },
          { tx: transaction },
        ),
      );
      if (!claimed || !context.campaign || !context.company)
        throw new ConflictError("automation-claim-failed");
      return {
        job: claimed,
        input,
        state: output,
        campaign: context.campaign,
        company: context.company,
        playbook: context.policy.settings,
      };
    }
    return null;
  });
export type AutomationClaim = NonNullable<
  Awaited<ReturnType<typeof claim>> extends Result<infer Data, Error>
    ? Data
    : never
>;

const correctCategoryWithin = async (
  transaction: TransactionScope,
  job: Job,
  actor: string,
  expectedRevision: number,
) => {
  const input = automationInputSchema.parse(job.input);
  const state = automationStateSchema.parse(job.output);
  const context = await current(input, transaction);
  if (context.reason) throw new ConflictError(context.reason);
  const prospectId = z.string().uuid().parse(state["prospectId"]);
  const prospect = value(
    await Prospects.get(Environment.SERVER, prospectId, { tx: transaction }),
  );
  if (
    !prospect ||
    job.prospectId !== prospect.id ||
    prospect.revision !== expectedRevision ||
    state["prospectRevision"] !== expectedRevision ||
    prospect.sentStep ||
    prospect.approvedAt ||
    prospect.approvedBy ||
    prospect.approvalHash ||
    !["candidate", "draft", "held"].includes(prospect.status) ||
    prospect.details.automationEvidenceId !== job.id
  )
    throw new ConflictError("product-category-correction-unavailable");
  const attempted = value(
    await Attempts.find(
      Environment.SERVER,
      {
        where: eq(schema.outboundSendAttempt.prospectId, prospect.id),
        limit: 1,
      },
      { tx: transaction },
    ),
  );
  const linkedin = value(
    await Jobs.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundIntegrationJob.provider, "linkedin"),
          eq(schema.outboundIntegrationJob.prospectId, prospect.id),
        ),
        limit: 1,
      },
      { tx: transaction },
    ),
  );
  const replies = value(
    await ConversationSends.find(
      Environment.SERVER,
      {
        where: sql`${schema.outboundConversationSend.input}->>'prospectId' = ${prospect.id}`,
        limit: 1,
      },
      { tx: transaction },
    ),
  );
  if (attempted.length || linkedin.length || replies.length)
    throw new ConflictError("product-category-correction-unavailable");
  await Store.assertCampaignActive(transaction, prospect);
  await Store.assertAutomaticEvidence(transaction, prospect);
  const qualification = z
    .object({
      status: z.literal("qualified"),
      details: prospectSchema.partial(),
      receipts: z.array(sourceReceiptSchema),
    })
    .passthrough()
    .parse(state["qualification"]);
  if (
    prospect.details.productCategory !== qualification.details.productCategory
  )
    throw new ConflictError("product-category-correction-unavailable");
  const correction = productCategoryCorrection(qualification);
  if (!correction)
    return {
      output: state,
      prospectId,
      revision: prospect.revision,
      corrected: false,
    };
  const saved = await Store.saveProspectWithin(
    transaction,
    actor,
    prospectSchema.parse({
      ...prospect.details,
      id: prospect.id,
      productCategory: correction.after,
    }),
  );
  value(
    await Prospects.update(
      Environment.SERVER,
      prospect.id,
      {
        messages: [],
        status: prospect.status === "held" ? "held" : "candidate",
        holdReason: prospect.holdReason,
      },
      { tx: transaction },
    ),
  );
  const { draft: _draft, ...retained } = state;
  const output = {
    ...retained,
    qualification: {
      ...qualification,
      details: { ...qualification.details, productCategory: correction.after },
    },
    prospectRevision: saved.revision,
    categoryCorrections: [
      ...z
        .array(z.unknown())
        .max(20)
        .parse(state["categoryCorrections"] ?? []),
      {
        ...correction,
        actor,
        correctedAt: new Date().toISOString(),
        previousProspectRevision: prospect.revision,
        prospectRevision: saved.revision,
        phase: "before-draft",
      },
    ],
    stage: ["applyDraft", "approve"].includes(state.stage)
      ? ("draft" as const)
      : state.stage,
  };
  return { output, prospectId, revision: saved.revision, corrected: true };
};

const finish = (claimed: AutomationClaim, transition: Steps.Transition) =>
  transaction(async (transaction) => {
    const job = value(
      await Jobs.get(Environment.SERVER, claimed.job.id, { tx: transaction }),
    );
    if (!job) throw new ConflictError("automation-job-missing");
    const state = automationStateSchema.parse(job.output);
    if (
      job.status !== "starting" ||
      state.lease?.token !== claimed.state.lease.token
    )
      return job;
    const context = await current(claimed.input, transaction);
    const normalized =
      transition.normalizeProductCategory && !context.reason
        ? await correctCategoryWithin(
            transaction,
            job,
            claimed.input.actor,
            z.number().int().parse(state["prospectRevision"]),
          )
        : null;
    const output: AutomationState = {
      ...(normalized?.output ?? claimed.state),
      ...transition.output,
      stage: transition.stage,
      availableAt: new Date(
        Date.now() + (transition.delayMs ?? 0),
      ).toISOString(),
      lease: null,
    };
    const reason = context.reason ?? transition.reason ?? null;
    if (!reason && transition.companyFacts)
      value(
        await Companies.update(
          Environment.SERVER,
          claimed.company.id,
          {
            ...transition.companyFacts,
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      );
    const saved = value(
      await Jobs.update(
        Environment.SERVER,
        job.id,
        {
          output,
          status: reason
            ? "failed"
            : transition.stage === "complete"
              ? "complete"
              : "pending",
          error: reason,
          ...(typeof output["prospectId"] === "string"
            ? { prospectId: output["prospectId"] }
            : {}),
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    if (!saved) throw new ConflictError("automation-job-missing");
    return saved;
  });
const fail = (claimed: AutomationClaim, error: Error) =>
  transaction(async (transaction) => {
    const job = value(
      await Jobs.get(Environment.SERVER, claimed.job.id, { tx: transaction }),
    );
    if (!job) throw new ConflictError("automation-job-missing");
    const state = automationStateSchema.parse(job.output);
    if (
      job.status !== "starting" ||
      state.lease?.token !== claimed.state.lease.token
    )
      return job;
    const certain =
      ["conflict-error", "validation-error"].includes(error.name) ||
      (error instanceof IntegrationError &&
        ["configuration", "input", "access", "quota", "rate-limit"].includes(
          error.code,
        ));
    const reason =
      error instanceof IntegrationError
        ? `provider-${certain ? error.code : "uncertain"}`
        : certain
          ? `${claimed.state.stage === "approve" ? "approval" : claimed.state.stage === "draft" ? "draft" : "qualification"}-held`
          : "provider-uncertain";
    const saved = value(
      await Jobs.update(
        Environment.SERVER,
        job.id,
        {
          status: certain ? "failed" : "uncertain",
          error: reason,
          output: {
            ...state,
            lease: null,
            ...(error instanceof IntegrationError
              ? { failureProvider: error.provider }
              : {}),
            ...(error instanceof IntegrationError && error.receipt
              ? { failureReceipt: error.receipt }
              : {}),
          },
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    if (!saved) throw new ConflictError("automation-job-missing");
    return saved;
  });

/** Resume one audited, rejected pre-contact request; no provider work or sending. */
export const resumeProviderFailure = (
  actor: string,
  input: {
    jobId: string;
    expectedStateHash: string;
    expectedInputHash: string;
    dryRun?: boolean;
  },
) =>
  transaction(async (transaction) => {
    const parsed = z
      .object({
        jobId: z.string().uuid(),
        expectedStateHash: z.string().regex(/^[a-f0-9]{64}$/),
        expectedInputHash: z.string().regex(/^[a-f0-9]{64}$/),
        dryRun: z.boolean().default(false),
      })
      .parse(input);
    const job = value(
      await Jobs.get(Environment.SERVER, parsed.jobId, { tx: transaction }),
    );
    if (
      !job ||
      job.provider !== "automation" ||
      job.prospectId ||
      researchStateHash(job.input) !== parsed.expectedInputHash
    )
      throw new ConflictError("provider-recovery-unavailable");
    const savedInput = automationInputSchema.parse(job.input);
    const state = automationStateSchema.parse(job.output);
    const previous = z
      .object({ version: z.literal(1), sourceStateHash: z.string() })
      .safeParse(state["providerRecovery"]);
    if (
      previous.success &&
      previous.data.sourceStateHash === parsed.expectedStateHash
    )
      return { job: view(job), repeated: true, dryRun: parsed.dryRun };
    const provider =
      state.stage === "companyFacts"
        ? "apollo"
        : state.stage === "startShoppingQuery"
          ? "scrapellm"
          : null;
    if (
      job.status !== "failed" ||
      researchStateHash(job.output) !== parsed.expectedStateHash ||
      !["provider-access", "provider-quota", "provider-rate-limit"].includes(
        job.error ?? "",
      ) ||
      !provider ||
      state["failureProvider"] !== provider ||
      state.lease ||
      state["prospectId"] ||
      state["shoppingJob"] ||
      state["shoppingAnswer"] ||
      state["shoppingReceipt"] ||
      state["people"] ||
      state["selection"] ||
      state.contactAttempts?.length
    )
      throw new ConflictError("provider-recovery-unavailable");
    const context = await current(savedInput, transaction);
    if (
      context.reason ||
      !context.company ||
      context.company.status !== "candidate" ||
      context.company.prospectId ||
      context.company.domain !== savedInput.companyDomain
    )
      throw new ConflictError(
        context.reason ?? "provider-recovery-unavailable",
      );
    const competing = value(
      await Jobs.find(
        Environment.SERVER,
        {
          where: and(
            scoped(),
            sql`${schema.outboundIntegrationJob.id} <> ${job.id}`,
            sql`${schema.outboundIntegrationJob.input}->>'companyDomain' = ${savedInput.companyDomain}`,
            sql`${schema.outboundIntegrationJob.status} in ('pending','starting','uncertain')`,
          ),
          limit: 1,
        },
        { tx: transaction },
      ),
    );
    if (competing.length)
      throw new ConflictError("provider-recovery-unavailable");
    if (parsed.dryRun) return { job: view(job), repeated: false, dryRun: true };
    const now = new Date();
    const saved = value(
      await Jobs.update(
        Environment.SERVER,
        job.id,
        {
          status: "pending",
          error: null,
          updatedAt: now,
          output: {
            ...state,
            availableAt: now.toISOString(),
            lease: null,
            providerRecovery: {
              version: 1,
              actor,
              provider,
              requestedAt: now.toISOString(),
              sourceStateHash: parsed.expectedStateHash,
              sourceInputHash: parsed.expectedInputHash,
              previousReason: job.error,
              previousReceipt: state["failureReceipt"] ?? null,
            },
          },
        },
        { tx: transaction },
      ),
    );
    if (!saved) throw new ConflictError("automation-job-missing");
    return { job: view(saved), repeated: false, dryRun: false };
  });

/** Requeue only a known, completed legacy contact miss; never retry an uncertain enrichment. */
export const resumeContactFallback = (
  actor: string,
  input: { jobId: string },
) =>
  transaction(async (transaction) => {
    const jobId = z.string().uuid().parse(input.jobId);
    const job = value(
      await Jobs.get(Environment.SERVER, jobId, { tx: transaction }),
    );
    if (
      !job ||
      job.provider !== "automation" ||
      job.status !== "failed" ||
      job.error !== "contact-held" ||
      job.prospectId
    )
      throw new ConflictError("contact-fallback-unavailable");
    const savedInput = automationInputSchema.parse(job.input);
    const context = await current(savedInput, transaction);
    if (
      context.reason ||
      !context.company ||
      context.company.status !== "candidate" ||
      context.company.prospectId
    )
      throw new ConflictError(context.reason ?? "contact-fallback-unavailable");
    const competing = value(
      await Jobs.find(
        Environment.SERVER,
        {
          where: and(
            scoped(),
            sql`${schema.outboundIntegrationJob.id} <> ${jobId}`,
            sql`${schema.outboundIntegrationJob.input}->>'companyDomain' = ${savedInput.companyDomain}`,
            sql`${schema.outboundIntegrationJob.status} in ('pending','starting','uncertain')`,
          ),
          limit: 1,
        },
        { tx: transaction },
      ),
    );
    if (competing.length)
      throw new ConflictError("contact-fallback-unavailable");
    const state = Steps.contactFallbackState(
      automationStateSchema.parse(job.output),
    );
    const saved = value(
      await Jobs.update(
        Environment.SERVER,
        job.id,
        {
          status: "pending",
          error: null,
          output: {
            ...state,
            contactFallbackResumedBy: actor,
            contactFallbackResumedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    if (!saved) throw new ConflictError("automation-job-missing");
    return view(saved);
  });

/** Deterministic copy correction bound to the original qualified product receipt. No provider work. */
export const normalizeProductCategoryForJob = (
  actor: string,
  input: { jobId: string; expectedProspectRevision: number },
) =>
  transaction(async (transaction) => {
    const parsed = z
      .object({
        jobId: z.string().uuid(),
        expectedProspectRevision: z.number().int().nonnegative(),
      })
      .parse(input);
    const job = value(
      await Jobs.get(Environment.SERVER, parsed.jobId, { tx: transaction }),
    );
    if (
      !job ||
      job.provider !== "automation" ||
      !["pending", "failed"].includes(job.status) ||
      automationStateSchema.parse(job.output).lease
    )
      throw new ConflictError("product-category-correction-unavailable");
    const normalized = await correctCategoryWithin(
      transaction,
      job,
      actor,
      parsed.expectedProspectRevision,
    );
    if (normalized.corrected)
      value(
        await Jobs.update(
          Environment.SERVER,
          job.id,
          { output: normalized.output, updatedAt: new Date() },
          { tx: transaction },
        ),
      );
    return {
      jobId: job.id,
      prospectId: normalized.prospectId,
      revision: normalized.revision,
      corrected: normalized.corrected,
    };
  });

/** Re-read one existing verified-but-undated request after its response parser has been corrected. */
export const resumeVerificationDateCheck = (
  actor: string,
  input: { jobId: string; expectedProspectRevision: number },
) =>
  transaction(async (transaction) => {
    const parsed = z
      .object({
        jobId: z.string().uuid(),
        expectedProspectRevision: z.number().int().nonnegative(),
      })
      .parse(input);
    const job = value(
      await Jobs.get(Environment.SERVER, parsed.jobId, { tx: transaction }),
    );
    if (
      !job ||
      job.provider !== "automation" ||
      job.status !== "failed" ||
      job.error !== "verification-held"
    )
      throw new ConflictError("verification-date-recheck-unavailable");
    const savedInput = automationInputSchema.parse(job.input);
    const context = await current(savedInput, transaction);
    if (context.reason) throw new ConflictError(context.reason);
    const state = automationStateSchema.parse(job.output);
    const prospect = job.prospectId
      ? value(
          await Prospects.get(Environment.SERVER, job.prospectId, {
            tx: transaction,
          }),
        )
      : null;
    if (
      state.stage !== "applyVerification" ||
      state.lease ||
      !prospect ||
      state["prospectId"] !== prospect.id ||
      state["prospectRevision"] !== parsed.expectedProspectRevision ||
      prospect.revision !== parsed.expectedProspectRevision ||
      prospect.sentStep ||
      prospect.approvedAt ||
      prospect.approvalHash ||
      !["candidate", "draft", "held"].includes(prospect.status)
    )
      throw new ConflictError("verification-date-recheck-unavailable");
    await Store.assertCampaignActive(transaction, prospect);
    await Store.assertAutomaticEvidence(transaction, prospect);
    const request = z
      .object({
        requestId: z.string(),
        requestedAt: z.string().datetime(),
        records: z.array(
          z.object({
            record_id: z.string(),
            input: z.object({ email: z.string() }),
          }),
        ),
      })
      .parse(state["verification"]);
    const result = z
      .object({
        requestId: z.string(),
        status: z.literal("complete"),
        results: z.array(
          z.object({
            email: z.string(),
            recordId: z.string(),
            status: z.string(),
            verifiedAt: z.string().nullable(),
          }),
        ),
      })
      .parse(state["verificationResult"]);
    const matching = result.results.filter(
      (record) =>
        record.email.toLowerCase() === prospect.details.email.toLowerCase() &&
        request.records.some(
          (input) =>
            input.record_id === record.recordId &&
            input.input.email.toLowerCase() === record.email.toLowerCase(),
        ),
    );
    const polls = z
      .number()
      .int()
      .nonnegative()
      .parse(state["verificationPolls"]);
    if (
      result.requestId !== request.requestId ||
      matching.length !== 1 ||
      matching[0]?.status !== "verified" ||
      matching[0].verifiedAt !== null ||
      polls >= 20 ||
      Date.parse(request.requestedAt) > Date.now() ||
      Date.now() - Date.parse(request.requestedAt) > 86_400_000
    )
      throw new ConflictError("verification-date-recheck-unavailable");
    const saved = value(
      await Jobs.update(
        Environment.SERVER,
        job.id,
        {
          status: "pending",
          error: null,
          output: {
            ...state,
            stage: "pollVerification",
            availableAt: new Date().toISOString(),
            lease: null,
            verificationDateRecheck: {
              actor,
              requestedAt: new Date().toISOString(),
              requestId: request.requestId,
              previousResult: state["verificationResult"],
            },
          },
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    if (!saved) throw new ConflictError("automation-job-missing");
    return view(saved);
  });

/** Internal, explicit one-time recovery of completed research holds; no provider work or sending. */
export const resumeResearchReview = (
  actor: string,
  input: {
    jobId: string;
    expectedStateHash: string;
    expectedInputHash: string;
    dryRun?: boolean;
  },
) =>
  transaction(async (transaction) => {
    const parsed = z
      .object({
        jobId: z.string().uuid(),
        expectedStateHash: z.string().regex(/^[a-f0-9]{64}$/),
        expectedInputHash: z.string().regex(/^[a-f0-9]{64}$/),
        dryRun: z.boolean().default(false),
      })
      .parse(input);
    const job = value(
      await Jobs.get(Environment.SERVER, parsed.jobId, { tx: transaction }),
    );
    if (
      !job ||
      job.provider !== "automation" ||
      job.prospectId ||
      researchStateHash(job.input) !== parsed.expectedInputHash
    )
      throw new ConflictError("research-review-recovery-unavailable");
    const savedInput = automationInputSchema.parse(job.input);
    const state = automationStateSchema.parse(job.output);
    const previous = z
      .object({
        version: z.literal(researchRecoveryVersion),
        sourceStateHash: z.string(),
      })
      .safeParse(state["researchReviewRecovery"]);
    if (
      previous.success &&
      previous.data.sourceStateHash === parsed.expectedStateHash
    )
      return { job: view(job), repeated: true, dryRun: parsed.dryRun };
    if (
      job.status !== "failed" ||
      researchStateHash(job.output) !== parsed.expectedStateHash
    )
      throw new ConflictError("research-review-recovery-unavailable");
    const context = await current(savedInput, transaction);
    if (
      context.reason ||
      !context.company ||
      !context.campaign ||
      context.company.status !== "candidate" ||
      context.company.prospectId ||
      context.company.domain !== savedInput.companyDomain
    )
      throw new ConflictError(
        context.reason ?? "research-review-recovery-unavailable",
      );
    const competing = value(
      await Jobs.find(
        Environment.SERVER,
        {
          where: and(
            scoped(),
            sql`${schema.outboundIntegrationJob.id} <> ${job.id}`,
            sql`${schema.outboundIntegrationJob.input}->>'companyDomain' = ${savedInput.companyDomain}`,
            sql`${schema.outboundIntegrationJob.status} in ('pending','starting','uncertain')`,
          ),
          limit: 1,
        },
        { tx: transaction },
      ),
    );
    if (competing.length)
      throw new ConflictError("research-review-recovery-unavailable");
    const recovery = researchRecoveryState({
      state,
      error: job.error,
      playbook: context.policy.settings,
      domain: context.company.domain,
      platforms: context.campaign.criteria.platforms,
    });
    if (parsed.dryRun) return { job: view(job), repeated: false, dryRun: true };
    const now = new Date();
    const saved = value(
      await Jobs.update(
        Environment.SERVER,
        job.id,
        {
          status: "pending",
          error: null,
          updatedAt: now,
          output: {
            ...state,
            availableAt: now.toISOString(),
            lease: null,
            ...(recovery.kind === "qualification"
              ? { qualificationReplayEvidence: recovery.evidence }
              : {}),
            researchReviewRecovery: {
              version: researchRecoveryVersion,
              kind: recovery.kind,
              actor,
              requestedAt: now.toISOString(),
              sourceStateHash: parsed.expectedStateHash,
              sourceInputHash: parsed.expectedInputHash,
              previousReason: job.error,
              previousAssessment: recovery.previous,
            },
          },
        },
        { tx: transaction },
      ),
    );
    if (!saved) throw new ConflictError("automation-job-missing");
    return { job: view(saved), repeated: false, dryRun: false };
  });

export const run = (
  options: {
    campaignId?: string;
    jobId?: string;
    maxSteps?: number;
    deadline?: number;
  } = {},
  execute: typeof Steps.execute = Steps.execute,
): Promise<Result<AutomationTick, Error>> =>
  resultify(async () => {
    const input = z
      .object({
        campaignId: z.string().uuid().optional(),
        jobId: z.string().uuid().optional(),
        maxSteps: z.number().int().min(1).max(20).default(3),
        deadline: z.number().default(Date.now() + 180000),
      })
      .parse(options);
    const policy = await Store.policy();
    const enabled = policy.settings.automationEnabled;
    if (!enabled) return { enabled: false, processed: 0, results: [] };
    const research = value(await ResearchReadiness.getStatus(policy.settings));
    if (!input.jobId && research.ready) value(await enqueue(input.campaignId));
    const results: AutomationJobSummary[] = [];
    for (const _ of Array.from({ length: input.maxSteps })) {
      if (Date.now() + 15000 >= input.deadline) break;
      const claimed = value(
        await claim(input.campaignId, input.jobId, research.ready),
      );
      if (!claimed) break;
      const executed = await resultify(() =>
        execute(claimed, Math.min(input.deadline, Date.now() + 100000)),
      );
      const settled = executed.success
        ? await finish(claimed, executed.data)
        : await fail(claimed, executed.error);
      const saved = settled.success
        ? settled
        : await fail(claimed, settled.error);
      results.push(view(value(saved)));
    }
    return {
      enabled: true,
      processed: results.length,
      results,
      blockers: [
        ...(research.ready ? [] : ["research-not-configured"]),
        ...(policy.settings.automaticApolloEnabled ? [] : ["apollo-paused"]),
      ],
    };
  });

export const getStatus = (
  input: { campaignId?: string } = {},
): Promise<Result<AutomationStatus, Error>> =>
  resultify(async () => {
    const parsed = z
      .object({ campaignId: z.string().uuid().optional() })
      .parse(input);
    const [policy, campaigns, jobs, delivery, totals] = await Promise.all([
      Store.policy(),
      Campaigns.count(
        Environment.SERVER,
        and(
          eq(schema.outboundCampaign.status, "active"),
          parsed.campaignId
            ? eq(schema.outboundCampaign.id, parsed.campaignId)
            : undefined,
        ),
      ),
      // Browser/raw captures can be large. The status panel only needs the stage,
      // never screenshots, full provider responses or private research content.
      resultifyRead(() =>
        db
          .select({
            id: schema.outboundIntegrationJob.id,
            input: schema.outboundIntegrationJob.input,
            output: sql<
              Record<string, unknown>
            >`jsonb_build_object('stage', output->'stage', 'availableAt', output->'availableAt', 'lease', output->'lease')`,
            status: schema.outboundIntegrationJob.status,
            error: schema.outboundIntegrationJob.error,
            prospectId: schema.outboundIntegrationJob.prospectId,
            updatedAt: schema.outboundIntegrationJob.updatedAt,
          })
          .from(schema.outboundIntegrationJob)
          .where(scoped(parsed.campaignId))
          .orderBy(desc(schema.outboundIntegrationJob.updatedAt))
          .limit(50),
      ),
      Store.automationDeliveryStatus(),
      Promise.all(
        (
          [
            { status: "queued", stored: "pending" },
            { status: "running", stored: "starting" },
            { status: "held", stored: "failed" },
            { status: "uncertain", stored: "uncertain" },
            { status: "complete", stored: "complete" },
          ] as const
        ).map(async ({ status, stored }) => ({
          status,
          result: await Jobs.count(
            Environment.SERVER,
            and(
              scoped(parsed.campaignId),
              eq(schema.outboundIntegrationJob.status, stored),
            ),
          ),
        })),
      ),
    ]);
    const rows = value(jobs).map(view);
    const counts = {
      queued: 0,
      running: 0,
      held: 0,
      uncertain: 0,
      complete: 0,
    };
    for (const total of totals) counts[total.status] = value(total.result);
    return {
      enabled: policy.settings.automationEnabled,
      research: value(await ResearchReadiness.getStatus(policy.settings)),
      activeCampaigns: value(campaigns),
      counts,
      jobs: rows,
      delivery: value(delivery),
    };
  });
