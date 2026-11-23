import "server-only";

import { resultify, unwrapResult } from "@zenncore/utils";
import { and, asc, count, desc, eq, or, sql } from "drizzle-orm";
import type { ProspectLifecycle } from "@/lib/outbound-prospect-progress";
import {
  PROSPECT_PAGE_SIZE,
  type ProspectList,
  type ProspectSearchParams,
  parseProspectQuery,
} from "@/lib/outbound-prospects";
import { db, schema } from "@/server/database";
import { resultifyRead } from "@/server/utils/repository";

/** Filter the full prospect set, projecting only the displayed page's summary. */
export const list = (input: ProspectSearchParams = {}) =>
  resultify(async (): Promise<ProspectList> => {
    const query = parseProspectQuery(input);
    const prospect = schema.outboundProspect;
    const job = schema.outboundIntegrationJob;
    const latest = db
      .selectDistinctOn([job.prospectId], {
        prospectId: job.prospectId,
        status: job.status,
      })
      .from(job)
      .where(eq(job.provider, "automation"))
      .orderBy(job.prospectId, desc(job.createdAt), desc(job.id))
      .as("latest_prospect_research");
    const company = sql<string>`coalesce(${prospect.details}->>'company', '')`;
    const domain = sql<string>`coalesce(${prospect.details}->>'domain', '')`;
    const name = sql<string>`coalesce(${prospect.details}->>'name', '')`;
    const title = sql<string>`coalesce(${prospect.details}->>'title', '')`;
    const email = sql<string>`coalesce(${prospect.details}->>'email', '')`;
    const linkedinUrl = sql<string>`coalesce(${prospect.details}->>'linkedinUrl', '')`;
    // Match prospectLifecycles without selecting bodies or research receipts.
    const lifecycle = {
      researching: sql`${latest.status} in ('pending', 'starting')`,
      scheduled: sql`${prospect.status} in ('approved', 'active') and ${prospect.nextSendAt} is not null and ${prospect.approvalHash} is not null and ${prospect.approvalHash} <> '' and ${prospect.sentStep} < jsonb_array_length(${prospect.messages})`,
      sent: sql`${prospect.sentStep} > 0`,
      replied: sql`${prospect.status} = 'replied'`,
      held: sql`(${prospect.status} = 'held' or ${latest.status} in ('failed', 'uncertain'))`,
    };
    const lifecycles = sql<ProspectLifecycle[]>`array_remove(array[
      case when ${lifecycle.researching} then 'researching' end,
      case when ${lifecycle.scheduled} then 'scheduled' end,
      case when ${lifecycle.sent} then 'sent' end,
      case when ${lifecycle.replied} then 'replied' end,
      case when ${lifecycle.held} then 'held' end
    ], null)`;
    const pattern = `%${query.q.replace(/[!%_]/g, "!$&")}%`;
    const where = and(
      query.status === "all" ? undefined : eq(prospect.status, query.status),
      query.lifecycle === "all" ? undefined : lifecycle[query.lifecycle],
      query.linkedin === "all"
        ? undefined
        : and(
            sql`${linkedinUrl} <> ''`,
            eq(prospect.linkedinStatus, query.linkedin),
          ),
      query.q
        ? or(
            ...[company, domain, name, title, email].map(
              (field) => sql`${field} ilike ${pattern} escape '!'`,
            ),
          )
        : undefined,
    );
    // Repository delegates cannot express this latest-job join and JSON projection.
    // These independent reads need no workspace write lock or full-record hydration.
    const totals = await unwrapResult(
      resultifyRead(() =>
        db
          .select({ total: count() })
          .from(prospect)
          .leftJoin(latest, eq(latest.prospectId, prospect.id))
          .where(where),
      ),
    );
    const total = totals[0]?.total ?? 0;
    const page = Math.min(
      query.page,
      Math.max(1, Math.ceil(total / PROSPECT_PAGE_SIZE)),
    );
    if (!total) return { rows: [], total, page, pageSize: PROSPECT_PAGE_SIZE };
    const rows = await unwrapResult(
      resultifyRead(() =>
        db
          .select({
            id: prospect.id,
            company,
            domain,
            name,
            title,
            email,
            status: prospect.status,
            linkedinUrl,
            linkedinStatus: prospect.linkedinStatus,
            lifecycles,
          })
          .from(prospect)
          .leftJoin(latest, eq(latest.prospectId, prospect.id))
          .where(where)
          .orderBy(desc(prospect.updatedAt), asc(prospect.id))
          .limit(PROSPECT_PAGE_SIZE)
          .offset((page - 1) * PROSPECT_PAGE_SIZE),
      ),
    );
    return { rows, total, page, pageSize: PROSPECT_PAGE_SIZE };
  });
