import "server-only";

import type { Result } from "@zenncore/utils";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { Playbook } from "@/lib/outbound";
import { schema, type TransactionScope } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { ConflictError } from "@/server/utils/error";
import { repository } from "@/server/utils/repository";

const Jobs = repository(schema.outboundIntegrationJob);
const Sends = repository(schema.outboundConversationSend);
const value = <Data>(result: Result<Data, Error>): Data => {
  if (!result.success) throw result.error;
  return result.data as Data;
};

/** Both cold outreach and conversation replies reserve under the workspace lock. */
export const assertLinkedinCapacity = async (
  transaction: TransactionScope,
  input: {
    accountId: string;
    action: "invite" | "message";
    settings: Pick<
      Playbook,
      "linkedinDailyInvites" | "linkedinWeeklyInvites" | "linkedinDailyMessages"
    >;
    now?: Date;
    excludeJobId?: string;
    excludeSendId?: string;
  },
) => {
  const now = input.now ?? new Date();
  const day = new Date(now.getTime() - 86_400_000).toISOString();
  const week = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const jobs = value(
    await Jobs.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundIntegrationJob.provider, "linkedin"),
          sql`${schema.outboundIntegrationJob.input}->>'accountId' = ${input.accountId}`,
          inArray(schema.outboundIntegrationJob.status, [
            "starting",
            "complete",
            "uncertain",
          ]),
          or(
            sql`${schema.outboundIntegrationJob.createdAt} >= ${week}`,
            inArray(schema.outboundIntegrationJob.status, [
              "starting",
              "uncertain",
            ]),
          ),
          input.excludeJobId
            ? sql`${schema.outboundIntegrationJob.id} <> ${input.excludeJobId}`
            : undefined,
        ),
      },
      { tx: transaction },
    ),
  );
  const replies = value(
    await Sends.find(
      Environment.SERVER,
      {
        where: and(
          sql`${schema.outboundConversationSend.input}->>'channel' = 'linkedin'`,
          sql`${schema.outboundConversationSend.input}->>'accountId' = ${input.accountId}`,
          inArray(schema.outboundConversationSend.status, [
            "starting",
            "accepted",
            "uncertain",
          ]),
          or(
            sql`${schema.outboundConversationSend.createdAt} >= ${day}`,
            inArray(schema.outboundConversationSend.status, [
              "starting",
              "uncertain",
            ]),
          ),
          input.excludeSendId
            ? sql`${schema.outboundConversationSend.id} <> ${input.excludeSendId}`
            : undefined,
        ),
      },
      { tx: transaction },
    ),
  );
  if (
    jobs.some((job) => ["starting", "uncertain"].includes(job.status)) ||
    replies.some((reply) => ["starting", "uncertain"].includes(reply.status))
  )
    throw new ConflictError("linkedin-account-reconciliation");
  const daily =
    jobs.filter(
      (job) =>
        job.input["action"] === input.action &&
        job.createdAt.getTime() >= now.getTime() - 86_400_000,
    ).length + (input.action === "message" ? replies.length : 0);
  const weekly = jobs.filter((job) => job.input["action"] === "invite").length;
  if (
    daily >=
      (input.action === "invite"
        ? input.settings.linkedinDailyInvites
        : input.settings.linkedinDailyMessages) ||
    (input.action === "invite" &&
      weekly >= input.settings.linkedinWeeklyInvites)
  )
    throw new ConflictError("linkedin-capacity");
};
