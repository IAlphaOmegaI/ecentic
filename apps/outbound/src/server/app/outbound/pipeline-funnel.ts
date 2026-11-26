import "server-only";

import { resultify } from "@zenncore/utils";
import { sql } from "drizzle-orm";
import { z } from "zod";
import {
  COPY_CRITERIA,
  WRITING_CONTRACT_VERSION,
} from "@/lib/outbound-composition";
import { db } from "@/server/database";
import { resultifyRead } from "@/server/utils/repository";

const count = z.number().int().nonnegative();
const countsSchema = z.object({
  contactsIn: count,
  researched: count,
  findings: count,
  noGap: count,
  blocked: count,
  copyPassed: count,
  approved: count,
  acceptedSends: count,
  humanReplies: count,
  positiveReplies: count,
  meetingsHeld: count,
  searchesPurchased: count,
  unconfirmedSearches: count,
  approvedFirstEmails: count,
});

/** One saved-contact cohort; raw receipts stay in PostgreSQL and never reach the UI. */
export const read = (playbookRevision: number) =>
  resultify(async () => {
    const result = await resultifyRead(() =>
      db.execute(sql`
        with contacts as (
          select id, revision, playbook_revision, status, messages, approval_hash,
            approved_at, first_sent_at, sent_step
          from outbound_prospect
          where coalesce(details->>'source', '') <> 'internal-mailbox-setup-test'
        ), research_jobs as (
          select job.id, contact.id as contact_id, job.status, job.output,
            job.input->>'operation' as operation, job.created_at, job.updated_at
          from outbound_integration_job job
          join contacts contact on contact.id = coalesce(job.prospect_id, job.input->>'prospectId')
          where job.provider = 'automation'
        ), research_records as (
          select job.*,
            coalesce(nullif(output->'shoppingReceipt', 'null'::jsonb), nullif(output->'receipt', 'null'::jsonb)) as receipt
          from research_jobs job
          where operation in ('leadResearch', 'campaignAutomation', 'savedContactPreparation', 'heldDiscoveryReview')
        ), latest_research as (
          select distinct on (contact_id) contact_id,
            receipt->'selected'->>'kind' as kind,
            receipt is not null and receipt <> 'null'::jsonb as has_receipt
          from research_records
          where receipt->'selected'->>'kind' is not null
            or (operation <> 'leadResearch' and (
              status in ('failed', 'uncertain')
              or nullif(output->>'heldReason', '') is not null
            ))
          order by contact_id, updated_at desc, created_at desc, id desc
        ), provider_jobs as (
          select job.id as source_job_id, capture.value
          from research_jobs job
          cross join lateral (values
            (output->'shoppingJob'),
            (output->'shoppingAnswer'->'job'),
            (output->'answer'->'job'),
            (output->'captureProof'->'answer'->'job')
          ) capture(value)
          union all
          select job.id, history.value->'shoppingJob'
          from research_jobs job
          cross join lateral jsonb_array_elements(
            case when jsonb_typeof(output->'shoppingHistory') = 'array'
              then output->'shoppingHistory' else '[]'::jsonb end
          ) history(value)
        ), acknowledged_searches as (
          select distinct value->>'id' as provider_job_id
          from provider_jobs
          where nullif(value->>'id', '') is not null
            and nullif(value->>'submittedAt', '') is not null
        ), unconfirmed_searches as (
          select job.id from research_jobs job
          where coalesce(output->>'queryReservedAt', output->>'shoppingQueryReservedAt') is not null
            and not exists (
              select 1 from (values
                (job.output->'shoppingJob'),
                (job.output->'shoppingAnswer'->'job'),
                (job.output->'answer'->'job')
              ) capture(value)
              where nullif(value->>'id', '') is not null
                and nullif(value->>'submittedAt', '') is not null
            )
        ), passed_copy as (
          select contact.id from contacts contact
          where contact.playbook_revision = ${playbookRevision}
            and contact.messages->0->'writing'->>'version' = ${WRITING_CONTRACT_VERSION}
            and contact.messages->0->'writing'->>'revision' = contact.revision::text
            and contact.messages->0->'writing'->'quality'->>'passed' = 'true'
            and contact.messages->0->'writing'->'quality'->'deterministicIssues' = '[]'::jsonb
            and (
              select count(*) = ${COPY_CRITERIA.length}
                and count(distinct criterion->>'criterion') = ${COPY_CRITERIA.length}
                and bool_and(coalesce(criterion->>'passed' = 'true'
                  and nullif(btrim(criterion->>'reason'), '') is not null
                  and criterion->>'criterion' in (${sql.join(
                    COPY_CRITERIA.map((criterion) => sql`${criterion}`),
                    sql`, `,
                  )}), false))
              from jsonb_array_elements(
                case when jsonb_typeof(contact.messages->0->'writing'->'quality'->'criteria') = 'array'
                  then contact.messages->0->'writing'->'quality'->'criteria' else '[]'::jsonb end
              ) criterion
            )
            and exists (
              select 1 from research_jobs job
              where job.contact_id = contact.id and job.operation = 'sequenceComposition' and job.status = 'complete'
                and job.output->>'appliedProspectRevision' = contact.revision::text
                and jsonb_set(job.output->'messages', '{0,writing,revision}', to_jsonb(contact.revision)) = contact.messages
            )
        ), current_approvals as (
          select contact.id from contacts contact
          join outbound_revision revision on revision.prospect_id = contact.id and revision.revision = contact.revision
          where contact.status in ('approved', 'active') and contact.approval_hash is not null
            and contact.playbook_revision = ${playbookRevision}
            and revision.content_hash = contact.approval_hash
            and revision.approved_at is not null and revision.revoked_at is null
            and revision.messages = contact.messages
        ), first_approvals as (
          select distinct contact.id from contacts contact
          join outbound_revision revision on revision.prospect_id = contact.id
          left join outbound_send_attempt first_send on first_send.prospect_id = contact.id
            and first_send.step = 1 and first_send.status = 'accepted' and not first_send.test
          where revision.approved_at is not null
            and (contact.sent_step = 0 or coalesce(contact.first_sent_at, first_send.completed_at) is not null)
            and revision.approved_at <= coalesce(contact.first_sent_at, first_send.completed_at, 'infinity'::timestamp)
        ), human_replies as (
          select distinct thread.prospect_id as contact_id
          from outbound_conversation thread
          join contacts contact on contact.id = thread.prospect_id
          join outbound_conversation_message message on message.conversation_id = thread.id
          where message.direction = 'inbound' and not message.is_automated
          union
          select distinct event.prospect_id from outbound_event event
          join contacts contact on contact.id = event.prospect_id
          where event.kind in ('reply', 'positive', 'negative', 'optout')
        ), positive_replies as (
          select distinct event.prospect_id as contact_id from outbound_event event
          join human_replies reply on reply.contact_id = event.prospect_id
          where event.kind = 'positive'
            or (event.kind = 'conversationStage' and event.detail ~ '^Conversation [^:]+: interested$')
          union
          select distinct thread.prospect_id from outbound_conversation thread
          join human_replies reply on reply.contact_id = thread.prospect_id
          where thread.stage = 'interested'
        ), held_meetings as (
          select distinct thread.prospect_id as contact_id from outbound_conversation thread
          join contacts contact on contact.id = thread.prospect_id
          where thread.stage = 'meetingHeld'
          union
          select distinct event.prospect_id from outbound_event event
          join contacts contact on contact.id = event.prospect_id
          where event.kind = 'meetingHeld'
            or (event.kind = 'conversationStage' and event.detail ~ '^Conversation [^:]+: meetingHeld$')
        )
        select
          (select count(*)::int from contacts) as "contactsIn",
          (select count(*)::int from latest_research where has_receipt) as researched,
          (select count(*)::int from latest_research where kind in ('discovery-absence', 'discovery-outranked', 'query-comparison', 'product-data-gap', 'checkout-handoff', 'ucp-gap')) as findings,
          (select count(*)::int from latest_research where kind = 'no-gap') as "noGap",
          (select count(*)::int from latest_research where kind is null or kind not in ('discovery-absence', 'discovery-outranked', 'query-comparison', 'product-data-gap', 'checkout-handoff', 'ucp-gap', 'no-gap')) as blocked,
          (select count(*)::int from passed_copy) as "copyPassed",
          (select count(*)::int from current_approvals) as approved,
          (select count(*)::int from outbound_send_attempt attempt join contacts contact on contact.id = attempt.prospect_id where attempt.status = 'accepted' and not attempt.test) as "acceptedSends",
          (select count(*)::int from human_replies) as "humanReplies",
          (select count(*)::int from positive_replies) as "positiveReplies",
          (select count(*)::int from held_meetings) as "meetingsHeld",
          (select count(*)::int from acknowledged_searches) as "searchesPurchased",
          (select count(*)::int from unconfirmed_searches) as "unconfirmedSearches",
          (select count(*)::int from first_approvals) as "approvedFirstEmails"
      `),
    );
    if (!result.success) throw result.error;
    const counts = countsSchema.parse(result.data[0]);
    return {
      ...counts,
      searchesPerApproved:
        counts.approvedFirstEmails > 0
          ? counts.searchesPurchased / counts.approvedFirstEmails
          : null,
    };
  });
export type Funnel = Extract<
  Awaited<ReturnType<typeof read>>,
  { success: true }
>["data"];
