import "server-only";

import { createHash, randomInt, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { type Result, resultify } from "@zenncore/utils";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lte,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import {
  type Activity,
  companyExcluded,
  contactHistoryReady,
  defaultPlaybook,
  deliveredBody,
  draftSchema,
  draftSimilarityIssues,
  type Inbox,
  type Issue,
  inSendWindow,
  linkedinSchema,
  lintMessages,
  type Message,
  mailboxConnected,
  normalizeDomain,
  outcomeSchema,
  type Playbook,
  type Prospect,
  type ProspectInput,
  personalSourceReadyForDraft,
  playbookSchema,
  prospectIssues,
  prospectSchema,
  renderMessages,
  reviewSchema,
  type Suppression,
  senderFor,
  senderPool,
  splitList,
  templateIssues,
} from "@/lib/outbound";
import {
  campaignCountryMatches,
  campaignDomainExcluded,
  companyQualificationIssues,
} from "@/lib/outbound-campaigns";
import { sendingCapacity } from "@/lib/outbound-capacity";
import {
  canReviewDraftAutomatically,
  draftReviewInputSchema,
  draftReviewOutputSchema,
  draftReviewReadinessKey,
} from "@/lib/outbound-draft-review";
import {
  LINKEDIN_PAGE_SIZE,
  type LinkedInQueue,
  type LinkedInSearchParams,
  parseLinkedInQuery,
} from "@/lib/outbound-linkedin";
import {
  parseReviewQuery,
  REVIEW_PAGE_SIZE,
  REVIEW_STATUSES,
  type ReviewQueue,
  type ReviewSearchParams,
  type ReviewStatus,
} from "@/lib/outbound-review";
import { isExcludedRole, matchesRole } from "@/lib/outbound-roles";
import {
  LEGACY_CONTACT_IMPORT_ACTOR,
  savedContactIdentitySchema,
  savedContactReceiptMatches,
  savedContactReceiptSchema,
  savedContactSourceVerified,
} from "@/lib/outbound-saved-contact";
import {
  sequenceRefreshInputSchema,
  sequenceRefreshStateSchema,
  validateSequenceRefreshReceipts,
} from "@/lib/outbound-sequence-refresh";
import { db, schema, type TransactionScope } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/server/utils/error";
import {
  hasRecentLinkedInTouch,
  linkedinHistoryReady,
} from "@/server/utils/outbound/linkedin-ledger";
import { assertShoppingEvidence } from "@/server/utils/outbound/shopping-research";
import {
  type SmtpFailure,
  smtpFailureFrom,
  smtpFailureSchema,
} from "@/server/utils/outbound/smtp-failure";
import {
  assertWarmupPreflight,
  preflightWarmup,
  type WarmupPreflight,
} from "@/server/utils/outbound/warmup-guard";
import { repository, resultifyRead } from "@/server/utils/repository";
import * as Conversations from "./conversations";
import { legacyHistory, mapLegacyProspect, parseImport } from "./import";

const Playbooks = repository(schema.outboundPlaybook);
const Companies = repository(schema.outboundCompany);
const People = repository(schema.outboundPerson);
const Prospects = repository(schema.outboundProspect);
const Revisions = repository(schema.outboundRevision);
const Events = repository(schema.outboundEvent);
const Suppressions = repository(schema.outboundSuppression);
const Inboxes = repository(schema.outboundInbox);
const Attempts = repository(schema.outboundSendAttempt);
const ConversationSends = repository(schema.outboundConversationSend);
const Campaigns = repository(schema.outboundCampaign);
const CampaignCompanies = repository(schema.outboundCampaignCompany);
const IntegrationJobs = repository(schema.outboundIntegrationJob);

type ProspectRow = typeof schema.outboundProspect.$inferSelect;
type SuppressionRow = typeof schema.outboundSuppression.$inferSelect;
export type Workspace = {
  playbook: Playbook;
  playbookRevision: number;
  prospects: Prospect[];
  events: Activity[];
  suppressions: Suppression[];
  inboxes: Inbox[];
};

const requireData = <T>(result: Result<T, Error>): T => {
  if (!result.success) throw result.error;
  return result.data as T;
};

const transaction = <T>(
  operation: (transaction: TransactionScope) => Promise<T>,
) =>
  resultify(() =>
    db.transaction(async (transaction) => {
      // One internal workspace; serialize policy, approvals and delivery claims together.
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
      );
      return operation(transaction);
    }),
  );

export const policy = async (transaction?: TransactionScope) => {
  const rows = requireData(
    await Playbooks.find(
      Environment.SERVER,
      { where: eq(schema.outboundPlaybook.id, "default"), limit: 1 },
      { tx: transaction },
    ),
  );
  const current = rows[0];
  return {
    settings: current
      ? playbookSchema.parse(current.settings)
      : defaultPlaybook,
    revision: current?.revision ?? 0,
  };
};

export const inboxCapacity = async (
  inbox: Pick<InboxRow, "id" | "dailyCap">,
  settings: Playbook,
  transaction?: TransactionScope,
) => {
  const attempts = requireData(
    await Attempts.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundSendAttempt.inboxId, inbox.id),
          eq(schema.outboundSendAttempt.test, false),
          eq(schema.outboundSendAttempt.status, "accepted"),
          gte(
            schema.outboundSendAttempt.completedAt,
            new Date(Date.now() - 60 * 86400000),
          ),
        ),
        limit: 5000,
      },
      { tx: transaction },
    ),
  );
  const replies = requireData(
    await ConversationSends.find(
      Environment.SERVER,
      {
        where: and(
          sql`${schema.outboundConversationSend.input}->>'channel' = 'email'`,
          sql`${schema.outboundConversationSend.input}->>'accountId' = ${inbox.id}`,
          eq(schema.outboundConversationSend.status, "accepted"),
          gte(
            schema.outboundConversationSend.completedAt,
            new Date(Date.now() - 60 * 86400000),
          ),
        ),
        limit: 5000,
      },
      { tx: transaction },
    ),
  );
  const identifiers = [
    ...new Set([
      ...attempts.map((attempt) => attempt.prospectId),
      ...replies.flatMap((reply) =>
        typeof reply.input["prospectId"] === "string"
          ? [reply.input["prospectId"]]
          : [],
      ),
    ]),
  ];
  const bounced = identifiers.length
    ? requireData(
        await Prospects.find(
          Environment.SERVER,
          {
            where: and(
              inArray(schema.outboundProspect.id, identifiers),
              eq(schema.outboundProspect.status, "bounced"),
            ),
          },
          { tx: transaction },
        ),
      )
    : [];
  const days = new Map<
    string,
    { day: string; accepted: number; bounced: number }
  >();
  for (const attempt of attempts) {
    if (!attempt.completedAt) continue;
    const day = attempt.completedAt.toISOString().slice(0, 10);
    const bucket = days.get(day) ?? { day, accepted: 0, bounced: 0 };
    bucket.accepted += 1;
    if (bounced.some((prospect) => prospect.id === attempt.prospectId))
      bucket.bounced += 1;
    days.set(day, bucket);
  }
  for (const reply of replies) {
    if (!reply.completedAt) continue;
    const day = reply.completedAt.toISOString().slice(0, 10);
    const bucket = days.get(day) ?? { day, accepted: 0, bounced: 0 };
    bucket.accepted += 1;
    if (bounced.some((prospect) => prospect.id === reply.input["prospectId"]))
      bucket.bounced += 1;
    days.set(day, bucket);
  }
  return sendingCapacity(
    Math.min(inbox.dailyCap, settings.dailyCap),
    [...days.values()],
    new Date(),
    { rampEnabled: settings.sendingRampEnabled },
  );
};

/** Readiness describes observed setup; enabling preparation never asserts these checks passed. */
export const automationDeliveryStatus = () =>
  resultify(async () => {
    const { settings } = await policy();
    const pool = senderPool(settings);
    const inboxes = requireData(
      await Inboxes.find(Environment.SERVER, {
        where: inArray(schema.outboundInbox.email, pool),
      }),
    );
    const blockers = [
      ...(!settings.sendingEnabled ? ["sendingPaused"] : []),
      ...(!settings.senderConfirmed ? ["senderUnconfirmed"] : []),
      ...(!contactHistoryReady(settings) ? ["historyUnconfirmed"] : []),
      ...(!settings.competingSendersPaused ? ["competingSendersActive"] : []),
      ...(!settings.senderTested ? ["senderUntested"] : []),
      ...(inboxes.length !== pool.length || !inboxes.length
        ? ["inboxesMissing"]
        : []),
      ...(inboxes.some((inbox) => !inbox.enabled || !mailboxConnected(inbox))
        ? ["inboxDisabled"]
        : []),
      ...(inboxes.some(
        (inbox) =>
          inbox.syncMode ||
          inbox.error ||
          !inbox.lastSyncedAt ||
          Date.now() - inbox.lastSyncedAt.getTime() > 600_000,
      )
        ? ["inboxSyncIncomplete"]
        : []),
      ...(inboxes.some(
        (inbox) =>
          inbox.fromName !== settings.fromName ||
          inbox.signer !== settings.signature,
      )
        ? ["senderIdentityMismatch"]
        : []),
    ];
    const capacities = await Promise.all(
      inboxes.map(async (inbox) => ({
        email: inbox.email,
        ...(await inboxCapacity(inbox, settings)),
      })),
    );
    return {
      sendingEnabled: settings.sendingEnabled,
      ready: blockers.length === 0,
      blockers,
      inboxes: capacities,
    };
  });

const qualifiedProductSchema = z.object({
  status: z.literal("qualified"),
  details: z.object({
    domain: z.string().min(1),
    product: z.string().min(1),
    productUrl: z.url(),
    gap: z.literal("product-published-data"),
    evidence: z.string().min(1),
    evidenceCheckedAt: z.string().min(1),
    country: z.string().min(1),
    platform: z.string().min(1),
    legitEvidence: z.string().min(1),
    finding: z.string().min(1),
    productInsight: prospectSchema.shape.productInsight,
  }),
});

const assertSavedContactVerification = async (
  transaction: TransactionScope,
  prospect: ProspectRow,
) => {
  if (!prospect.details.savedContactVerificationId) return false;
  const receipt = requireData(
    await IntegrationJobs.get(
      Environment.SERVER,
      prospect.details.savedContactVerificationId,
      { tx: transaction },
    ),
  );
  if (
    receipt?.provider !== "automation" ||
    receipt.status !== "complete" ||
    receipt.prospectId !== prospect.id ||
    !savedContactReceiptMatches(receipt.input, prospect)
  )
    throw new ValidationError(
      "The recipient no longer matches the accepted saved contact source.",
    );
  return (await policy(transaction)).settings.trustSavedContactVerification;
};

/** Retain the independently sourced contact when later product research changes. */
export const assertAutomaticContactEvidence = async (
  transaction: TransactionScope,
  prospect: ProspectRow,
) => {
  await assertSavedContactVerification(transaction, prospect);
  const identifier = z
    .string()
    .uuid()
    .safeParse(prospect.details.automationEvidenceId);
  if (!identifier.success) {
    const existing = requireData(
      await IntegrationJobs.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundIntegrationJob.prospectId, prospect.id),
            sql`${schema.outboundIntegrationJob.input}->>'operation' = 'campaignAutomation'`,
          ),
          limit: 1,
        },
        { tx: transaction },
      ),
    );
    if (existing.length)
      throw new ValidationError(
        "The original contact evidence cannot be removed.",
      );
    return null;
  }
  const job = requireData(
    await IntegrationJobs.get(Environment.SERVER, identifier.data, {
      tx: transaction,
    }),
  );
  const identity = z
    .object({
      status: z.literal("selected"),
      provisional: z.literal(false),
      person: z.object({
        name: z.string(),
        first: z.string(),
        title: z.string(),
        email: z.string(),
        domain: z.string(),
        linkedinUrl: z.string(),
      }),
      details: z.object({
        roleSource: z.string().min(1),
        roleCheckedAt: z.string().min(1),
        timezone: z.string(),
      }),
    })
    .safeParse(job?.output?.["selection"]);
  if (
    job?.provider !== "automation" ||
    job.input["operation"] !== "campaignAutomation" ||
    job.input["campaignId"] !== prospect.campaignId ||
    job.output?.["prospectId"] !== prospect.id ||
    !identity.success ||
    Object.entries(identity.data.person).some(
      ([key, value]) => prospect.details[key as keyof ProspectInput] !== value,
    ) ||
    Object.entries(identity.data.details).some(
      ([key, value]) => prospect.details[key as keyof ProspectInput] !== value,
    )
  )
    throw new ValidationError(
      "The recipient no longer matches the independently selected contact.",
    );
  return job;
};

/** Source checks are independent: new shopping evidence does not replace contact proof. */
export const assertAutomaticEvidence = async (
  transaction: TransactionScope,
  prospect: ProspectRow,
) => {
  await assertShoppingEvidence(
    transaction,
    prospect,
    await policy(transaction),
  );
  const job = await assertAutomaticContactEvidence(transaction, prospect);
  if (
    !["product-published-data", "shopping-research"].includes(
      prospect.details.gap,
    )
  )
    return;
  if (prospect.details.gap === "shopping-research") return;
  if (!job) throw new ValidationError("Automatic product evidence is missing.");
  const qualified = qualifiedProductSchema.safeParse(
    job.output?.["qualification"],
  );
  const refresh = prospect.details.automationRefreshId
    ? requireData(
        await IntegrationJobs.get(
          Environment.SERVER,
          prospect.details.automationRefreshId,
          { tx: transaction },
        ),
      )
    : null;
  const refreshInput = sequenceRefreshInputSchema.safeParse(refresh?.input);
  const refreshState = sequenceRefreshStateSchema.safeParse(refresh?.output);
  const appliedAt =
    typeof refresh?.output?.["appliedAt"] === "string"
      ? Date.parse(refresh.output["appliedAt"])
      : Number.NaN;
  const refreshed =
    refresh?.status === "complete" &&
    refresh.provider === "automation" &&
    refreshInput.success &&
    refreshState.success &&
    refreshInput.data.sourceEvidenceId === job?.id &&
    refreshInput.data.prospectId === prospect.id &&
    refreshInput.data.campaignId === prospect.campaignId &&
    refresh.output?.["appliedProspectRevision"] === prospect.revision &&
    Number.isFinite(appliedAt)
      ? validateSequenceRefreshReceipts(
          refreshInput.data,
          refreshState.data,
          prospect.details,
          (await policy(transaction)).settings,
          appliedAt,
        )
      : null;
  if (
    prospect.details.automationRefreshId &&
    (!refreshed ||
      "reason" in refreshed ||
      Object.entries(refreshed.patch).some(
        ([key, value]) =>
          prospect.details[key as keyof ProspectInput] !== value,
      ))
  )
    throw new ValidationError(
      "Automatic renewal receipt does not match this sequence.",
    );
  if (
    job?.provider !== "automation" ||
    job.input["operation"] !== "campaignAutomation" ||
    job.input["campaignId"] !== prospect.campaignId ||
    job.output?.["prospectId"] !== prospect.id ||
    !qualified.success ||
    Object.entries(qualified.data.details).some(([key, value]) =>
      key === "evidenceCheckedAt" && refreshed && "patch" in refreshed
        ? false
        : !isDeepStrictEqual(
            prospect.details[key as keyof ProspectInput] ?? null,
            value ?? null,
          ),
    )
  )
    throw new ValidationError(
      "Automatic product evidence does not match this prospect.",
    );
};

/** Renew only factual receipts; original words, recipient and historical sent revisions stay intact. */
export const applyAutomaticSequenceRefresh = (input: {
  jobId: string;
  leaseToken: string;
}) =>
  transaction(async (transaction) => {
    const identifier = z.string().uuid().parse(input.jobId);
    const job = requireData(
      await IntegrationJobs.get(Environment.SERVER, identifier, {
        tx: transaction,
      }),
    );
    const scope = sequenceRefreshInputSchema.parse(job?.input);
    const state = sequenceRefreshStateSchema.parse(job?.output);
    const now = new Date();
    if (
      job?.provider !== "automation" ||
      job.status !== "starting" ||
      state.stage !== "apply" ||
      state.lease?.token !== input.leaseToken ||
      Date.parse(state.lease.expiresAt) <= now.getTime()
    )
      throw new ConflictError(
        "The receipt renewal lease is no longer current.",
      );
    const prospect = await findProspect(transaction, scope.prospectId);
    const current = await policy(transaction);
    const campaign = requireData(
      await Campaigns.get(Environment.SERVER, scope.campaignId, {
        tx: transaction,
      }),
    );
    if (
      !current.settings.automationEnabled ||
      !campaign ||
      campaign.status !== "active" ||
      campaign.revision !== scope.campaignRevision ||
      current.revision !== scope.playbookRevision ||
      prospect.campaignId !== campaign.id ||
      prospect.revision !== scope.prospectRevision ||
      prospect.approvalHash !== scope.approvalHash ||
      prospect.sentStep !== scope.sentStep ||
      prospect.status !== "active" ||
      !prospect.approvedBy?.startsWith("automatic:") ||
      prospect.details.email.toLowerCase() !== scope.recipient.toLowerCase()
    )
      throw new ConflictError("The sequence changed during receipt renewal.");
    await assertCampaignActive(transaction, prospect);
    await assertAutomaticEvidence(transaction, prospect);
    const pending = requireData(
      await Attempts.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundSendAttempt.prospectId, prospect.id),
            inArray(schema.outboundSendAttempt.status, [
              "claimed",
              "uncertain",
            ]),
          ),
          limit: 1,
        },
        { tx: transaction },
      ),
    );
    if (pending.length)
      throw new ConflictError(
        "Reconcile the outstanding send before renewing this sequence.",
      );
    const checked = validateSequenceRefreshReceipts(
      scope,
      state,
      prospect.details,
      current.settings,
      now.getTime(),
    );
    if ("reason" in checked) throw new ValidationError(checked.reason);
    const details = prospectSchema.parse({
      ...prospect.details,
      ...checked.patch,
      automationRefreshId: job.id,
    });
    const entries = requireData(
      await Suppressions.find(Environment.SERVER, {}, { tx: transaction }),
    );
    const issues = issuesFor(
      { ...prospect, details },
      current.settings,
      entries,
    );
    if (issues.length)
      throw new ValidationError(
        `Receipt renewal failed: ${issues.map((issue) => issue.code).join(", ")}`,
      );
    const previous = requireData(
      await Revisions.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundRevision.prospectId, prospect.id),
            eq(schema.outboundRevision.revision, prospect.revision),
          ),
          limit: 1,
        },
        { tx: transaction },
      ),
    )[0];
    if (
      !previous?.approvedAt ||
      previous.revokedAt ||
      previous.contentHash !== scope.approvalHash ||
      contentHash(
        prospect.messages,
        approvalManifest(prospect, current.settings, current.revision),
      ) !== scope.approvalHash
    )
      throw new ConflictError(
        "The original approved sequence no longer matches.",
      );
    const revision = prospect.revision + 1;
    const manifest = approvalManifest(
      { ...prospect, details },
      current.settings,
      current.revision,
    );
    const hash = contentHash(prospect.messages, manifest);
    await revoke(
      transaction,
      prospect,
      "Source receipts renewed without changing messages",
    );
    requireData(
      await Revisions.create(
        Environment.SERVER,
        {
          prospectId: prospect.id,
          revision,
          messages: prospect.messages,
          manifest,
          contentHash: hash,
          approvedBy: `automatic:${scope.actor}`,
          approvedAt: now,
        },
        { tx: transaction },
      ),
    );
    requireData(
      await Prospects.update(
        Environment.SERVER,
        prospect.id,
        {
          details,
          revision,
          approvalHash: hash,
          approvedBy: `automatic:${scope.actor}`,
          approvedAt: now,
          updatedAt: now,
        },
        { tx: transaction },
      ),
    );
    requireData(
      await IntegrationJobs.update(
        Environment.SERVER,
        job.id,
        {
          status: "complete",
          error: null,
          output: {
            ...state,
            stage: "complete",
            lease: null,
            appliedAt: now.toISOString(),
            appliedProspectRevision: revision,
          },
          updatedAt: now,
        },
        { tx: transaction },
      ),
    );
    await event(
      transaction,
      scope.actor,
      "sequenceReceiptsRenewed",
      `Fresh product and recipient checks renewed revision ${revision}; message text unchanged.`,
      prospect.id,
    );
    return { prospectId: prospect.id, revision };
  });

const event = async (
  transaction: TransactionScope,
  actor: string,
  kind: string,
  detail: string,
  prospectId?: string,
) =>
  requireData(
    await Events.create(
      Environment.SERVER,
      { actor, kind, detail, prospectId: prospectId ?? null },
      { tx: transaction },
    ),
  );

/** A versioned diagnostic event, separate from immutable content and outcome status. */
export const recordSmtpFailureWithin = async (
  transaction: TransactionScope,
  input: {
    actor: string;
    prospectId: string;
    attemptId: string;
    source: "sequence" | "conversation" | "mailbox-test";
    smtpFailure: unknown;
  },
) => {
  const diagnostic = smtpFailureSchema.safeParse(input.smtpFailure);
  if (!diagnostic.success) return;
  await event(
    transaction,
    input.actor,
    "deliveryTransportFailure",
    JSON.stringify({
      version: 1,
      transport: "smtp",
      attemptId: input.attemptId,
      source: input.source,
      ...diagnostic.data,
    }),
    input.prospectId,
  );
};

const suppressed = (details: ProspectInput, entries: SuppressionRow[]) =>
  entries.some((entry) =>
    entry.scope === "email"
      ? entry.value === details.email.toLowerCase()
      : entry.value === normalizeDomain(details.domain) ||
        entry.value === details.email.split("@")[1]?.toLowerCase(),
  );

export const approvalManifest = (
  prospect: Pick<ProspectRow, "id" | "details">,
  settings: Playbook,
  revision: number,
) => ({
  recipient: prospect.details.email.toLowerCase(),
  sender: senderFor(prospect.id, settings),
  fromName: settings.fromName,
  signature: settings.signature,
  postalAddress: settings.postalAddress,
  playbookRevision: revision,
  evidence: prospect.details.evidence,
  evidenceCheckedAt: prospect.details.evidenceCheckedAt,
});

export const contentHash = (
  messages: Message[],
  manifest: ReturnType<typeof approvalManifest>,
) => {
  // A fresh receipt for the same evidence does not change the approved semantic fact set.
  const facts = {
    recipient: manifest.recipient,
    sender: manifest.sender,
    fromName: manifest.fromName,
    signature: manifest.signature,
    postalAddress: manifest.postalAddress,
    playbookRevision: manifest.playbookRevision,
    evidence: manifest.evidence,
  };
  const canonical = messages.map(({ step, afterDays, subject, body }) => ({
    step,
    afterDays,
    subject,
    body,
  }));
  return createHash("sha256")
    .update(JSON.stringify({ messages: canonical, manifest: facts }))
    .digest("hex");
};

const issuesFor = (
  prospect: ProspectRow,
  settings: Playbook,
  entries: SuppressionRow[],
): Issue[] => [
  ...prospectIssues(prospect.details, settings),
  ...lintMessages(prospect.messages, settings, prospect.details),
  ...(prospect.messages.length !== 3
    ? [{ code: "draftMissing", field: "messages" }]
    : []),
  ...(suppressed(prospect.details, entries)
    ? [{ code: "suppressed", field: "email" }]
    : []),
];

const view = (
  row: ProspectRow,
  settings: Playbook,
  entries: SuppressionRow[],
  first?: typeof schema.outboundRevision.$inferSelect,
): Prospect => ({
  ...row.details,
  id: row.id,
  campaignId: row.campaignId,
  senderEmail: senderFor(row.id, settings),
  sentStep: row.sentStep,
  sentFirstMessage:
    first?.messages.find((message) => message.step === 1) ?? null,
  sentPostalAddress: first?.manifest.postalAddress ?? null,
  companyId: row.companyId,
  personId: row.personId,
  status: row.status,
  messages: row.messages,
  revision: row.revision,
  approvedAt: row.approvedAt?.toISOString() ?? null,
  approvedBy: row.approvedBy,
  approvalHash: row.approvalHash,
  playbookRevision: row.playbookRevision,
  holdReason: row.holdReason,
  linkedinStatus: row.linkedinStatus,
  linkedinDraft: row.linkedinDraft,
  linkedinNextActionAt: row.linkedinNextActionAt?.toISOString() ?? null,
  linkedinNote: row.linkedinNote,
  lastContactedAt: row.lastSentAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  issues: issuesFor(row, settings, entries),
});

export const getReviewQueue = (input: ReviewSearchParams = {}) =>
  resultify(async (): Promise<ReviewQueue> => {
    const query = parseReviewQuery(input);
    const prospect = schema.outboundProspect;
    const company = sql<string>`coalesce(${prospect.details}->>'company', '')`;
    const domain = sql<string>`coalesce(${prospect.details}->>'domain', '')`;
    const name = sql<string>`coalesce(${prospect.details}->>'name', '')`;
    const email = sql<string>`coalesce(${prospect.details}->>'email', '')`;
    const subject = sql<string>`coalesce(${prospect.messages}->0->>'subject', '')`;
    // Escape wildcard characters so searches for names such as "100%" stay literal.
    const pattern = `%${query.q.replace(/[!%_]/g, "!$&")}%`;
    const where = and(
      inArray(prospect.status, [...REVIEW_STATUSES]),
      query.campaign ? eq(prospect.campaignId, query.campaign) : undefined,
      sql`jsonb_array_length(${prospect.messages}) > 0`,
      query.status === "all" ? undefined : eq(prospect.status, query.status),
      query.q
        ? or(
            ...[company, domain, name, email, subject].map(
              (field) => sql`${field} ilike ${pattern} escape '!'`,
            ),
          )
        : undefined,
    );
    const total = requireData(await Prospects.count(Environment.SERVER, where));
    const page = Math.min(
      query.page,
      Math.max(1, Math.ceil(total / REVIEW_PAGE_SIZE)),
    );
    if (!total) return { rows: [], total, page, pageSize: REVIEW_PAGE_SIZE };
    // The repository does not project JSON fields. Fetch only this page's summary,
    // never the full message bodies, evidence or the rest of the workspace.
    const rows = requireData(
      await resultifyRead(async () =>
        db
          .select({
            id: prospect.id,
            company,
            domain,
            name,
            email,
            subject,
            status: prospect.status,
            updatedAt: prospect.updatedAt,
          })
          .from(prospect)
          .where(where)
          .orderBy(desc(prospect.updatedAt), asc(prospect.id))
          .limit(REVIEW_PAGE_SIZE)
          .offset((page - 1) * REVIEW_PAGE_SIZE),
      ),
    );
    return {
      rows: rows.map((row) => ({
        ...row,
        status: row.status as ReviewStatus,
        updatedAt: row.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize: REVIEW_PAGE_SIZE,
    };
  });

export const getLinkedInQueue = (input: LinkedInSearchParams = {}) =>
  resultify(async (): Promise<LinkedInQueue> => {
    const query = parseLinkedInQuery(input);
    const prospect = schema.outboundProspect;
    const company = sql<string>`coalesce(${prospect.details}->>'company', '')`;
    const domain = sql<string>`coalesce(${prospect.details}->>'domain', '')`;
    const name = sql<string>`coalesce(${prospect.details}->>'name', '')`;
    const title = sql<string>`coalesce(${prospect.details}->>'title', '')`;
    const linkedinUrl = sql<string>`coalesce(${prospect.details}->>'linkedinUrl', '')`;
    const pattern = `%${query.q.replace(/[!%_]/g, "!$&")}%`;
    const where = and(
      notInArray(prospect.status, ["optedOut", "bounced", "skipped"]),
      query.campaign ? eq(prospect.campaignId, query.campaign) : undefined,
      sql`btrim(${linkedinUrl}) <> ''`,
      query.status === "all"
        ? undefined
        : eq(prospect.linkedinStatus, query.status),
      query.q
        ? or(
            ...[company, domain, name, title].map(
              (field) => sql`${field} ilike ${pattern} escape '!'`,
            ),
          )
        : undefined,
    );
    const total = requireData(await Prospects.count(Environment.SERVER, where));
    const page = Math.min(
      query.page,
      Math.max(1, Math.ceil(total / LINKEDIN_PAGE_SIZE)),
    );
    if (!total) return { rows: [], total, page, pageSize: LINKEDIN_PAGE_SIZE };
    // JSON projections keep drafts and evidence out of the paginated queue.
    const rows = requireData(
      await resultifyRead(async () =>
        db
          .select({
            id: prospect.id,
            company,
            domain,
            name,
            title,
            linkedinUrl,
            status: prospect.linkedinStatus,
            nextActionAt: prospect.linkedinNextActionAt,
            updatedAt: prospect.updatedAt,
            hasDraft: sql<boolean>`btrim(${prospect.linkedinDraft}) <> ''`,
          })
          .from(prospect)
          .where(where)
          .orderBy(
            sql`${prospect.linkedinNextActionAt} asc nulls last`,
            desc(prospect.updatedAt),
            asc(prospect.id),
          )
          .limit(LINKEDIN_PAGE_SIZE)
          .offset((page - 1) * LINKEDIN_PAGE_SIZE),
      ),
    );
    return {
      rows: rows.map((row) => ({
        ...row,
        nextActionAt: row.nextActionAt?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize: LINKEDIN_PAGE_SIZE,
    };
  });

const prospectItem = (
  input: { id: string },
  eligible: (row: ProspectRow) => boolean,
) =>
  resultify(
    async (): Promise<{ prospect: Prospect; playbook: Playbook } | null> => {
      const [configuration, result] = await Promise.all([
        policy(),
        Prospects.get(Environment.SERVER, input.id),
      ]);
      const row = requireData(result);
      if (!row || !eligible(row)) return null;
      const email = row.details.email.toLowerCase();
      const domains = [
        ...new Set([
          normalizeDomain(row.details.domain),
          email.split("@")[1] ?? "",
        ]),
      ];
      const resumeId = await latestDraftReviewRequest(undefined, row.id);
      const [suppressions, firsts, reviews, research] = await Promise.all([
        Suppressions.find(Environment.SERVER, {
          where: or(
            and(
              eq(schema.outboundSuppression.scope, "email"),
              eq(schema.outboundSuppression.value, email),
            ),
            and(
              eq(schema.outboundSuppression.scope, "domain"),
              inArray(schema.outboundSuppression.value, domains),
            ),
          ),
        }),
        Attempts.find(Environment.SERVER, {
          where: and(
            eq(schema.outboundSendAttempt.prospectId, row.id),
            eq(schema.outboundSendAttempt.step, 1),
            eq(schema.outboundSendAttempt.status, "accepted"),
          ),
          limit: 1,
        }),
        IntegrationJobs.find(Environment.SERVER, {
          where: and(
            eq(schema.outboundIntegrationJob.provider, "automation"),
            eq(schema.outboundIntegrationJob.prospectId, row.id),
            sql`${schema.outboundIntegrationJob.input}->>'operation' = 'draftReview'`,
            or(
              eq(schema.outboundIntegrationJob.status, "uncertain"),
              and(
                eq(schema.outboundIntegrationJob.status, "failed"),
                sql`${schema.outboundIntegrationJob.input}->>'prospectRevision' = ${String(row.revision)}`,
                sql`${schema.outboundIntegrationJob.input}->>'playbookRevision' = ${String(configuration.revision)}`,
                sql`${schema.outboundIntegrationJob.input}->>'readinessKey' = ${draftReviewReadinessKey(row.details, configuration.settings.senderConfirmed, configuration.settings.allowStaleEvidence, configuration.settings.trustSavedContactVerification, configuration.settings.allowProductObservations, configuration.settings.allowUsMarketWindow)}`,
                sql`${schema.outboundIntegrationJob.input}->>'resumeId' = ${resumeId}`,
              ),
            ),
          ),
          limit: 1,
          orderBy: [
            {
              column: schema.outboundIntegrationJob.updatedAt,
              direction: "desc",
            },
          ],
        }),
        resultify(() => assertShoppingEvidence(undefined, row, configuration)),
      ]);
      const first = requireData(firsts)[0];
      const original = first
        ? requireData(
            await Revisions.find(Environment.SERVER, {
              where: and(
                eq(schema.outboundRevision.prospectId, row.id),
                eq(schema.outboundRevision.revision, first.revision),
              ),
              limit: 1,
            }),
          )[0]
        : undefined;
      const prospect = view(
        row,
        configuration.settings,
        requireData(suppressions),
        original,
      );
      const review = requireData(reviews)[0];
      if (
        !research.success &&
        research.error.name === ValidationError.errorName
      )
        prospect.issues.push({
          code: "shoppingResearchRequired",
          field: "evidence",
        });
      if (
        !research.success &&
        research.error.name !== ValidationError.errorName
      )
        throw research.error;
      if (review)
        prospect.issues.push({
          code:
            review.status === "uncertain"
              ? "automaticReviewUncertain"
              : "automaticReviewFailed",
          field: "messages",
        });
      return { prospect, playbook: configuration.settings };
    },
  );

export const getReviewItem = (input: { id: string }) =>
  prospectItem(input, (row) => row.messages.length > 0);

export const getProspectItem = (input: { id: string }) =>
  prospectItem(input, () => true);

export const getLinkedInItem = (input: { id: string }) =>
  prospectItem(
    input,
    (row) =>
      Boolean(row.details.linkedinUrl.trim()) &&
      !["optedOut", "bounced", "skipped"].includes(row.status),
  );

/** Public mailbox metadata only; never load or decrypt transport credentials for a page. */
export const getInboxSummaries = () =>
  resultify(async (): Promise<Inbox[]> => {
    const rows = requireData(
      await resultifyRead(() =>
        db
          .select({
            id: schema.outboundInbox.id,
            email: schema.outboundInbox.email,
            fromName: schema.outboundInbox.fromName,
            signer: schema.outboundInbox.signer,
            enabled: schema.outboundInbox.enabled,
            transport: schema.outboundInbox.transport,
            connected: sql<boolean>`case when ${schema.outboundInbox.transport} = 'google-app-password'
          then coalesce(${schema.outboundInbox.appPassword} <> '', false)
          else coalesce(${schema.outboundInbox.refreshToken} <> '', false) end`,
            lastSyncedAt: schema.outboundInbox.lastSyncedAt,
            error: schema.outboundInbox.error,
            dailyCap: schema.outboundInbox.dailyCap,
            nextSendAt: schema.outboundInbox.nextSendAt,
          })
          .from(schema.outboundInbox),
      ),
    );
    return rows.map((row) => ({
      ...row,
      lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
      nextSendAt: row.nextSendAt?.toISOString() ?? null,
    }));
  });

/** The optional manual batch loads IDs on demand, with the same ordering and evidence rules. */
export const getPreparationSummary = () =>
  resultify(async () => {
    const prospect = schema.outboundProspect;
    // Match String.trim(), which the original client queue used for empty evidence.
    const whitespace =
      "\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff";
    const [configuration, records] = await Promise.all([
      policy(),
      resultifyRead(() =>
        db
          .select({
            id: prospect.id,
            candidate: sql<boolean>`${prospect.status} = 'candidate' and btrim(coalesce(${prospect.details}->>'evidence', ''), ${whitespace}) = ''`,
            verified: sql<boolean>`${prospect.status} in ('candidate','draft','approved')
          and ${prospect.details}->>'relationship' = 'cold'
          and coalesce(${prospect.details}->>'evidence', '') <> ''
          and coalesce(${prospect.details}->>'gap', '') <> ''
          and coalesce(${prospect.details}->>'finding', '') <> ''
          and coalesce(${prospect.details}->>'productUrl', '') <> ''`,
            checkedAt: sql<string>`coalesce(${prospect.details}->>'evidenceCheckedAt', '')`,
          })
          .from(prospect)
          .orderBy(desc(prospect.updatedAt))
          .limit(5000),
      ),
    ]);
    const rows = requireData(records);
    const now = Date.now();
    return {
      candidates: rows.filter((row) => row.candidate).map((row) => row.id),
      verified: rows
        .filter((row) => {
          const checked = Date.parse(row.checkedAt);
          return row.verified && checked <= now && now - checked < 86_400_000;
        })
        .map((row) => row.id),
      target: configuration.settings.weeklyTarget,
    };
  });

export const getWorkspace = () =>
  resultify(async (): Promise<Workspace> => {
    const [
      configuration,
      prospects,
      events,
      suppressions,
      inboxes,
      firsts,
      versions,
    ] = await Promise.all([
      policy(),
      Prospects.find(Environment.SERVER, {
        orderBy: [
          { column: schema.outboundProspect.updatedAt, direction: "desc" },
        ],
        limit: 5000,
      }),
      Events.find(Environment.SERVER, { limit: 200 }),
      Suppressions.find(Environment.SERVER),
      Inboxes.find(Environment.SERVER),
      Attempts.find(Environment.SERVER, {
        where: and(
          eq(schema.outboundSendAttempt.step, 1),
          eq(schema.outboundSendAttempt.status, "accepted"),
        ),
      }),
      Revisions.find(Environment.SERVER),
    ]);
    const entries = requireData(suppressions);
    const originals = new Map(
      requireData(firsts).map((attempt) => [
        attempt.prospectId,
        requireData(versions).find(
          (version) =>
            version.prospectId === attempt.prospectId &&
            version.revision === attempt.revision,
        ),
      ]),
    );
    return {
      playbook: configuration.settings,
      playbookRevision: configuration.revision,
      prospects: requireData(prospects).map((row) =>
        view(row, configuration.settings, entries, originals.get(row.id)),
      ),
      events: requireData(events).map((row) => ({
        id: row.id,
        prospectId: row.prospectId,
        kind: row.kind,
        detail: row.detail,
        actor: row.actor,
        createdAt: row.createdAt.toISOString(),
      })),
      suppressions: entries.map((row) => ({
        id: row.id,
        scope: row["scope"],
        value: row.value,
        reason: row["reason"],
        createdAt: row.createdAt.toISOString(),
      })),
      inboxes: requireData(inboxes).map((row) => ({
        id: row.id,
        email: row["email"],
        fromName: row.fromName,
        signer: row.signer,
        enabled: row.enabled,
        connected: mailboxConnected(row),
        transport: row.transport,
        lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
        error: row.error,
        dailyCap: row.dailyCap,
        nextSendAt: row.nextSendAt?.toISOString() ?? null,
      })),
    };
  });

const revoke = async (
  transaction: TransactionScope,
  prospect: ProspectRow,
  reason: string,
) => {
  const revisions = requireData(
    await Revisions.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundRevision.prospectId, prospect.id),
          eq(schema.outboundRevision.revision, prospect.revision),
        ),
      },
      { tx: transaction },
    ),
  );
  for (const revision of revisions)
    requireData(
      await Revisions.update(
        Environment.SERVER,
        revision.id,
        { revokedAt: new Date(), revokeReason: reason },
        { tx: transaction },
      ),
    );
};

/** Pause both cold sequences under the caller's workspace lock, without inventing a reply or opt-out. */
export const pauseColdOutreachWithin = async (
  transaction: TransactionScope,
  actor: string,
  input: { prospect: string; reason: string },
) => {
  const prospect = await findProspect(transaction, input.prospect);
  const stopped = [
    "held",
    "optedOut",
    "bounced",
    "replied",
    "skipped",
    "finished",
  ].includes(prospect.status);
  await revoke(transaction, prospect, input.reason);
  requireData(
    await Prospects.update(
      Environment.SERVER,
      prospect.id,
      {
        status: stopped ? prospect.status : "held",
        holdReason: stopped ? prospect.holdReason : input.reason,
        approvedAt: null,
        approvedBy: null,
        approvalHash: null,
        nextSendAt: null,
        linkedinStatus:
          prospect.linkedinStatus === "replied" ? "replied" : "closed",
        linkedinNextActionAt: null,
        updatedAt: new Date(),
      },
      { tx: transaction },
    ),
  );
  await event(transaction, actor, "hold", input.reason, prospect.id);
};

export const savePlaybookWithin = async (
  transaction: TransactionScope,
  actor: string,
  input: unknown,
  expectedRevision?: number,
) => {
  const parsed = playbookSchema.safeParse(input);
  if (!parsed.success)
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Invalid playbook.",
    );
  const templates = [
    parsed.data.subjectTemplate,
    parsed.data.bodyTemplate,
    parsed.data.followupOneTemplate,
    parsed.data.followupTwoTemplate,
    parsed.data.linkedinTemplate,
  ].flatMap(templateIssues);
  if (templates.length)
    throw new ValidationError(
      `Unknown template variable: ${templates[0]?.field}`,
    );
  if (parsed.data.sendingEnabled) {
    const inboxes = requireData(
      await Inboxes.find(
        Environment.SERVER,
        {
          where: inArray(schema.outboundInbox.email, senderPool(parsed.data)),
        },
        { tx: transaction },
      ),
    );
    if (
      !parsed.data.senderConfirmed ||
      inboxes.length !== senderPool(parsed.data).length ||
      inboxes.some(
        (inbox) =>
          !inbox.enabled ||
          !mailboxConnected(inbox) ||
          inbox.error ||
          !inbox.lastSyncedAt ||
          Date.now() - inbox.lastSyncedAt.getTime() > 10 * 60_000,
      )
    )
      throw new ValidationError(
        "Connect and synchronize the sender inbox before enabling delivery.",
      );
  }
  const current = await policy(transaction);
  if (expectedRevision !== undefined && current.revision !== expectedRevision)
    throw new ConflictError(
      "The Playbook changed. Review its current version before applying these settings.",
    );
  // Operational quotas, pauses and observation-age tolerance change no approved words or research scope.
  const contentPolicy = (settings: Playbook) => {
    const {
      sendingEnabled,
      automationEnabled,
      linkedinAutomationEnabled,
      senderConfirmed,
      historyConfirmed,
      allowIncompleteHistory,
      allowStaleEvidence,
      competingSendersPaused,
      senderTested,
      dailyCap,
      sendingRampEnabled,
      allowUsMarketWindow,
      automaticApolloEnabled,
      trustSavedContactVerification,
      allowProductObservations,
      dailyCompanyTarget,
      weeklyTarget,
      minGapMinutes,
      maxGapMinutes,
      ...content
    } = settings;
    return content;
  };
  const changed =
    JSON.stringify(contentPolicy(current.settings)) !==
    JSON.stringify(contentPolicy(parsed.data));
  const revision = current.revision + (changed ? 1 : 0);
  requireData(
    await Playbooks.upsert(
      Environment.SERVER,
      {
        id: "default",
        settings: parsed.data,
        revision,
        updatedBy: actor,
        updatedAt: new Date(),
      },
      { target: [schema.outboundPlaybook.id], tx: transaction },
    ),
  );
  const pending = changed
    ? requireData(
        await Prospects.find(
          Environment.SERVER,
          {
            where: inArray(schema.outboundProspect.status, [
              "approved",
              "active",
              "draft",
            ]),
          },
          { tx: transaction },
        ),
      )
    : [];
  for (const prospect of pending) {
    await revoke(transaction, prospect, "Playbook changed");
    requireData(
      await Prospects.update(
        Environment.SERVER,
        prospect.id,
        {
          status: prospect.sentStep > 0 ? "held" : "draft",
          approvedAt: null,
          approvedBy: null,
          approvalHash: null,
          nextSendAt: null,
          holdReason: "playbookChanged",
        },
        { tx: transaction },
      ),
    );
  }
  if (
    current.settings.allowIncompleteHistory !==
    parsed.data.allowIncompleteHistory
  )
    await event(
      transaction,
      actor,
      "historicalContactPolicyChanged",
      parsed.data.allowIncompleteHistory
        ? "Previous campaign history import made optional; repeat-contact risk accepted. Known exclusions, replies and Outbound send records remain enforced."
        : "Previous campaign history import required again before delivery.",
    );
  await event(
    transaction,
    actor,
    "playbookUpdated",
    `Playbook revision ${revision}; ${pending.length} pending sequences returned to review.`,
  );
  return { revision };
};

export const savePlaybook = (
  actor: string,
  input: unknown,
  expectedRevision?: number,
) =>
  transaction((transaction) =>
    savePlaybookWithin(transaction, actor, input, expectedRevision),
  );

const findProspect = async (transaction: TransactionScope, id: string) => {
  const prospect = requireData(
    await Prospects.get(Environment.SERVER, id, { tx: transaction }),
  );
  if (!prospect) throw new NotFoundError("Prospect not found.");
  return prospect;
};

const saveProspectWithin = async (
  transaction: TransactionScope,
  actor: string,
  input: ProspectInput,
  imported = false,
) => {
  const domain = normalizeDomain(input.domain);
  if (!domain) throw new ValidationError("Enter a valid store domain.");
  const previous = input.id ? await findProspect(transaction, input.id) : null;
  if (
    previous?.sentStep &&
    (previous.details.email.toLowerCase() !== input.email.toLowerCase() ||
      normalizeDomain(previous.details.domain) !== domain)
  )
    throw new ConflictError("The recipient of a sent sequence cannot change.");
  const companies = requireData(
    await Companies.find(
      Environment.SERVER,
      { where: eq(schema.outboundCompany.domain, domain), limit: 1 },
      { tx: transaction },
    ),
  );
  const company =
    companies[0] ??
    requireData(
      await Companies.create(
        Environment.SERVER,
        {
          domain,
          name: input.company,
          website: input.website || `https://${domain}`,
          country: input.country,
          relationship: input.relationship,
          source: input.source,
        },
        { tx: transaction },
      ),
    );
  const existing =
    previous ??
    requireData(
      await Prospects.find(
        Environment.SERVER,
        { where: eq(schema.outboundProspect.companyId, company.id), limit: 1 },
        { tx: transaction },
      ),
    )[0];
  if (!previous && existing) {
    if (imported)
      return {
        prospect: existing.id,
        imported: false,
        revision: existing.revision,
      };
    throw new ConflictError(
      "This company already has a prospect. Update that record to keep one contact per company.",
    );
  }
  if (previous && previous.companyId !== company.id)
    throw new ConflictError(
      "A prospect's company cannot be replaced. Create a separate company record.",
    );
  const identityKey = `${company.id}:${input.email.toLowerCase() || input.linkedinUrl || input.name.toLowerCase()}`;
  const people = requireData(
    await People.find(
      Environment.SERVER,
      { where: eq(schema.outboundPerson.identityKey, identityKey), limit: 1 },
      { tx: transaction },
    ),
  );
  const person =
    people[0] ??
    requireData(
      await People.create(
        Environment.SERVER,
        {
          companyId: company.id,
          identityKey,
          name: input.name,
          email: input.email.toLowerCase(),
          linkedinUrl: input.linkedinUrl,
          title: input.title,
        },
        { tx: transaction },
      ),
    );
  requireData(
    await Companies.update(
      Environment.SERVER,
      company.id,
      {
        name: input.company,
        website: input.website || `https://${domain}`,
        country: input.country,
        relationship: input.relationship,
        source: input.source,
        updatedAt: new Date(),
      },
      { tx: transaction },
    ),
  );
  requireData(
    await People.update(
      Environment.SERVER,
      person.id,
      { name: input.name, title: input.title },
      { tx: transaction },
    ),
  );
  const details = {
    ...input,
    domain,
    email: input.email.toLowerCase(),
    website: input.website || `https://${domain}`,
  };
  const prospect = existing
    ? requireData(
        await Prospects.update(
          Environment.SERVER,
          existing.id,
          {
            details,
            personId: person.id,
            status: ["optedOut", "bounced", "replied", "finished"].includes(
              existing.status,
            )
              ? existing.status
              : existing.sentStep || existing.status === "held"
                ? "held"
                : existing.messages.length
                  ? "draft"
                  : "candidate",
            approvedAt: null,
            approvedBy: null,
            approvalHash: null,
            nextSendAt: null,
            revision: existing.revision + 1,
            holdReason:
              existing.status === "held"
                ? existing.holdReason
                : existing.sentStep
                  ? "detailsChanged"
                  : "",
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      )
    : requireData(
        await Prospects.create(
          Environment.SERVER,
          {
            companyId: company.id,
            personId: person.id,
            details,
            createdBy: actor,
          },
          { tx: transaction },
        ),
      );
  if (!prospect) throw new NotFoundError("Prospect not found.");
  if (existing) await revoke(transaction, existing, "Prospect details changed");
  await event(
    transaction,
    actor,
    existing ? "prospectUpdated" : "prospectAdded",
    `${input.company}: ${input.name}`,
    prospect.id,
  );
  return { prospect: prospect.id, imported: true, revision: prospect.revision };
};

export const saveProspect = (actor: string, input: unknown) =>
  transaction(async (transaction) => {
    const parsed = prospectSchema.safeParse(input);
    if (!parsed.success)
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid prospect.",
      );
    return saveProspectWithin(transaction, actor, parsed.data);
  });

/** Accept the existing import's verification label without inventing a newer check. */
export const trustSavedContact = (
  actor: string,
  input: { prospect: string; revision: number },
) =>
  transaction(async (transaction) => {
    const prospect = await findProspect(transaction, input.prospect);
    const current = await policy(transaction);
    if (!current.settings.trustSavedContactVerification)
      throw new ValidationError(
        "Enable saved contact verification in the Playbook first.",
      );
    if (prospect.revision !== input.revision)
      throw new ConflictError("The saved contact changed before acceptance.");
    if (
      prospect.createdBy !== LEGACY_CONTACT_IMPORT_ACTOR ||
      !savedContactSourceVerified(prospect.details) ||
      prospect.sentStep > 0 ||
      !["candidate", "draft"].includes(prospect.status)
    )
      throw new ValidationError(
        "Only an unsent source-verified contact from the original import can be accepted.",
      );
    if (prospect.details.savedContactVerificationId) {
      await assertSavedContactVerification(transaction, prospect);
      return {
        prospect: prospect.id,
        revision: prospect.revision,
        verificationId: prospect.details.savedContactVerificationId,
      };
    }
    const previous = requireData(
      await IntegrationJobs.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundIntegrationJob.prospectId, prospect.id),
            sql`${schema.outboundIntegrationJob.input}->>'operation' = 'savedContactVerification'`,
          ),
          limit: 1,
        },
        { tx: transaction },
      ),
    )[0];
    if (previous)
      throw new ConflictError(
        "The original accepted contact receipt cannot be replaced.",
      );
    const receipt = requireData(
      await IntegrationJobs.create(
        Environment.SERVER,
        {
          provider: "automation",
          prospectId: prospect.id,
          requestId: `saved-contact-verification:${prospect.id}`,
          status: "complete",
          input: savedContactReceiptSchema.parse({
            operation: "savedContactVerification",
            prospectId: prospect.id,
            importedBy: prospect.createdBy,
            importedAt: prospect.createdAt.toISOString(),
            acceptedBy: actor,
            acceptedAt: new Date().toISOString(),
            originalRevision: prospect.revision,
            identity: savedContactIdentitySchema.parse(prospect.details),
          }),
        },
        { tx: transaction },
      ),
    );
    const saved = await saveProspectWithin(transaction, actor, {
      ...prospect.details,
      id: prospect.id,
      savedContactVerificationId: receipt.id,
    });
    await event(
      transaction,
      actor,
      "savedContactAccepted",
      "Accepted the imported source's verified label and saved role. Original observation dates remain unchanged.",
      prospect.id,
    );
    return { ...saved, verificationId: receipt.id };
  });

/** Claim a researched company for one prospect in the same workspace transaction. */
export const saveCampaignProspect = (
  actor: string,
  input: { company: string; revision: number; prospect: unknown },
) =>
  transaction(async (transaction) => {
    const candidate = requireData(
      await CampaignCompanies.get(Environment.SERVER, input.company, {
        tx: transaction,
      }),
    );
    if (candidate?.status !== "candidate")
      throw new ConflictError(
        "This company is no longer available for contact selection.",
      );
    const campaign = requireData(
      await Campaigns.get(Environment.SERVER, candidate.campaignId, {
        tx: transaction,
      }),
    );
    if (!campaign || !["draft", "active"].includes(campaign.status))
      throw new ConflictError("Resume the campaign before adding a contact.");
    if (campaign.revision !== input.revision)
      throw new ConflictError(
        "The campaign criteria changed. Reopen this company before adding a contact.",
      );
    if (candidate.criteriaRevision !== campaign.revision)
      throw new ConflictError(
        "Research this company again under the current campaign criteria.",
      );
    const parsed = prospectSchema.safeParse(input.prospect);
    if (!parsed.success)
      throw new ValidationError("Review the company and contact fields.");
    if (
      parsed.data.id ||
      normalizeDomain(parsed.data.domain) !== candidate.domain
    )
      throw new ValidationError(
        "The prospect must belong to this campaign company.",
      );
    const settings = (await policy(transaction)).settings;
    const entries = requireData(
      await Suppressions.find(Environment.SERVER, {}, { tx: transaction }),
    );
    if (
      parsed.data.relationship !== "cold" ||
      !campaignCountryMatches(
        splitList(settings.allowedCountries),
        parsed.data.country,
      ) ||
      campaignCountryMatches(
        splitList(settings.heldCountries),
        parsed.data.country,
      ) ||
      splitList(settings.excludedDomains)
        .map(normalizeDomain)
        .includes(candidate.domain) ||
      companyExcluded(settings, candidate.name) ||
      companyExcluded(settings, parsed.data.company) ||
      entries.some(
        (entry) =>
          normalizeDomain(
            entry.scope === "domain"
              ? entry.value
              : (entry.value.split("@")[1] ?? ""),
          ) === candidate.domain,
      )
    )
      throw new ConflictError(
        "This company is excluded by the current Playbook or contact history.",
      );
    const existingCompanies = requireData(
      await Companies.find(
        Environment.SERVER,
        {
          where: eq(schema.outboundCompany.domain, candidate.domain),
          limit: 1,
        },
        { tx: transaction },
      ),
    );
    if (
      existingCompanies.some(
        (company) =>
          company.relationship !== "cold" ||
          (company.lastContactedAt &&
            Date.now() - company.lastContactedAt.getTime() < 180 * 86400000),
      )
    )
      throw new ConflictError(
        "This company already has a relationship or recent contact history.",
      );
    const saved = await saveProspectWithin(transaction, actor, parsed.data);
    requireData(
      await Prospects.update(
        Environment.SERVER,
        saved.prospect,
        {
          campaignId: campaign.id,
        },
        { tx: transaction },
      ),
    );
    requireData(
      await CampaignCompanies.update(
        Environment.SERVER,
        candidate.id,
        {
          status: "added",
          prospectId: saved.prospect,
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    return saved;
  });

export const assertCampaignActive = async (
  transaction: TransactionScope,
  prospect: ProspectRow,
) => {
  if (!prospect.campaignId) return;
  const campaign = requireData(
    await Campaigns.get(Environment.SERVER, prospect.campaignId, {
      tx: transaction,
    }),
  );
  if (campaign?.status !== "active")
    throw new ConflictError(
      "Activate this prospect's campaign before approving or delivering messages.",
    );
  const criteria = campaign.criteria;
  const details = prospect.details;
  if (
    !campaignCountryMatches(criteria.countries, details.country) ||
    !criteria.platforms.includes(
      details.platform as "shopify" | "woocommerce",
    ) ||
    campaignDomainExcluded(criteria, details.domain)
  )
    throw new ConflictError(
      "This prospect no longer matches its campaign criteria.",
    );
  const companies = requireData(
    await CampaignCompanies.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundCampaignCompany.campaignId, campaign.id),
          eq(schema.outboundCampaignCompany.prospectId, prospect.id),
        ),
        limit: 1,
      },
      { tx: transaction },
    ),
  );
  const company = companies[0];
  if (
    !company ||
    companyQualificationIssues(criteria, {
      ...company,
      country: details.country,
      platform: details.platform as "shopify" | "woocommerce",
    }).length
  )
    throw new ConflictError(
      "Verify the company against the campaign's size and revenue criteria before approval.",
    );
  if (
    isExcludedRole(details.title, criteria.excludedRoles) ||
    !criteria.targetRoles.some((role) => matchesRole(details.title, role))
  )
    throw new ConflictError(
      "Review this contact's role against the campaign criteria.",
    );
};

export const patchProspect = (
  actor: string,
  id: string,
  patch: Partial<ProspectInput>,
  expectedRevision?: number,
) =>
  transaction(async (transaction) => {
    const prospect = await findProspect(transaction, id);
    if (
      expectedRevision !== undefined &&
      prospect.revision !== expectedRevision
    )
      throw new ConflictError(
        "The prospect changed while this check was running. Review the result before applying it.",
      );
    const parsed = prospectSchema.safeParse({
      ...prospect.details,
      ...patch,
      id,
    });
    if (!parsed.success) throw new ValidationError("Invalid prospect update.");
    const receipts = new Set([
      "id",
      "emailVerifiedAt",
      "mxCheckedAt",
      "evidenceCheckedAt",
      "roleCheckedAt",
    ]);
    // New schema defaults are storage normalization, not a changed approved fact.
    const previous = prospectSchema.parse({ ...prospect.details, id });
    const unchanged = Object.entries(parsed.data).every(
      ([key, value]) =>
        receipts.has(key) ||
        isDeepStrictEqual(previous[key as keyof ProspectInput], value),
    );
    if (unchanged) {
      requireData(
        await Prospects.update(
          Environment.SERVER,
          id,
          { details: parsed.data, updatedAt: new Date() },
          { tx: transaction },
        ),
      );
      await event(
        transaction,
        actor,
        "evidenceRechecked",
        "Fresh receipts confirmed the same approved facts.",
        id,
      );
      return { prospect: id, imported: false, revision: prospect.revision };
    }
    return saveProspectWithin(transaction, actor, parsed.data);
  });

const writeMessages = async (
  transaction: TransactionScope,
  actor: string,
  prospect: ProspectRow,
  messages: Message[],
) => {
  if (
    ["replied", "optedOut", "bounced", "finished", "skipped"].includes(
      prospect.status,
    )
  )
    throw new ConflictError(
      "This sequence is closed. Draft editing cannot reactivate it.",
    );
  const current = await policy(transaction);
  const revision = prospect.revision + 1;
  await assertShoppingEvidence(transaction, prospect, current);
  const manifest = approvalManifest(
    prospect,
    current.settings,
    current.revision,
  );
  await revoke(transaction, prospect, "Draft changed");
  requireData(
    await Revisions.create(
      Environment.SERVER,
      {
        prospectId: prospect.id,
        revision,
        messages,
        manifest,
        contentHash: contentHash(messages, manifest),
      },
      { tx: transaction },
    ),
  );
  requireData(
    await Prospects.update(
      Environment.SERVER,
      prospect.id,
      {
        messages,
        revision,
        playbookRevision: current.revision,
        status: prospect.status === "held" ? "held" : "draft",
        approvedAt: null,
        approvedBy: null,
        approvalHash: null,
        holdReason: prospect.status === "held" ? prospect.holdReason : "",
        nextSendAt: null,
        updatedAt: new Date(),
      },
      { tx: transaction },
    ),
  );
  await event(
    transaction,
    actor,
    "draftUpdated",
    `Draft revision ${revision}`,
    prospect.id,
  );
  return {
    prospect: prospect.id,
    revision,
    issues: [
      ...prospectIssues(prospect.details, current.settings),
      ...lintMessages(messages, current.settings, prospect.details),
    ],
  };
};

export const generateDraftsWithin = async (
  transaction: TransactionScope,
  actor: string,
  input: { prospect: string; expectedRevision?: number },
) => {
  const prospect = await findProspect(transaction, input.prospect);
  if (
    input.expectedRevision !== undefined &&
    (prospect.revision !== input.expectedRevision ||
      !["candidate", "draft"].includes(prospect.status) ||
      !["", "playbookChanged"].includes(prospect.holdReason))
  )
    throw new ConflictError(
      "The prospect changed or was held before automatic drafting.",
    );
  if (prospect.sentStep)
    throw new ConflictError(
      "A sent sequence's original draft cannot be regenerated.",
    );
  const current = await policy(transaction);
  if (!personalSourceReadyForDraft(prospect.details, current.settings))
    throw new ValidationError(
      "Reopen and date the personal source before drafting, or remove the personal line.",
    );
  return writeMessages(
    transaction,
    actor,
    prospect,
    renderMessages(prospect.details, current.settings),
  );
};

export const generateDrafts = (actor: string, input: { prospect: string }) =>
  transaction((transaction) => generateDraftsWithin(transaction, actor, input));

export const saveDraft = (actor: string, input: unknown) =>
  transaction(async (transaction) => {
    const parsed = draftSchema.safeParse(input);
    if (!parsed.success)
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid draft.",
      );
    const prospect = await findProspect(transaction, parsed.data.prospect);
    if (
      prospect.sentStep &&
      (parsed.data.subject !== prospect.messages[0]?.subject ||
        parsed.data.body !== prospect.messages[0]?.body ||
        (prospect.sentStep >= 2 &&
          parsed.data.followupOne !== prospect.messages[1]?.body) ||
        (prospect.sentStep >= 3 &&
          parsed.data.followupTwo !== prospect.messages[2]?.body))
    )
      throw new ConflictError(
        "Previously sent message text is immutable. Only remaining follow-ups can be edited.",
      );
    if (prospect.revision !== parsed.data.revision)
      throw new ConflictError(
        "This draft changed in another session. Reload it before editing.",
      );
    const current = await policy(transaction);
    return writeMessages(transaction, actor, prospect, [
      {
        step: 1,
        afterDays: 0,
        subject: parsed.data.subject,
        body: parsed.data.body,
      },
      {
        step: 2,
        afterDays: current.settings.followupOneDays,
        subject: `Re: ${parsed.data.subject}`,
        body: parsed.data.followupOne,
      },
      {
        step: 3,
        afterDays: current.settings.followupTwoDays,
        subject: `Re: ${parsed.data.subject}`,
        body: parsed.data.followupTwo,
      },
    ]);
  });

type AutomaticApproval =
  | { automationJobId: string; reviewJobId?: never }
  | { reviewJobId: string; automationJobId?: never };

const reviewProspectWithin = async (
  transaction: TransactionScope,
  actor: string,
  input: unknown,
  automatic?: AutomaticApproval,
) => {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("Invalid review decision.");
  const prospect = await findProspect(transaction, parsed.data.prospect);
  if (prospect.revision !== parsed.data.revision)
    throw new ConflictError(
      "This draft changed in another session. Review the current version.",
    );
  if (["optedOut", "bounced", "replied", "finished"].includes(prospect.status))
    throw new ConflictError(
      "This sequence is closed and cannot be reactivated.",
    );
  const current = await policy(transaction);
  if (parsed.data.decision === "approve") {
    await assertCampaignActive(transaction, prospect);
    if (automatic) {
      const identifier = z
        .string()
        .uuid()
        .safeParse(automatic.reviewJobId ?? automatic.automationJobId);
      if (
        !current.settings.automationEnabled ||
        !prospect.campaignId ||
        !identifier.success
      )
        throw new ConflictError(
          "Automatic mode is not enabled for this campaign.",
        );
      const reviewJob = automatic.reviewJobId
        ? requireData(
            await IntegrationJobs.get(Environment.SERVER, identifier.data, {
              tx: transaction,
            }),
          )
        : null;
      if (
        automatic.reviewJobId &&
        (reviewJob?.provider !== "automation" ||
          reviewJob.status !== "starting" ||
          reviewJob.input["operation"] !== "draftReview" ||
          reviewJob.prospectId !== prospect.id ||
          reviewJob.input["playbookRevision"] !== current.revision ||
          reviewJob.output?.["appliedProspectRevision"] !== prospect.revision)
      )
        throw new ConflictError(
          "The automatic review no longer matches this draft.",
        );
      const evidenceId = automatic.reviewJobId
        ? prospect.details.automationEvidenceId
        : identifier.data;
      const [job, campaign] = await Promise.all([
        evidenceId
          ? IntegrationJobs.get(Environment.SERVER, evidenceId, {
              tx: transaction,
            })
          : Promise.resolve({ success: true as const, data: null }),
        Campaigns.get(Environment.SERVER, prospect.campaignId, {
          tx: transaction,
        }),
      ]);
      const source = requireData(job);
      const target = requireData(campaign);
      const selection = z
        .object({ status: z.literal("selected") })
        .safeParse(source?.output?.["selection"]);
      if (target?.status !== "active")
        throw new ConflictError("The campaign is not active.");
      if (
        evidenceId &&
        (source?.provider !== "automation" ||
          (automatic.reviewJobId
            ? !["complete", "failed"].includes(source.status)
            : source.status !== "starting") ||
          prospect.details.automationEvidenceId !== source.id ||
          source.input["operation"] !== "campaignAutomation" ||
          source.input["campaignId"] !== target.id ||
          source.input["campaignRevision"] !== target.revision ||
          (!automatic.reviewJobId &&
            source.input["playbookRevision"] !== current.revision) ||
          (!automatic.reviewJobId && source.output?.["stage"] !== "approve") ||
          source.output?.["prospectId"] !== prospect.id ||
          (!automatic.reviewJobId &&
            source.output?.["prospectRevision"] !== prospect.revision) ||
          !selection.success ||
          !qualifiedProductSchema.safeParse(source.output?.["qualification"])
            .success)
      )
        throw new ConflictError(
          "The automatic checks no longer match this campaign or draft.",
        );
      if (!source && !prospect.details.shoppingResearchId)
        throw new ValidationError(
          "Saved shopping research is required for automatic review.",
        );
      await assertAutomaticReviewVerification(transaction, prospect);
    }
    await assertAutomaticEvidence(transaction, prospect);
    const entries = requireData(
      await Suppressions.find(Environment.SERVER, {}, { tx: transaction }),
    );
    const issues = issuesFor(prospect, current.settings, entries);
    const peers = requireData(
      await Prospects.find(
        Environment.SERVER,
        {
          where: inArray(schema.outboundProspect.status, [
            "approved",
            "active",
          ]),
        },
        { tx: transaction },
      ),
    );
    issues.push(
      ...draftSimilarityIssues(
        prospect.messages,
        peers
          .filter((peer) => peer.id !== prospect.id)
          .map((peer) => peer.messages),
        current.settings,
      ),
    );
    if (issues.length)
      throw new ValidationError(
        `Resolve the review checks before approving: ${issues.map((issue) => issue.code).join(", ")}`,
      );
    if (prospect.playbookRevision !== current.revision)
      throw new ConflictError(
        "The playbook changed. Save or regenerate the draft before approval.",
      );
    const revisions = requireData(
      await Revisions.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundRevision.prospectId, prospect.id),
            eq(schema.outboundRevision.revision, prospect.revision),
          ),
          limit: 1,
        },
        { tx: transaction },
      ),
    );
    const revision = revisions[0];
    const hash = contentHash(
      prospect.messages,
      approvalManifest(prospect, current.settings, current.revision),
    );
    if (!revision || revision.contentHash !== hash)
      throw new ConflictError(
        "The draft evidence changed. Save a new draft version before approval.",
      );
    const now = new Date();
    const approvalActor = automatic ? `automatic:${actor}` : actor;
    requireData(
      await Revisions.update(
        Environment.SERVER,
        revision.id,
        {
          approvedBy: approvalActor,
          approvedAt: now,
          revokedAt: null,
          revokeReason: null,
        },
        { tx: transaction },
      ),
    );
    requireData(
      await Prospects.update(
        Environment.SERVER,
        prospect.id,
        {
          status: prospect.sentStep ? "active" : "approved",
          approvedBy: approvalActor,
          approvedAt: now,
          approvalHash: hash,
          holdReason: "",
          nextSendAt: prospect.firstSentAt
            ? new Date(
                Math.max(
                  prospect.firstSentAt.getTime() +
                    (prospect.messages.find(
                      (message) => message.step === prospect.sentStep + 1,
                    )?.afterDays ?? 0) *
                      86_400_000,
                  (prospect.lastSentAt?.getTime() ?? 0) + 86_400_000,
                ),
              )
            : now,
          updatedAt: now,
        },
        { tx: transaction },
      ),
    );
  } else {
    await revoke(
      transaction,
      prospect,
      parsed.data.reason || parsed.data.decision,
    );
    requireData(
      await Prospects.update(
        Environment.SERVER,
        prospect.id,
        {
          status:
            parsed.data.decision === "hold"
              ? "held"
              : parsed.data.decision === "skip"
                ? "skipped"
                : "draft",
          approvedAt: null,
          approvedBy: null,
          approvalHash: null,
          nextSendAt: null,
          holdReason: parsed.data.reason,
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
  }
  await event(
    transaction,
    actor,
    automatic ? "automaticApproval" : parsed.data.decision,
    automatic
      ? `Automatic checks passed for revision ${prospect.revision}; evidence job ${automatic.reviewJobId ?? automatic.automationJobId}.`
      : parsed.data.reason || `Sequence ${parsed.data.decision}`,
    prospect.id,
  );
  return { prospect: prospect.id };
};

export const reviewProspect = (
  actor: string,
  input: unknown,
  automatic?: AutomaticApproval,
) =>
  transaction((transaction) =>
    reviewProspectWithin(transaction, actor, input, automatic),
  );

/** Operator-only recovery for an audited receipt-normalization revocation. */
export const restoreReceiptNormalizationApproval = (
  actor: string,
  input: unknown,
) =>
  transaction(async (transaction) => {
    const parsed = z
      .object({
        prospect: z.string().uuid(),
        revision: z.number().int().positive(),
        updatedAt: z.string().datetime(),
        incidentEventId: z.string().uuid(),
        priorRevisionId: z.string().uuid(),
        contentHash: z.string().regex(/^[a-f0-9]{64}$/),
        nextSendAt: z.string().datetime(),
        snapshot: z.string().trim().min(1).max(500),
      })
      .safeParse(input);
    if (!parsed.success)
      throw new ValidationError(
        "An exact audited recovery snapshot is required.",
      );
    const expected = parsed.data;
    const prospect = await findProspect(transaction, expected.prospect);
    const version = requireData(
      await Revisions.get(Environment.SERVER, expected.priorRevisionId, {
        tx: transaction,
      }),
    );
    const incident = requireData(
      await Events.get(Environment.SERVER, expected.incidentEventId, {
        tx: transaction,
      }),
    );
    if (
      prospect.revision !== expected.revision ||
      prospect.updatedAt.toISOString() !== expected.updatedAt ||
      prospect.approvedAt ||
      prospect.approvedBy ||
      prospect.approvalHash ||
      prospect.nextSendAt ||
      prospect.sentStep >= 3 ||
      (prospect.sentStep
        ? prospect.status !== "held" || prospect.holdReason !== "detailsChanged"
        : prospect.status !== "draft" || prospect.holdReason !== "") ||
      !version?.approvedAt ||
      !version.approvedBy ||
      !version.revokedAt ||
      version.prospectId !== prospect.id ||
      version.revision !== prospect.revision - 1 ||
      version.revokeReason !== "Prospect details changed" ||
      version.contentHash !== expected.contentHash ||
      !isDeepStrictEqual(version.messages, prospect.messages) ||
      Math.abs(version.revokedAt.getTime() - prospect.updatedAt.getTime()) >
        1000 ||
      incident?.prospectId !== prospect.id ||
      incident.kind !== "prospectUpdated" ||
      incident.actor !== "outbound-worker" ||
      Math.abs(incident.createdAt.getTime() - prospect.updatedAt.getTime()) >
        1000
    )
      throw new ConflictError(
        "The current record no longer matches the audited receipt incident.",
      );
    const newer = requireData(
      await Revisions.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundRevision.prospectId, prospect.id),
            gte(schema.outboundRevision.revision, prospect.revision),
          ),
          limit: 1,
        },
        { tx: transaction },
      ),
    );
    if (newer.length)
      throw new ConflictError(
        "A newer draft exists and must be reviewed normally.",
      );
    const current = await policy(transaction);
    if (
      prospect.playbookRevision !== current.revision ||
      version.contentHash !== contentHash(version.messages, version.manifest) ||
      version.contentHash !==
        contentHash(
          prospect.messages,
          approvalManifest(prospect, current.settings, current.revision),
        )
    )
      throw new ConflictError(
        "The previously approved content or policy no longer matches.",
      );
    const conversations = await transaction
      .select({
        inbound: schema.outboundConversation.lastInboundAt,
        stage: schema.outboundConversation.stage,
      })
      .from(schema.outboundConversation)
      .where(eq(schema.outboundConversation.prospectId, prospect.id));
    if (
      conversations.some(
        (conversation) => conversation.inbound || conversation.stage !== "open",
      )
    )
      throw new ConflictError(
        "A reply or conversation decision prevents sequence restoration.",
      );
    const attempts = requireData(
      await Attempts.find(
        Environment.SERVER,
        {
          where: eq(schema.outboundSendAttempt.prospectId, prospect.id),
        },
        { tx: transaction },
      ),
    );
    if (
      attempts.length !== prospect.sentStep ||
      attempts.some(
        (attempt) =>
          attempt.test ||
          attempt.status !== "accepted" ||
          attempt.step > prospect.sentStep,
      ) ||
      (prospect.sentStep &&
        (!prospect.firstSentAt ||
          !prospect.lastSentAt ||
          !prospect.threadId ||
          !prospect.inboxId))
    )
      throw new ConflictError(
        "Delivery history changed or contains an unresolved attempt.",
      );
    for (const attempt of attempts)
      await immutableDelivery(transaction, attempt);
    const next = prospect.messages.find(
      (message) => message.step === prospect.sentStep + 1,
    );
    if (!next)
      throw new ConflictError("The saved sequence has no remaining message.");
    const scheduled =
      prospect.firstSentAt && prospect.lastSentAt
        ? new Date(
            Math.max(
              prospect.firstSentAt.getTime() + next.afterDays * 86_400_000,
              prospect.lastSentAt.getTime() + 86_400_000,
            ),
          )
        : version.approvedAt;
    if (scheduled.toISOString() !== expected.nextSendAt)
      throw new ConflictError(
        "The audited schedule does not match the immutable delivery history.",
      );

    // Normal approval performs current campaign, source, opt-out, and copy checks.
    // A failure rolls back both this temporary revision pointer and the approval.
    requireData(
      await Prospects.update(
        Environment.SERVER,
        prospect.id,
        {
          revision: version.revision,
        },
        { tx: transaction },
      ),
    );
    await reviewProspectWithin(transaction, actor, {
      prospect: prospect.id,
      revision: version.revision,
      decision: "approve",
      reason: "",
    });
    requireData(
      await Revisions.update(
        Environment.SERVER,
        version.id,
        {
          approvedAt: version.approvedAt,
          approvedBy: version.approvedBy,
        },
        { tx: transaction },
      ),
    );
    requireData(
      await Prospects.update(
        Environment.SERVER,
        prospect.id,
        {
          approvedAt: version.approvedAt,
          approvedBy: version.approvedBy,
          nextSendAt: scheduled,
        },
        { tx: transaction },
      ),
    );
    await event(
      transaction,
      actor,
      "approvalRestored",
      `Restored unchanged revision ${version.revision} after receipt-normalization incident ${incident.id}; original approval and schedule retained. Snapshot: ${expected.snapshot}`,
      prospect.id,
    );
    return {
      prospect: prospect.id,
      revision: version.revision,
      status: prospect.sentStep ? "active" : "approved",
      nextSendAt: scheduled.toISOString(),
    };
  });

export const approveAutomatically = (
  actor: string,
  input: { prospect: string; revision: number; automationJobId: string },
) =>
  reviewProspect(
    actor,
    {
      prospect: input.prospect,
      revision: input.revision,
      decision: "approve",
      reason: "",
    },
    { automationJobId: input.automationJobId },
  );

export const latestDraftReviewRequest = async (
  transaction: TransactionScope | undefined,
  prospect: string,
) =>
  requireData(
    await Events.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundEvent.prospectId, prospect),
          eq(schema.outboundEvent.kind, "review"),
        ),
        orderBy: [
          { column: schema.outboundEvent.createdAt, direction: "desc" },
          { column: schema.outboundEvent.id, direction: "desc" },
        ],
        limit: 1,
      },
      { tx: transaction },
    ),
  )[0]?.id ?? "";

/** Editable email labels are not a verification receipt. Correlate the saved provider request. */
const assertAutomaticReviewVerification = async (
  transaction: TransactionScope,
  prospect: ProspectRow,
) => {
  if (await assertSavedContactVerification(transaction, prospect)) return;
  const match = /^Apollo verification (.+); record (.+)$/.exec(
    prospect.details.emailSource,
  );
  if (!match)
    throw new ValidationError(
      "A saved email verification receipt is required for automatic review.",
    );
  const verified = requireData(
    await IntegrationJobs.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundIntegrationJob.provider, "apollo"),
          eq(schema.outboundIntegrationJob.prospectId, prospect.id),
          eq(schema.outboundIntegrationJob.requestId, match[1]!),
        ),
        limit: 1,
      },
      { tx: transaction },
    ),
  )[0];
  const source =
    verified ??
    (prospect.details.automationEvidenceId
      ? requireData(
          await IntegrationJobs.get(
            Environment.SERVER,
            prospect.details.automationEvidenceId,
            { tx: transaction },
          ),
        )
      : null);
  const automatic = !verified && Boolean(prospect.details.automationEvidenceId);
  const request = automatic
    ? source?.output?.["verification"]
    : {
        requestId: source?.requestId,
        records: source?.output?.["records"],
      };
  const response = automatic
    ? source?.output?.["verificationResult"]
    : {
        requestId: source?.requestId,
        status: source?.status,
        results: source?.output?.["results"],
      };
  const verification = z
    .object({
      requestId: z.string(),
      records: z.array(
        z.object({
          record_id: z.string(),
          input: z.object({ email: z.string() }),
        }),
      ),
    })
    .safeParse(request);
  const result = z
    .object({
      requestId: z.string(),
      status: z.literal("complete"),
      results: z.array(
        z.object({
          recordId: z.string(),
          email: z.string(),
          status: z.string(),
          verifiedAt: z.string().nullable(),
        }),
      ),
    })
    .safeParse(response);
  if (
    !source ||
    (automatic
      ? !["starting", "complete", "failed"].includes(source.status)
      : source.status !== "complete" ||
        source.input["operation"] !== "verify" ||
        String(source.input["email"]).toLowerCase() !==
          prospect.details.email.toLowerCase()) ||
    !verification.success ||
    !result.success ||
    verification.data.requestId !== match[1] ||
    result.data.requestId !== match[1]
  )
    throw new ValidationError(
      "The saved email verification request does not match this recipient.",
    );
  const matches = result.data.results.filter(
    (record) =>
      record.email.toLowerCase() === prospect.details.email.toLowerCase() &&
      record.recordId === match[2] &&
      verification.data.records.some(
        (input) =>
          input.record_id === record.recordId &&
          input.input.email.toLowerCase() === record.email.toLowerCase(),
      ),
  );
  if (
    matches.length !== 1 ||
    matches[0]?.status !== "verified" ||
    matches[0].verifiedAt !== prospect.details.emailVerifiedAt
  )
    throw new ValidationError(
      "The saved email verification result does not match this recipient.",
    );
};

/** Shared preflight prevents provider work for opted-out, attempted or ineligible contacts. */
export const assertAutomaticDraftReviewReady = async (
  transaction: TransactionScope,
  prospect: ProspectRow,
  { allowExpiredMx = false }: { allowExpiredMx?: boolean } = {},
) => {
  const current = await policy(transaction);
  if (
    !current.settings.automationEnabled ||
    !canReviewDraftAutomatically(prospect)
  )
    throw new ConflictError(
      "This draft is not available for automatic review.",
    );
  await assertCampaignActive(transaction, prospect);
  await assertAutomaticEvidence(transaction, prospect);
  await assertAutomaticReviewVerification(transaction, prospect);
  const attempts = requireData(
    await Attempts.find(
      Environment.SERVER,
      {
        where: eq(schema.outboundSendAttempt.prospectId, prospect.id),
        limit: 1,
      },
      { tx: transaction },
    ),
  );
  const linkedin = requireData(
    await IntegrationJobs.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundIntegrationJob.prospectId, prospect.id),
          eq(schema.outboundIntegrationJob.provider, "linkedin"),
        ),
        limit: 1,
      },
      { tx: transaction },
    ),
  );
  const entries = requireData(
    await Suppressions.find(Environment.SERVER, {}, { tx: transaction }),
  );
  if (
    attempts.length ||
    linkedin.length ||
    suppressed(prospect.details, entries)
  )
    throw new ConflictError("Contact history prevents automatic draft review.");
  const issues = prospectIssues(prospect.details, current.settings).filter(
    (issue) =>
      !(
        allowExpiredMx &&
        issue.code === "mxUnknown" &&
        ["google", "other"].includes(prospect.details.mxProvider)
      ),
  );
  if (issues.length)
    throw new ValidationError(
      `Automatic review requires current evidence: ${issues.map((issue) => issue.code).join(", ")}`,
    );
};

/** Record an actual DNS observation only if the original unsent review context is still open. */
export const applyAutomaticDraftMx = (input: {
  prospect: string;
  revision: number;
  playbookRevision: number;
  campaignRevision: number;
  previousCheckedAt: string;
  checked: { provider: ProspectInput["mxProvider"]; checkedAt: string };
}) =>
  transaction(async (transaction) => {
    const prospect = await findProspect(transaction, input.prospect);
    const current = await policy(transaction);
    const campaign = prospect.campaignId
      ? requireData(
          await Campaigns.get(Environment.SERVER, prospect.campaignId, {
            tx: transaction,
          }),
        )
      : null;
    if (
      prospect.revision !== input.revision ||
      current.revision !== input.playbookRevision ||
      campaign?.revision !== input.campaignRevision ||
      prospect.details.mxCheckedAt !== input.previousCheckedAt
    )
      throw new ConflictError(
        "The draft context changed during the mail-host check.",
      );
    await assertAutomaticDraftReviewReady(transaction, prospect, {
      allowExpiredMx: true,
    });
    const checkedAt = Date.parse(input.checked.checkedAt);
    if (
      !Number.isFinite(checkedAt) ||
      checkedAt > Date.now() ||
      Date.now() - checkedAt > 60_000
    )
      throw new ValidationError("A fresh mail-host observation is required.");
    const details = prospectSchema.parse({
      ...prospect.details,
      id: prospect.id,
      mxProvider: input.checked.provider,
      mxCheckedAt: input.checked.checkedAt,
    });
    if (details.mxProvider !== prospect.details.mxProvider)
      return saveProspectWithin(transaction, "outbound-draft-review", details);
    requireData(
      await Prospects.update(
        Environment.SERVER,
        prospect.id,
        { details, updatedAt: new Date() },
        { tx: transaction },
      ),
    );
    await event(
      transaction,
      "outbound-draft-review",
      "evidenceRechecked",
      "A fresh DNS check confirmed the same recipient mail host.",
      prospect.id,
    );
    return { prospect: prospect.id, revision: prospect.revision };
  });

/** Apply a checkpointed automatic review and approval in one transaction. */
export const applyAutomaticDraftReview = (input: {
  job: string;
  token: string;
}) =>
  transaction(async (transaction) => {
    const job = requireData(
      await IntegrationJobs.get(Environment.SERVER, input.job, {
        tx: transaction,
      }),
    );
    const scope = draftReviewInputSchema.parse(job?.input);
    const output = draftReviewOutputSchema.parse(job?.output);
    const current = await policy(transaction);
    const prospect = await findProspect(transaction, scope.prospectId);
    const campaign = requireData(
      await Campaigns.get(Environment.SERVER, scope.campaignId, {
        tx: transaction,
      }),
    );
    if (
      job?.provider !== "automation" ||
      job.status !== "starting" ||
      job.prospectId !== prospect.id ||
      output.stage !== "apply" ||
      output.lease.token !== input.token ||
      Date.parse(output.lease.expiresAt) <= Date.now() ||
      !current.settings.automationEnabled ||
      current.revision !== scope.playbookRevision ||
      !canReviewDraftAutomatically(prospect) ||
      prospect.revision !== scope.prospectRevision ||
      draftReviewReadinessKey(
        prospect.details,
        current.settings.senderConfirmed,
        current.settings.allowStaleEvidence,
        current.settings.trustSavedContactVerification,
        current.settings.allowProductObservations,
        current.settings.allowUsMarketWindow,
      ) !== scope.readinessKey ||
      (await latestDraftReviewRequest(transaction, prospect.id)) !==
        scope.resumeId ||
      prospect.campaignId !== scope.campaignId ||
      campaign?.revision !== scope.campaignRevision ||
      campaign.status !== "active"
    )
      throw new ConflictError(
        "The prospect, campaign or Playbook changed during automatic review.",
      );
    const attempts = requireData(
      await Attempts.find(
        Environment.SERVER,
        {
          where: eq(schema.outboundSendAttempt.prospectId, prospect.id),
          limit: 1,
        },
        { tx: transaction },
      ),
    );
    const linkedin = requireData(
      await IntegrationJobs.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundIntegrationJob.prospectId, prospect.id),
            eq(schema.outboundIntegrationJob.provider, "linkedin"),
          ),
          limit: 1,
        },
        { tx: transaction },
      ),
    );
    if (attempts.length || linkedin.length)
      throw new ConflictError(
        "An existing outreach attempt prevents automatic draft changes.",
      );
    if (scope.regenerate && !output.messages)
      throw new ValidationError("The refreshed draft is missing.");
    const saved = scope.regenerate
      ? await writeMessages(
          transaction,
          "outbound-draft-review",
          prospect,
          output.messages!,
        )
      : { revision: prospect.revision };
    requireData(
      await IntegrationJobs.update(
        Environment.SERVER,
        job.id,
        {
          output: { ...job.output, appliedProspectRevision: saved.revision },
        },
        { tx: transaction },
      ),
    );
    await reviewProspectWithin(
      transaction,
      "outbound-draft-review",
      {
        prospect: prospect.id,
        revision: saved.revision,
        decision: "approve",
        reason: "",
      },
      { reviewJobId: job.id },
    );
    requireData(
      await IntegrationJobs.update(
        Environment.SERVER,
        job.id,
        {
          status: "complete",
          output: {
            ...job.output,
            appliedProspectRevision: saved.revision,
            approvedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    return { prospect: prospect.id, revision: saved.revision };
  });

export const updateLinkedIn = (actor: string, input: unknown) =>
  transaction(async (transaction) => {
    const parsed = linkedinSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("Invalid LinkedIn task.");
    const prospect = await findProspect(transaction, parsed.data.prospect);
    const entries = requireData(
      await Suppressions.find(Environment.SERVER, {}, { tx: transaction }),
    );
    if (
      suppressed(prospect.details, entries) &&
      !["closed", "research"].includes(parsed.data.status)
    )
      throw new ConflictError(
        "This person or company is suppressed across all outreach channels.",
      );
    if (
      parsed.data.status !== "research" &&
      parsed.data.status !== "closed" &&
      !prospect.details.linkedinUrl
    )
      throw new ValidationError("Add a verified LinkedIn profile URL first.");
    const invitation =
      parsed.data.status === "invited" && prospect.linkedinStatus !== "invited";
    if (invitation) {
      const recent = requireData(
        await Events.find(
          Environment.SERVER,
          {
            where: and(
              eq(schema.outboundEvent.kind, "linkedinInvited"),
              gte(
                schema.outboundEvent.createdAt,
                new Date(Date.now() - 7 * 86_400_000),
              ),
            ),
          },
          { tx: transaction },
        ),
      );
      if (
        recent.length >= 50 ||
        recent.filter(
          (entry) => Date.now() - entry.createdAt.getTime() < 86_400_000,
        ).length >= 15
      )
        throw new ConflictError(
          "The LinkedIn invitation limit is 15 per day and 50 per week.",
        );
    }
    const replied = parsed.data.status === "replied";
    if (replied) await revoke(transaction, prospect, "LinkedIn reply received");
    requireData(
      await Prospects.update(
        Environment.SERVER,
        prospect.id,
        {
          linkedinStatus: parsed.data.status,
          linkedinDraft: parsed.data.draft,
          linkedinNextActionAt: parsed.data.nextActionAt
            ? new Date(parsed.data.nextActionAt)
            : null,
          linkedinNote: parsed.data.note,
          ...(replied
            ? {
                status: "replied" as const,
                nextSendAt: null,
                approvedAt: null,
                approvedBy: null,
                approvalHash: null,
              }
            : {}),
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    await event(
      transaction,
      actor,
      invitation ? "linkedinInvited" : "linkedinUpdated",
      `${parsed.data.status}${parsed.data.note ? `: ${parsed.data.note}` : ""}`,
      prospect.id,
    );
    return { prospect: prospect.id };
  });

export const recordOutcome = (actor: string, input: unknown) =>
  transaction(async (transaction) => {
    const parsed = outcomeSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("Invalid outcome.");
    const prospect = await findProspect(transaction, parsed.data.prospect);
    const kind = parsed.data.kind;
    const status = (() => {
      if (prospect.status === "optedOut") return "optedOut" as const;
      switch (kind) {
        case "optout":
        case "negative":
          return "optedOut" as const;
        case "bounce":
          return "bounced" as const;
        case "reply":
        case "positive":
        case "meeting":
          return "replied" as const;
        default:
          return prospect.status;
      }
    })();
    if (kind !== "note") {
      await revoke(transaction, prospect, kind);
      requireData(
        await Prospects.update(
          Environment.SERVER,
          prospect.id,
          {
            status,
            nextSendAt: null,
            approvalHash: null,
            approvedAt: null,
            approvedBy: null,
            linkedinStatus:
              kind === "optout" || kind === "negative"
                ? "closed"
                : prospect.linkedinStatus,
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      );
    }
    if (["optout", "negative", "bounce"].includes(kind)) {
      const entries: { scope: "email" | "domain"; value: string }[] = [
        ...(prospect.details.email
          ? [
              {
                scope: "email" as const,
                value: prospect.details.email.toLowerCase(),
              },
            ]
          : []),
        ...(kind !== "bounce"
          ? [
              {
                scope: "domain" as const,
                value: normalizeDomain(prospect.details.domain),
              },
            ]
          : []),
      ];
      for (const entry of entries)
        requireData(
          await Suppressions.upsert(
            Environment.SERVER,
            { ...entry, reason: parsed.data.note || kind, createdBy: actor },
            {
              target: [
                schema.outboundSuppression.scope,
                schema.outboundSuppression.value,
              ],
              tx: transaction,
            },
          ),
        );
    }
    await event(
      transaction,
      actor,
      kind,
      parsed.data.note || kind,
      prospect.id,
    );
    return { prospect: prospect.id };
  });

const importFrozen = async (
  transaction: TransactionScope,
  actor: string,
  rows: Record<string, unknown>[],
  quarantine?: { count: number; reportPath: string },
) => {
  const settings = {
    ...defaultPlaybook,
    sendingEnabled: false,
    historyConfirmed: false,
    senderConfirmed: false,
    senderTested: false,
  };
  const companies: (typeof schema.outboundCompany.$inferInsert)[] = [];
  const people: (typeof schema.outboundPerson.$inferInsert)[] = [];
  const prospects: (typeof schema.outboundProspect.$inferInsert)[] = [];
  const revisions: (typeof schema.outboundRevision.$inferInsert)[] = [];
  const suppressions: (typeof schema.outboundSuppression.$inferInsert)[] = [];
  const domains = new Set<string>();
  for (const [position, row] of rows.entries()) {
    const mapped = resultify(() => mapLegacyProspect(row));
    if (!mapped.success) {
      const scope = row["scope"];
      const value =
        scope === "domain"
          ? normalizeDomain(String(row["domain"] ?? ""))
          : String(row["email"] ?? "")
              .trim()
              .toLowerCase();
      if (
        !["domain", "email"].includes(String(scope)) ||
        !value ||
        typeof row["reason"] !== "string"
      )
        throw new ValidationError(`Invalid migration row ${position + 1}.`);
      suppressions.push({
        scope: scope === "domain" ? "domain" : "email",
        value,
        reason: row["reason"],
        createdBy: actor,
      });
      continue;
    }
    const details = mapped.data;
    if (domains.has(details.domain))
      throw new ConflictError(
        `Duplicate company in normalized migration: ${details.domain}`,
      );
    domains.add(details.domain);
    const companyId = randomUUID();
    const personId = randomUUID();
    const id = randomUUID();
    companies.push({
      id: companyId,
      domain: details.domain,
      name: details.company,
      website: details.website,
      country: details.country,
      relationship: details.relationship,
      source: details.source,
    });
    people.push({
      id: personId,
      companyId,
      identityKey: `${companyId}:${details.email || details.linkedinUrl || details.name.toLowerCase()}`,
      name: details.name,
      email: details.email,
      linkedinUrl: details.linkedinUrl,
      title: details.title,
    });
    const drafted =
      typeof row["subject"] === "string" &&
      typeof row["body"] === "string" &&
      Boolean(row["subject"].trim() && row["body"].trim());
    const messages = drafted
      ? renderMessages(details, settings).map((message) => ({
          ...message,
          subject:
            message.step === 1
              ? String(row["subject"])
              : `Re: ${String(row["subject"])}`,
          body: message.step === 1 ? String(row["body"]) : message.body,
        }))
      : [];
    if (
      drafted &&
      !draftSchema.safeParse({
        prospect: id,
        revision: 0,
        subject: messages[0]?.subject,
        body: messages[0]?.body,
        followupOne: messages[1]?.body,
        followupTwo: messages[2]?.body,
      }).success
    )
      throw new ValidationError(
        `Invalid preserved draft at row ${position + 1}.`,
      );
    const status = ["dropped", "skipped"].includes(String(row["status"]))
      ? "skipped"
      : ["hold", "held"].includes(String(row["status"]))
        ? "held"
        : drafted
          ? "draft"
          : "candidate";
    prospects.push({
      id,
      companyId,
      personId,
      details,
      messages,
      status,
      revision: drafted ? 1 : 0,
      playbookRevision: drafted ? 1 : 0,
      holdReason:
        typeof row["hold_reason"] === "string" ? row["hold_reason"] : "",
      createdBy: actor,
    });
    if (drafted) {
      const manifest = approvalManifest({ id, details }, settings, 1);
      revisions.push({
        prospectId: id,
        revision: 1,
        messages,
        manifest,
        contentHash: contentHash(messages, manifest),
      });
    }
  }
  // Repository delegates are single-row; this all-or-nothing import uses bounded bulk inserts.
  if (companies.length)
    await transaction.insert(schema.outboundCompany).values(companies);
  if (people.length)
    await transaction.insert(schema.outboundPerson).values(people);
  if (prospects.length)
    await transaction.insert(schema.outboundProspect).values(prospects);
  if (revisions.length)
    await transaction.insert(schema.outboundRevision).values(revisions);
  if (suppressions.length)
    await transaction.insert(schema.outboundSuppression).values(suppressions);
  if (quarantine?.count)
    await event(
      transaction,
      actor,
      "legacyMigrationWarning",
      `${quarantine.count} historic identities require manual review. History remains unconfirmed and sending disabled. Quarantine report: ${quarantine.reportPath}`,
    );
  await event(
    transaction,
    actor,
    "imported",
    `${prospects.length} legacy prospects; ${revisions.length} unapproved drafts; ${suppressions.length} scoped exclusions. Sending disabled.`,
  );
  return {
    imported: prospects.length,
    drafts: revisions.length,
    duplicate: 0,
    suppressed: suppressions.length,
    invalid: 0,
    errors: [] as { row: number; message: string }[],
  };
};

export const importProspects = (
  actor: string,
  input: {
    content: string;
    freeze?: boolean;
    quarantine?: { count: number; reportPath: string };
  },
) =>
  transaction(async (transaction) => {
    if (!input.content || input.content.length > 2_000_000)
      throw new ValidationError("Import at most 2 MB at a time.");
    const rows = parseImport(input.content);
    if (rows.length > 5000)
      throw new ValidationError("Import at most 5000 rows per batch.");
    if (input.freeze) {
      const existing = await Promise.all([
        Prospects.find(Environment.SERVER, { limit: 1 }, { tx: transaction }),
        Events.find(Environment.SERVER, { limit: 1 }, { tx: transaction }),
        Inboxes.find(Environment.SERVER, { limit: 1 }, { tx: transaction }),
        Suppressions.find(
          Environment.SERVER,
          { limit: 1 },
          { tx: transaction },
        ),
        Playbooks.find(Environment.SERVER, { limit: 1 }, { tx: transaction }),
      ]);
      if (
        existing.some((result) => {
          if (!result.success) throw result.error;
          return result.data.length > 0;
        })
      )
        throw new ConflictError(
          "The one-time migration requires empty Outbound tables.",
        );
      requireData(
        await Playbooks.create(
          Environment.SERVER,
          {
            id: "default",
            settings: {
              ...defaultPlaybook,
              sendingEnabled: false,
              historyConfirmed: false,
              senderConfirmed: false,
              senderTested: false,
            },
            revision: 1,
            updatedBy: actor,
          },
          { tx: transaction },
        ),
      );
      return importFrozen(transaction, actor, rows, input.quarantine);
    }
    const result = {
      imported: 0,
      drafts: 0,
      duplicate: 0,
      suppressed: 0,
      invalid: 0,
      errors: [] as { row: number; message: string }[],
    };
    for (const [position, row] of rows.entries()) {
      const mapped = resultify(() => mapLegacyProspect(row));
      const history = legacyHistory(row);
      // A domain/email/reason-only DNC file has no person to import.
      if (
        !mapped.success &&
        (typeof row["reason"] === "string" ||
          history.contacted ||
          history.suppressed ||
          history.bounced) &&
        (typeof row["domain"] === "string" || typeof row["email"] === "string")
      ) {
        const values = [
          ...(!history.bounced &&
          row["scope"] !== "email" &&
          typeof row["domain"] === "string" &&
          normalizeDomain(row["domain"])
            ? [
                {
                  scope: "domain" as const,
                  value: normalizeDomain(row["domain"]),
                },
              ]
            : []),
          ...(typeof row["email"] === "string" && row["email"].includes("@")
            ? [
                {
                  scope: "email" as const,
                  value: row["email"].toLowerCase().trim(),
                },
              ]
            : []),
        ];
        for (const value of values)
          requireData(
            await Suppressions.upsert(
              Environment.SERVER,
              {
                ...value,
                reason:
                  typeof row["reason"] === "string"
                    ? row["reason"]
                    : history.bounced
                      ? "legacy bounce"
                      : history.suppressed
                        ? "legacy opt-out"
                        : "historic contact: cold outreach excluded",
                createdBy: actor,
              },
              {
                target: [
                  schema.outboundSuppression.scope,
                  schema.outboundSuppression.value,
                ],
                tx: transaction,
              },
            ),
          );
        result.suppressed += values.length;
        continue;
      }
      if (!mapped.success) {
        result.invalid += 1;
        if (result.errors.length < 20)
          result.errors.push({
            row: position + 1,
            message:
              "Missing or invalid company, person, country or email fields.",
          });
        continue;
      }
      const imported = await saveProspectWithin(
        transaction,
        actor,
        mapped.data,
        true,
      );
      if (imported.imported) result.imported += 1;
      else result.duplicate += 1;
      if (
        imported.imported &&
        typeof row["subject"] === "string" &&
        typeof row["body"] === "string" &&
        row["subject"].trim() &&
        row["body"].trim()
      ) {
        const prospect = await findProspect(transaction, imported.prospect);
        const current = await policy(transaction);
        const messages = renderMessages(prospect.details, current.settings);
        const checked = draftSchema.safeParse({
          prospect: prospect.id,
          revision: prospect.revision,
          subject: row["subject"],
          body: row["body"],
          followupOne: messages[1]?.body ?? "",
          followupTwo: messages[2]?.body ?? "",
        });
        if (!checked.success)
          throw new ValidationError(
            `Invalid imported draft at row ${position + 1}.`,
          );
        await writeMessages(
          transaction,
          actor,
          prospect,
          messages.map((message) => ({
            ...message,
            subject:
              message.step === 1
                ? checked.data.subject
                : `Re: ${checked.data.subject}`,
            body: message.step === 1 ? checked.data.body : message.body,
          })),
        );
        result.drafts += 1;
      }
      if (
        imported.imported &&
        ["hold", "held", "dropped", "skipped"].includes(String(row["status"]))
      )
        requireData(
          await Prospects.update(
            Environment.SERVER,
            imported.prospect,
            {
              status: ["dropped", "skipped"].includes(String(row["status"]))
                ? "skipped"
                : "held",
              holdReason:
                typeof row["hold_reason"] === "string"
                  ? row["hold_reason"]
                  : "Legacy review required",
            },
            { tx: transaction },
          ),
        );
      if (history.contacted || history.suppressed || history.bounced) {
        const prospect = await findProspect(transaction, imported.prospect);
        await revoke(
          transaction,
          prospect,
          "Historic contact or suppression imported",
        );
        requireData(
          await Prospects.update(
            Environment.SERVER,
            prospect.id,
            {
              status: history.suppressed
                ? "optedOut"
                : history.bounced
                  ? "bounced"
                  : "held",
              holdReason: "historicContact",
              approvedAt: null,
              approvedBy: null,
              approvalHash: null,
              nextSendAt: null,
            },
            { tx: transaction },
          ),
        );
        requireData(
          await Companies.update(
            Environment.SERVER,
            prospect.companyId,
            {
              lastContactedAt: history.contactedAt
                ? new Date(history.contactedAt)
                : null,
            },
            { tx: transaction },
          ),
        );
        // Unknown historic touch dates still exclude a second cold sequence; keep that separate from an opt-out.
        const scope = history.bounced
          ? ("email" as const)
          : ("domain" as const);
        const value =
          scope === "email" ? mapped.data.email : mapped.data.domain;
        if (value) {
          requireData(
            await Suppressions.upsert(
              Environment.SERVER,
              {
                scope,
                value,
                reason: history.suppressed
                  ? "legacy opt-out"
                  : history.bounced
                    ? "legacy bounce"
                    : "historic contact: cold outreach excluded",
                createdBy: actor,
              },
              {
                target: [
                  schema.outboundSuppression.scope,
                  schema.outboundSuppression.value,
                ],
                tx: transaction,
              },
            ),
          );
          result.suppressed += 1;
        }
      }
    }
    if (input.freeze && result.invalid)
      throw new ValidationError(
        "The migration contains invalid rows; no Outbound data was imported.",
      );
    if (input.freeze && input.quarantine?.count)
      await event(
        transaction,
        actor,
        "legacyMigrationWarning",
        `${input.quarantine.count} historic identities require manual review. History remains unconfirmed and sending disabled. Quarantine report: ${input.quarantine.reportPath}`,
      );
    await event(
      transaction,
      actor,
      "imported",
      `${result.imported} imported; ${result.duplicate} existing; ${result.suppressed} exclusions; ${result.invalid} invalid.`,
    );
    return result;
  });

export const getProspect = (id: string) =>
  resultify(async () =>
    requireData(await Prospects.get(Environment.SERVER, id)),
  );
export const readProspect = getProspect;

/** Paid preparation reads only this company and its matching suppression records. */
export const getEnrichmentContext = (
  id: string,
  transaction?: TransactionScope,
) =>
  resultify(async () => {
    const [configuration, loaded] = await Promise.all([
      policy(transaction),
      Prospects.get(Environment.SERVER, id, { tx: transaction }),
    ]);
    const prospect = requireData(loaded);
    if (!prospect) throw new NotFoundError("Prospect not found.");
    const email = prospect.details.email.toLowerCase();
    const domains = [
      ...new Set(
        [
          normalizeDomain(prospect.details.domain),
          email.split("@")[1] ?? "",
        ].filter(Boolean),
      ),
    ];
    const [company, entries] = await Promise.all([
      Companies.get(Environment.SERVER, prospect.companyId, {
        tx: transaction,
      }),
      Suppressions.find(
        Environment.SERVER,
        {
          where: or(
            and(
              eq(schema.outboundSuppression.scope, "email"),
              eq(schema.outboundSuppression.value, email),
            ),
            and(
              eq(schema.outboundSuppression.scope, "domain"),
              inArray(schema.outboundSuppression.value, domains),
            ),
          ),
        },
        { tx: transaction },
      ),
    ]);
    const identity = requireData(company);
    if (!identity) throw new NotFoundError("Company not found.");
    return {
      prospect,
      settings: configuration.settings,
      suppressed: suppressed(prospect.details, requireData(entries)),
      lastContactedAt: identity.lastContactedAt,
    };
  });

export const holdPreparation = (
  actor: string,
  input: {
    prospect: string;
    revision: number;
    reason: string;
    details?: Partial<ProspectInput>;
  },
) =>
  transaction(async (transaction) => {
    const prospect = await findProspect(transaction, input.prospect);
    if (
      prospect.revision !== input.revision ||
      prospect.sentStep ||
      !["candidate", "draft", "held"].includes(prospect.status)
    )
      throw new ConflictError(
        "The prospect changed or left the preparation queue.",
      );
    const entries = requireData(
      await Suppressions.find(Environment.SERVER, {}, { tx: transaction }),
    );
    const reason = suppressed(prospect.details, entries)
      ? "suppressed"
      : input.reason.slice(0, 2000);
    const details = prospectSchema.safeParse({
      ...prospect.details,
      ...input.details,
      findingReviewed: false,
    });
    if (!details.success)
      throw new ValidationError("Invalid product evidence update.");
    await revoke(transaction, prospect, reason);
    requireData(
      await Prospects.update(
        Environment.SERVER,
        prospect.id,
        {
          details: details.data,
          status: "held",
          holdReason: reason,
          approvedAt: null,
          approvedBy: null,
          approvalHash: null,
          nextSendAt: null,
          revision: prospect.revision + 1,
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    await event(transaction, actor, "preparationHeld", reason, prospect.id);
    return { prospect: prospect.id };
  });

export { saveProspectWithin };

export type DeliveryClaim = {
  attempt: string;
  messageId: string;
  prospect: string;
  inbox: string;
  step: 1 | 2 | 3;
  revision: number;
  message: Message;
  manifest: ReturnType<typeof approvalManifest>;
  threadId: string | null;
  references: string[];
};
type AttemptRow = typeof schema.outboundSendAttempt.$inferSelect;
type InboxRow = typeof schema.outboundInbox.$inferSelect;

const immutableDelivery = async (
  transaction: TransactionScope,
  attempt: AttemptRow,
) => {
  const versions = requireData(
    await Revisions.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundRevision.prospectId, attempt.prospectId),
          eq(schema.outboundRevision.revision, attempt.revision),
        ),
        limit: 1,
      },
      { tx: transaction },
    ),
  );
  const version = versions[0];
  if (
    !version ||
    version.contentHash !== attempt.contentHash ||
    version.contentHash !== contentHash(version.messages, version.manifest)
  )
    throw new ConflictError(
      "The immutable delivery record is missing or changed.",
    );
  const message = version.messages.find(
    (candidate) => candidate.step === attempt.step,
  );
  if (!message)
    throw new ConflictError("The immutable sequence is incomplete.");
  const references = requireData(
    await Attempts.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundSendAttempt.prospectId, attempt.prospectId),
          eq(schema.outboundSendAttempt.status, "accepted"),
        ),
        orderBy: [
          { column: schema.outboundSendAttempt.step, direction: "asc" },
        ],
      },
      { tx: transaction },
    ),
  );
  const firstAttempt = references.find((reference) => reference.step === 1);
  const firstVersion =
    attempt.step === 1
      ? version
      : firstAttempt
        ? requireData(
            await Revisions.find(
              Environment.SERVER,
              {
                where: and(
                  eq(schema.outboundRevision.prospectId, attempt.prospectId),
                  eq(schema.outboundRevision.revision, firstAttempt.revision),
                ),
                limit: 1,
              },
              { tx: transaction },
            ),
          )[0]
        : null;
  const original = firstVersion?.messages.find(
    (candidate) => candidate.step === 1,
  );
  if (
    !firstVersion ||
    !original ||
    firstVersion.contentHash !==
      contentHash(firstVersion.messages, firstVersion.manifest) ||
    (attempt.step > 1 && firstVersion.contentHash !== firstAttempt?.contentHash)
  )
    throw new ConflictError(
      "The immutable first-message record is missing or changed.",
    );
  return {
    version,
    message: {
      ...message,
      body: deliveredBody(
        message,
        original,
        firstVersion.manifest.postalAddress,
      ),
    },
    references,
  };
};

const deliveryClaim = async (
  transaction: TransactionScope,
  prospect: ProspectRow,
  attempt: AttemptRow,
  _settings: Playbook,
): Promise<DeliveryClaim> => {
  const snapshot = await immutableDelivery(transaction, attempt);
  return {
    attempt: attempt.id,
    messageId: attempt.messageId,
    prospect: prospect.id,
    inbox: attempt.inboxId,
    step: snapshot.message.step,
    revision: snapshot.version.revision,
    message: snapshot.message,
    manifest: snapshot.version.manifest,
    threadId: prospect.threadId,
    references: snapshot.references.map((reference) => reference.messageId),
  };
};

const deliveryGates = async (
  transaction: TransactionScope,
  prospect: ProspectRow,
  inbox: InboxRow,
  settings: Playbook,
  revision: number,
  warmup: WarmupPreflight,
  currentAttempt?: AttemptRow,
) => {
  const now = new Date();
  await assertCampaignActive(transaction, prospect);
  await assertAutomaticEvidence(transaction, prospect);
  const channelScope = {
    prospectId: prospect.id,
    companyId: prospect.companyId,
    now,
  };
  if (await hasRecentLinkedInTouch(transaction, channelScope))
    throw new ConflictError(
      "Wait at least24 hours after the last LinkedIn action before emailing this company.",
    );
  if (!(await linkedinHistoryReady(transaction, channelScope)))
    throw new ConflictError(
      "Synchronize this LinkedIn conversation before continuing email delivery.",
    );
  const refreshing = requireData(
    await IntegrationJobs.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundIntegrationJob.provider, "automation"),
          eq(schema.outboundIntegrationJob.prospectId, prospect.id),
          sql`${schema.outboundIntegrationJob.input}->>'operation' = 'sequenceRefresh'`,
          sql`${schema.outboundIntegrationJob.input}->>'prospectRevision' = ${String(prospect.revision)}`,
          inArray(schema.outboundIntegrationJob.status, [
            "pending",
            "starting",
            "uncertain",
          ]),
        ),
        limit: 1,
      },
      { tx: transaction },
    ),
  );
  if (refreshing.length)
    throw new ConflictError(
      "Source receipts are being renewed before this follow-up.",
    );
  if (
    prospect.approvedBy?.startsWith("automatic:") &&
    !settings.automationEnabled
  )
    throw new ConflictError("Automatic delivery is paused.");
  if (
    !settings.sendingEnabled ||
    !contactHistoryReady(settings) ||
    !settings.competingSendersPaused ||
    !settings.senderTested
  )
    throw new ConflictError(
      "Confirm sender tests and history/exclusion checks before enabling delivery.",
    );
  await assertWarmupPreflight(inbox.email, warmup, transaction);
  if (
    !inbox.enabled ||
    !mailboxConnected(inbox) ||
    inbox.error ||
    !inbox.lastSyncedAt ||
    now.getTime() - inbox.lastSyncedAt.getTime() > 600000 ||
    inbox.syncMode
  )
    throw new ConflictError(
      "A healthy, fully synchronized sender inbox is required within the last ten minutes.",
    );
  if (
    inbox.email.toLowerCase() !== senderFor(prospect.id, settings) ||
    inbox.fromName !== settings.fromName ||
    inbox.signer !== settings.signature ||
    (prospect.inboxId && prospect.inboxId !== inbox.id)
  )
    throw new ConflictError(
      "The connected sender does not match the approved sender.",
    );
  if (
    !["approved", "active"].includes(prospect.status) ||
    !prospect.approvedAt ||
    !prospect.approvedBy ||
    !prospect.approvalHash ||
    !prospect.nextSendAt ||
    prospect.nextSendAt > now
  )
    throw new ConflictError("This sequence has no current, due approval.");
  if (
    !prospect.sentStep &&
    now.getTime() - prospect.approvedAt.getTime() > 7 * 86400000
  )
    throw new ConflictError("First-email approval expired after seven days.");
  if (prospect.sentStep >= 3 || prospect.playbookRevision !== revision)
    throw new ConflictError(
      "The sequence is complete or its playbook changed.",
    );
  if (!inSendWindow(prospect.details, now, settings))
    throw new ConflictError(
      "Wait for the selected sending window: Monday–Thursday, 08:00–14:00 in the saved timezone, or 18:00–21:00 UTC for an enabled US market window with no saved timezone.",
    );
  if (
    prospect.sentStep &&
    (!prospect.threadId ||
      !prospect.firstSentAt ||
      !prospect.lastSentAt ||
      now.getTime() - prospect.lastSentAt.getTime() < 86400000)
  )
    throw new ConflictError(
      "Follow-ups need the original thread and at least 24 hours since the last message.",
    );
  if (
    prospect.sentStep &&
    inbox.transport === "gmail-oauth" &&
    prospect.threadId?.startsWith("<")
  )
    throw new ConflictError(
      "This conversation was sent through the direct mailbox. Keep that connection for its follow-ups or resolve its Gmail conversation before switching delivery methods.",
    );
  const entries = requireData(
    await Suppressions.find(Environment.SERVER, {}, { tx: transaction }),
  );
  const issues = issuesFor(prospect, settings, entries);
  if (issues.length)
    throw new ValidationError(
      `Delivery checks failed: ${issues.map((issue) => issue.code).join(", ")}`,
    );
  const versions = requireData(
    await Revisions.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundRevision.prospectId, prospect.id),
          eq(schema.outboundRevision.revision, prospect.revision),
        ),
        limit: 1,
      },
      { tx: transaction },
    ),
  );
  const version = versions[0];
  const hash = contentHash(
    prospect.messages,
    approvalManifest(prospect, settings, revision),
  );
  if (
    !version?.approvedAt ||
    version.revokedAt ||
    version.contentHash !== hash ||
    prospect.approvalHash !== hash ||
    (currentAttempt &&
      (currentAttempt.contentHash !== hash ||
        currentAttempt.revision !== prospect.revision))
  )
    throw new ConflictError(
      "The exact content, evidence, recipient and sender approval no longer matches.",
    );
  const company = requireData(
    await Companies.get(Environment.SERVER, prospect.companyId, {
      tx: transaction,
    }),
  );
  const ownLinkedInHistory = company?.lastContactedAt
    ? requireData(
        await IntegrationJobs.find(
          Environment.SERVER,
          {
            where: and(
              eq(schema.outboundIntegrationJob.provider, "linkedin"),
              eq(schema.outboundIntegrationJob.prospectId, prospect.id),
              eq(schema.outboundIntegrationJob.status, "complete"),
            ),
          },
          { tx: transaction },
        ),
      ).some(
        (job) =>
          job.output?.["acceptedAt"] === company.lastContactedAt?.toISOString(),
      )
    : false;
  if (
    !company ||
    (!prospect.sentStep && company.lastContactedAt && !ownLinkedInHistory)
  )
    throw new ConflictError("This company already has outbound history.");
  const aliases = requireData(
    await People.find(
      Environment.SERVER,
      {
        where: eq(
          schema.outboundPerson.email,
          prospect.details.email.toLowerCase(),
        ),
      },
      { tx: transaction },
    ),
  );
  const others = aliases
    .filter((person) => person.companyId !== prospect.companyId)
    .map((person) => person.companyId);
  if (others.length) {
    const active = requireData(
      await Prospects.find(
        Environment.SERVER,
        {
          where: and(
            inArray(schema.outboundProspect.companyId, others),
            or(
              inArray(schema.outboundProspect.status, [
                "approved",
                "active",
                "replied",
                "finished",
                "optedOut",
                "bounced",
              ]),
              sql`exists (select 1 from ${schema.outboundSendAttempt} where ${schema.outboundSendAttempt.prospectId} = ${schema.outboundProspect.id} and ${schema.outboundSendAttempt.status} = 'uncertain')`,
            ),
          ),
        },
        { tx: transaction },
      ),
    );
    if (active.length)
      throw new ConflictError(
        "This recipient belongs to another approved or contacted company.",
      );
  }
  const attempts = requireData(
    await Attempts.find(
      Environment.SERVER,
      { where: eq(schema.outboundSendAttempt.prospectId, prospect.id) },
      { tx: transaction },
    ),
  );
  const outstanding = requireData(
    await Attempts.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundSendAttempt.inboxId, inbox.id),
          eq(schema.outboundSendAttempt.status, "claimed"),
        ),
      },
      { tx: transaction },
    ),
  );
  if (outstanding.some((attempt) => attempt.id !== currentAttempt?.id))
    throw new ConflictError(
      "The sender has an unresolved delivery reservation. Reconcile it before another send.",
    );
  if (attempts.some((attempt) => attempt.status === "uncertain"))
    throw new ConflictError(
      "This recipient has an uncertain delivery. Reconcile it before continuing this sequence.",
    );
  if (
    attempts.some(
      (attempt) =>
        attempt.step === prospect.sentStep + 1 &&
        attempt.id !== currentAttempt?.id,
    )
  )
    throw new ConflictError(
      "This step already has an attempt. Reconcile it before proceeding.",
    );
  if (currentAttempt && currentAttempt.status !== "claimed")
    throw new ConflictError("The delivery reservation is no longer available.");
  if (!currentAttempt && inbox.nextSendAt && inbox.nextSendAt > now)
    throw new ConflictError("The sender is waiting for its next paced slot.");
  const daily = requireData(
    await Attempts.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundSendAttempt.inboxId, inbox.id),
          gte(
            schema.outboundSendAttempt.createdAt,
            new Date(now.getTime() - 86400000),
          ),
        ),
      },
      { tx: transaction },
    ),
  );
  if (daily.filter((attempt) => attempt.status === "uncertain").length >= 2)
    throw new ConflictError(
      "Two delivery attempts are uncertain within 24 hours. Check the sender transport before continuing.",
    );
  const replies = requireData(
    await ConversationSends.find(
      Environment.SERVER,
      {
        where: and(
          sql`${schema.outboundConversationSend.input}->>'channel' = 'email'`,
          sql`${schema.outboundConversationSend.input}->>'accountId' = ${inbox.id}`,
          or(
            inArray(schema.outboundConversationSend.status, [
              "starting",
              "uncertain",
            ]),
            and(
              eq(schema.outboundConversationSend.status, "accepted"),
              gte(
                schema.outboundConversationSend.createdAt,
                new Date(now.getTime() - 86400000),
              ),
            ),
          ),
        ),
      },
      { tx: transaction },
    ),
  );
  if (
    replies.some(
      (reply) => reply.status === "starting" || reply.status === "uncertain",
    )
  )
    throw new ConflictError(
      "The sender has an unresolved conversation reply. Reconcile it before another send.",
    );
  const cap = (await inboxCapacity(inbox, settings, transaction)).dailyCap;
  const count =
    daily.filter(
      (attempt) =>
        attempt.id !== currentAttempt?.id && attempt.status !== "failed",
    ).length + replies.length;
  if (count >= cap)
    throw new ConflictError("The sender's rolling 24-hour cap is reached.");
  const firsts = requireData(
    await Attempts.find(
      Environment.SERVER,
      {
        where: eq(schema.outboundSendAttempt.step, 1),
        orderBy: [
          { column: schema.outboundSendAttempt.createdAt, direction: "desc" },
        ],
        limit: 100,
      },
      { tx: transaction },
    ),
  );
  const recipients = [...new Set(firsts.map((attempt) => attempt.prospectId))];
  const bounced = recipients.length
    ? requireData(
        await Prospects.find(
          Environment.SERVER,
          {
            where: and(
              inArray(schema.outboundProspect.id, recipients),
              eq(schema.outboundProspect.status, "bounced"),
            ),
          },
          { tx: transaction },
        ),
      )
    : [];
  if (bounced.length >= 2 && bounced.length / recipients.length > 0.03)
    throw new ConflictError(
      "The first-email hard-bounce rate requires review.",
    );
  if (!prospect.sentStep) {
    const weekly = requireData(
      await Attempts.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundSendAttempt.step, 1),
            gte(
              schema.outboundSendAttempt.createdAt,
              new Date(now.getTime() - 7 * 86400000),
            ),
          ),
        },
        { tx: transaction },
      ),
    );
    if (
      weekly.filter((attempt) => attempt.id !== currentAttempt?.id).length >=
      settings.weeklyTarget
    )
      throw new ConflictError("The weekly first-email target is reached.");
    const following = requireData(
      await Prospects.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundProspect.inboxId, inbox.id),
            eq(schema.outboundProspect.status, "active"),
            lte(schema.outboundProspect.nextSendAt, now),
          ),
        },
        { tx: transaction },
      ),
    );
    const reserved = following.length;
    if (count + reserved >= cap)
      throw new ConflictError(
        "Remaining capacity is reserved for due follow-ups.",
      );
  }
};

export const claimDelivery = (
  actor: string,
  input: { prospect: string; inbox: string },
) =>
  resultify(async () => {
    const sender = requireData(
      await Inboxes.get(Environment.SERVER, input.inbox),
    );
    if (!sender) throw new NotFoundError("Sender inbox not found.");
    const warmup = await preflightWarmup(sender.email);
    return requireData(
      await transaction(async (transaction) => {
        const prospect = await findProspect(transaction, input.prospect);
        const inbox = requireData(
          await Inboxes.get(Environment.SERVER, input.inbox, {
            tx: transaction,
          }),
        );
        if (!inbox) throw new NotFoundError("Sender inbox not found.");
        const current = await policy(transaction);
        await deliveryGates(
          transaction,
          prospect,
          inbox,
          current.settings,
          current.revision,
          warmup,
        );
        const now = new Date();
        const attempt = requireData(
          await Attempts.create(
            Environment.SERVER,
            {
              prospectId: prospect.id,
              inboxId: inbox.id,
              step: prospect.sentStep + 1,
              revision: prospect.revision,
              messageId: `<${randomUUID()}@${inbox.email.split("@")[1]}>`,
              status: "claimed",
              contentHash: contentHash(
                prospect.messages,
                approvalManifest(prospect, current.settings, current.revision),
              ),
            },
            { tx: transaction },
          ),
        );
        requireData(
          await Inboxes.update(
            Environment.SERVER,
            inbox.id,
            {
              nextSendAt: new Date(
                now.getTime() +
                  randomInt(
                    current.settings.minGapMinutes,
                    current.settings.maxGapMinutes + 1,
                  ) *
                    60000,
              ),
              updatedAt: now,
            },
            { tx: transaction },
          ),
        );
        await event(
          transaction,
          actor,
          "deliveryClaimed",
          `Step ${attempt.step}; ${attempt.messageId}`,
          prospect.id,
        );
        return deliveryClaim(transaction, prospect, attempt, current.settings);
      }),
    );
  });

type Completion = {
  attempt: string;
  status: "accepted" | "failed" | "uncertain";
  providerMessageId?: string;
  threadId?: string;
  error?: string;
  smtpFailure?: SmtpFailure | null;
};
const completeWithin = async (
  transaction: TransactionScope,
  actor: string,
  input: Completion,
) => {
  const attempt = requireData(
    await Attempts.get(Environment.SERVER, input.attempt, { tx: transaction }),
  );
  if (!attempt) throw new NotFoundError("Delivery attempt not found.");
  if (attempt.status === "accepted")
    return { attempt: attempt.id, status: attempt.status };
  if (!["claimed", "uncertain"].includes(attempt.status))
    throw new ConflictError("The attempt is already closed.");
  const prospect = await findProspect(transaction, attempt.prospectId);
  const now = new Date();
  if (
    input.status === "accepted" &&
    (!input.providerMessageId || !input.threadId)
  )
    throw new ValidationError(
      "Acceptance needs provider message and thread identifiers.",
    );
  requireData(
    await Attempts.update(
      Environment.SERVER,
      attempt.id,
      {
        status: input.status,
        providerMessageId: input.providerMessageId ?? null,
        error: input.error ?? null,
        completedAt: now,
      },
      { tx: transaction },
    ),
  );
  if (input.status === "accepted") {
    const receipt = z
      .object({
        providerMessageId: z.string().min(1),
        threadId: z.string().min(1),
      })
      .parse(input);
    const snapshot = await immutableDelivery(transaction, attempt);
    if (!attempt.test)
      await Conversations.ingestWithin(transaction, {
        prospectId: prospect.id,
        channel: "email",
        accountId: attempt.inboxId,
        accountLabel: snapshot.version.manifest.sender,
        providerThreadId: receipt.threadId,
        counterpart: snapshot.version.manifest.recipient,
        message: {
          providerMessageId: receipt.providerMessageId,
          direction: "outbound",
          bodyText: snapshot.message.body,
          subject: snapshot.message.subject,
          from: snapshot.version.manifest.sender,
          to: snapshot.version.manifest.recipient,
          rfcMessageId: attempt.messageId,
          sentAt: now,
          isAutomated: true,
          truncated: false,
        },
      });
    const current = await policy(transaction);
    requireData(
      await Inboxes.update(
        Environment.SERVER,
        attempt.inboxId,
        {
          nextSendAt: new Date(
            now.getTime() +
              randomInt(
                current.settings.minGapMinutes,
                current.settings.maxGapMinutes + 1,
              ) *
                60_000,
          ),
          updatedAt: now,
        },
        { tx: transaction },
      ),
    );
    const firstSentAt = prospect.firstSentAt ?? now;
    const next = prospect.messages.find(
      (message) => message.step === attempt.step + 1,
    );
    const nextSendAt = next
      ? new Date(
          Math.max(
            firstSentAt.getTime() + next.afterDays * 86400000,
            now.getTime() + 86400000,
          ),
        )
      : null;
    const stopped = [
      "optedOut",
      "bounced",
      "replied",
      "held",
      "skipped",
    ].includes(prospect.status);
    requireData(
      await Prospects.update(
        Environment.SERVER,
        prospect.id,
        {
          sentStep: attempt.step,
          firstSentAt,
          lastSentAt: now,
          inboxId: attempt.inboxId,
          threadId: input.threadId,
          nextSendAt: stopped ? null : nextSendAt,
          status: stopped ? prospect.status : next ? "active" : "finished",
          updatedAt: now,
        },
        { tx: transaction },
      ),
    );
    requireData(
      await Companies.update(
        Environment.SERVER,
        prospect.companyId,
        { lastContactedAt: now, updatedAt: now },
        { tx: transaction },
      ),
    );
  } else {
    requireData(
      await Prospects.update(
        Environment.SERVER,
        prospect.id,
        {
          status: ["optedOut", "bounced", "replied"].includes(prospect.status)
            ? prospect.status
            : "held",
          holdReason:
            input.status === "uncertain"
              ? "deliveryUncertain"
              : "deliveryFailed",
          nextSendAt: null,
          updatedAt: now,
        },
        { tx: transaction },
      ),
    );
  }
  await event(
    transaction,
    actor,
    `delivery${input.status.charAt(0).toUpperCase()}${input.status.slice(1)}`,
    input.error || `Step ${attempt.step}; ${attempt.messageId}`,
    prospect.id,
  );
  if (input.status !== "accepted")
    await recordSmtpFailureWithin(transaction, {
      actor,
      prospectId: prospect.id,
      attemptId: attempt.id,
      source: attempt.test ? "mailbox-test" : "sequence",
      smtpFailure: input.smtpFailure,
    });
  return { attempt: attempt.id, status: input.status };
};
export const completeDeliveryWithin = completeWithin;

export const completeDelivery = (actor: string, input: Completion) =>
  transaction((transaction) => completeWithin(transaction, actor, input));

/** A committed reservation survives crashes; final checks and transport serialize with edits and opt-outs. */
export const dispatchDelivery = (
  actor: string,
  input: { attempt: string; connectionVersion?: number },
  send: (
    claim: DeliveryClaim,
  ) => Promise<Result<{ providerMessageId: string; threadId: string }, Error>>,
) =>
  resultify(async () => {
    const reservation = requireData(
      await Attempts.get(Environment.SERVER, input.attempt),
    );
    if (!reservation) throw new NotFoundError("Delivery attempt not found.");
    const sender = requireData(
      await Inboxes.get(Environment.SERVER, reservation.inboxId),
    );
    if (!sender) throw new NotFoundError("Sender inbox not found.");
    const warmup = await preflightWarmup(sender.email);
    return requireData(
      await transaction(async (transaction) => {
        const attempt = requireData(
          await Attempts.get(Environment.SERVER, input.attempt, {
            tx: transaction,
          }),
        );
        if (!attempt) throw new NotFoundError("Delivery attempt not found.");
        const prospect = await findProspect(transaction, attempt.prospectId);
        const inbox = requireData(
          await Inboxes.get(Environment.SERVER, attempt.inboxId, {
            tx: transaction,
          }),
        );
        if (!inbox) throw new NotFoundError("Sender inbox not found.");
        if (
          input.connectionVersion !== undefined &&
          inbox.connectionVersion !== input.connectionVersion
        )
          throw new ConflictError(
            "The sender connection changed before delivery. Review this attempt before continuing.",
          );
        const current = await policy(transaction);
        await deliveryGates(
          transaction,
          prospect,
          inbox,
          current.settings,
          current.revision,
          warmup,
          attempt,
        );
        const claim = await deliveryClaim(
          transaction,
          prospect,
          attempt,
          current.settings,
        );
        const sent = await resultify(() => send(claim));
        if (!sent.success || !sent.data.success) {
          const failure = !sent.success
            ? sent.error
            : !sent.data.success
              ? sent.data.error
              : new Error("Delivery outcome unknown.");
          return completeWithin(transaction, actor, {
            attempt: attempt.id,
            status: "uncertain",
            error: failure.message,
            smtpFailure: smtpFailureFrom(failure),
          });
        }
        return completeWithin(transaction, actor, {
          attempt: attempt.id,
          status: "accepted",
          ...sent.data.data,
        });
      }),
    );
  });

export const getWeeklyReport = () =>
  resultify(async () => {
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 86_400_000);
    const prospect = schema.outboundProspect;
    const attempt = schema.outboundSendAttempt;
    const event = schema.outboundEvent;
    const source = sql<string>`coalesce(nullif(${prospect.details}->>'source', ''), 'manual')`;
    // The visible report needs measurements, not message bodies, raw receipts or
    // every prospect's evidence. Keep the seven-day activity window in SQL.
    const [prospects, attempts, events] = await Promise.all([
      resultifyRead(() =>
        db
          .select({
            id: prospect.id,
            status: prospect.status,
            holdReason: prospect.holdReason,
            source,
          })
          .from(prospect)
          .where(sql`${source} <> 'internal-mailbox-setup-test'`),
      ),
      resultifyRead(() =>
        db
          .select({
            prospectId: attempt.prospectId,
            status: attempt.status,
            step: attempt.step,
          })
          .from(attempt)
          .where(
            and(
              eq(attempt.test, false),
              gte(attempt.completedAt, from),
              lte(attempt.completedAt, to),
            ),
          ),
      ),
      resultifyRead(() =>
        db
          .select({ prospectId: event.prospectId, kind: event.kind })
          .from(event)
          .where(
            and(
              gte(event.createdAt, from),
              lte(event.createdAt, to),
              isNotNull(event.prospectId),
            ),
          ),
      ),
    ]);
    const records = requireData(prospects);
    const sends = requireData(attempts);
    const outcomes = requireData(events);
    const groups = [...new Set(records.map((prospect) => prospect.source))].map(
      (source) => {
        const matching = records.filter(
          (prospect) => prospect.source === source,
        );
        const identities = new Set(matching.map((prospect) => prospect.id));
        const accepted = sends.filter(
          (attempt) =>
            attempt.status === "accepted" && identities.has(attempt.prospectId),
        );
        const unique = (kinds: string[]) =>
          new Set(
            outcomes
              .filter(
                (event) =>
                  event.prospectId &&
                  identities.has(event.prospectId) &&
                  kinds.includes(event.kind),
              )
              .map((event) => event.prospectId),
          ).size;
        return {
          source,
          prospects: matching.length,
          held: matching.filter((prospect) => prospect.status === "held")
            .length,
          acceptedFirsts: accepted.filter((attempt) => attempt.step === 1)
            .length,
          acceptedFollowups: accepted.filter((attempt) => attempt.step > 1)
            .length,
          replies: unique(["reply", "positive", "negative", "optout"]),
          bounces: unique(["bounce"]),
          meetings: unique(["meeting"]),
        };
      },
    );
    const held = records.filter((prospect) => prospect.status === "held");
    const missing = held.filter((prospect) => !prospect.holdReason);
    // Preserve the existing validation fallback only for unlabelled holds. Most
    // reports use saved reasons and never read policy or evidence details.
    const fallback = missing.length
      ? await Promise.all([
          policy(),
          resultifyRead(() =>
            db
              .select({ id: prospect.id, details: prospect.details })
              .from(prospect)
              .where(
                inArray(
                  prospect.id,
                  missing.map(({ id }) => id),
                ),
              ),
          ),
        ]).then(
          ([configuration, details]) =>
            new Map(
              requireData(details).map((prospect) => [
                prospect.id,
                prospectIssues(prospect.details, configuration.settings)[0]
                  ?.code ?? "reviewRequired",
              ]),
            ),
        )
      : new Map<string, string>();
    const reasons = new Map<string, number>();
    for (const prospect of held) {
      const reason =
        prospect.holdReason || fallback.get(prospect.id) || "reviewRequired";
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
    }
    const totals = groups.reduce(
      (total, group) => ({
        prospects: total.prospects + group.prospects,
        held: total.held + group.held,
        acceptedFirsts: total.acceptedFirsts + group.acceptedFirsts,
        acceptedFollowups: total.acceptedFollowups + group.acceptedFollowups,
        replies: total.replies + group.replies,
        bounces: total.bounces + group.bounces,
        meetings: total.meetings + group.meetings,
      }),
      {
        prospects: 0,
        held: 0,
        acceptedFirsts: 0,
        acceptedFollowups: 0,
        replies: 0,
        bounces: 0,
        meetings: 0,
      },
    );
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      totals: {
        ...totals,
        uncertain: sends.filter((attempt) => attempt.status === "uncertain")
          .length,
      },
      bySource: groups.sort(
        (first, second) => second.prospects - first.prospects,
      ),
      holdReasons: [...reasons]
        .map(([reason, count]) => ({ reason, count }))
        .sort((first, second) => second.count - first.count),
    };
  });
