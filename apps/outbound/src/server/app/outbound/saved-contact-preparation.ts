import "server-only";
import { randomUUID } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import {
  companyExcluded,
  normalizeDomain,
  type Playbook,
  prospectIssues,
  prospectSchema,
  recipientMailHostAllowed,
} from "@/lib/outbound";
import {
  campaignCountryMatches,
  campaignDomainExcluded,
  candidateExclusion,
} from "@/lib/outbound-campaigns";
import { isExcludedRole, matchesRole } from "@/lib/outbound-roles";
import { resolveSendingWindow } from "@/lib/outbound-scheduling";
import { db, schema, type TransactionScope } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { ConflictError, ValidationError } from "@/server/utils/error";
import * as Qualification from "@/server/utils/outbound/automation-qualification";
import { isGiftCardProductCandidate } from "@/server/utils/outbound/discovery";
import {
  browserClaimInterval,
  browserRetryLimit,
  sessionCreationRateLimit,
} from "@/server/utils/outbound/firecrawl-cooldown";
import { IntegrationError } from "@/server/utils/outbound/http";
import * as Capture from "@/server/utils/outbound/live-shopping";
import { rawCaptureSchema } from "@/server/utils/outbound/live-shopping-contract";
import * as MX from "@/server/utils/outbound/mx";
import * as Location from "@/server/utils/outbound/saved-contact-location";
import { resolveBusinessTimezone } from "@/server/utils/outbound/saved-contact-timezone";
import {
  type PreparationInput,
  type PreparationState,
  paidPreparationStage,
  preparationInputSchema,
  preparationStageBudget,
  preparationStateSchema,
} from "@/server/utils/outbound/saved-preparation-contract";
import {
  shoppingClaimInterval,
  shoppingMinuteRateLimit,
  shoppingPollLimit,
  shoppingPollUrl,
  shoppingQueryUrl,
  shoppingRetryLimit,
} from "@/server/utils/outbound/scrapellm-cooldown";
import * as Assessment from "@/server/utils/outbound/shopping-assessment";
import {
  broaderSearchProblem,
  completedShoppingQuerySchema,
} from "@/server/utils/outbound/shopping-query-history";
import { researchHash } from "@/server/utils/outbound/shopping-research";
import { repository } from "@/server/utils/repository";
import * as LeadResearch from "./lead-research";
import * as Credentials from "./provider-credentials";
import * as Composition from "./sequence-composition";
import { claimShoppingProviderSlot } from "./shopping-provider-pacing";
import * as Store from "./store";

const Jobs = repository(schema.outboundIntegrationJob);
const Prospects = repository(schema.outboundProspect);
const Campaigns = repository(schema.outboundCampaign);
const Companies = repository(schema.outboundCampaignCompany);
const Attempts = repository(schema.outboundSendAttempt);
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
  sql`${schema.outboundIntegrationJob.input}->>'operation' = 'savedContactPreparation'`,
);
const batchSchema = z.object({
  operation: z.literal("savedContactPreparationBatch"),
  campaignId: z.string().uuid(),
  maxQueries: z.number().int().min(1).max(50),
  startsAt: z.string().datetime().optional(),
  requestedBy: z.string().min(1),
});
const budgetSchema = z.object({
  queriesReserved: z.number().int().min(0).max(50).default(0),
  paused: z.boolean().default(false),
  failureProvider: z.string().optional(),
  failureCode: z.string().optional(),
  browserAvailableAt: z.string().datetime().optional(),
  scrapellmAvailableAt: z.string().datetime().optional(),
});
type Job = typeof schema.outboundIntegrationJob.$inferSelect;
type Claim = { job: Job; input: PreparationInput; state: PreparationState };

const companyFor = (prospect: typeof schema.outboundProspect.$inferSelect) => ({
  id: prospect.companyId,
  name: prospect.details.company,
  domain: normalizeDomain(prospect.details.domain),
  website:
    prospect.details.website ||
    `https://${normalizeDomain(prospect.details.domain)}`,
  country: prospect.details.country,
  platform: ["shopify", "woocommerce"].includes(prospect.details.platform)
    ? (prospect.details.platform as "shopify" | "woocommerce")
    : null,
  teamSize: null,
  annualRevenue: null,
  source: "saved" as const,
  sourceId: prospect.id,
  sourcePayload: {
    originalSource: prospect.details.source,
    originalImportAt: prospect.createdAt.toISOString(),
  },
});

const discoveryQueryProblem = (
  state: PreparationState,
  details: typeof schema.outboundProspect.$inferSelect.details,
  company: ReturnType<typeof companyFor>,
  settings: Playbook,
) => {
  if (!state.query || !state.query.intent?.startsWith("unbranded-"))
    return "A validated unbranded shopper question is required before research spending.";
  if (state.productCapture?.status !== "captured")
    return "The shopper question needs a saved rendered product page.";
  if (state.query.intent === "unbranded-broad") {
    const previous = state.shoppingHistory?.[0];
    const problem = broaderSearchProblem(previous, Date.now(), settings);
    if (problem) return problem;
    if (
      researchHash(state.query.product) !==
      researchHash(previous?.query.product)
    )
      return "The broader search must use the product from the completed first search.";
  }
  return Capture.validateShopperQuery({
    query: state.query,
    product: { name: details.product, url: details.productUrl },
    category: details.productCategory,
    merchant: { name: company.name, domain: company.domain },
    browser: state.productCapture,
    discoveryFreshnessDays: settings.discoveryFreshnessDays,
  });
};

/** This is checked before every stage, including each paid call and local write. */
const eligible = async (
  transaction: TransactionScope,
  input: PreparationInput,
  state: PreparationState,
) => {
  const policy = await Store.policy(transaction);
  const prospect = value(
    await Prospects.get(Environment.SERVER, input.prospectId, {
      tx: transaction,
    }),
  );
  const campaign = value(
    await Campaigns.get(Environment.SERVER, input.campaignId, {
      tx: transaction,
    }),
  );
  if (
    !policy.settings.automationEnabled ||
    !policy.settings.trustSavedContactVerification
  )
    throw new ConflictError(
      "Saved contact preparation is paused in the Playbook.",
    );
  if (
    !prospect ||
    prospect.revision !== state.prospectRevision ||
    prospect.sentStep ||
    !["candidate", "draft"].includes(prospect.status) ||
    !["", "playbookChanged"].includes(prospect.holdReason)
  )
    throw new ConflictError(
      "The saved contact changed, was held, or already entered outreach.",
    );
  if (
    campaign?.status !== "active" ||
    campaign.revision !== input.campaignRevision ||
    policy.revision !== input.playbookRevision ||
    (prospect.campaignId && prospect.campaignId !== campaign.id)
  )
    throw new ConflictError(
      "The campaign or Playbook changed; review this preparation before continuing.",
    );
  const details = prospect.details;
  if (
    [
      "qualify",
      "applyCompany",
      "renderedProduct",
      "generateQuery",
      "query",
      "poll",
      "browser",
      "assess",
      "applyResearch",
      "draft",
      "applyDraft",
    ].includes(state.stage) &&
    !resolveSendingWindow(
      {
        timezone: state.timezone?.timezone ?? details.timezone,
        country: details.country,
      },
      policy.settings,
    )
  )
    throw new ConflictError("The contact has no enabled sending window.");
  const contact = prospectIssues(details, policy.settings).find((issue) =>
    [
      "domainInvalid",
      "emailDomainMismatch",
      "excludedCompany",
      "relationshipExcluded",
      "countryHeld",
      "emailUnverified",
      "sharedInbox",
      "roleUnverified",
      "roleExcluded",
      "roleOutsideTarget",
    ].includes(issue.code),
  );
  if (contact)
    throw new ValidationError(
      `Saved contact is not eligible: ${contact.code}.`,
    );
  if (
    !campaignCountryMatches(campaign.criteria.countries, details.country) ||
    campaignDomainExcluded(campaign.criteria, details.domain) ||
    companyExcluded(policy.settings, details.company) ||
    isExcludedRole(details.title, campaign.criteria.excludedRoles) ||
    !campaign.criteria.targetRoles.some((role) =>
      matchesRole(details.title, role),
    )
  )
    throw new ValidationError(
      "The saved contact does not match this campaign.",
    );
  await Store.assertAutomaticContactEvidence(transaction, prospect);
  const reserved = value(
    await Companies.find(
      Environment.SERVER,
      {
        where: and(
          eq(
            schema.outboundCampaignCompany.domain,
            normalizeDomain(details.domain),
          ),
          sql`((${schema.outboundCampaignCompany.campaignId} = ${campaign.id} and ${schema.outboundCampaignCompany.status} = 'excluded' and not (${schema.outboundCampaignCompany.reason} = 'existingProspect' and (${schema.outboundCampaignCompany.prospectId} is null or ${schema.outboundCampaignCompany.prospectId} = ${prospect.id}) and exists (select 1 from outbound_company original where original.id = ${prospect.companyId} and original.domain = ${schema.outboundCampaignCompany.domain}))) or (${schema.outboundCampaignCompany.campaignId} <> ${campaign.id} and ${schema.outboundCampaignCompany.status} in ('candidate', 'added')))`,
        ),
        limit: 1,
      },
      { tx: transaction },
    ),
  )[0];
  if (reserved)
    throw new ConflictError(
      "This company is excluded here or reserved by another campaign.",
    );
  if (
    state.stage !== "preflight" &&
    state.mx &&
    (!recipientMailHostAllowed(state.mx.provider, policy.settings) ||
      !state.mx.records.length)
  )
    throw new ConflictError(
      "The saved contact's mail host is not enabled in the current Playbook.",
    );
  if (
    state.stage !== "preflight" &&
    (!state.mx || Date.now() - Date.parse(state.mx.checkedAt) >= 86_400_000)
  )
    throw new ConflictError(
      "The saved contact's live MX receipt needs to be checked again.",
    );
  const context = value(
    await Store.getEnrichmentContext(prospect.id, transaction),
  );
  if (context.suppressed)
    throw new ConflictError("This person or company is suppressed.");
  if (
    value(
      await Attempts.find(
        Environment.SERVER,
        {
          where: eq(schema.outboundSendAttempt.prospectId, prospect.id),
          limit: 1,
        },
        { tx: transaction },
      ),
    ).length
  )
    throw new ConflictError(
      "An existing delivery attempt must be reconciled first.",
    );
  if (
    value(
      await Jobs.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundIntegrationJob.provider, "linkedin"),
            eq(schema.outboundIntegrationJob.prospectId, prospect.id),
          ),
          limit: 1,
        },
        { tx: transaction },
      ),
    ).length
  )
    throw new ConflictError(
      "This contact already has a LinkedIn outreach attempt.",
    );
  const other = value(
    await Prospects.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundProspect.companyId, prospect.companyId),
          ne(schema.outboundProspect.id, prospect.id),
          sql`(${schema.outboundProspect.sentStep} > 0 or ${schema.outboundProspect.status} in ('approved', 'scheduled', 'replied', 'optedOut', 'bounced'))`,
        ),
        limit: 1,
      },
      { tx: transaction },
    ),
  )[0];
  if (other)
    throw new ConflictError(
      "Another contact at this company already has outreach activity.",
    );
  return { policy, prospect, campaign, company: companyFor(prospect) };
};

export const enqueueSchema = z
  .object({
    batchId: z.string().uuid(),
    campaignId: z.string().uuid(),
    prospects: z.array(z.string().uuid()).min(1).max(200),
    maxQueries: z.number().int().min(1).max(50),
    startsAt: z
      .string()
      .datetime({ offset: true })
      .transform((timestamp) => new Date(timestamp).toISOString())
      .optional(),
  })
  .strict();

/** Explicit opt-in only. Original prospect IDs and verification dates are retained. */
export const enqueue = (actor: string, input: z.infer<typeof enqueueSchema>) =>
  resultify(async () => {
    const parsed = enqueueSchema.parse(input);
    value(
      await transaction(async (transaction) => {
        const existing = value(
          await Jobs.get(Environment.SERVER, parsed.batchId, {
            tx: transaction,
          }),
        );
        const settings = batchSchema.parse({
          operation: "savedContactPreparationBatch",
          campaignId: parsed.campaignId,
          maxQueries: parsed.maxQueries,
          startsAt: parsed.startsAt,
          requestedBy: actor,
        });
        if (existing) {
          const prior = batchSchema.parse(existing.input);
          if (
            prior.campaignId !== settings.campaignId ||
            prior.maxQueries !== settings.maxQueries ||
            prior.startsAt !== settings.startsAt
          )
            throw new ConflictError(
              "The preparation batch already has different settings.",
            );
          return;
        }
        value(
          await Jobs.create(
            Environment.SERVER,
            {
              id: parsed.batchId,
              provider: "automation",
              requestId: `saved-contact-batch:${parsed.batchId}`,
              status: "complete",
              input: settings,
              output: { queriesReserved: 0, paused: false },
            },
            { tx: transaction },
          ),
        );
      }),
    );
    const results: {
      prospectId: string;
      jobId?: string;
      repeated?: boolean;
      error?: string;
    }[] = [];
    for (const prospectId of [...new Set(parsed.prospects)]) {
      const saved = await resultify(async () => {
        const existing = value(
          await Jobs.find(Environment.SERVER, {
            where: eq(
              schema.outboundIntegrationJob.requestId,
              `saved-contact-preparation:${prospectId}`,
            ),
            limit: 1,
          }),
        )[0];
        if (existing) return { prospectId, jobId: existing.id, repeated: true };
        const prospect = value(await Store.readProspect(prospectId));
        if (!prospect) throw new ValidationError("Saved contact not found.");
        const trusted = value(
          await Store.trustSavedContact(actor, {
            prospect: prospectId,
            revision: prospect.revision,
          }),
        );
        return value(
          await transaction(async (transaction) => {
            const policy = await Store.policy(transaction);
            const campaign = value(
              await Campaigns.get(Environment.SERVER, parsed.campaignId, {
                tx: transaction,
              }),
            );
            if (!campaign) throw new ValidationError("Campaign not found.");
            const claim = preparationInputSchema.parse({
              operation: "savedContactPreparation",
              batchId: parsed.batchId,
              prospectId,
              campaignId: campaign.id,
              campaignRevision: campaign.revision,
              playbookRevision: policy.revision,
              requestedBy: actor,
            });
            const state = preparationStateSchema.parse({
              stage: "preflight",
              prospectRevision: trusted.revision,
              availableAt: parsed.startsAt ?? new Date().toISOString(),
              lease: null,
            });
            const context = await eligible(transaction, claim, state);
            const duplicate = value(
              await Jobs.find(
                Environment.SERVER,
                {
                  where: and(
                    scope,
                    sql`${schema.outboundIntegrationJob.prospectId} in (select id from outbound_prospect where company_id = ${context.prospect.companyId})`,
                  ),
                  limit: 1,
                },
                { tx: transaction },
              ),
            )[0];
            if (duplicate)
              throw new ConflictError(
                "This company already has a saved contact preparation. Reuse its existing job.",
              );
            const job = value(
              await Jobs.create(
                Environment.SERVER,
                {
                  provider: "automation",
                  prospectId,
                  requestId: `saved-contact-preparation:${prospectId}`,
                  status: "pending",
                  input: claim,
                  output: state,
                },
                { tx: transaction },
              ),
            );
            return { prospectId, jobId: job.id, repeated: false };
          }),
        );
      });
      results.push(
        saved.success ? saved.data : { prospectId, error: saved.error.message },
      );
    }
    return {
      batchId: parsed.batchId,
      maxQueries: parsed.maxQueries,
      startsAt: parsed.startsAt,
      results,
    };
  });

const claim = (deadline: number, batchId?: string) =>
  transaction(async (transaction) => {
    const policy = await Store.policy(transaction);
    if (
      !policy.settings.automationEnabled ||
      !policy.settings.trustSavedContactVerification
    )
      return null;
    // Scheduling needs small metadata; raw captures are loaded only for the chosen job.
    // Repository.find cannot project JSONB fields, so this read uses a narrow projection.
    const jobs = await transaction
      .select({
        id: schema.outboundIntegrationJob.id,
        status: schema.outboundIntegrationJob.status,
        input: schema.outboundIntegrationJob.input,
        output: sql<
          Record<string, unknown>
        >`${schema.outboundIntegrationJob.output} - ARRAY['companyEvidence','locationReceipts','qualification','query','productCapture','shoppingHistory','unpaidExactQuery','shoppingJob','answer','browser','assessment','shoppingReceipt','collection','failureReceipt','originalQualification','originalCollection','originalLocation','originalQualificationCollection','originalGiftNavigationCollection']::text[]`,
      })
      .from(schema.outboundIntegrationJob)
      .where(
        and(
          scope,
          sql`${schema.outboundIntegrationJob.status} in ('pending', 'starting')`,
          sql`(${schema.outboundIntegrationJob.status} = 'starting' or (${schema.outboundIntegrationJob.output}->>'availableAt')::timestamptz <= ${new Date().toISOString()}::timestamptz)`,
          ...(batchId
            ? [
                sql`${schema.outboundIntegrationJob.input}->>'batchId' = ${batchId}`,
              ]
            : []),
        ),
      )
      .orderBy(asc(schema.outboundIntegrationJob.updatedAt))
      .limit(200);
    const batches = new Map<
      string,
      {
        settings: z.infer<typeof batchSchema>;
        budget: z.infer<typeof budgetSchema>;
      }
    >();
    for (const job of jobs) {
      const input = preparationInputSchema.parse(job.input);
      const state = preparationStateSchema.parse(job.output);
      if (
        job.status === "starting" &&
        state.lease &&
        Date.parse(state.lease.expiresAt) > Date.now()
      )
        continue;
      if (job.status === "starting" && paidPreparationStage(state.stage)) {
        value(
          await Jobs.update(
            Environment.SERVER,
            job.id,
            {
              status: "uncertain",
              error:
                "The paid stage lost its lease. Reconcile the existing receipt before any retry.",
              updatedAt: new Date(),
            },
            { tx: transaction },
          ),
        );
        continue;
      }
      if (
        Date.parse(state.availableAt) > Date.now() ||
        Date.now() + preparationStageBudget(state.stage) > deadline
      )
        continue;
      if (!batches.has(input.batchId)) {
        const batch = value(
          await Jobs.get(Environment.SERVER, input.batchId, {
            tx: transaction,
          }),
        );
        batches.set(input.batchId, {
          settings: batchSchema.parse(batch?.input),
          budget: budgetSchema.parse(batch?.output),
        });
      }
      // The workspace lock keeps this snapshot stable; a budget write returns immediately.
      const { settings, budget } = batches.get(input.batchId)!;
      // The batch barrier survives a retry that makes an individual stage available early.
      if (settings.startsAt && Date.parse(settings.startsAt) > Date.now())
        continue;
      const savedAnswerMayContinue =
        budget.paused &&
        budget.failureProvider === "scrapellm" &&
        ["browser", "assess", "draft"].includes(state.stage);
      if (
        budget.paused &&
        paidPreparationStage(state.stage) &&
        !savedAnswerMayContinue
      )
        continue;
      if (
        ["query", "poll"].includes(state.stage) &&
        budget.scrapellmAvailableAt &&
        Date.parse(budget.scrapellmAvailableAt) > Date.now()
      )
        continue;
      if (
        ["browser", "renderedProduct"].includes(state.stage) &&
        budget.browserAvailableAt &&
        Date.parse(budget.browserAvailableAt) > Date.now()
      )
        continue;
      const ready = await resultify(() => eligible(transaction, input, state));
      if (!ready.success) {
        value(
          await Jobs.update(
            Environment.SERVER,
            job.id,
            {
              status: "failed",
              error: ready.error.message,
              updatedAt: new Date(),
            },
            { tx: transaction },
          ),
        );
        continue;
      }
      const selected = value(
        await Jobs.get(Environment.SERVER, job.id, { tx: transaction }),
      );
      if (!selected)
        throw new ConflictError("The preparation job disappeared.");
      const saved = preparationStateSchema.parse(selected.output);
      if (savedAnswerMayContinue && !hasAcceptedShoppingAnswer(saved)) continue;
      const rejectedQueryMayRetry = hasRejectedQueryRetry(saved);
      // A previously prepared exact-name question has not earned permission to spend.
      // Existing reserved submissions and captured answers retain their original route.
      if (
        saved.stage === "query" &&
        !saved.queryReservedAt &&
        !saved.shoppingJob &&
        !saved.answer &&
        !["unbranded-specific", "unbranded-broad"].includes(
          saved.query?.intent ?? "",
        )
      ) {
        const { query: unpaidExactQuery, ...retained } = saved;
        value(
          await Jobs.update(
            Environment.SERVER,
            job.id,
            {
              output: {
                ...retained,
                unpaidExactQuery,
                shoppingQueryIntent: "unbranded-specific",
                shoppingQueryCount: saved.shoppingQueryCount ?? 0,
                stage:
                  saved.productCapture?.status === "captured"
                    ? "generateQuery"
                    : "renderedProduct",
                lease: null,
                availableAt: new Date().toISOString(),
              },
              updatedAt: new Date(),
            },
            { tx: transaction },
          ),
        );
        continue;
      }
      if (saved.stage === "query" && !saved.queryReservedAt) {
        const problem = discoveryQueryProblem(
          saved,
          ready.data.prospect.details,
          ready.data.company,
          ready.data.policy.settings,
        );
        const count = saved.shoppingQueryCount ?? 0;
        const repeated =
          saved.query?.intent === "unbranded-specific"
            ? count !== 0
            : count !== 1;
        if (
          problem ||
          repeated ||
          count >= ready.data.policy.settings.searchesPerLead
        ) {
          value(
            await Jobs.update(
              Environment.SERVER,
              job.id,
              {
                status: "complete",
                output: {
                  ...saved,
                  stage: "complete",
                  lease: null,
                  heldReason:
                    problem ??
                    "The saved per-lead search count does not permit another query.",
                },
                updatedAt: new Date(),
              },
              { tx: transaction },
            ),
          );
          continue;
        }
      }
      if (
        state.stage === "query" &&
        !rejectedQueryMayRetry &&
        (state.queryReservedAt || budget.queriesReserved >= settings.maxQueries)
      ) {
        if (state.queryReservedAt)
          value(
            await Jobs.update(
              Environment.SERVER,
              job.id,
              {
                status: "uncertain",
                error:
                  "A shopping query was already reserved. Reconcile that submission before continuing.",
                updatedAt: new Date(),
              },
              { tx: transaction },
            ),
          );
        continue;
      }
      if (
        ["query", "poll"].includes(state.stage) &&
        !(await claimShoppingProviderSlot(transaction))
      )
        continue;
      const next = preparationStateSchema.parse({
        ...saved,
        lease: {
          token: randomUUID(),
          expiresAt: new Date(Date.now() + 180_000).toISOString(),
        },
        ...(state.stage === "query"
          ? {
              queryReservedAt:
                saved.queryReservedAt ?? new Date().toISOString(),
              queryRetryPending: false,
              ...(saved.query?.intent?.startsWith("unbranded-")
                ? {
                    shoppingQueryCount:
                      (saved.shoppingQueryCount ?? 0) +
                      (rejectedQueryMayRetry ? 0 : 1),
                  }
                : {}),
            }
          : {}),
      });
      if (["query", "poll", "browser", "renderedProduct"].includes(state.stage))
        value(
          await Jobs.update(
            Environment.SERVER,
            input.batchId,
            {
              output: {
                ...budget,
                ...(state.stage === "query"
                  ? {
                      queriesReserved:
                        budget.queriesReserved +
                        (rejectedQueryMayRetry ? 0 : 1),
                    }
                  : {}),
                ...(["query", "poll"].includes(state.stage)
                  ? {
                      scrapellmAvailableAt: new Date(
                        Date.now() + shoppingClaimInterval,
                      ).toISOString(),
                    }
                  : {}),
                ...(["browser", "renderedProduct"].includes(state.stage)
                  ? {
                      browserAvailableAt: new Date(
                        Date.now() + browserClaimInterval,
                      ).toISOString(),
                    }
                  : {}),
              },
              updatedAt: new Date(),
            },
            { tx: transaction },
          ),
        );
      value(
        await Jobs.update(
          Environment.SERVER,
          job.id,
          {
            status: "starting",
            output: next,
            error: null,
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      );
      return { job: selected, input, state: next } satisfies Claim;
    }
    return null;
  });

const owned = async (transaction: TransactionScope, claim: Claim) => {
  const job = value(
    await Jobs.get(Environment.SERVER, claim.job.id, { tx: transaction }),
  );
  const state = preparationStateSchema.parse(job?.output);
  if (
    job?.status !== "starting" ||
    state.lease?.token !== claim.state.lease?.token ||
    !state.lease ||
    Date.parse(state.lease.expiresAt) <= Date.now() ||
    state.stage !== claim.state.stage
  )
    throw new ConflictError("The saved contact preparation lease changed.");
  return state;
};
const checkpoint = (
  claim: Claim,
  patch: Partial<PreparationState>,
  status: "pending" | "complete" = "pending",
) =>
  transaction(async (transaction) => {
    const state = await owned(transaction, claim);
    // Keep provider receipts even if a reply or hold arrived during the external call.
    const ready = await resultify(() =>
      eligible(transaction, claim.input, state),
    );
    value(
      await Jobs.update(
        Environment.SERVER,
        claim.job.id,
        {
          status: ready.success ? status : "failed",
          output: preparationStateSchema.parse({
            ...state,
            ...patch,
            lease: null,
          }),
          error: ready.success ? null : ready.error.message,
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
  });
const hasAcceptedShoppingAnswer = (state: PreparationState) =>
  Boolean(
    state.queryReservedAt &&
      state.query &&
      state.shoppingJob &&
      state.answer &&
      researchHash(state.shoppingJob) === researchHash(state.answer.job) &&
      researchHash(state.query) === researchHash(state.shoppingJob.query),
  );
const hasSavedBrowserAnswer = (state: PreparationState) =>
  state.stage === "browser" &&
  hasAcceptedShoppingAnswer(state) &&
  !state.browser &&
  !state.shoppingReceipt &&
  !state["assessment"];
const hasUncapturedProduct = (state: PreparationState) =>
  state.stage === "renderedProduct" &&
  !state.productCapture &&
  !state.queryReservedAt &&
  !state.shoppingJob &&
  !state.answer;
const hasUnacceptedQuery = (state: PreparationState) =>
  state.stage === "query" &&
  Boolean(state.queryReservedAt && state.query) &&
  !state.shoppingJob &&
  !state.answer &&
  !state.browser &&
  !state.shoppingReceipt &&
  !state["assessment"] &&
  state.polls === 0 &&
  state.pollRateLimits.length === 0;
const hasRejectedQueryRetry = (state: PreparationState) => {
  const last = state.queryRateLimits.at(-1);
  const failure = z
    .object({ response: rawCaptureSchema })
    .safeParse(state["failureReceipt"]);
  return Boolean(
    hasUnacceptedQuery(state) &&
      state.queryRetryPending &&
      state.queryRetries > 0 &&
      state.queryRetries <= shoppingRetryLimit &&
      state.queryRateLimits.length === state.queryRetries &&
      last &&
      state.query &&
      failure.success &&
      shoppingMinuteRateLimit(last, shoppingQueryUrl(state.query)) &&
      researchHash(last.response) === researchHash(failure.data.response),
  );
};
const fail = (claim: Claim, error: Error) =>
  transaction(async (transaction) => {
    const state = await owned(transaction, claim);
    const provider = error instanceof IntegrationError ? error : null;
    const queryMayRetry =
      hasUnacceptedQuery(state) && state.queryRetries < shoppingRetryLimit;
    const pollMayRetry =
      state.stage === "poll" &&
      state.polls < shoppingPollLimit &&
      state.shoppingJob &&
      state.query &&
      !state.answer &&
      researchHash(state.shoppingJob.query) === researchHash(state.query);
    const retryUrl =
      queryMayRetry && state.query
        ? shoppingQueryUrl(state.query)
        : pollMayRetry && state.shoppingJob
          ? shoppingPollUrl(state.shoppingJob)
          : null;
    const shoppingCooldown =
      provider?.provider === "scrapellm" &&
      provider.code === "rate-limit" &&
      retryUrl
        ? shoppingMinuteRateLimit(
            provider.receipt,
            retryUrl,
            provider.retryAfterSeconds,
          )
        : null;
    if (shoppingCooldown) {
      const ready = await resultify(() =>
        eligible(transaction, claim.input, state),
      );
      value(
        await Jobs.update(
          Environment.SERVER,
          claim.job.id,
          {
            status: ready.success ? "pending" : "failed",
            error: ready.success
              ? "ScrapeLLM reached its minute limit; waiting to resume the same research request."
              : ready.error.message,
            output: preparationStateSchema.parse({
              ...state,
              lease: null,
              availableAt: shoppingCooldown.retryAt,
              ...(queryMayRetry
                ? {
                    queryRetries: state.queryRetries + 1,
                    queryRetryPending: true,
                    queryRateLimits: [
                      ...state.queryRateLimits,
                      shoppingCooldown,
                    ],
                  }
                : {
                    polls: state.polls + 1,
                    pollRateLimits: [...state.pollRateLimits, shoppingCooldown],
                  }),
              failureProvider: provider?.provider,
              failureCode: provider?.code,
              failureReceipt: provider?.receipt,
            }),
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      );
      if (ready.success) {
        const batch = value(
          await Jobs.get(Environment.SERVER, claim.input.batchId, {
            tx: transaction,
          }),
        );
        const budget = budgetSchema.parse(batch?.output);
        value(
          await Jobs.update(
            Environment.SERVER,
            claim.input.batchId,
            {
              output: {
                ...budget,
                scrapellmAvailableAt: new Date(
                  Math.max(
                    Date.parse(budget.scrapellmAvailableAt ?? "1970-01-01"),
                    Date.parse(shoppingCooldown.retryAt),
                  ),
                ).toISOString(),
              },
              updatedAt: new Date(),
            },
            { tx: transaction },
          ),
        );
      }
      return;
    }
    const productPreflight = hasUncapturedProduct(state);
    const browserRetries = productPreflight
      ? (state.productBrowserRetries ?? 0)
      : state.browserRetries;
    const cooldown =
      provider?.provider === "firecrawl" &&
      provider.code === "rate-limit" &&
      (hasSavedBrowserAnswer(state) || productPreflight) &&
      browserRetries < browserRetryLimit
        ? sessionCreationRateLimit(
            provider.receipt,
            provider.retryAfterSeconds,
            browserRetries,
          )
        : null;
    if (cooldown) {
      const ready = await resultify(() =>
        eligible(transaction, claim.input, state),
      );
      value(
        await Jobs.update(
          Environment.SERVER,
          claim.job.id,
          {
            status: ready.success ? "pending" : "failed",
            error: ready.success
              ? "Firecrawl browser creation was rate limited; waiting to resume the saved research stage."
              : ready.error.message,
            output: preparationStateSchema.parse({
              ...state,
              lease: null,
              availableAt: cooldown.retryAt,
              ...(productPreflight
                ? {
                    productBrowserRetries: browserRetries + 1,
                    productBrowserRateLimits: [
                      ...(state.productBrowserRateLimits ?? []),
                      cooldown,
                    ],
                  }
                : {
                    browserRetries: browserRetries + 1,
                    browserRateLimits: [...state.browserRateLimits, cooldown],
                  }),
              failureProvider: provider?.provider,
              failureCode: provider?.code,
              failureReceipt: provider?.receipt,
            }),
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      );
      if (ready.success) {
        const batch = value(
          await Jobs.get(Environment.SERVER, claim.input.batchId, {
            tx: transaction,
          }),
        );
        const budget = budgetSchema.parse(batch?.output);
        value(
          await Jobs.update(
            Environment.SERVER,
            claim.input.batchId,
            {
              output: {
                ...budget,
                browserAvailableAt: new Date(
                  Math.max(
                    Date.parse(budget.browserAvailableAt ?? "1970-01-01"),
                    Date.parse(cooldown.retryAt),
                  ),
                ).toISOString(),
              },
              updatedAt: new Date(),
            },
            { tx: transaction },
          ),
        );
      }
      return;
    }
    const uncertain =
      provider?.code === "uncertain" ||
      (!provider &&
        paidPreparationStage(state.stage) &&
        !(
          state.stage === "draft" &&
          (error.name === ValidationError.errorName ||
            error.name === ConflictError.errorName)
        ));
    value(
      await Jobs.update(
        Environment.SERVER,
        claim.job.id,
        {
          status: uncertain ? "uncertain" : "failed",
          error: error.message,
          output: {
            ...state,
            lease: null,
            ...(provider
              ? {
                  failureProvider: provider.provider,
                  failureCode: provider.code,
                  failureReceipt: provider.receipt,
                }
              : {}),
          },
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    if (
      provider &&
      ["quota", "access", "rate-limit", "configuration"].includes(provider.code)
    ) {
      const batch = value(
        await Jobs.get(Environment.SERVER, claim.input.batchId, {
          tx: transaction,
        }),
      );
      const budget = budgetSchema.parse(batch?.output);
      value(
        await Jobs.update(
          Environment.SERVER,
          claim.input.batchId,
          {
            output: {
              ...budget,
              paused: true,
              failureProvider: provider.provider,
              failureCode: provider.code,
            },
            error: provider.message,
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      );
    }
  });

const key = async (
  provider: "scrapellm" | "firecrawl",
  resolve: typeof Credentials.resolveKey,
) => {
  const saved = value(await resolve(provider));
  if (!saved)
    throw new IntegrationError(
      provider,
      "configuration",
      `Save ${provider} credentials before research.`,
      409,
    );
  return saved;
};
type Dependencies = {
  mx?: typeof MX.check;
  collect?: typeof Qualification.collectCompanyEvidence;
  location?: typeof Location.collectLocationReceipts;
  qualify?: typeof Qualification.qualifyCompanyEvidence;
  inspectProduct?: typeof Capture.inspectProduct;
  generateQuery?: typeof Capture.generateShopperQuery;
  start?: typeof Capture.startQuery;
  poll?: typeof Capture.pollQuery;
  browse?: typeof Capture.inspectPages;
  assess?: typeof Assessment.assess;
  resolveKey?: typeof Credentials.resolveKey;
  compose?: typeof Composition.composeForProspect;
};

const execute = async (
  claim: Claim,
  deadline: number,
  dependencies: Dependencies,
) => {
  const state = claim.state;
  const context = value(
    await transaction(async (transaction) => {
      await owned(transaction, claim);
      return eligible(transaction, claim.input, state);
    }),
  );
  const { prospect, campaign, company, policy } = context;
  const qualification = {
    campaign,
    company,
    playbook: policy.settings,
    deadline,
  };
  const next = (
    stage: PreparationState["stage"],
    patch: Partial<PreparationState> = {},
  ) =>
    checkpoint(claim, {
      stage,
      availableAt: new Date().toISOString(),
      ...patch,
    });
  if (
    ["applyResearch", "draft", "applyDraft"].includes(state.stage) &&
    state.shoppingReceipt &&
    ["product-observation", "no-gap"].includes(
      state.shoppingReceipt.selected.kind,
    )
  )
    return checkpoint(
      claim,
      {
        stage: "complete",
        heldReason:
          state.shoppingReceipt.selected.kind === "no-gap"
            ? "No gap found. Keep this lead for another product or season."
            : "needs-unbranded-search",
      },
      "complete",
    );
  switch (state.stage) {
    case "preflight": {
      const mx = value(
        await (dependencies.mx ?? MX.check)(prospect.details.email),
      );
      if (
        !recipientMailHostAllowed(mx.provider, policy.settings) ||
        !mx.records.length
      )
        throw new ValidationError(
          "The saved email has no eligible live mail route.",
        );
      return next("collect", { mx });
    }
    case "collect": {
      const evidence = value(
        await (dependencies.collect ?? Qualification.collectCompanyEvidence)(
          qualification,
        ),
      );
      if ("status" in evidence)
        return checkpoint(
          claim,
          {
            collection: evidence,
            lease: null,
            heldReason: evidence.reason,
            stage: "complete",
          },
          "complete",
        );
      const timezone = resolveBusinessTimezone(
        evidence.receipts,
        company.domain,
      );
      const window = resolveSendingWindow(
        {
          timezone: timezone?.timezone ?? prospect.details.timezone,
          country: prospect.details.country,
        },
        policy.settings,
      );
      return next(window ? "qualify" : "location", {
        companyEvidence: evidence,
        ...(timezone ? { timezone } : {}),
      });
    }
    case "location": {
      const receipts = value(
        await (dependencies.location ?? Location.collectLocationReceipts)({
          website: company.website,
          deadline,
          existing: state.companyEvidence?.receipts ?? [],
        }),
      );
      const timezone = resolveBusinessTimezone(receipts, company.domain);
      if (!timezone && !resolveSendingWindow(prospect.details, policy.settings))
        return checkpoint(
          claim,
          {
            locationReceipts: receipts,
            stage: "complete",
            heldReason:
              "No unambiguous public business address was found for local sending hours.",
          },
          "complete",
        );
      return next("qualify", {
        locationReceipts: receipts,
        ...(timezone ? { timezone } : {}),
      });
    }
    case "qualify": {
      const evidence = Qualification.companyEvidenceSchema.parse(
        state.companyEvidence,
      );
      const result = value(
        await (dependencies.qualify ?? Qualification.qualifyCompanyEvidence)({
          ...qualification,
          evidence,
        }),
      );
      return result.status === "qualified"
        ? next("applyCompany", { qualification: result })
        : checkpoint(
            claim,
            {
              qualification: result,
              stage: "complete",
              heldReason: result.reason,
            },
            "complete",
          );
    }
    case "applyCompany":
      return transaction(async (transaction) => {
        await owned(transaction, claim);
        const current = await eligible(transaction, claim.input, state);
        const evidence = Qualification.companyEvidenceSchema.parse(
          state.companyEvidence,
        );
        const qualified = state.qualification as
          | Extract<Qualification.Qualification, { status: "qualified" }>
          | undefined;
        const window = resolveSendingWindow(
          {
            timezone:
              state.timezone?.timezone ?? current.prospect.details.timezone,
            country: current.prospect.details.country,
          },
          current.policy.settings,
        );
        if (qualified?.status !== "qualified" || !state.mx || !window)
          throw new ValidationError(
            "Public qualification, MX, or business location receipts are missing.",
          );
        if (
          candidateExclusion(campaign.criteria, {
            ...company,
            platform: evidence.platform,
          })
        )
          throw new ValidationError(
            "The public company evidence does not meet the campaign criteria.",
          );
        const existing = value(
          await Companies.find(
            Environment.SERVER,
            {
              where: and(
                eq(schema.outboundCampaignCompany.campaignId, campaign.id),
                eq(schema.outboundCampaignCompany.domain, company.domain),
              ),
              limit: 1,
            },
            { tx: transaction },
          ),
        )[0];
        if (existing?.prospectId && existing.prospectId !== prospect.id)
          throw new ConflictError(
            "This company already belongs to another campaign prospect.",
          );
        const record = {
          campaignId: campaign.id,
          domain: company.domain,
          name: company.name,
          website: company.website,
          country: company.country,
          platform: evidence.platform,
          source: existing?.source ?? ("saved" as const),
          sourceId: existing?.sourceId ?? prospect.id,
          sourcePayload: {
            ...company.sourcePayload,
            ...existing?.sourcePayload,
            preparationJobId: claim.job.id,
            businessHours: state.timezone ?? {
              ...window,
              basis: "chosen-sending-window",
            },
          },
          status: "added" as const,
          reason: "",
          prospectId: prospect.id,
          criteriaRevision: campaign.revision,
          updatedAt: new Date(),
        };
        if (existing)
          value(
            await Companies.update(Environment.SERVER, existing.id, record, {
              tx: transaction,
            }),
          );
        else
          value(
            await Companies.create(Environment.SERVER, record, {
              tx: transaction,
            }),
          );
        // Verification identity/source and its original dates remain bound to the imported contact.
        const details = prospectSchema.parse({
          ...current.prospect.details,
          id: prospect.id,
          campaignId: campaign.id,
          platform: evidence.platform,
          product: evidence.product.name,
          productUrl: evidence.product.url,
          productCategory: qualified.details.productCategory,
          legitEvidence: qualified.details.legitEvidence,
          productInsight: qualified.details.productInsight,
          personalLine: "",
          personalSource: "",
          personalPublishedAt: "",
          personalCheckedAt: "",
          mxProvider: state.mx.provider,
          mxCheckedAt: state.mx.checkedAt,
          timezone:
            state.timezone?.timezone ?? current.prospect.details.timezone,
        });
        const saved = await Store.saveProspectWithin(
          transaction,
          claim.input.requestedBy,
          details,
        );
        value(
          await Prospects.update(
            Environment.SERVER,
            prospect.id,
            { campaignId: campaign.id, updatedAt: new Date() },
            { tx: transaction },
          ),
        );
        value(
          await Jobs.update(
            Environment.SERVER,
            claim.job.id,
            {
              status: "pending",
              output: {
                ...state,
                stage: "renderedProduct",
                prospectRevision: saved.revision,
                shoppingQueryIntent: "unbranded-specific",
                shoppingQueryCount: 0,
                lease: null,
                availableAt: new Date().toISOString(),
              },
              updatedAt: new Date(),
            },
            { tx: transaction },
          ),
        );
      });
    case "renderedProduct": {
      if (state.productCapture?.status === "captured")
        return next("generateQuery");
      const capture = value(
        await (dependencies.inspectProduct ?? Capture.inspectProduct)({
          apiKey: await key(
            "firecrawl",
            dependencies.resolveKey ?? Credentials.resolveKey,
          ),
          product: {
            name: prospect.details.product,
            url: prospect.details.productUrl,
          },
          country:
            campaign.criteria.countries.find((country) =>
              campaignCountryMatches([country], prospect.details.country),
            ) ?? prospect.details.country,
          deadline,
        }),
      );
      return capture.status === "captured"
        ? next("generateQuery", { productCapture: capture })
        : checkpoint(
            claim,
            {
              productCapture: capture,
              stage: "complete",
              heldReason: capture.reason,
            },
            "complete",
          );
    }
    case "generateQuery": {
      if (state.productCapture?.status !== "captured")
        throw new ValidationError(
          "The question needs a saved rendered product page.",
        );
      if (state.shoppingQueryIntent === "unbranded-broad") {
        const problem = broaderSearchProblem(
          state.shoppingHistory?.[0],
          Date.now(),
          policy.settings,
        );
        if (problem || state.shoppingQueryCount !== 1)
          return checkpoint(
            claim,
            {
              stage: "complete",
              heldReason:
                problem ?? "A lead can reserve only one broader search.",
            },
            "complete",
          );
      }
      const generated = value(
        await (dependencies.generateQuery ?? Capture.generateShopperQuery)({
          product: {
            name: prospect.details.product,
            url: prospect.details.productUrl,
          },
          category: prospect.details.productCategory,
          country:
            campaign.criteria.countries.find((country) =>
              campaignCountryMatches([country], prospect.details.country),
            ) ?? prospect.details.country,
          merchant: { name: company.name, domain: company.domain },
          browser: state.productCapture,
          intent: state.shoppingQueryIntent ?? "unbranded-specific",
          queryStyle: policy.settings.queryStyle,
          discoveryFreshnessDays: policy.settings.discoveryFreshnessDays,
          ...(state.shoppingHistory?.[0]
            ? { previousQuestion: state.shoppingHistory[0].query.prompt }
            : {}),
          deadline,
        }),
      );
      return generated.status === "prepared"
        ? next("query", {
            query: generated.query,
            queryGeneration: generated.generation,
          })
        : checkpoint(
            claim,
            {
              queryGeneration: generated.generation,
              stage: "complete",
              heldReason: generated.reason,
            },
            "complete",
          );
    }
    case "query": {
      if (!state.query?.intent?.startsWith("unbranded-"))
        throw new ValidationError("needs-unbranded-search");
      if (
        state.shoppingQueryCount !==
        (state.query.intent === "unbranded-broad" ? 2 : 1)
      )
        throw new ValidationError(
          "The query does not match its saved per-lead reservation.",
        );
      const problem = discoveryQueryProblem(
        state,
        prospect.details,
        company,
        policy.settings,
      );
      if (problem) throw new ValidationError(problem);
      const result = value(
        await (dependencies.start ?? Capture.startQuery)({
          apiKey: await key(
            "scrapellm",
            dependencies.resolveKey ?? Credentials.resolveKey,
          ),
          query: Capture.preparedQuerySchema.parse(state.query),
          deadline,
        }),
      );
      return next("poll", {
        shoppingJob: result,
        availableAt: new Date(Date.now() + 20_000).toISOString(),
      });
    }
    case "poll": {
      const job = Capture.aiJobSchema.parse(state.shoppingJob);
      if (
        state.polls >= shoppingPollLimit ||
        Date.now() - Date.parse(job.submittedAt) > 86_400_000
      )
        throw new ValidationError(
          "The existing shopping job needs reconciliation; no replacement query was submitted.",
        );
      const result = value(
        await (dependencies.poll ?? Capture.pollQuery)({
          apiKey: await key(
            "scrapellm",
            dependencies.resolveKey ?? Credentials.resolveKey,
          ),
          job,
          deadline,
        }),
      );
      return result.status === "pending"
        ? next("poll", {
            polls: state.polls + 1,
            availableAt: new Date(Date.now() + 30_000).toISOString(),
          })
        : next("browser", { polls: state.polls + 1, answer: result.capture });
    }
    case "browser": {
      const answer = Capture.aiCaptureSchema.parse(state.answer);
      const browser = value(
        await (dependencies.browse ?? Capture.inspectPages)({
          apiKey: await key(
            "firecrawl",
            dependencies.resolveKey ?? Credentials.resolveKey,
          ),
          product: answer.job.query.product,
          answer,
          country: answer.job.query.country,
          ...(state.productCapture?.status === "captured"
            ? { productCapture: state.productCapture }
            : {}),
          deadline,
        }),
      );
      return browser.status === "captured"
        ? next("assess", { browser })
        : checkpoint(
            claim,
            { browser, stage: "complete", heldReason: browser.reason },
            "complete",
          );
    }
    case "assess": {
      const browser = Capture.browserResearchSchema.parse(state.browser);
      if (browser.status !== "captured")
        throw new ValidationError("Browser evidence is not complete.");
      const evidence = {
        answer: Capture.aiCaptureSchema.parse(state.answer),
        browser,
      };
      const assessed = value(
        await (dependencies.assess ?? Assessment.assess)({
          ...evidence,
          playbook: policy.settings,
          deadline,
        }),
      );
      if (assessed.status !== "researched")
        return checkpoint(
          claim,
          {
            assessment: assessed,
            stage: "complete",
            heldReason: assessed.reason,
          },
          "complete",
        );
      const receipt = assessed.receipt;
      const observed = {
        assessment: assessed,
        shoppingReceipt: receipt,
      };
      if (receipt.selected.kind === "product-observation")
        return checkpoint(
          claim,
          {
            ...observed,
            stage: "complete",
            heldReason: "needs-unbranded-search",
          },
          "complete",
        );
      const problem = Assessment.validateAutomaticResearch(
        evidence,
        receipt,
        policy.settings.verificationDays,
        policy.settings,
      );
      if (problem) throw new ValidationError(problem);
      if (receipt.selected.kind === "no-gap") {
        if (
          policy.settings.searchesPerLead === 1 ||
          state.shoppingQueryCount !== 1 ||
          state.shoppingHistory?.length ||
          evidence.answer.job.query.intent !== "unbranded-specific"
        )
          return checkpoint(
            claim,
            {
              ...observed,
              stage: "complete",
              heldReason:
                "No gap found. Keep this lead for another product or season.",
            },
            "complete",
          );
        const previous = completedShoppingQuerySchema.parse({
          query: state.query,
          shoppingJob: state.shoppingJob,
          ...evidence,
          shoppingReceipt: receipt,
          queryReservedAt: state.queryReservedAt,
          attemptMetadata: {
            generation: state.queryGeneration,
            assessment: assessed,
            polls: state.polls,
            queryRetries: state.queryRetries,
            queryRetryPending: state.queryRetryPending,
            queryRateLimits: state.queryRateLimits,
            queryRateLimitRecovery: state["queryRateLimitRecovery"],
            pollRateLimits: state.pollRateLimits,
            browserRetries: state.browserRetries,
            browserRateLimits: state.browserRateLimits,
            browserRateLimitRecovery: state["browserRateLimitRecovery"],
            failureReceipt: state["failureReceipt"],
            failureProvider: state["failureProvider"],
            failureCode: state["failureCode"],
          },
        });
        const broaderProblem = broaderSearchProblem(
          previous,
          Date.now(),
          policy.settings,
        );
        if (broaderProblem)
          return checkpoint(
            claim,
            {
              ...observed,
              stage: "complete",
              heldReason: broaderProblem,
            },
            "complete",
          );
        // This checkpoint commits the first raw result and its reservation before
        // generation and the independently locked second batch reservation.
        return next("generateQuery", {
          shoppingHistory: [previous],
          shoppingQueryIntent: "unbranded-broad",
          query: undefined,
          shoppingJob: undefined,
          answer: undefined,
          browser: undefined,
          shoppingReceipt: undefined,
          assessment: undefined,
          queryReservedAt: undefined,
          queryGeneration: undefined,
          polls: 0,
          queryRetries: 0,
          queryRetryPending: false,
          queryRateLimits: [],
          queryRateLimitRecovery: undefined,
          pollRateLimits: [],
          browserRetries: 0,
          browserRateLimits: [],
          browserRateLimitRecovery: undefined,
          failureReceipt: undefined,
          failureProvider: undefined,
          failureCode: undefined,
        });
      }
      return next("applyResearch", observed);
    }
    case "applyResearch": {
      if (!state.shoppingReceipt || !state.lease)
        throw new ValidationError(
          "The saved shopping receipt or lease is missing.",
        );
      return LeadResearch.savePreparedAndApply(
        claim.input.requestedBy,
        {
          requestId: claim.job.id,
          prospectId: prospect.id,
          expectedRevision: state.prospectRevision,
          expectedPlaybookRevision: claim.input.playbookRevision,
          receipt: state.shoppingReceipt,
        },
        { jobId: claim.job.id, leaseToken: state.lease.token },
      );
    }
    case "draft": {
      const drafted = value(
        await (dependencies.compose ?? Composition.composeForProspect)(
          claim.input.requestedBy,
          {
            prospectId: prospect.id,
            expectedRevision: state.prospectRevision,
            expectedPlaybookRevision: claim.input.playbookRevision,
          },
          { deadline },
        ),
      );
      return next("applyDraft", {
        composition: drafted.composition,
        draftIssues: drafted.issues,
      });
    }
    case "applyDraft":
      return transaction(async (transaction) => {
        await owned(transaction, claim);
        await eligible(transaction, claim.input, state);
        if (!state.composition || state.composition.prospectId !== prospect.id)
          throw new ConflictError(
            "The saved composition belongs to another context.",
          );
        const saved = await Store.saveComposedDraftWithin(
          transaction,
          claim.input.requestedBy,
          {
            prospect: prospect.id,
            revision: state.prospectRevision,
            compositionJobId: state.composition.jobId,
          },
        );
        value(
          await Jobs.update(
            Environment.SERVER,
            claim.job.id,
            {
              status: "complete",
              output: {
                ...state,
                stage: "complete",
                prospectRevision: saved.revision,
                lease: null,
                preparedAt: new Date().toISOString(),
                draftIssues: saved.issues,
                ...(saved.copyProblem ? { heldReason: saved.copyProblem } : {}),
              },
              updatedAt: new Date(),
            },
            { tx: transaction },
          ),
        );
      });
    case "complete":
      return checkpoint(claim, {}, "complete");
  }
};

/** Resumes only explicitly seeded jobs. This worker never calls Apollo or sends email. */
export const run = (
  input: { maxSteps?: number; deadline?: number; batchId?: string } = {},
  dependencies: Dependencies = {},
) =>
  resultify(async () => {
    const deadline = input.deadline ?? Date.now() + 220_000;
    const completed: { jobId: string; stage: string; status: string }[] = [];
    for (const _ of Array.from({
      length: Math.min(40, Math.max(1, input.maxSteps ?? 15)),
    })) {
      if (Date.now() + 10_000 >= deadline) break;
      const selected = value(await claim(deadline, input.batchId));
      if (!selected) break;
      const result = await resultify(async () => {
        const executed = await execute(selected, deadline, dependencies);
        if (!executed.success) throw executed.error;
      });
      if (!result.success) value(await fail(selected, result.error));
      completed.push({
        jobId: selected.job.id,
        stage: selected.state.stage,
        status: result.success ? "checkpointed" : "held",
      });
    }
    return { steps: completed.length, jobs: completed };
  });

export const reviewQualificationSchema = z
  .object({
    jobId: z.string().uuid(),
    requestId: z.string().uuid(),
    expectedUpdatedAt: z.string().datetime(),
    assessment: Qualification.assessmentSchema,
    note: z.string().trim().min(20).max(2000),
  })
  .strict();

/** A reviewed quote correction resumes from saved public sources, never recreating provider work. */
export const reviewQualification = (
  actor: string,
  input: z.infer<typeof reviewQualificationSchema>,
) =>
  transaction(async (transaction) => {
    const parsed = reviewQualificationSchema.parse(input);
    const job = value(
      await Jobs.get(Environment.SERVER, parsed.jobId, { tx: transaction }),
    );
    const claim = preparationInputSchema.parse(job?.input);
    const state = preparationStateSchema.parse(job?.output);
    const correction = z
      .object({ requestId: z.string().uuid(), assessmentHash: z.string() })
      .safeParse(state["qualificationReview"]);
    const assessmentHash = researchHash(parsed.assessment);
    if (correction.success) {
      if (
        correction.data.requestId !== parsed.requestId ||
        correction.data.assessmentHash !== assessmentHash
      )
        throw new ConflictError(
          "This qualification already has a different reviewed correction.",
        );
      return { jobId: parsed.jobId, repeated: true };
    }
    if (
      job?.provider !== "automation" ||
      job.status !== "complete" ||
      job.updatedAt.toISOString() !== parsed.expectedUpdatedAt ||
      state.stage !== "complete" ||
      state.queryReservedAt ||
      state.shoppingJob ||
      state.shoppingReceipt
    )
      throw new ConflictError(
        "Only an unchanged public-qualification hold can be reviewed before a shopping submission.",
      );
    const original = z
      .object({
        status: z.literal("hold"),
        assessment: Qualification.assessmentSchema,
        usage: z.object({
          inputTokens: z.number().nullable(),
          outputTokens: z.number().nullable(),
        }),
        providerRequestId: z.string().nullable(),
      })
      .parse(state.qualification);
    const context = await eligible(transaction, claim, state);
    const evidence = Qualification.companyEvidenceSchema.parse(
      state.companyEvidence,
    );
    const result = value(
      Qualification.reviewCompanyEvidence(
        {
          campaign: context.campaign,
          company: context.company,
          playbook: context.policy.settings,
          evidence,
        },
        {
          assessment: parsed.assessment,
          usage: original.usage,
          providerRequestId: original.providerRequestId,
        },
      ),
    );
    if (result.status !== "qualified") throw new ValidationError(result.reason);
    const updated = preparationStateSchema.parse({
      ...state,
      qualification: result,
      originalQualification: state.qualification,
      qualificationReview: {
        requestId: parsed.requestId,
        assessmentHash,
        reviewedBy: actor,
        reviewedAt: new Date().toISOString(),
        note: parsed.note,
      },
      stage: "applyCompany",
      lease: null,
      heldReason: null,
      availableAt: new Date().toISOString(),
    });
    value(
      await Jobs.update(
        Environment.SERVER,
        job.id,
        {
          status: "pending",
          output: updated,
          error: null,
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    value(
      await repository(schema.outboundEvent).create(
        Environment.SERVER,
        {
          prospectId: claim.prospectId,
          actor,
          kind: "savedQualificationReviewed",
          detail: parsed.note,
          externalId: `saved-qualification-review:${parsed.requestId}`,
        },
        { tx: transaction },
      ),
    );
    return { jobId: job.id, repeated: false };
  });

export const resumeLocationSchema = z
  .object({
    jobId: z.string().uuid(),
    requestId: z.string().uuid(),
    expectedUpdatedAt: z.string().datetime(),
    reason: z.string().trim().min(20).max(2000),
  })
  .strict();

/** Reinterprets a saved business address after a parser correction, without collecting it again. */
export const resumeLocation = (
  actor: string,
  input: z.infer<typeof resumeLocationSchema>,
) =>
  transaction(async (transaction) => {
    const parsed = resumeLocationSchema.parse(input);
    const job = value(
      await Jobs.get(Environment.SERVER, parsed.jobId, { tx: transaction }),
    );
    const claim = preparationInputSchema.parse(job?.input);
    const state = preparationStateSchema.parse(job?.output);
    const requestHash = researchHash({ ...parsed, actor });
    const prior = z
      .object({ requestId: z.string().uuid(), requestHash: z.string() })
      .safeParse(state["locationReview"]);
    if (prior.success) {
      if (
        prior.data.requestId !== parsed.requestId ||
        prior.data.requestHash !== requestHash
      )
        throw new ConflictError(
          "This location already has a different reviewed correction.",
        );
      return { jobId: parsed.jobId, repeated: true };
    }
    if (
      job?.provider !== "automation" ||
      job.status !== "complete" ||
      job.updatedAt.toISOString() !== parsed.expectedUpdatedAt ||
      state.stage !== "complete" ||
      state["heldReason"] !==
        "No unambiguous public business address was found for local sending hours." ||
      state.lease !== null ||
      state.polls !== 0 ||
      state.browserRetries !== 0 ||
      state.browserRateLimits.length !== 0 ||
      [
        "timezone",
        "qualification",
        "queryReservedAt",
        "query",
        "shoppingJob",
        "answer",
        "browser",
        "assessment",
        "shoppingReceipt",
        "failureReceipt",
        "originalLocation",
      ].some((key) => state[key] !== undefined && state[key] !== null)
    )
      throw new ConflictError(
        "Only an unchanged missing-address hold without paid work can be reviewed.",
      );
    const context = await eligible(transaction, claim, state);
    const evidence = Qualification.companyEvidenceSchema.parse(
      state.companyEvidence,
    );
    const timezone = resolveBusinessTimezone(
      [...evidence.receipts, ...(state.locationReceipts ?? [])],
      context.company.domain,
    );
    const window = resolveSendingWindow(
      {
        timezone: timezone?.timezone ?? context.prospect.details.timezone,
        country: context.prospect.details.country,
      },
      context.policy.settings,
    );
    if (!window)
      throw new ValidationError(
        "The original saved sources do not establish an unambiguous business address.",
      );
    const now = new Date();
    const updated = preparationStateSchema.parse({
      ...state,
      originalLocation: {
        status: job.status,
        input: job.input,
        output: job.output,
        error: job.error,
        updatedAt: job.updatedAt.toISOString(),
      },
      locationReview: {
        requestId: parsed.requestId,
        requestHash,
        reviewedBy: actor,
        reviewedAt: now.toISOString(),
        reason: parsed.reason,
      },
      ...(timezone ? { timezone } : {}),
      schedulingWindow: window,
      stage: "qualify",
      lease: null,
      heldReason: null,
      availableAt: now.toISOString(),
    });
    value(
      await Jobs.update(
        Environment.SERVER,
        job.id,
        { status: "pending", output: updated, error: null, updatedAt: now },
        { tx: transaction },
      ),
    );
    value(
      await repository(schema.outboundEvent).create(
        Environment.SERVER,
        {
          prospectId: claim.prospectId,
          actor,
          kind: "savedLocationReviewed",
          detail: parsed.reason,
          externalId: `saved-location-review:${parsed.requestId}`,
        },
        { tx: transaction },
      ),
    );
    return { jobId: job.id, repeated: false };
  });

export const retryCollectionSchema = z
  .object({
    jobId: z.string().uuid(),
    requestId: z.string().uuid(),
    expectedUpdatedAt: z.string().datetime(),
    expectedJobHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    defect: z.literal("giftNavigation").optional(),
    reason: z.string().trim().min(20).max(2000),
  })
  .strict();

const missingProductReason =
  "No unambiguous own-brand priced physical product was established from the bounded public pages.";

/** Reviewed defects get separate bounded retries before any paid shopping work. */
export const retryCollection = (
  actor: string,
  input: z.infer<typeof retryCollectionSchema>,
) =>
  transaction(async (transaction) => {
    const parsed = retryCollectionSchema.parse(input);
    const job = value(
      await Jobs.get(Environment.SERVER, parsed.jobId, { tx: transaction }),
    );
    const claim = preparationInputSchema.parse(job?.input);
    const state = preparationStateSchema.parse(job?.output);
    const requestHash = researchHash({ ...parsed, actor });
    const giftNavigation = parsed.defect === "giftNavigation";
    const retryKey = giftNavigation ? "giftNavigationRetry" : "collectionRetry";
    const prior = z
      .object({ requestId: z.string().uuid(), requestHash: z.string() })
      .safeParse(state[retryKey]);
    if (prior.success) {
      if (
        prior.data.requestId !== parsed.requestId ||
        prior.data.requestHash !== requestHash
      )
        throw new ConflictError(
          "This collection already has a different reviewed retry.",
        );
      return { jobId: parsed.jobId, repeated: true };
    }
    if (
      job?.provider !== "automation" ||
      job.status !== "complete" ||
      job.updatedAt.toISOString() !== parsed.expectedUpdatedAt ||
      state.stage !== "complete" ||
      state["heldReason"] !== missingProductReason ||
      state.lease !== null ||
      (giftNavigation &&
        (!parsed.expectedJobHash ||
          browserRecoverySnapshot(job) !== parsed.expectedJobHash ||
          state.polls !== 0 ||
          state.queryRetries !== 0 ||
          state.browserRetries !== 0)) ||
      [
        "companyEvidence",
        "qualification",
        "queryReservedAt",
        "query",
        "shoppingJob",
        "answer",
        "browser",
        "assessment",
        "shoppingReceipt",
        "failureReceipt",
        "originalGiftNavigationCollection",
        ...(giftNavigation ? [] : ["originalCollection"]),
      ].some((key) => state[key] !== undefined && state[key] !== null)
    )
      throw new ConflictError(
        "Only an unchanged product-parser hold without shopping work can be retried.",
      );
    const collectionSchema = z.object({
      status: z.literal("hold"),
      reason: z.literal(missingProductReason),
      retryable: z.literal(false),
      receipts: z.array(Qualification.sourceReceiptSchema).min(1).max(6),
    });
    const collection = collectionSchema.parse(state["collection"]);
    const context = await eligible(transaction, claim, state);
    if (giftNavigation) {
      const original = collectionSchema.parse(state["originalCollection"]);
      z.object({
        requestId: z.string().uuid(),
        requestHash: z.string(),
        reviewedBy: z.string(),
        reviewedAt: z.string().datetime(),
      }).parse(state["collectionRetry"]);
      for (const attempt of [original, collection]) {
        const products = attempt.receipts.filter(
          (receipt) => receipt.kind === "product",
        );
        if (
          !products.length ||
          attempt.receipts.some((receipt) => {
            const url = new URL(receipt.url);
            return (
              normalizeDomain(receipt.url) !== context.company.domain ||
              url.protocol !== "https:" ||
              Boolean(url.username || url.password || url.port) ||
              /^\/password\/?$/i.test(url.pathname)
            );
          }) ||
          products.some((receipt) => !isGiftCardProductCandidate(receipt.url))
        )
          throw new ValidationError(
            "Both saved collection attempts must contain only own-site gift-card products before this navigation retry.",
          );
      }
    }
    if (
      !collection.receipts.some(
        (receipt) =>
          receipt.kind === "product" &&
          normalizeDomain(receipt.url) === context.company.domain &&
          receipt.excerpt.trim().length >= 12 &&
          /\/(?:products?|p|item|shop)\/[^/]+/i.test(
            new URL(receipt.url).pathname,
          ),
      )
    )
      throw new ValidationError(
        "The held collection has no original own-site product page to review.",
      );
    const now = new Date();
    const updated = preparationStateSchema.parse({
      ...state,
      ...(giftNavigation
        ? { originalGiftNavigationCollection: state["collection"] }
        : { originalCollection: state["collection"] }),
      collection: undefined,
      [retryKey]: {
        requestId: parsed.requestId,
        requestHash,
        previousUpdatedAt: parsed.expectedUpdatedAt,
        ...(giftNavigation
          ? { previousJobHash: parsed.expectedJobHash, defect: parsed.defect }
          : {}),
        reviewedBy: actor,
        reviewedAt: now.toISOString(),
        reason: parsed.reason,
      },
      stage: "collect",
      lease: null,
      heldReason: null,
      availableAt: now.toISOString(),
    });
    value(
      await Jobs.update(
        Environment.SERVER,
        job.id,
        { status: "pending", output: updated, error: null, updatedAt: now },
        { tx: transaction },
      ),
    );
    value(
      await repository(schema.outboundEvent).create(
        Environment.SERVER,
        {
          prospectId: claim.prospectId,
          actor,
          kind: giftNavigation
            ? "savedGiftNavigationRetried"
            : "savedCollectionRetryReviewed",
          detail: parsed.reason,
          externalId: `${giftNavigation ? "saved-gift-navigation-retry" : "saved-collection-retry"}:${parsed.requestId}`,
        },
        { tx: transaction },
      ),
    );
    return { jobId: job.id, repeated: false };
  });

export const browserRecoverySnapshot = (
  job: Pick<Job, "status" | "input" | "output" | "error">,
) =>
  researchHash({
    status: job.status,
    input: job.input,
    output: job.output,
    error: job.error,
  });

export const resumeBrowserRateLimitSchema = z
  .object({
    jobId: z.string().uuid(),
    requestId: z.string().uuid(),
    expectedUpdatedAt: z.string().datetime(),
    expectedJobHash: z.string().regex(/^[a-f0-9]{64}$/),
    expectedBatchUpdatedAt: z.string().datetime(),
    expectedBatchHash: z.string().regex(/^[a-f0-9]{64}$/),
    reason: z.string().trim().min(20).max(2000),
  })
  .strict();

/** Recover one saved session-create rejection; neither the answer nor query budget is reset. */
export const resumeBrowserRateLimit = (
  actor: string,
  input: z.infer<typeof resumeBrowserRateLimitSchema>,
) =>
  transaction(async (transaction) => {
    const parsed = resumeBrowserRateLimitSchema.parse(input);
    const job = value(
      await Jobs.get(Environment.SERVER, parsed.jobId, { tx: transaction }),
    );
    const claim = preparationInputSchema.parse(job?.input);
    const state = preparationStateSchema.parse(job?.output);
    const requestHash = researchHash({ ...parsed, actor });
    const prior = z
      .object({ requestId: z.string().uuid(), requestHash: z.string() })
      .safeParse(state["browserRateLimitRecovery"]);
    if (prior.success) {
      if (
        prior.data.requestId !== parsed.requestId ||
        prior.data.requestHash !== requestHash
      )
        throw new ConflictError(
          "This browser failure already has a different reviewed recovery.",
        );
      return { jobId: parsed.jobId, batchId: claim.batchId, repeated: true };
    }
    const batch = value(
      await Jobs.get(Environment.SERVER, claim.batchId, { tx: transaction }),
    );
    const settings = batchSchema.parse(batch?.input);
    const budget = budgetSchema.parse(batch?.output);
    const now = new Date();
    const cooldown = sessionCreationRateLimit(
      state["failureReceipt"],
      null,
      state.browserRetries,
      now.getTime(),
    );
    if (
      job?.provider !== "automation" ||
      job.status !== "failed" ||
      job.updatedAt.toISOString() !== parsed.expectedUpdatedAt ||
      browserRecoverySnapshot(job) !== parsed.expectedJobHash ||
      !batch ||
      batch.provider !== "automation" ||
      batch.updatedAt.toISOString() !== parsed.expectedBatchUpdatedAt ||
      browserRecoverySnapshot(batch) !== parsed.expectedBatchHash ||
      settings.campaignId !== claim.campaignId ||
      !budget.paused ||
      budget.failureProvider !== "firecrawl" ||
      budget.failureCode !== "rate-limit" ||
      budget.queriesReserved < 1 ||
      budget.queriesReserved > settings.maxQueries ||
      state.lease !== null ||
      state["failureProvider"] !== "firecrawl" ||
      state["failureCode"] !== "rate-limit" ||
      state.browserRetries >= browserRetryLimit ||
      !hasSavedBrowserAnswer(state) ||
      !cooldown
    )
      throw new ConflictError(
        "Only an unchanged rejected Firecrawl session creation with its saved shopping answer can resume.",
      );
    const otherFailure = value(
      await Jobs.find(
        Environment.SERVER,
        {
          where: and(
            scope,
            ne(schema.outboundIntegrationJob.id, job.id),
            eq(schema.outboundIntegrationJob.status, "failed"),
            sql`${schema.outboundIntegrationJob.input}->>'batchId' = ${claim.batchId}`,
            sql`${schema.outboundIntegrationJob.output}->>'failureCode' in ('quota', 'access', 'rate-limit', 'configuration')`,
          ),
          limit: 1,
        },
        { tx: transaction },
      ),
    )[0];
    if (otherFailure)
      throw new ConflictError(
        "Another provider failure still pauses this batch; reconcile it before recovery.",
      );
    await eligible(transaction, claim, state);
    value(
      await Jobs.update(
        Environment.SERVER,
        job.id,
        {
          status: "pending",
          error: null,
          output: preparationStateSchema.parse({
            ...state,
            availableAt: cooldown.retryAt,
            browserRetries: state.browserRetries + 1,
            browserRateLimits: [...state.browserRateLimits, cooldown],
            browserRateLimitRecovery: {
              requestId: parsed.requestId,
              requestHash,
              previousJobHash: parsed.expectedJobHash,
              previousBatchHash: parsed.expectedBatchHash,
              reviewedBy: actor,
              reviewedAt: now.toISOString(),
              reason: parsed.reason,
            },
          }),
          updatedAt: now,
        },
        { tx: transaction },
      ),
    );
    value(
      await Jobs.update(
        Environment.SERVER,
        batch.id,
        {
          error: null,
          output: {
            ...budget,
            paused: false,
            failureProvider: undefined,
            failureCode: undefined,
            browserAvailableAt: new Date(
              Math.max(
                Date.parse(budget.browserAvailableAt ?? "1970-01-01"),
                Date.parse(cooldown.retryAt),
              ),
            ).toISOString(),
          },
          updatedAt: now,
        },
        { tx: transaction },
      ),
    );
    value(
      await repository(schema.outboundEvent).create(
        Environment.SERVER,
        {
          prospectId: claim.prospectId,
          actor,
          kind: "savedBrowserRateLimitRecovered",
          detail: parsed.reason,
          externalId: `saved-browser-recovery:${parsed.requestId}`,
        },
        { tx: transaction },
      ),
    );
    return {
      jobId: job.id,
      batchId: batch.id,
      repeated: false,
      availableAt: cooldown.retryAt,
      queriesReserved: budget.queriesReserved,
    };
  });

export const resumeQueryRateLimitSchema = z
  .object({
    jobId: z.string().uuid(),
    requestId: z.string().uuid(),
    expectedUpdatedAt: z.string().datetime(),
    expectedJobHash: z.string().regex(/^[a-f0-9]{64}$/),
    expectedBatchUpdatedAt: z.string().datetime(),
    expectedBatchHash: z.string().regex(/^[a-f0-9]{64}$/),
    reason: z.string().trim().min(20).max(2000),
  })
  .strict();

/** Recover only the exact rejected query submission; retain its original budget reservation. */
export const resumeQueryRateLimit = (
  actor: string,
  input: z.infer<typeof resumeQueryRateLimitSchema>,
) =>
  transaction(async (transaction) => {
    const parsed = resumeQueryRateLimitSchema.parse(input);
    const job = value(
      await Jobs.get(Environment.SERVER, parsed.jobId, { tx: transaction }),
    );
    const claim = preparationInputSchema.parse(job?.input);
    const state = preparationStateSchema.parse(job?.output);
    const requestHash = researchHash({ ...parsed, actor });
    const prior = z
      .object({ requestId: z.string().uuid(), requestHash: z.string() })
      .safeParse(state["queryRateLimitRecovery"]);
    if (prior.success) {
      if (
        prior.data.requestId !== parsed.requestId ||
        prior.data.requestHash !== requestHash
      )
        throw new ConflictError(
          "This query failure already has a different reviewed recovery.",
        );
      return { jobId: parsed.jobId, batchId: claim.batchId, repeated: true };
    }
    const batch = value(
      await Jobs.get(Environment.SERVER, claim.batchId, { tx: transaction }),
    );
    const settings = batchSchema.parse(batch?.input);
    const budget = budgetSchema.parse(batch?.output);
    const now = new Date();
    const cooldown = state.query
      ? shoppingMinuteRateLimit(
          state["failureReceipt"],
          shoppingQueryUrl(state.query),
          null,
          now.getTime(),
        )
      : null;
    if (
      job?.provider !== "automation" ||
      job.status !== "failed" ||
      job.updatedAt.toISOString() !== parsed.expectedUpdatedAt ||
      browserRecoverySnapshot(job) !== parsed.expectedJobHash ||
      !batch ||
      batch.provider !== "automation" ||
      batch.updatedAt.toISOString() !== parsed.expectedBatchUpdatedAt ||
      browserRecoverySnapshot(batch) !== parsed.expectedBatchHash ||
      settings.campaignId !== claim.campaignId ||
      !budget.paused ||
      budget.failureProvider !== "scrapellm" ||
      budget.failureCode !== "rate-limit" ||
      budget.queriesReserved < 1 ||
      budget.queriesReserved > settings.maxQueries ||
      state.lease !== null ||
      state["failureProvider"] !== "scrapellm" ||
      state["failureCode"] !== "rate-limit" ||
      state.queryRetries >= shoppingRetryLimit ||
      !hasUnacceptedQuery(state) ||
      state.queryRetryPending ||
      !cooldown
    )
      throw new ConflictError(
        "Only an unchanged ScrapeLLM minute-limit rejection without an accepted job can resume.",
      );
    const otherFailure = value(
      await Jobs.find(
        Environment.SERVER,
        {
          where: and(
            scope,
            ne(schema.outboundIntegrationJob.id, job.id),
            eq(schema.outboundIntegrationJob.status, "failed"),
            sql`${schema.outboundIntegrationJob.input}->>'batchId' = ${claim.batchId}`,
            sql`${schema.outboundIntegrationJob.output}->>'failureCode' in ('quota', 'access', 'rate-limit', 'configuration')`,
          ),
          limit: 1,
        },
        { tx: transaction },
      ),
    )[0];
    if (otherFailure)
      throw new ConflictError(
        "Another provider failure still pauses this batch; reconcile it before recovery.",
      );
    await eligible(transaction, claim, state);
    value(
      await Jobs.update(
        Environment.SERVER,
        job.id,
        {
          status: "pending",
          error: null,
          output: preparationStateSchema.parse({
            ...state,
            availableAt: cooldown.retryAt,
            queryRetries: state.queryRetries + 1,
            queryRetryPending: true,
            queryRateLimits: [...state.queryRateLimits, cooldown],
            queryRateLimitRecovery: {
              requestId: parsed.requestId,
              requestHash,
              previousJobHash: parsed.expectedJobHash,
              previousBatchHash: parsed.expectedBatchHash,
              reviewedBy: actor,
              reviewedAt: now.toISOString(),
              reason: parsed.reason,
            },
          }),
          updatedAt: now,
        },
        { tx: transaction },
      ),
    );
    value(
      await Jobs.update(
        Environment.SERVER,
        batch.id,
        {
          error: null,
          output: {
            ...budget,
            paused: false,
            failureProvider: undefined,
            failureCode: undefined,
            scrapellmAvailableAt: new Date(
              Math.max(
                Date.parse(budget.scrapellmAvailableAt ?? "1970-01-01"),
                Date.parse(cooldown.retryAt),
              ),
            ).toISOString(),
          },
          updatedAt: now,
        },
        { tx: transaction },
      ),
    );
    value(
      await repository(schema.outboundEvent).create(
        Environment.SERVER,
        {
          prospectId: claim.prospectId,
          actor,
          kind: "savedQueryRateLimitRecovered",
          detail: parsed.reason,
          externalId: `saved-query-recovery:${parsed.requestId}`,
        },
        { tx: transaction },
      ),
    );
    return {
      jobId: job.id,
      batchId: batch.id,
      repeated: false,
      availableAt: cooldown.retryAt,
      queriesReserved: budget.queriesReserved,
    };
  });

export const retryQualificationCollectionSchema = z
  .object({
    jobId: z.string().uuid(),
    requestId: z.string().uuid(),
    expectedUpdatedAt: z.string().datetime(),
    expectedJobHash: z.string().regex(/^[a-f0-9]{64}$/),
    reason: z.string().trim().min(20).max(2000),
  })
  .strict();

/** Recollect public facts once after a reviewed collection defect, before shopping work. */
export const retryQualificationCollection = (
  actor: string,
  input: z.infer<typeof retryQualificationCollectionSchema>,
) =>
  transaction(async (transaction) => {
    const parsed = retryQualificationCollectionSchema.parse(input);
    const job = value(
      await Jobs.get(Environment.SERVER, parsed.jobId, { tx: transaction }),
    );
    const claim = preparationInputSchema.parse(job?.input);
    const state = preparationStateSchema.parse(job?.output);
    const requestHash = researchHash({ ...parsed, actor });
    const prior = z
      .object({ requestId: z.string().uuid(), requestHash: z.string() })
      .safeParse(state["qualificationCollectionRetry"]);
    if (prior.success) {
      if (
        prior.data.requestId !== parsed.requestId ||
        prior.data.requestHash !== requestHash
      )
        throw new ConflictError(
          "This qualification already has a different reviewed collection retry.",
        );
      return { jobId: parsed.jobId, repeated: true };
    }
    const qualification = z
      .object({
        status: z.literal("hold"),
        reason: z.string().min(1),
        assessment: Qualification.assessmentSchema,
      })
      .safeParse(state.qualification);
    if (
      job?.provider !== "automation" ||
      job.status !== "complete" ||
      job.updatedAt.toISOString() !== parsed.expectedUpdatedAt ||
      browserRecoverySnapshot(job) !== parsed.expectedJobHash ||
      state.stage !== "complete" ||
      state.lease !== null ||
      !qualification.success ||
      state["heldReason"] !== qualification.data.reason ||
      state.polls !== 0 ||
      state.queryRetries !== 0 ||
      state.browserRetries !== 0 ||
      [
        "queryReservedAt",
        "query",
        "shoppingJob",
        "answer",
        "browser",
        "assessment",
        "shoppingReceipt",
        "failureReceipt",
        "qualificationReview",
        "originalQualificationCollection",
      ].some((key) => state[key] !== undefined && state[key] !== null)
    )
      throw new ConflictError(
        "Only an unchanged completed company-qualification hold without shopping work can be recollected.",
      );
    const evidence = Qualification.companyEvidenceSchema.parse(
      state.companyEvidence,
    );
    const context = await eligible(transaction, claim, state);
    if (
      normalizeDomain(evidence.product.url) !== context.company.domain ||
      !evidence.receipts.some(
        (receipt) =>
          receipt.kind === "product" &&
          receipt.url === evidence.product.url &&
          receipt.excerpt.includes("Observed structured product:"),
      )
    )
      throw new ValidationError(
        "The held qualification has no source-bound own-site product to recollect.",
      );
    const now = new Date();
    const updated = preparationStateSchema.parse({
      ...state,
      originalQualificationCollection: {
        companyEvidence: state.companyEvidence,
        qualification: state.qualification,
        locationReceipts: state.locationReceipts,
        timezone: state.timezone,
        heldReason: state["heldReason"],
      },
      companyEvidence: undefined,
      qualification: undefined,
      locationReceipts: undefined,
      timezone: undefined,
      qualificationCollectionRetry: {
        requestId: parsed.requestId,
        requestHash,
        previousJobHash: parsed.expectedJobHash,
        reviewedBy: actor,
        reviewedAt: now.toISOString(),
        reason: parsed.reason,
      },
      stage: "collect",
      heldReason: null,
      availableAt: now.toISOString(),
    });
    value(
      await Jobs.update(
        Environment.SERVER,
        job.id,
        { status: "pending", output: updated, error: null, updatedAt: now },
        { tx: transaction },
      ),
    );
    value(
      await repository(schema.outboundEvent).create(
        Environment.SERVER,
        {
          prospectId: claim.prospectId,
          actor,
          kind: "savedQualificationCollectionRetried",
          detail: parsed.reason,
          externalId: `saved-qualification-collection-retry:${parsed.requestId}`,
        },
        { tx: transaction },
      ),
    );
    return { jobId: job.id, repeated: false };
  });
