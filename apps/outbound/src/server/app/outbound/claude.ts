import "server-only";

import { createHash } from "node:crypto";
import { resultify } from "@zenncore/utils";
import { sql } from "drizzle-orm";
import { z } from "zod";
import {
  type ClaudeModel,
  claudeConfigurationSchema,
  claudeContextSchema,
  claudePreviewSchema,
} from "@/lib/outbound-claude";
import { db, schema } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/server/utils/error";
import * as Claude from "@/server/utils/outbound/claude";
import { IntegrationError } from "@/server/utils/outbound/http";
import { repository } from "@/server/utils/repository";
import * as Jobs from "./jobs";
import * as Credentials from "./provider-credentials";
import * as Store from "./store";

const Campaigns = repository(schema.outboundCampaign);
const Generations = repository(schema.outboundIntegrationJob);
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const inputSchema = z
  .object({
    campaignId: z.string().uuid(),
    expectedRevision: z.number().int().positive(),
    context: claudeContextSchema,
    requestId: z.string().uuid(),
  })
  .strict();
export type GenerateInput = z.infer<typeof inputSchema>;

export const getStatus = () =>
  resultify(async () => {
    const metadata = value(await Credentials.metadata("claude"));
    return {
      configured: metadata.configured,
      credentialStatus: metadata.credentialStatus,
      ...claudeConfigurationSchema.parse(metadata.configuration),
    };
  });
export const saveKey = (
  actor: string,
  input: { apiKey: string; model?: ClaudeModel; workspaceId?: string },
) =>
  Credentials.save(actor, {
    provider: "claude",
    apiKey: input.apiKey,
    configuration: { model: input.model, workspaceId: input.workspaceId },
  });

const preview = async (job: Jobs.Job) => {
  if (
    job.provider !== "claude" ||
    job.input["operation"] !== "campaignCriteria"
  )
    throw new NotFoundError("claude-generation-missing");
  const output = claudePreviewSchema.safeParse(job.output);
  if (!output.success || job.status === "failed") {
    switch (job.status) {
      case "starting":
      case "pending":
        // Reporting an exceeded request deadline never releases or retries this ID.
        throw new ConflictError(
          Date.now() - job.createdAt.getTime() > 90_000
            ? "claude-generation-uncertain"
            : "claude-generation-running",
        );
      case "uncertain":
        throw new ConflictError("claude-generation-uncertain");
      default:
        throw new ValidationError("claude-generation-failed");
    }
  }
  const [campaign, policy] = await Promise.all([
    Campaigns.get(Environment.SERVER, output.data.campaignId),
    Store.policy(),
  ]);
  const current = value(campaign);
  return {
    ...output.data,
    answers: JSON.stringify({ criteria: output.data.criteria }, null, 2),
    stale:
      !current ||
      current.status === "archived" ||
      current.revision !== output.data.campaignRevision ||
      policy.revision !== output.data.playbookRevision,
  };
};
export const getGeneration = (input: { requestId: string }) =>
  resultify(async () => {
    const parsed = z
      .object({ requestId: z.string().uuid() })
      .strict()
      .parse(input);
    const job = value(
      await Generations.get(Environment.SERVER, parsed.requestId),
    );
    if (!job) throw new NotFoundError("claude-generation-missing");
    return preview(job);
  });

const reserve = (actor: string, input: GenerateInput) =>
  db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
    );
    const hash = createHash("sha256").update(input.context).digest("hex");
    const existing = value(
      await Generations.get(Environment.SERVER, input.requestId, {
        tx: transaction,
      }),
    );
    if (existing) {
      if (
        existing.provider !== "claude" ||
        existing.input["campaignId"] !== input.campaignId ||
        existing.input["expectedRevision"] !== input.expectedRevision ||
        existing.input["contextHash"] !== hash
      )
        throw new ConflictError("claude-request-invalid");
      return { existing };
    }
    const campaign = value(
      await Campaigns.get(Environment.SERVER, input.campaignId, {
        tx: transaction,
      }),
    );
    if (!campaign) throw new NotFoundError("Campaign not found.");
    if (campaign.revision !== input.expectedRevision)
      throw new ConflictError("campaign-criteria-changed");
    if (campaign.status === "archived")
      throw new ConflictError("campaign-archived");
    const policy = await Store.policy(transaction);
    const job = value(
      await Generations.create(
        Environment.SERVER,
        {
          id: input.requestId,
          requestId: `claude-generation:${input.requestId}`,
          provider: "claude",
          status: "starting",
          createdAt: new Date(),
          updatedAt: new Date(),
          prospectId: null,
          input: {
            operation: "campaignCriteria",
            campaignId: input.campaignId,
            expectedRevision: input.expectedRevision,
            contextHash: hash,
            playbookRevision: policy.revision,
            actor,
          },
        },
        { tx: transaction },
      ),
    );
    return { campaign, policy, job };
  });

/** Explicit requests create review previews. Repeating a request ID can only read its existing result. */
export const generate = (actor: string, input: GenerateInput) =>
  resultify(async () => {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("claude-request-invalid");
    const reserved = await reserve(actor, parsed.data);
    if (reserved.existing) return preview(reserved.existing);
    const { campaign, policy, job } = reserved;
    const generated = await resultify(() =>
      Claude.generateCriteria({
        campaign,
        playbook: policy.settings,
        context: parsed.data.context,
      }),
    );
    const error = !generated.success
      ? generated.error
      : !generated.data.success
        ? generated.data.error
        : null;
    if (error) {
      const uncertain =
        !(error instanceof IntegrationError) ||
        ["uncertain", "unavailable"].includes(error.code);
      value(
        await Jobs.update(job.id, {
          status: uncertain ? "uncertain" : "failed",
          error:
            error instanceof IntegrationError
              ? error.message
              : "claude-generation-uncertain",
          output: error instanceof IntegrationError ? error.receipt : null,
        }),
      );
      throw error instanceof IntegrationError
        ? error
        : new ConflictError("claude-generation-uncertain");
    }
    const result = value(value(generated));
    const output = claudePreviewSchema.parse({
      ...result,
      requestId: job.id,
      campaignId: campaign.id,
      campaignRevision: campaign.revision,
      playbookRevision: policy.revision,
    });
    const saved = await Jobs.update(job.id, {
      status: "complete",
      output,
      error: null,
    });
    if (!saved.success || !saved.data) {
      // Preserve the validated preview if a later write succeeds. Recovery reads it;
      // neither a failed acknowledgement nor its request ID invokes Claude again.
      await Jobs.update(job.id, {
        status: "uncertain",
        output,
        error: "claude-generation-uncertain",
      });
      throw new ConflictError("claude-generation-uncertain");
    }
    return preview(saved.data);
  });
