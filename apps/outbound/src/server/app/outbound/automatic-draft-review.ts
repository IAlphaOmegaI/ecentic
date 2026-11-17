import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  canReviewDraftAutomatically,
  draftReviewInputSchema,
  draftReviewOutputSchema,
  draftReviewReadinessKey,
} from "@/lib/outbound-draft-review";
import { db, schema, type TransactionScope } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { ConflictError, ValidationError } from "@/server/utils/error";
import * as Draft from "@/server/utils/outbound/draft";
import { repository } from "@/server/utils/repository";
import * as Store from "./store";

const Jobs = repository(schema.outboundIntegrationJob);
const Prospects = repository(schema.outboundProspect);
const Campaigns = repository(schema.outboundCampaign);
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
const scope = and(
  eq(schema.outboundIntegrationJob.provider, "automation"),
  sql`${schema.outboundIntegrationJob.input}->>'operation' = 'draftReview'`,
);
const lease = () => ({
  token: randomUUID(),
  expiresAt: new Date(Date.now() + 180_000).toISOString(),
});

const claim = () =>
  transaction(async (transaction) => {
    const policy = await Store.policy(transaction);
    if (!policy.settings.automationEnabled) return null;
    const running = value(
      await Jobs.find(
        Environment.SERVER,
        {
          where: and(
            scope,
            eq(schema.outboundIntegrationJob.status, "starting"),
          ),
          limit: 50,
        },
        { tx: transaction },
      ),
    );
    for (const job of running) {
      const output = draftReviewOutputSchema.parse(job.output);
      if (Date.parse(output.lease.expiresAt) > Date.now()) return null;
      if (output.stage === "apply") {
        // The provider output was durably saved. Applying it is atomic and safe to resume.
        const updated = value(
          await Jobs.update(
            Environment.SERVER,
            job.id,
            {
              output: { ...job.output, lease: lease() },
              updatedAt: new Date(),
            },
            { tx: transaction },
          ),
        );
        return updated;
      }
      value(
        await Jobs.update(
          Environment.SERVER,
          job.id,
          {
            status: "uncertain",
            error: "The draft request outcome is unknown. It was not repeated.",
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      );
    }
    const pending = value(
      await Jobs.find(
        Environment.SERVER,
        {
          where: and(
            scope,
            eq(schema.outboundIntegrationJob.status, "pending"),
            sql`exists (select 1 from outbound_campaign campaign where campaign.id = ${schema.outboundIntegrationJob.input}->>'campaignId' and campaign.status = 'active')`,
          ),
          limit: 1,
          orderBy: [
            {
              column: schema.outboundIntegrationJob.updatedAt,
              direction: "asc",
            },
          ],
        },
        { tx: transaction },
      ),
    )[0];
    if (pending)
      return value(
        await Jobs.update(
          Environment.SERVER,
          pending.id,
          {
            status: "starting",
            output: { ...pending.output, lease: lease() },
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      );
    const readiness = sql`concat_ws('|', ${schema.outboundProspect.details}->>'emailVerifiedAt', ${schema.outboundProspect.details}->>'mxCheckedAt', ${schema.outboundProspect.details}->>'evidenceCheckedAt', ${schema.outboundProspect.details}->>'roleCheckedAt', ${schema.outboundProspect.details}->>'personalCheckedAt', ${String(policy.settings.senderConfirmed)}::text)`;
    const resumed = sql`coalesce((select event.id from outbound_event event where event.prospect_id = ${schema.outboundProspect.id} and event.kind = 'review' order by event.created_at desc, event.id desc limit 1), '')`;
    const prospects = value(
      await Prospects.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundProspect.status, "draft"),
            eq(schema.outboundProspect.sentStep, 0),
            sql`${schema.outboundProspect.holdReason} in ('', 'playbookChanged')`,
            sql`exists (select 1 from outbound_campaign campaign where campaign.id = ${schema.outboundProspect.campaignId} and campaign.status = 'active')`,
            sql`not exists (select 1 from outbound_integration_job job where job.provider = 'automation' and job.input->>'operation' = 'draftReview' and job.prospect_id = ${schema.outboundProspect.id} and (job.status in ('starting', 'uncertain') or (job.input->>'prospectRevision' = ${schema.outboundProspect.revision}::text and job.input->>'playbookRevision' = ${String(policy.revision)} and (job.status <> 'failed' or (job.input->>'readinessKey' = ${readiness} and job.input->>'resumeId' = ${resumed})))))`,
            sql`not exists (select 1 from outbound_integration_job job where job.provider = 'automation' and job.input->>'operation' = 'campaignAutomation' and job.prospect_id = ${schema.outboundProspect.id} and job.status in ('pending', 'starting', 'uncertain'))`,
          ),
          orderBy: [
            { column: schema.outboundProspect.updatedAt, direction: "asc" },
          ],
          limit: 1,
        },
        { tx: transaction },
      ),
    );
    const prospect = prospects[0];
    if (
      !prospect ||
      !prospect.campaignId ||
      !canReviewDraftAutomatically(prospect)
    )
      return null;
    const campaign = value(
      await Campaigns.get(Environment.SERVER, prospect.campaignId, {
        tx: transaction,
      }),
    );
    if (!campaign) return null;
    const checked = await resultify(() =>
      Store.assertAutomaticDraftReviewReady(transaction, prospect),
    );
    const readinessKey = draftReviewReadinessKey(
      prospect.details,
      policy.settings.senderConfirmed,
    );
    const resumeId = await Store.latestDraftReviewRequest(
      transaction,
      prospect.id,
    );
    const regenerate =
      prospect.playbookRevision !== policy.revision ||
      prospect.messages.length !== 3;
    return value(
      await Jobs.create(
        Environment.SERVER,
        {
          provider: "automation",
          prospectId: prospect.id,
          requestId: `draft-review:${prospect.id}:${prospect.revision}:${policy.revision}:${createHash("sha256").update(`${readinessKey}|${resumeId}`).digest("hex")}`,
          status: checked.success ? "starting" : "failed",
          error: checked.success ? null : checked.error.message,
          input: draftReviewInputSchema.parse({
            operation: "draftReview",
            prospectId: prospect.id,
            prospectRevision: prospect.revision,
            campaignId: campaign.id,
            campaignRevision: campaign.revision,
            playbookRevision: policy.revision,
            regenerate,
            readinessKey,
            resumeId,
          }),
          output: { stage: regenerate ? "draft" : "apply", lease: lease() },
        },
        { tx: transaction },
      ),
    );
  });

const checkpoint = (identifier: string, token: string, messages: unknown) =>
  transaction(async (transaction) => {
    const job = value(
      await Jobs.get(Environment.SERVER, identifier, { tx: transaction }),
    );
    const output = draftReviewOutputSchema.parse(job?.output);
    if (
      job?.status !== "starting" ||
      output.lease.token !== token ||
      Date.parse(output.lease.expiresAt) <= Date.now()
    )
      throw new ConflictError("The automatic draft lease changed.");
    const updated = draftReviewOutputSchema.parse({
      ...output,
      stage: "apply",
      messages,
    });
    value(
      await Jobs.update(
        Environment.SERVER,
        identifier,
        { output: updated, updatedAt: new Date() },
        { tx: transaction },
      ),
    );
  });

const fail = (identifier: string, token: string, error: Error) =>
  transaction(async (transaction) => {
    const job = value(
      await Jobs.get(Environment.SERVER, identifier, { tx: transaction }),
    );
    if (job?.status !== "starting" || job.output?.["lease"] == null) return;
    const output = draftReviewOutputSchema.parse(job.output);
    if (output.lease.token !== token) return;
    const input = draftReviewInputSchema.parse(job.input);
    const policy = await Store.policy(transaction);
    const campaign = value(
      await Campaigns.get(Environment.SERVER, input.campaignId, {
        tx: transaction,
      }),
    );
    const paused =
      output.stage === "apply" &&
      policy.revision === input.playbookRevision &&
      campaign?.revision === input.campaignRevision &&
      (!policy.settings.automationEnabled || campaign?.status === "paused");
    value(
      await Jobs.update(
        Environment.SERVER,
        identifier,
        {
          status: paused
            ? "pending"
            : output.stage === "draft" &&
                error.name !== ConflictError.errorName &&
                error.name !== ValidationError.errorName
              ? "uncertain"
              : "failed",
          error: error.message,
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
  });

/** Automatically approve eligible unsent edits, regenerating only stale Playbook drafts. Never sends mail. */
export const run = (
  options: { maxDrafts?: number; deadline?: number } = {},
  generate: typeof Draft.generateDraft = Draft.generateDraft,
) =>
  resultify(async () => {
    const input = z
      .object({
        maxDrafts: z.number().int().min(1).max(20).default(3),
        deadline: z.number().default(Date.now() + 90_000),
      })
      .parse(options);
    const results: { prospect: string; status: "approved" | "held" }[] = [];
    for (const _ of Array.from({ length: input.maxDrafts })) {
      if (Date.now() + 30_000 >= input.deadline) break;
      const job = value(await claim());
      if (!job) break;
      const scope = draftReviewInputSchema.parse(job.input);
      const output = draftReviewOutputSchema.parse(job.output);
      if (job.status === "failed") {
        results.push({ prospect: scope.prospectId, status: "held" });
        continue;
      }
      const completed = await resultify(async () => {
        if (output.stage === "draft") {
          const row = value(await Store.readProspect(scope.prospectId));
          const policy = await Store.policy();
          if (
            !row ||
            row.revision !== scope.prospectRevision ||
            policy.revision !== scope.playbookRevision
          )
            throw new ConflictError(
              "The draft context changed before generation.",
            );
          const draft = value(await generate(row.details, policy.settings));
          if (draft.issues.length)
            throw new ConflictError(
              `The refreshed draft needs attention: ${draft.issues.map((issue) => issue.code).join(", ")}`,
            );
          value(await checkpoint(job.id, output.lease.token, draft.messages));
        }
        return value(
          await Store.applyAutomaticDraftReview({
            job: job.id,
            token: output.lease.token,
          }),
        );
      });
      if (!completed.success)
        value(await fail(job.id, output.lease.token, completed.error));
      results.push({
        prospect: scope.prospectId,
        status: completed.success ? "approved" : "held",
      });
    }
    return {
      processed: results.length,
      approved: results.filter((result) => result.status === "approved").length,
      results,
    };
  });
