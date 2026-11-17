import "server-only";
import { resultify } from "@zenncore/utils";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { ConflictError, NotFoundError } from "@/server/utils/error";
import { repository } from "@/server/utils/repository";

const Jobs = repository(schema.outboundIntegrationJob);
export type Job = typeof schema.outboundIntegrationJob.$inferSelect;
const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};

export const list = () =>
  Jobs.find(Environment.SERVER, {
    orderBy: [
      { column: schema.outboundIntegrationJob.createdAt, direction: "desc" },
    ],
    limit: 100,
  });
export const read = async (id: string) =>
  resultify(async () => {
    const job = value(await Jobs.get(Environment.SERVER, id));
    if (!job) throw new NotFoundError("Provider job not found.");
    return job;
  });
export const find = async (provider: Job["provider"], prospectId: string) =>
  resultify(
    async () =>
      value(
        await Jobs.find(Environment.SERVER, {
          where: and(
            eq(schema.outboundIntegrationJob.provider, provider),
            eq(schema.outboundIntegrationJob.prospectId, prospectId),
          ),
          orderBy: [
            {
              column: schema.outboundIntegrationJob.createdAt,
              direction: "desc",
            },
          ],
          limit: 100,
        }),
      ).find((job) => job.input["operation"] === "verify") ?? null,
  );
export const byRequest = async (requestId: string) =>
  resultify(
    async () =>
      value(
        await Jobs.find(Environment.SERVER, {
          where: eq(schema.outboundIntegrationJob.requestId, requestId),
          limit: 1,
        }),
      )[0] ?? null,
  );

export const reserve = (
  provider: Job["provider"],
  prospectId: string | null,
  input: Record<string, unknown>,
) =>
  resultify(() =>
    db.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-providers'))`,
      );
      const pending = value(
        await Jobs.find(
          Environment.SERVER,
          {
            where: and(
              eq(schema.outboundIntegrationJob.provider, provider),
              inArray(schema.outboundIntegrationJob.status, [
                "starting",
                "pending",
                "uncertain",
              ]),
            ),
          },
          { tx: transaction },
        ),
      );
      if (
        pending.some(
          (job) => provider === "clay" || job.prospectId === prospectId,
        )
      )
        throw new ConflictError(
          "A provider job is already pending or needs reconciliation. Resolve it before submitting again.",
        );
      return value(
        await Jobs.create(
          Environment.SERVER,
          { provider, prospectId, input, status: "starting" },
          { tx: transaction },
        ),
      );
    }),
  );

export const update = (
  id: string,
  input: Partial<Pick<Job, "requestId" | "status" | "output" | "error">>,
) => Jobs.update(Environment.SERVER, id, { ...input, updatedAt: new Date() });

export const hasPendingWarmup = (email: string) =>
  resultify(
    async () =>
      value(
        await Jobs.find(Environment.SERVER, {
          where: and(
            eq(schema.outboundIntegrationJob.provider, "warmbly"),
            inArray(schema.outboundIntegrationJob.status, [
              "starting",
              "pending",
              "uncertain",
            ]),
            sql`${schema.outboundIntegrationJob.input}->>'email' = ${email.trim().toLowerCase()}`,
          ),
          limit: 1,
        }),
      ).length > 0,
  );

export const beginPoll = (id: string) =>
  resultify(() =>
    db.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-providers'))`,
      );
      const job = value(
        await Jobs.get(Environment.SERVER, id, { tx: transaction }),
      );
      if (!job?.requestId)
        throw new NotFoundError("No provider request is ready to poll.");
      if (job.status !== "pending")
        throw new ConflictError("This provider job is no longer pending.");
      if (Date.now() - job.createdAt.getTime() > 24 * 3600_000) {
        value(
          await Jobs.update(
            Environment.SERVER,
            id,
            {
              status: "failed",
              error:
                "The provider job expired. Review it before starting a new request.",
              updatedAt: new Date(),
            },
            { tx: transaction },
          ),
        );
        return null;
      }
      if (Date.now() - job.updatedAt.getTime() < 30_000)
        throw new ConflictError("Wait 30 seconds between provider polls.");
      value(
        await Jobs.update(
          Environment.SERVER,
          id,
          { updatedAt: new Date() },
          { tx: transaction },
        ),
      );
      return job;
    }),
  );
