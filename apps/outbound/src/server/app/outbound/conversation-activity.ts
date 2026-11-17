import "server-only";
import { type Result, resultify } from "@zenncore/utils";
import { sql } from "drizzle-orm";
import { z } from "zod";
import {
  activityQuerySchema,
  type ConversationActivity,
} from "@/lib/outbound-conversation-activity";
import { db } from "@/server/database";
import { resultifyRead } from "@/server/utils/repository";

const value = <Data>(result: Result<Data, Error>): Data => {
  if (!result.success) throw result.error;
  return result.data as Data;
};
const rowSchema = z.object({
  id: z.string(),
  prospectId: z.string(),
  company: z.string(),
  person: z.string(),
  channel: z.enum(["email", "linkedin"]),
  kind: z.enum(["emailStep", "linkedinMessage", "linkedinInvite", "reply"]),
  status: z.enum(["accepted", "starting", "failed", "uncertain", "scheduled"]),
  at: z.coerce.date(),
  step: z.number().nullable(),
  exactHref: z.string().nullable(),
});

/** Reads actual dispatch ledgers or saved email schedule timestamps; performs no provider work. */
export const list = (input: unknown) =>
  resultify(async (): Promise<ConversationActivity> => {
    const query = activityQuerySchema.parse(input);
    const source =
      query.view === "scheduled"
        ? sql`
    select p.id, p.id as prospect_id, 'email'::text as channel, 'emailStep'::text as kind,
      'scheduled'::text as status, p.next_send_at as at, p.sent_step + 1 as step, null::text as exact_href,
      (select coalesce(message->>'subject','') || ' ' || coalesce(message->>'body','') from jsonb_array_elements(p.messages) message where (message->>'step')::int = p.sent_step + 1 limit 1) as search_text
    from outbound_prospect p where p.next_send_at is not null and p.status in ('approved','active') and exists (select 1 from jsonb_array_elements(p.messages) message where (message->>'step')::int = p.sent_step + 1)
  `
        : sql`
    select attempt.id, attempt.prospect_id, 'email'::text as channel, 'emailStep'::text as kind,
      case when attempt.status = 'claimed' then 'starting' else attempt.status end as status,
      coalesce(attempt.completed_at, attempt.created_at) as at, attempt.step, '/sent/' || attempt.id as exact_href,
      (select coalesce(message->>'subject','') || ' ' || coalesce(message->>'body','') from outbound_revision version cross join lateral jsonb_array_elements(version.messages) message where version.prospect_id = attempt.prospect_id and version.revision = attempt.revision and (message->>'step')::int = attempt.step limit 1) as search_text
    from outbound_send_attempt attempt where not attempt.test
    union all
    select job.id, job.prospect_id, 'linkedin'::text as channel,
      case when job.input->>'action' = 'invite' then 'linkedinInvite' else 'linkedinMessage' end as kind,
      case when job.status = 'complete' and coalesce(job.output->>'providerMessageId', job.output->>'providerInvitationId') is not null then 'accepted'
        when job.status = 'complete' then 'uncertain' else job.status end as status,
      coalesce((job.output->>'acceptedAt')::timestamptz, job.created_at) as at, null::int as step, null::text as exact_href, job.input->>'text' as search_text
    from outbound_integration_job job where job.provider = 'linkedin' and job.input->>'operation' = 'linkedinOutreach'
      and job.prospect_id is not null and job.status in ('starting','complete','failed','uncertain')
    union all
    select attempt.id, thread.prospect_id, thread.channel, 'reply'::text as kind, attempt.status,
      coalesce(attempt.completed_at, attempt.created_at) as at, null::int as step, null::text as exact_href, coalesce(attempt.input->>'subject','') || ' ' || coalesce(attempt.input->>'body','') as search_text
    from outbound_conversation_send attempt join outbound_conversation thread on thread.id = attempt.conversation_id
  `;
    const scoped = sql`with activity as (${source}), filtered as (
    select activity.*, p.details->>'company' as company, p.details->>'name' as person from activity
    join outbound_prospect p on p.id = activity.prospect_id
    where (${query.channel} = 'all' or activity.channel = ${query.channel})
      and (${query.q} = '' or position(lower(${query.q}) in lower(coalesce(p.details->>'company','') || ' ' || coalesce(p.details->>'name','') || ' ' || coalesce(p.details->>'email','') || ' ' || coalesce(activity.search_text,''))) > 0)
      and (${query.prospect ?? null}::text is null or p.id = ${query.prospect ?? null})
      and (${query.campaign ?? null}::text is null or p.campaign_id = ${query.campaign ?? null})
  )`;
    const [counted, found] = await Promise.all([
      resultifyRead(() =>
        db.execute(sql`${scoped} select count(*)::int as total from filtered`),
      ),
      resultifyRead(() =>
        db.execute(
          sql`${scoped} select id, prospect_id as "prospectId", company, person, channel, kind, status, at, step, exact_href as "exactHref" from filtered order by ${query.view === "scheduled" ? sql`at asc` : sql`at desc`}, id limit 50 offset ${(query.page - 1) * 50}`,
        ),
      ),
    ]);
    return {
      rows: z
        .array(rowSchema)
        .parse(value(found))
        .map((row) => ({ ...row, at: row.at.toISOString() })),
      total: z.object({ total: z.number().int() }).parse(value(counted)[0])
        .total,
      page: query.page,
      pageSize: 50,
    };
  });
