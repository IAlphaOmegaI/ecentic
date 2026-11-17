import "server-only";

import { randomUUID } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import { and, eq, lte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  originalRefreshProduct,
  refreshFresh,
  type SequenceRefreshInput,
  type SequenceRefreshState,
  sequenceRefreshInputSchema,
  sequenceRefreshStateSchema,
  validateSequenceRefreshReceipts,
} from "@/lib/outbound-sequence-refresh";
import { db, schema, type TransactionScope } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { ConflictError, ValidationError } from "@/server/utils/error";
import { IntegrationError } from "@/server/utils/outbound/http";
import * as MX from "@/server/utils/outbound/mx";
import * as Providers from "@/server/utils/outbound/providers";
import * as Product from "@/server/utils/outbound/sequence-refresh-product";
import { repository } from "@/server/utils/repository";
import * as Store from "./store";

const Jobs = repository(schema.outboundIntegrationJob);
const Prospects = repository(schema.outboundProspect);
const Campaigns = repository(schema.outboundCampaign);
type Prospect = typeof schema.outboundProspect.$inferSelect;
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
const scope = (prospectId?: string) =>
  and(
    eq(schema.outboundIntegrationJob.provider, "automation"),
    sql`${schema.outboundIntegrationJob.input}->>'operation' = 'sequenceRefresh'`,
    prospectId
      ? eq(schema.outboundIntegrationJob.prospectId, prospectId)
      : undefined,
  );
const newState = (): SequenceRefreshState => ({
  stage: "product",
  availableAt: new Date().toISOString(),
  lease: null,
  product: null,
  verification: null,
  verificationResult: null,
  verificationPolls: 0,
  mx: null,
});
const sameApproval = (row: Prospect, input: SequenceRefreshInput) =>
  row.id === input.prospectId &&
  row.campaignId === input.campaignId &&
  row.revision === input.prospectRevision &&
  row.playbookRevision === input.playbookRevision &&
  row.approvalHash === input.approvalHash &&
  row.sentStep === input.sentStep &&
  row.details.email.toLowerCase() === input.recipient.toLowerCase() &&
  Boolean(row.approvedBy?.startsWith("automatic:"));
const current = async (
  input: SequenceRefreshInput,
  transaction: TransactionScope,
) => {
  const policy = await Store.policy(transaction);
  const [prospect, campaign] = await Promise.all([
    Prospects.get(Environment.SERVER, input.prospectId, { tx: transaction }),
    Campaigns.get(Environment.SERVER, input.campaignId, { tx: transaction }),
  ]);
  const row = value(prospect);
  const target = value(campaign);
  const reason = !policy.settings.automationEnabled
    ? "automation-disabled"
    : !row || !sameApproval(row, input) || row.status !== "active"
      ? "sequence-changed"
      : target?.status !== "active"
        ? "campaign-inactive"
        : target.revision !== input.campaignRevision ||
            policy.revision !== input.playbookRevision
          ? "sequence-policy-changed"
          : null;
  return { policy, prospect: row, campaign: target, reason };
};
const holdWithin = async (
  transaction: TransactionScope,
  input: SequenceRefreshInput,
  reason: string,
) => {
  const row = value(
    await Prospects.get(Environment.SERVER, input.prospectId, {
      tx: transaction,
    }),
  );
  if (row?.status !== "active" || !sameApproval(row, input)) return;
  value(
    await Prospects.update(
      Environment.SERVER,
      row.id,
      {
        status: "held",
        holdReason: reason,
        nextSendAt: null,
        updatedAt: new Date(),
      },
      { tx: transaction },
    ),
  );
};

/** One durable refresh per approved revision; failed or uncertain work is never silently recreated. */
const enqueue = (prospectId?: string) =>
  transaction(async (transaction) => {
    const policy = await Store.policy(transaction);
    if (!policy.settings.automationEnabled) return;
    const pending = value(
      await Prospects.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundProspect.status, "active"),
            sql`${schema.outboundProspect.approvedBy} like 'automatic:%'`,
            sql`${schema.outboundProspect.sentStep} between 1 and 2`,
            lte(
              schema.outboundProspect.nextSendAt,
              new Date(Date.now() + 900000),
            ),
            prospectId ? eq(schema.outboundProspect.id, prospectId) : undefined,
            sql`(${schema.outboundProspect.details}->>'emailStatus' <> 'verified' or coalesce(nullif(${schema.outboundProspect.details}->>'emailVerifiedAt','')::timestamptz,'epoch') < now() - (${policy.settings.emailVerificationDays} * interval '1 day') or coalesce(nullif(${schema.outboundProspect.details}->>'evidenceCheckedAt','')::timestamptz,'epoch') < now() - (${policy.settings.verificationDays} * interval '1 day') or coalesce(nullif(${schema.outboundProspect.details}->>'mxCheckedAt','')::timestamptz,'epoch') < now() - interval '1 day')`,
            sql`not exists (select 1 from outbound_integration_job refresh where refresh.provider='automation' and refresh.input->>'operation'='sequenceRefresh' and refresh.prospect_id=${schema.outboundProspect.id} and refresh.input->>'prospectRevision'=${schema.outboundProspect.revision}::text)`,
          ),
          orderBy: [
            { column: schema.outboundProspect.nextSendAt, direction: "asc" },
          ],
          limit: 20,
        },
        { tx: transaction },
      ),
    );
    for (const prospect of pending) {
      if (
        !prospect.campaignId ||
        !prospect.approvalHash ||
        !prospect.approvedBy
      )
        continue;
      const campaign = value(
        await Campaigns.get(Environment.SERVER, prospect.campaignId, {
          tx: transaction,
        }),
      );
      if (
        campaign?.status !== "active" ||
        prospect.playbookRevision !== policy.revision
      )
        continue;
      const product = originalRefreshProduct(prospect.details);
      if (!product) continue;
      const proof = await resultify(() =>
        Store.assertAutomaticEvidence(transaction, prospect),
      );
      if (!proof.success) continue;
      const input = sequenceRefreshInputSchema.parse({
        operation: "sequenceRefresh",
        prospectId: prospect.id,
        campaignId: campaign.id,
        campaignRevision: campaign.revision,
        prospectRevision: prospect.revision,
        playbookRevision: policy.revision,
        approvalHash: prospect.approvalHash,
        recipient: prospect.details.email.toLowerCase(),
        sentStep: prospect.sentStep,
        sourceEvidenceId: prospect.details.automationEvidenceId,
        actor: "sequence-refresh",
        needEmail:
          prospect.details.emailStatus !== "verified" ||
          !refreshFresh(
            prospect.details.emailVerifiedAt,
            policy.settings.emailVerificationDays,
          ),
        product,
      });
      value(
        await Jobs.create(
          Environment.SERVER,
          {
            provider: "automation",
            prospectId: prospect.id,
            status: "pending",
            input,
            output: newState(),
          },
          { tx: transaction },
        ),
      );
    }
  });

type Claim = {
  job: Job;
  input: SequenceRefreshInput;
  state: SequenceRefreshState & { lease: { token: string; expiresAt: string } };
};
const claim = (prospectId?: string) =>
  transaction(async (transaction) => {
    const running = value(
      await Jobs.find(
        Environment.SERVER,
        {
          where: and(
            scope(prospectId),
            eq(schema.outboundIntegrationJob.status, "starting"),
          ),
          limit: 50,
        },
        { tx: transaction },
      ),
    );
    for (const job of running) {
      const state = sequenceRefreshStateSchema.parse(job.output);
      if (state.lease && Date.parse(state.lease.expiresAt) > Date.now())
        continue;
      const paid = state.stage === "verify";
      value(
        await Jobs.update(
          Environment.SERVER,
          job.id,
          {
            status: paid ? "uncertain" : "pending",
            error: paid ? "sequence-request-uncertain" : null,
            output: { ...state, lease: null },
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      );
      if (paid)
        await holdWithin(
          transaction,
          sequenceRefreshInputSchema.parse(job.input),
          "sequence-request-uncertain",
        );
    }
    const jobs = value(
      await Jobs.find(
        Environment.SERVER,
        {
          where: and(
            scope(prospectId),
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
    for (const job of jobs) {
      const input = sequenceRefreshInputSchema.parse(job.input);
      const state = sequenceRefreshStateSchema.parse(job.output);
      if (Date.parse(state.availableAt) > Date.now()) continue;
      const context = await current(input, transaction);
      if (
        context.reason === "campaign-inactive" ||
        context.reason === "automation-disabled"
      )
        continue;
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
      const output = {
        ...state,
        lease: {
          token: randomUUID(),
          expiresAt: new Date(Date.now() + 120000).toISOString(),
        },
      };
      const claimed = value(
        await Jobs.update(
          Environment.SERVER,
          job.id,
          { status: "starting", output, updatedAt: new Date() },
          { tx: transaction },
        ),
      );
      if (!claimed) throw new ConflictError("sequence-refresh-missing");
      return { job: claimed, input, state: output } satisfies Claim;
    }
    return null;
  });

type Transition = { state: SequenceRefreshState; reason?: string };
export type SequenceRefreshDependencies = {
  product: typeof Product.check;
  verify: typeof Providers.verifyApolloEmails;
  poll: typeof Providers.pollApolloVerification;
  mx: typeof MX.check;
  apply: (input: {
    jobId: string;
    leaseToken: string;
  }) => Promise<Result<{ prospectId: string; revision: number }, Error>>;
};
const execute = async (
  claim: Claim,
  dependencies: SequenceRefreshDependencies,
  deadline: number,
): Promise<Transition | { applied: true }> => {
  const state = { ...claim.state, lease: null };
  switch (claim.state.stage) {
    case "product": {
      const product = value(await dependencies.product(claim.input, deadline));
      return {
        state: {
          ...state,
          product,
          stage: claim.input.needEmail ? "verify" : "mx",
        },
        ...(product.status !== "same"
          ? { reason: product.reason ?? "sequence-product-changed" }
          : {}),
      };
    }
    case "verify": {
      const verification = sequenceRefreshStateSchema.shape.verification
        .unwrap()
        .parse(
          value(await dependencies.verify({ emails: [claim.input.recipient] })),
        );
      if (
        !verification.records.some(
          (record) =>
            record.input.email.toLowerCase() ===
            claim.input.recipient.toLowerCase(),
        )
      )
        throw new ValidationError("sequence-verification-held");
      return {
        state: {
          ...state,
          verification,
          verificationPolls: 0,
          stage: "pollVerification",
          availableAt: new Date(Date.now() + 30000).toISOString(),
        },
      };
    }
    case "pollVerification": {
      const request = claim.state.verification;
      if (
        !request ||
        claim.state.verificationPolls >= 20 ||
        !refreshFresh(request.requestedAt, 1)
      )
        return { state, reason: "sequence-verification-held" };
      const verificationResult = value(
        await dependencies.poll({ requestId: request.requestId }),
      );
      const pending = verificationResult.status === "pending";
      return {
        state: {
          ...state,
          verificationResult,
          verificationPolls: state.verificationPolls + 1,
          stage: pending ? "pollVerification" : "mx",
          availableAt: new Date(
            Date.now() +
              (pending
                ? Math.min(
                    300000,
                    Math.max(
                      30000,
                      verificationResult.retryAfterSeconds * 1000,
                    ),
                  )
                : 0),
          ).toISOString(),
        },
      };
    }
    case "mx": {
      const mx = value(await dependencies.mx(claim.input.recipient));
      return { state: { ...state, mx, stage: "apply" } };
    }
    case "apply": {
      const prospect = value(await Store.readProspect(claim.input.prospectId));
      if (!prospect) throw new ConflictError("sequence-changed");
      const policy = await Store.policy();
      const validation = validateSequenceRefreshReceipts(
        claim.input,
        claim.state,
        prospect.details,
        policy.settings,
      );
      if ("reason" in validation) return { state, reason: validation.reason };
      value(
        await dependencies.apply({
          jobId: claim.job.id,
          leaseToken: claim.state.lease.token,
        }),
      );
      return { applied: true };
    }
    case "complete":
      throw new ConflictError("sequence-refresh-complete");
  }
};
const settle = (claimed: Claim, transition: Transition) =>
  transaction(async (transaction) => {
    const job = value(
      await Jobs.get(Environment.SERVER, claimed.job.id, { tx: transaction }),
    );
    if (!job) return;
    const state = sequenceRefreshStateSchema.parse(job.output);
    if (
      job.status !== "starting" ||
      state.lease?.token !== claimed.state.lease.token
    )
      return;
    const context = await current(claimed.input, transaction);
    const paused = ["campaign-inactive", "automation-disabled"].includes(
      context.reason ?? "",
    );
    const reason =
      (paused ? null : context.reason) ?? transition.reason ?? null;
    value(
      await Jobs.update(
        Environment.SERVER,
        job.id,
        {
          status: reason ? "failed" : "pending",
          error: reason,
          output: transition.state,
          requestId: transition.state.verification?.requestId ?? job.requestId,
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    if (reason) await holdWithin(transaction, claimed.input, reason);
  });
const fail = (
  claimed: Claim,
  error: Error,
  checkpoint?: SequenceRefreshState,
) =>
  transaction(async (transaction) => {
    const job = value(
      await Jobs.get(Environment.SERVER, claimed.job.id, { tx: transaction }),
    );
    if (!job) return;
    const state = sequenceRefreshStateSchema.parse(job.output);
    if (
      job.status !== "starting" ||
      state.lease?.token !== claimed.state.lease.token
    )
      return;
    const context = await current(claimed.input, transaction);
    if (
      claimed.state.stage !== "verify" &&
      ["campaign-inactive", "automation-disabled"].includes(
        context.reason ?? "",
      )
    ) {
      value(
        await Jobs.update(
          Environment.SERVER,
          job.id,
          {
            status: "pending",
            error: null,
            output: { ...(checkpoint ?? state), lease: null },
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      );
      return;
    }
    const definitive =
      error instanceof ConflictError ||
      error instanceof ValidationError ||
      (error instanceof IntegrationError &&
        ["configuration", "input", "access", "quota", "rate-limit"].includes(
          error.code,
        ));
    const reason =
      error instanceof IntegrationError
        ? `provider-${definitive ? error.code : "uncertain"}`
        : definitive
          ? "sequence-refresh-held"
          : "sequence-request-uncertain";
    value(
      await Jobs.update(
        Environment.SERVER,
        job.id,
        {
          status: definitive ? "failed" : "uncertain",
          error: reason,
          output: { ...(checkpoint ?? state), lease: null },
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    await holdWithin(transaction, claimed.input, reason);
  });

/** One explicit cron tick resumes bounded recorded stages; uncertain billable requests never restart. */
export const run = (
  options: { prospectId?: string; maxSteps?: number; deadline?: number } = {},
  dependencies: SequenceRefreshDependencies = {
    product: Product.check,
    verify: Providers.verifyApolloEmails,
    poll: Providers.pollApolloVerification,
    mx: MX.check,
    apply: Store.applyAutomaticSequenceRefresh,
  },
) =>
  resultify(async () => {
    const input = z
      .object({
        prospectId: z.string().uuid().optional(),
        maxSteps: z.number().int().min(1).max(20).default(3),
        deadline: z.number().default(Date.now() + 60000),
      })
      .parse(options);
    if (!(await Store.policy()).settings.automationEnabled)
      return { enabled: false, processed: 0 };
    value(await enqueue(input.prospectId));
    const processed: string[] = [];
    for (const _ of Array.from({ length: input.maxSteps })) {
      if (Date.now() + 10000 >= input.deadline) break;
      const claimed = value(await claim(input.prospectId));
      if (!claimed) break;
      const result = await resultify(() =>
        execute(claimed, dependencies, input.deadline),
      );
      if (!result.success) value(await fail(claimed, result.error));
      else if (!("applied" in result.data)) {
        const finished = await settle(claimed, result.data);
        if (!finished.success)
          value(await fail(claimed, finished.error, result.data.state));
      }
      processed.push(claimed.job.id);
    }
    return { enabled: true, processed: processed.length };
  });
