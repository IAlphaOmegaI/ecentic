import "server-only";

import { resultify, unwrapResult } from "@zenncore/utils";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { ProspectProgress } from "@/lib/outbound-prospect-progress";
import { db, schema } from "@/server/database";
import { resultifyRead } from "@/server/utils/repository";

/** Project only lifecycle fields for the displayed prospect scope, never receipt payloads. */
export const getProgress = (input: { prospectIds: string[] }) =>
  resultify(async (): Promise<ProspectProgress[]> => {
    const prospectIds = z
      .array(z.string().uuid())
      .max(5000)
      .parse(input.prospectIds);
    if (!prospectIds.length) return [];
    const [prospects, jobs] = await Promise.all([
      unwrapResult(
        resultifyRead(() =>
          db
            .select({
              prospectId: schema.outboundProspect.id,
              nextSendAt: schema.outboundProspect.nextSendAt,
            })
            .from(schema.outboundProspect)
            .where(inArray(schema.outboundProspect.id, prospectIds)),
        ),
      ),
      unwrapResult(
        resultifyRead(() =>
          db
            .selectDistinctOn([schema.outboundIntegrationJob.prospectId], {
              prospectId: schema.outboundIntegrationJob.prospectId,
              status: schema.outboundIntegrationJob.status,
            })
            .from(schema.outboundIntegrationJob)
            .where(
              and(
                eq(schema.outboundIntegrationJob.provider, "automation"),
                inArray(schema.outboundIntegrationJob.prospectId, prospectIds),
              ),
            )
            .orderBy(
              schema.outboundIntegrationJob.prospectId,
              desc(schema.outboundIntegrationJob.createdAt),
              desc(schema.outboundIntegrationJob.id),
            ),
        ),
      ),
    ]);
    const states = new Map(jobs.map((job) => [job.prospectId, job.status]));
    return prospects.map((prospect) => {
      const state = states.get(prospect.prospectId);
      return {
        prospectId: prospect.prospectId,
        nextSendAt: prospect.nextSendAt?.toISOString() ?? null,
        research:
          state === "pending"
            ? "queued"
            : state === "starting"
              ? "running"
              : state === "failed"
                ? "held"
                : (state ?? null),
      };
    });
  });
