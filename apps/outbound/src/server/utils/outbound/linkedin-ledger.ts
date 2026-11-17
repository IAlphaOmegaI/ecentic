import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { schema, type TransactionScope } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { repository } from "@/server/utils/repository";

export const linkedinAttemptSchema = z.object({
  operation: z.literal("linkedinOutreach"),
  action: z.enum(["invite", "message"]),
  prospectId: z.string().uuid(),
  companyId: z.string().uuid(),
  campaignId: z.string().uuid(),
  accountId: z.string().regex(/^acc_[A-Za-z0-9_-]+$/),
  accountUserId: z.string().min(1),
  recipientId: z.string().min(1),
  profileUrl: z.url(),
  chatId: z.string().min(1).nullable(),
  text: z.string().max(3000),
  prospectRevision: z.number().int().nonnegative(),
  campaignRevision: z.number().int().positive(),
  playbookRevision: z.number().int().nonnegative(),
  qualificationJobId: z.string().uuid(),
  historyCheckedAt: z.iso.datetime(),
  approvedAt: z.iso.datetime(),
  approvalHash: z.string().length(64),
});
export type LinkedInAttempt = z.infer<typeof linkedinAttemptSchema>;
const Jobs = repository(schema.outboundIntegrationJob);
type Scope = { prospectId: string; companyId: string; now?: Date };
const touched = (scope: Scope) =>
  and(
    eq(schema.outboundIntegrationJob.provider, "linkedin"),
    sql`${schema.outboundIntegrationJob.input}->>'operation' = 'linkedinOutreach'`,
    sql`(${schema.outboundIntegrationJob.prospectId} = ${scope.prospectId} or ${schema.outboundIntegrationJob.input}->>'companyId' = ${scope.companyId})`,
    sql`${schema.outboundIntegrationJob.status} in ('starting', 'complete', 'uncertain')`,
  );

/** Called under the workspace lock by both channels. Uncertain attempts count as touches. */
export const hasRecentLinkedInTouch = async (
  transaction: TransactionScope,
  scope: Scope,
) => {
  const result = await Jobs.find(
    Environment.SERVER,
    {
      where: and(
        touched(scope),
        sql`${schema.outboundIntegrationJob.createdAt} >= ${new Date((scope.now ?? new Date()).getTime() - 86_400_000).toISOString()}`,
      ),
      limit: 1,
    },
    { tx: transaction },
  );
  if (!result.success) throw result.error;
  return result.data.length > 0;
};

/** A linked conversation must be checked successfully before another email may leave. */
export const linkedinHistoryReady = async (
  transaction: TransactionScope,
  scope: Scope,
) => {
  const result = await Jobs.find(
    Environment.SERVER,
    { where: touched(scope) },
    { tx: transaction },
  );
  if (!result.success) throw result.error;
  const now = (scope.now ?? new Date()).getTime();
  return result.data.every((job) => {
    const checked = job.output?.["historyCheckedAt"];
    const timestamp =
      typeof checked === "string" ? Date.parse(checked) : Number.NaN;
    return (
      job.status !== "starting" &&
      job.status !== "uncertain" &&
      job.output?.["historyClear"] === true &&
      Number.isFinite(timestamp) &&
      timestamp <= now &&
      now - timestamp < 600_000
    );
  });
};
