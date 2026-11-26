import "server-only";

import { type Result, resultify } from "@zenncore/utils";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { repository, resultifyRead } from "@/server/utils/repository";
import * as Conversations from "./conversations";
import * as Funnel from "./pipeline-funnel";
import * as Credentials from "./provider-credentials";
import * as Store from "./store";

const value = <Data>(result: Result<Data, Error>): Data => {
  if (!result.success) throw result.error;
  return result.data as Data;
};
const count = z.number().int().nonnegative();
const totalsSchema = z.object({
  activeCampaigns: count,
  companies: count,
  insights: count,
  contacts: count,
  sequences: count,
  needsReply: count,
  meetings: count,
  acceptedEmails: count,
  acceptedLinkedin: count,
});
const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  companies: count,
  insights: count,
  contacts: count,
  sequences: count,
  held: count,
});
const workSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  companyId: z.string().nullable(),
  prospectId: z.string().nullable(),
  company: z.string(),
  stage: z.string(),
  status: z.enum(["pending", "starting", "failed", "uncertain"]),
  reason: z.string().nullable(),
});
const Accounts = repository(schema.outboundLinkedinAccount);

/** Counts live campaign records, never equates an automation job with a contact. */
export const read = () =>
  resultify(async () => {
    const policy = await Store.policy();
    const scoped = sql`
    with active_campaigns as (
      select * from outbound_campaign where status = 'active'
    ), current_companies as (
      select company.* from outbound_campaign_company company
      join active_campaigns campaign on campaign.id = company.campaign_id
      where company.criteria_revision = campaign.revision and company.status <> 'excluded'
    ), provider_jobs as (
      select distinct on (company.id) job.*, company.id as source_company_id,
        company.campaign_id as source_campaign_id, company.name as source_company_name, company.domain as source_company_domain, null::text as source_prospect_id
      from outbound_integration_job job
      join current_companies company on job.input->>'companyId' = company.id
      join active_campaigns campaign on campaign.id = company.campaign_id
      where job.provider = 'automation' and job.input->>'operation' = 'campaignAutomation'
        and job.input->>'campaignRevision' = campaign.revision::text
        and job.input->>'playbookRevision' = ${String(policy.revision)}
      order by company.id, job.created_at desc, job.updated_at desc, job.id desc
    ), saved_jobs as (
      select job.*, company.id as source_company_id,
        campaign.id as source_campaign_id, prospect.details->>'company' as source_company_name,
        prospect.details->>'domain' as source_company_domain, prospect.id as source_prospect_id
      from outbound_integration_job job
      join active_campaigns campaign on campaign.id = job.input->>'campaignId'
      join outbound_prospect prospect on prospect.id = job.prospect_id
      left join current_companies company on company.prospect_id = prospect.id and company.campaign_id = campaign.id
      where job.provider = 'automation' and job.input->>'operation' = 'savedContactPreparation'
        and job.input->>'campaignRevision' = campaign.revision::text
        and job.input->>'playbookRevision' = ${String(policy.revision)}
    ), latest_jobs as (
      select distinct on (source_campaign_id, source_company_domain) * from (
        select * from provider_jobs union all select * from saved_jobs
      ) jobs order by source_campaign_id, source_company_domain, created_at desc, updated_at desc, id desc
    ), current_jobs as (
      select job.*, exists (
        select 1 from outbound_prospect prospect
        join outbound_integration_job research on research.id = prospect.details->>'shoppingResearchId'
        join outbound_revision approval on approval.prospect_id = prospect.id and approval.revision = prospect.revision
        where job.status = 'complete' and job.output->>'heldReason' is not null
          and prospect.id = coalesce(job.source_prospect_id, company.prospect_id)
          and prospect.campaign_id = job.source_campaign_id
          and prospect.status in ('approved','active') and prospect.approval_hash is not null
          and prospect.playbook_revision = ${policy.revision}
          and approval.content_hash = prospect.approval_hash
          and approval.approved_at is not null and approval.revoked_at is null
          and research.provider = 'automation' and research.status = 'complete'
          and research.prospect_id = prospect.id and research.input->>'operation' = 'leadResearch'
          and research.input->>'prospectId' = prospect.id
          and research.input->>'campaignId' = job.source_campaign_id
          and research.input->>'campaignRevision' = job.input->>'campaignRevision'
          and research.input->>'playbookRevision' = ${String(policy.revision)}
          and research.created_at > job.updated_at and prospect.approved_at >= research.created_at
          and research.output->'details'->>'shoppingResearchId' = research.id
          and research.output->'details'->>'email' = prospect.details->>'email'
          and research.output->'details'->'shoppingFinding' = prospect.details->'shoppingFinding'
          and research.output->'details'->>'evidence' = prospect.details->>'evidence'
          and research.output->'receipt'->'product'->>'url' = prospect.details->>'productUrl'
      ) as recovered
      from latest_jobs job
      left join current_companies company on company.id = job.source_company_id
    )`;
    const researched = policy.settings.requireShoppingEvidence
      ? sql`(recovered or (output->'shoppingReceipt' is not null and (output->'shoppingAssessment'->>'status' = 'researched' or output->'assessment'->>'status' = 'researched')))`
      : sql`output->'qualification'->>'status' = 'qualified'`;

    const [
      totals,
      campaigns,
      work,
      delivery,
      apollo,
      unipile,
      accounts,
      conversations,
      funnel,
    ] = await Promise.all([
      resultifyRead(() =>
        db.execute(sql`${scoped} select
      (select count(*)::int from active_campaigns) as "activeCampaigns",
      (select count(distinct domain)::int from current_companies) as companies,
      (select count(distinct source_company_domain)::int from current_jobs where ${researched}) as insights,
      (select count(distinct prospect.id)::int from current_companies company join outbound_prospect prospect on prospect.id = company.prospect_id) as contacts,
      (select count(distinct prospect.id)::int from current_companies company join outbound_prospect prospect on prospect.id = company.prospect_id where prospect.status in ('approved','active') and prospect.approval_hash is not null) as sequences,
      ((select count(*)::int from outbound_send_attempt where status = 'accepted' and not test and completed_at >= now() - interval '7 days')
        + (select count(*)::int from outbound_conversation_send reply join outbound_conversation thread on thread.id = reply.conversation_id where reply.status = 'accepted' and thread.channel = 'email' and reply.completed_at >= now() - interval '7 days')) as "acceptedEmails",
      ((select count(*)::int from outbound_integration_job where provider = 'linkedin' and status = 'complete' and output->>'providerMessageId' is not null and (output->>'acceptedAt')::timestamptz >= now() - interval '7 days')
        + (select count(*)::int from outbound_conversation_send reply join outbound_conversation thread on thread.id = reply.conversation_id where reply.status = 'accepted' and thread.channel = 'linkedin' and reply.completed_at >= now() - interval '7 days')) as "acceptedLinkedin"`),
      ),
      resultifyRead(() =>
        db.execute(sql`${scoped} select campaign.id, campaign.name,
      (select count(*)::int from current_companies company where company.campaign_id = campaign.id) as companies,
      (select count(*)::int from current_jobs job where job.source_campaign_id = campaign.id and (${researched})) as insights,
      (select count(*)::int from current_companies company join outbound_prospect prospect on prospect.id = company.prospect_id where company.campaign_id = campaign.id) as contacts,
      (select count(*)::int from current_companies company join outbound_prospect prospect on prospect.id = company.prospect_id where company.campaign_id = campaign.id and prospect.status in ('approved','active') and prospect.approval_hash is not null) as sequences,
      (select count(*)::int from current_jobs job where job.source_campaign_id = campaign.id and not job.recovered and (job.status in ('failed','uncertain') or job.output->>'heldReason' is not null)) as held
      from active_campaigns campaign order by campaign.updated_at desc, campaign.id limit 8`),
      ),
      resultifyRead(() =>
        db.execute(sql`${scoped} select id, source_campaign_id as "campaignId", source_company_id as "companyId", source_prospect_id as "prospectId", source_company_name as company,
      coalesce(output->>'stage','') as stage,
      case when output->>'heldReason' is not null then 'failed' else status end as status,
      coalesce(error, output->>'heldReason') as reason from current_jobs
      where not recovered and (status in ('pending','starting','failed','uncertain') or output->>'heldReason' is not null)
      order by case when status = 'starting' then 0 when status = 'pending' then 1 when status = 'uncertain' then 2 else 3 end, updated_at desc limit 8`),
      ),
      Store.automationDeliveryStatus(),
      Credentials.metadata("apollo"),
      Credentials.metadata("unipile"),
      policy.settings.linkedinAccountId
        ? Accounts.find(Environment.SERVER, {
            where: eq(
              schema.outboundLinkedinAccount.id,
              policy.settings.linkedinAccountId,
            ),
            limit: 1,
          })
        : Promise.resolve({ success: true as const, data: [] }),
      Conversations.summary(),
      Funnel.read(policy.revision),
    ]);
    const account = value(accounts)[0];
    return {
      totals: totalsSchema.parse({
        ...value(totals)[0],
        needsReply: value(conversations).needsReply,
        meetings: value(funnel).meetingsHeld,
      }),
      funnel: value(funnel),
      campaigns: z.array(campaignSchema).parse(value(campaigns)),
      work: z.array(workSchema).parse(value(work)),
      setup: {
        automationEnabled: policy.settings.automationEnabled,
        emailEnabled: policy.settings.sendingEnabled,
        linkedinEnabled: policy.settings.linkedinAutomationEnabled,
        apolloConfigured: value(apollo).configured,
        azureConfigured: Boolean(
          process.env.AZURE_RESOURCE_NAME &&
            process.env.AZURE_API_KEY &&
            (process.env.AZURE_DEPLOYMENT_GPT ||
              process.env.AZURE_DEPLOYMENT_GPT4O),
        ),
        linkedinConnected:
          value(unipile).configured &&
          Boolean(account && account.status === "running" && !account.isLocked),
        deliveryBlockers: value(delivery).blockers,
      },
    };
  });
export type Pipeline =
  Awaited<ReturnType<typeof read>> extends Result<infer Data, Error>
    ? Data
    : never;
