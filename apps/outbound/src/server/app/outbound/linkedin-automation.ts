import "server-only";

import { createHash } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  contactHistoryReady,
  inSendWindow,
  normalizeDomain,
  prospectIssues,
  splitList,
  templateIssues,
} from "@/lib/outbound";
import { renderLinkedInResult } from "@/lib/outbound-composition";
import { copyPhrasePresent } from "@/lib/outbound-copy-quality";
import { outreachMayStart } from "@/lib/outbound-scheduling";
import { db, schema, type TransactionScope } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { ConflictError } from "@/server/utils/error";
import { IntegrationError } from "@/server/utils/outbound/http";
import { classifyInbound } from "@/server/utils/outbound/inbound";
import { assertLinkedinCapacity } from "@/server/utils/outbound/linkedin-capacity";
import {
  type LinkedInAttempt,
  linkedinAttemptSchema,
} from "@/server/utils/outbound/linkedin-ledger";
import * as Unipile from "@/server/utils/outbound/unipile";
import { repository } from "@/server/utils/repository";
import * as Conversations from "./conversations";
import * as Store from "./store";

const Jobs = repository(schema.outboundIntegrationJob);
const Prospects = repository(schema.outboundProspect);
const Accounts = repository(schema.outboundLinkedinAccount);
const Attempts = repository(schema.outboundSendAttempt);
const Campaigns = repository(schema.outboundCampaign);
const Suppressions = repository(schema.outboundSuppression);
const Companies = repository(schema.outboundCompany);
const Events = repository(schema.outboundEvent);
type Prospect = typeof schema.outboundProspect.$inferSelect;
type Job = typeof schema.outboundIntegrationJob.$inferSelect;
type Provider = Pick<
  typeof Unipile,
  | "getAccount"
  | "resolveUser"
  | "getUserChats"
  | "getChatMessages"
  | "sendInvitation"
  | "startChat"
  | "sendMessage"
>;
const actor = "outbound-linkedin-automation";
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
const hold = (reason: string): never => {
  throw new ConflictError(reason);
};
const safeReason = (error: Error) =>
  error.name === "conflict-error"
    ? error.message
    : error instanceof IntegrationError
      ? `linkedin-provider-${error.code}`
      : "linkedin-check-failed";
const digest = (input: Omit<LinkedInAttempt, "approvalHash">) =>
  createHash("sha256").update(JSON.stringify(input)).digest("hex");
const attemptRows = async (
  prospectId: string,
  transaction?: TransactionScope,
) =>
  value(
    await Jobs.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundIntegrationJob.provider, "linkedin"),
          eq(schema.outboundIntegrationJob.prospectId, prospectId),
        ),
      },
      { tx: transaction },
    ),
  );

/** Uses real current profile identity; a query filter or a matching display name alone is insufficient. */
export const profileMatches = (profile: Unipile.User, prospect: Prospect) => {
  if (profile.profile_url) {
    const address = new URL(profile.profile_url);
    if (
      address.protocol !== "https:" ||
      !/^(?:www\.|[a-z]{2}\.)?linkedin\.com$/i.test(address.hostname)
    )
      return false;
  }
  const expected = new URL(prospect.details.linkedinUrl).pathname
    .replace(/\/+$/, "")
    .toLowerCase();
  const actual = profile.profile_url
    ? new URL(profile.profile_url).pathname.replace(/\/+$/, "").toLowerCase()
    : profile.public_identifier
      ? `/in/${profile.public_identifier.toLowerCase()}`
      : "";
  const normalize = (name: string) =>
    name
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N} ]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  return (
    expected.startsWith("/in/") &&
    actual === expected &&
    normalize(profile.display_name) === normalize(prospect.details.name)
  );
};

type History = {
  chatId: string | null;
  checkedAt: string;
  reply: Unipile.ChatMessage | null;
  clear: boolean;
  reason: string | null;
};
const replyOptout = (message: Unipile.ChatMessage) =>
  classifyInbound({
    id: message.id,
    threadId: message.chat_id,
    internalDate: String(Date.parse(message.timestamp)),
    headers: {},
    text: message.text ?? "",
  }) === "optout";
const history = async (
  accountId: string,
  recipientId: string,
  jobs: Job[],
  provider: Provider,
  initialProspectId?: string,
): Promise<History> => {
  const chats = value(await provider.getUserChats(accountId, recipientId));
  if (chats.data.length > 1)
    return {
      chatId: null,
      checkedAt: new Date().toISOString(),
      reply: null,
      clear: false,
      reason: "linkedin-ambiguous-conversation",
    };
  const chatId = chats.data[0]?.chat_id ?? null;
  if (!chatId)
    return {
      chatId,
      checkedAt: new Date().toISOString(),
      reply: null,
      clear: true,
      reason: null,
    };
  const messages = value(await provider.getChatMessages(accountId, chatId));
  if (messages.data.some((message) => message.chat_id !== chatId))
    hold("linkedin-conversation-mismatch");
  const linkedJob = jobs.find(
    (job) =>
      job.prospectId &&
      job.input["accountId"] === accountId &&
      job.input["recipientId"] === recipientId,
  );
  const conversationProspect = linkedJob?.prospectId ?? initialProspectId;
  if (conversationProspect) {
    const account = value(await Accounts.get(Environment.SERVER, accountId));
    for (const message of messages.data.filter(
      (message) => !message.is_event,
    )) {
      value(
        await Conversations.ingest({
          prospectId: conversationProspect,
          channel: "linkedin",
          accountId,
          accountLabel: account?.name ?? "LinkedIn",
          providerThreadId: chatId,
          counterpart: recipientId,
          outcome:
            !message.is_sender && replyOptout(message) ? "optout" : undefined,
          message: {
            providerMessageId: message.id,
            direction: message.is_sender ? "outbound" : "inbound",
            bodyText: message.text ?? "",
            subject: "",
            from: message.sender_id,
            to: message.is_sender
              ? recipientId
              : (account?.providerUserId ?? ""),
            sentAt: new Date(message.timestamp),
            isAutomated: false,
            truncated: false,
          },
        }),
      );
    }
  }
  const incoming =
    messages.data.find(
      (message) =>
        !message.is_sender && !message.is_event && replyOptout(message),
    ) ??
    messages.data.find((message) => !message.is_sender && !message.is_event);
  if (incoming)
    return {
      chatId,
      checkedAt: new Date().toISOString(),
      reply: incoming,
      clear: false,
      reason: "linkedin-reply",
    };
  const known = new Set(
    jobs
      .filter((job) => job.status === "complete")
      .map((job) => job.output?.["providerMessageId"])
      .filter(
        (identifier): identifier is string => typeof identifier === "string",
      ),
  );
  if (
    messages.data.some((message) => !message.is_event && !known.has(message.id))
  )
    return {
      chatId,
      checkedAt: new Date().toISOString(),
      reply: null,
      clear: false,
      reason: "linkedin-existing-conversation",
    };
  if (
    messages.next_cursor ||
    (chats.data[0]?.has_history === true && messages.data.length === 0) ||
    messages.data.length >= 20 ||
    (messages.total_count ?? 0) > messages.data.length
  )
    return {
      chatId,
      checkedAt: new Date().toISOString(),
      reply: null,
      clear: false,
      reason: "linkedin-history-incomplete",
    };
  return {
    chatId,
    checkedAt: new Date().toISOString(),
    reply: null,
    clear: true,
    reason: null,
  };
};
const checkpointHistory = async (
  prospectId: string,
  accountId: string,
  checked: History,
) =>
  transaction(async (transaction) => {
    for (const job of (await attemptRows(prospectId, transaction)).filter(
      (job) => job.input["accountId"] === accountId,
    ))
      value(
        await Jobs.update(
          Environment.SERVER,
          job.id,
          {
            output: {
              ...job.output,
              historyCheckedAt: checked.checkedAt,
              historyClear: checked.clear,
              historyReason: checked.reason,
            },
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      );
  });
const recordReply = async (prospectId: string, reply: Unipile.ChatMessage) => {
  const optout = replyOptout(reply);
  value(
    await Store.recordOutcome(actor, {
      prospect: prospectId,
      kind: optout ? "optout" : "reply",
      note: `LinkedIn ${optout ? "opt-out" : "reply"} received (${reply.id}).`,
    }),
  );
  value(
    await transaction(async (transaction) =>
      value(
        await Prospects.update(
          Environment.SERVER,
          prospectId,
          {
            linkedinStatus: optout ? "closed" : "replied",
            linkedinNextActionAt: null,
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      ),
    ),
  );
};

const eligible = async (
  transaction: TransactionScope,
  prospectId: string,
  now: Date,
  expected?: LinkedInAttempt,
) => {
  const prospect = value(
    await Prospects.get(Environment.SERVER, prospectId, { tx: transaction }),
  );
  if (!prospect || !prospect.campaignId)
    return hold("linkedin-campaign-required");
  const policy = await Store.policy(transaction);
  if (prospect.replacementOf) return hold("linkedin-replacement-email-only");
  const { assertSequenceFamilyWithin } = await import(
    "./replacement-sequences"
  );
  await assertSequenceFamilyWithin(transaction, prospect, policy.settings);
  if (
    !policy.settings.automationEnabled ||
    !policy.settings.linkedinAutomationEnabled
  )
    return hold("linkedin-paused");
  if (!outreachMayStart(policy.settings, now))
    return hold("linkedin-not-before");
  if (!policy.settings.linkedinAccountId)
    return hold("linkedin-account-missing");
  if (
    !contactHistoryReady(policy.settings) ||
    !policy.settings.competingSendersPaused
  )
    return hold("linkedin-history-unconfirmed");
  if (
    ["held", "skipped", "replied", "optedOut", "bounced", "finished"].includes(
      prospect.status,
    ) ||
    ["replied", "closed"].includes(prospect.linkedinStatus)
  )
    return hold("linkedin-prospect-stopped");
  await Store.assertCampaignActive(transaction, prospect);
  await Store.assertAutomaticEvidence(transaction, prospect);
  await Store.assertAppliedCompositionWithin(transaction, prospect);
  const campaign = value(
    await Campaigns.get(Environment.SERVER, prospect.campaignId, {
      tx: transaction,
    }),
  );
  if (!campaign) return hold("linkedin-campaign-required");
  const source = prospect.details.automationEvidenceId
    ? value(
        await Jobs.get(
          Environment.SERVER,
          prospect.details.automationEvidenceId,
          { tx: transaction },
        ),
      )
    : null;
  const selection = z
    .object({
      status: z.literal("selected"),
      provisional: z.literal(false),
      details: z.object({
        name: z.string(),
        title: z.string(),
        linkedinUrl: z.string(),
        roleSource: z.string(),
        roleCheckedAt: z.string(),
      }),
    })
    .safeParse(source?.output?.["selection"]);
  const refresh = prospect.details.automationRefreshId
    ? value(
        await Jobs.get(
          Environment.SERVER,
          prospect.details.automationRefreshId,
          { tx: transaction },
        ),
      )
    : null;
  const refreshedRevision =
    refresh?.provider === "automation" &&
    refresh.status === "complete" &&
    refresh.input["operation"] === "sequenceRefresh" &&
    refresh.input["sourceEvidenceId"] === source?.id &&
    refresh.input["prospectId"] === prospect.id &&
    refresh.input["campaignId"] === campaign.id &&
    refresh.input["campaignRevision"] === campaign.revision &&
    refresh.input["playbookRevision"] === policy.revision &&
    refresh.output?.["stage"] === "complete" &&
    refresh.output?.["appliedProspectRevision"] === prospect.revision;
  // Shopping research binds the current prospect, campaign and research policy
  // above; its original selected-contact job remains immutable.
  const shoppingResearch = prospect.details.gap === "shopping-research";
  if (
    !source ||
    source.provider !== "automation" ||
    source.input["operation"] !== "campaignAutomation" ||
    source.input["campaignId"] !== campaign.id ||
    source.output?.["prospectId"] !== prospect.id ||
    (!shoppingResearch &&
      (source.input["campaignRevision"] !== campaign.revision ||
        source.input["playbookRevision"] !== policy.revision ||
        (source.output?.["prospectRevision"] !== prospect.revision &&
          !refreshedRevision) ||
        prospect.details.gap !== "product-published-data")) ||
    !selection.success ||
    Object.entries(selection.data.details).some(
      ([key, detail]) =>
        prospect.details[key as keyof typeof prospect.details] !== detail,
    ) ||
    !z
      .object({ status: z.literal("qualified") })
      .safeParse(source.output?.["qualification"]).success
  )
    return hold("linkedin-qualification-stale");
  const ignored = new Set([
    "emailUnverified",
    "sharedInbox",
    "microsoftHeld",
    "mxUnknown",
    "senderUnconfirmed",
    "senderDomain",
  ]);
  const issues = prospectIssues(prospect.details, policy.settings, now).filter(
    (issue) => !ignored.has(issue.code),
  );
  if (issues.length)
    return hold(`linkedin-${issues[0]?.code ?? "evidence-missing"}`);
  if (
    !prospect.details.linkedinUrl ||
    !inSendWindow(prospect.details, now, policy.settings)
  )
    return hold("linkedin-window-or-profile");
  const suppressed = value(
    await Suppressions.find(Environment.SERVER, {}, { tx: transaction }),
  ).some((entry) =>
    entry.scope === "domain"
      ? entry.value === normalizeDomain(prospect.details.domain)
      : entry.value === prospect.details.email.toLowerCase(),
  );
  if (suppressed) return hold("linkedin-suppressed");
  const emails = value(
    await Attempts.find(
      Environment.SERVER,
      {
        where: and(
          sql`exists (select 1 from outbound_prospect email_prospect where email_prospect.id = ${schema.outboundSendAttempt.prospectId} and email_prospect.company_id = ${prospect.companyId})`,
          eq(schema.outboundSendAttempt.test, false),
          sql`${schema.outboundSendAttempt.createdAt} >= ${new Date(now.getTime() - 86_400_000).toISOString()}`,
        ),
        limit: 1,
      },
      { tx: transaction },
    ),
  );
  if (emails.length) return hold("linkedin-cross-channel-wait");
  const company = value(
    await Companies.get(Environment.SERVER, prospect.companyId, {
      tx: transaction,
    }),
  );
  if (!company || company.relationship !== "cold")
    return hold("linkedin-company-history");
  if (
    company.lastContactedAt &&
    now.getTime() - company.lastContactedAt.getTime() < 180 * 86_400_000
  ) {
    const acceptedEmails = value(
      await Attempts.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundSendAttempt.prospectId, prospect.id),
            eq(schema.outboundSendAttempt.status, "accepted"),
            eq(schema.outboundSendAttempt.test, false),
            eq(schema.outboundSendAttempt.completedAt, company.lastContactedAt),
          ),
          limit: 1,
        },
        { tx: transaction },
      ),
    );
    const ownLinkedIn = (await attemptRows(prospect.id, transaction)).some(
      (job) =>
        job.status === "complete" &&
        job.output?.["acceptedAt"] === company.lastContactedAt?.toISOString(),
    );
    if (!acceptedEmails.length && !ownLinkedIn)
      return hold("linkedin-company-history");
  }
  const account = value(
    await Accounts.get(Environment.SERVER, policy.settings.linkedinAccountId, {
      tx: transaction,
    }),
  );
  if (!account || account.isLocked || account.status !== "running")
    return hold("linkedin-account-unavailable");
  if (
    expected &&
    (prospect.revision !== expected.prospectRevision ||
      campaign.revision !== expected.campaignRevision ||
      policy.revision !== expected.playbookRevision ||
      account.id !== expected.accountId ||
      account.providerUserId !== expected.accountUserId ||
      prospect.details.linkedinUrl !== expected.profileUrl ||
      source.id !== expected.qualificationJobId)
  )
    return hold("linkedin-approval-stale");
  return { prospect, policy, campaign, source, account };
};

const reserve = async (prospectId: string, provider: Provider, now: Date) => {
  const context = value(
    await transaction((transaction) => eligible(transaction, prospectId, now)),
  );
  const live = value(await provider.getAccount(context.account.id));
  if (
    live.status !== "running" ||
    live.is_locked ||
    live.user_id !== context.account.providerUserId ||
    Object.values(live.metadata.products_connection_status ?? {}).some(
      (status) => status !== "running",
    )
  )
    return hold("linkedin-account-unavailable");
  const profile = value(
    await provider.resolveUser(
      context.account.id,
      context.prospect.details.linkedinUrl,
    ),
  );
  if (
    profile.is_blocked ||
    profile.specifics.network_distance === "SELF" ||
    !profileMatches(profile, context.prospect)
  )
    return hold("linkedin-profile-mismatch");
  const jobs = await attemptRows(prospectId);
  const checked = await history(
    context.account.id,
    profile.id,
    jobs,
    provider,
    prospectId,
  );
  value(await checkpointHistory(prospectId, context.account.id, checked));
  if (checked.reply) {
    await recordReply(prospectId, checked.reply);
    return hold("linkedin-reply");
  }
  if (!checked.clear)
    return hold(checked.reason ?? "linkedin-history-incomplete");
  const action: LinkedInAttempt["action"] =
    profile.specifics.network_distance === "FIRST_DEGREE"
      ? "message"
      : "invite";
  if (action === "invite" && profile.specifics.relation_request)
    return hold("linkedin-invitation-pending");
  if (
    action === "invite" &&
    !["SECOND_DEGREE", "THIRD_DEGREE", "OUT_OF_NETWORK"].includes(
      profile.specifics.network_distance ?? "",
    )
  )
    return hold("linkedin-connection-unknown");
  if (
    action === "message" &&
    /\{founderLine\}/.test(context.policy.settings.linkedinTemplate)
  )
    return hold("linkedin-persona-mismatch");
  const writing = context.prospect.messages[0]?.writing;
  const rendered = writing
    ? renderLinkedInResult(
        context.prospect.details,
        context.policy.settings,
        writing.parts,
      )
    : null;
  const text =
    action === "invite"
      ? ""
      : rendered?.status === "ready"
        ? rendered.text
        : "";
  if (
    action === "message" &&
    (!text ||
      text.length > 3000 ||
      templateIssues(text).length ||
      /[{}]/.test(text) ||
      splitList(context.policy.settings.bannedPhrases).some((phrase) =>
        copyPhrasePresent(text, phrase),
      ))
  )
    return hold("linkedin-message-invalid");
  const approved: Omit<LinkedInAttempt, "approvalHash"> = {
    operation: "linkedinOutreach" as const,
    action,
    prospectId,
    companyId: context.prospect.companyId,
    campaignId: context.campaign.id,
    accountId: context.account.id,
    accountUserId: context.account.providerUserId,
    recipientId: profile.id,
    profileUrl: context.prospect.details.linkedinUrl,
    chatId: checked.chatId,
    text,
    prospectRevision: context.prospect.revision,
    campaignRevision: context.campaign.revision,
    playbookRevision: context.policy.revision,
    qualificationJobId: context.source.id,
    historyCheckedAt: checked.checkedAt,
    approvedAt: now.toISOString(),
  };
  const input = linkedinAttemptSchema.parse({
    ...approved,
    approvalHash: digest(approved),
  });
  return value(
    await transaction(async (transaction) => {
      const current = await eligible(transaction, prospectId, now, input);
      await assertLinkedinCapacity(transaction, {
        accountId: input.accountId,
        action,
        settings: current.policy.settings,
        now,
      });
      const existing = await attemptRows(prospectId, transaction);
      if (existing.some((job) => job.input["action"] === action)) return null;
      if (existing.some((job) => job.input["accountId"] !== input.accountId))
        return hold("linkedin-account-changed");
      if (
        existing.some(
          (job) =>
            job.status === "starting" ||
            job.status === "uncertain" ||
            now.getTime() - job.createdAt.getTime() < 86_400_000,
        )
      )
        return hold("linkedin-touch-wait");
      const accountJobs = value(
        await Jobs.find(
          Environment.SERVER,
          {
            where: and(
              eq(schema.outboundIntegrationJob.provider, "linkedin"),
              sql`${schema.outboundIntegrationJob.input}->>'accountId' = ${input.accountId}`,
              sql`${schema.outboundIntegrationJob.createdAt} >= ${new Date(now.getTime() - 7 * 86_400_000).toISOString()}`,
            ),
          },
          { tx: transaction },
        ),
      );
      if (
        accountJobs.some((job) =>
          ["starting", "uncertain"].includes(job.status),
        )
      )
        return hold("linkedin-account-reconciliation");
      if (
        accountJobs.some(
          (job) =>
            job.status === "failed" &&
            [
              "linkedin-provider-access",
              "linkedin-provider-quota",
              "linkedin-provider-rate-limit",
            ].includes(job.error ?? "") &&
            now.getTime() - job.createdAt.getTime() < 3_600_000,
        )
      )
        return hold("linkedin-account-cooldown");
      return value(
        await Jobs.create(
          Environment.SERVER,
          {
            provider: "linkedin",
            prospectId,
            requestId: `linkedin:${prospectId}:${action}`,
            status: "starting",
            input,
            output: { historyCheckedAt: checked.checkedAt, historyClear: true },
            createdAt: now,
            updatedAt: now,
          },
          { tx: transaction },
        ),
      );
    }),
  );
};

/** The reservation commits before POST. A crashed worker leaves starting/uncertain and is never replayed. */
const dispatch = (job: Job, provider: Provider, now: Date, deadline: number) =>
  transaction(async (transaction) => {
    const saved = value(
      await Jobs.get(Environment.SERVER, job.id, { tx: transaction }),
    );
    if (!saved || saved.status !== "starting") return "held" as const;
    const input = linkedinAttemptSchema.parse(saved.input);
    const { approvalHash, ...manifest } = input;
    if (digest(manifest) !== approvalHash)
      return hold("linkedin-approval-invalid");
    const checked = await resultify(async () => {
      const current = await eligible(transaction, input.prospectId, now, input);
      await assertLinkedinCapacity(transaction, {
        accountId: input.accountId,
        action: input.action,
        settings: current.policy.settings,
        now,
        excludeJobId: saved.id,
      });
      if (Date.now() > deadline - 25_000)
        return hold("linkedin-worker-deadline");
      if (
        Date.now() - Date.parse(input.historyCheckedAt) > 60_000 ||
        Date.parse(input.historyCheckedAt) > Date.now()
      )
        return hold("linkedin-history-stale");
      return true;
    });
    if (!checked.success) {
      value(
        await Jobs.update(
          Environment.SERVER,
          saved.id,
          {
            status: "failed",
            error: safeReason(checked.error),
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      );
      return "held" as const;
    }
    const sent = await resultify(async () => {
      if (input.action === "invite") {
        const receipt = value(
          await provider.sendInvitation(
            input.accountId,
            input.recipientId,
            input.text,
          ),
        );
        return {
          providerInvitationId: receipt.id,
          providerMessageId: null,
          chatId: null,
        };
      }
      const receipt = input.chatId
        ? value(
            await provider.sendMessage(
              input.accountId,
              input.chatId,
              input.text,
            ),
          )
        : value(
            await provider.startChat(
              input.accountId,
              input.recipientId,
              input.text,
            ),
          );
      const identifier = receipt.message_id;
      if (typeof identifier !== "string" || !identifier)
        throw new IntegrationError(
          "unipile",
          "uncertain",
          "Message receipt is ambiguous.",
        );
      return {
        providerInvitationId: null,
        providerMessageId: identifier,
        chatId: "chat_id" in receipt ? receipt.chat_id : input.chatId,
      };
    });
    if (!sent.success) {
      const certain =
        sent.error instanceof IntegrationError &&
        ["configuration", "input", "access", "quota", "rate-limit"].includes(
          sent.error.code,
        );
      value(
        await Jobs.update(
          Environment.SERVER,
          saved.id,
          {
            status: certain ? "failed" : "uncertain",
            error: safeReason(sent.error),
            output: { ...saved.output, historyClear: false },
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      );
      return certain ? ("held" as const) : ("uncertain" as const);
    }
    const acceptedAt = new Date();
    const sender = value(
      await Accounts.get(Environment.SERVER, input.accountId, {
        tx: transaction,
      }),
    );
    const providerMessageId =
      input.action === "invite"
        ? sent.data.providerInvitationId
        : sent.data.providerMessageId;
    const providerThreadId =
      input.action === "invite"
        ? `invitation:${providerMessageId}`
        : sent.data.chatId;
    if (providerMessageId && providerThreadId)
      await Conversations.ingestWithin(transaction, {
        prospectId: input.prospectId,
        channel: "linkedin",
        accountId: input.accountId,
        accountLabel: sender?.name ?? "LinkedIn",
        providerThreadId,
        counterpart: input.recipientId,
        message: {
          providerMessageId,
          direction: "outbound",
          bodyText: input.text,
          subject: input.action === "invite" ? "LinkedIn invitation" : "",
          from: input.accountUserId,
          to: input.recipientId,
          sentAt: acceptedAt,
          isAutomated: true,
          truncated: false,
        },
      });
    value(
      await Jobs.update(
        Environment.SERVER,
        saved.id,
        {
          status: "complete",
          error: null,
          output: {
            ...saved.output,
            ...sent.data,
            acceptedAt: acceptedAt.toISOString(),
          },
          updatedAt: acceptedAt,
        },
        { tx: transaction },
      ),
    );
    value(
      await Prospects.update(
        Environment.SERVER,
        input.prospectId,
        {
          linkedinStatus: input.action === "invite" ? "invited" : "messaged",
          linkedinDraft: input.text,
          linkedinNextActionAt:
            input.action === "invite"
              ? new Date(acceptedAt.getTime() + 86_400_000)
              : null,
          linkedinNote: "",
          updatedAt: acceptedAt,
        },
        { tx: transaction },
      ),
    );
    value(
      await Companies.update(
        Environment.SERVER,
        input.companyId,
        { lastContactedAt: acceptedAt, updatedAt: acceptedAt },
        { tx: transaction },
      ),
    );
    value(
      await Events.create(
        Environment.SERVER,
        {
          actor,
          kind:
            input.action === "invite" ? "linkedinInvited" : "linkedinMessaged",
          detail: `Unipile accepted ${input.action}; immutable attempt ${saved.id}.`,
          prospectId: input.prospectId,
        },
        { tx: transaction },
      ),
    );
    return "accepted" as const;
  });

export const run = async (
  options: { maxActions?: number; deadline?: number } = {},
  provider: Provider = Unipile,
) =>
  resultify(async () => {
    const maximum = z
      .number()
      .int()
      .min(1)
      .max(5)
      .parse(options.maxActions ?? 1);
    const deadline = options.deadline ?? Date.now() + 120_000;
    const policy = await Store.policy();
    const outcome = {
      enabled:
        policy.settings.linkedinAutomationEnabled &&
        policy.settings.automationEnabled,
      attempted: 0,
      accepted: 0,
      uncertain: 0,
      held: [] as { prospectId: string; reason: string }[],
    };
    if (!outcome.enabled) return outcome;
    value(
      await transaction(async (transaction) => {
        const abandoned = value(
          await Jobs.find(
            Environment.SERVER,
            {
              where: and(
                eq(schema.outboundIntegrationJob.provider, "linkedin"),
                eq(schema.outboundIntegrationJob.status, "starting"),
                sql`${schema.outboundIntegrationJob.createdAt} < ${new Date(Date.now() - 120_000).toISOString()}`,
              ),
            },
            { tx: transaction },
          ),
        );
        for (const job of abandoned)
          value(
            await Jobs.update(
              Environment.SERVER,
              job.id,
              {
                status: "uncertain",
                error: "linkedin-worker-interrupted",
                updatedAt: new Date(),
              },
              { tx: transaction },
            ),
          );
      }),
    );
    if (!outreachMayStart(policy.settings)) return outcome;
    const prospects = value(
      await Prospects.find(Environment.SERVER, {
        where: and(
          sql`${schema.outboundProspect.campaignId} is not null`,
          sql`${schema.outboundProspect.details}->>'automationEvidenceId' <> ''`,
          inArray(schema.outboundProspect.status, [
            "candidate",
            "draft",
            "approved",
            "active",
          ]),
          sql`exists (select 1 from outbound_campaign linkedin_campaign where linkedin_campaign.id = ${schema.outboundProspect.campaignId} and linkedin_campaign.status = 'active')`,
          sql`(${schema.outboundProspect.linkedinNextActionAt} is null or ${schema.outboundProspect.linkedinNextActionAt} <= ${new Date().toISOString()})`,
          inArray(schema.outboundProspect.linkedinStatus, [
            "research",
            "ready",
            "invited",
            "connected",
          ]),
          sql`not exists (select 1 from outbound_integration_job linkedin_job where linkedin_job.provider = 'linkedin' and linkedin_job.prospect_id = ${schema.outboundProspect.id} and (linkedin_job.input->>'action' = 'message' or linkedin_job.status in ('starting','uncertain')))`,
        ),
        orderBy: [
          {
            column: schema.outboundProspect.linkedinNextActionAt,
            direction: "asc",
          },
          { column: schema.outboundProspect.createdAt, direction: "asc" },
        ],
        limit: 20,
      }),
    );
    for (const prospect of prospects) {
      if (Date.now() > deadline - 105_000 || outcome.attempted >= maximum)
        break;
      const reserved = await resultify(() =>
        reserve(prospect.id, provider, new Date()),
      );
      if (!reserved.success || !reserved.data) {
        const reason = reserved.success
          ? "linkedin-invitation-pending"
          : safeReason(reserved.error);
        outcome.held.push({ prospectId: prospect.id, reason });
        value(
          await transaction(async (transaction) =>
            value(
              await Prospects.update(
                Environment.SERVER,
                prospect.id,
                {
                  linkedinNextActionAt: new Date(Date.now() + 3_600_000),
                  linkedinNote: reason,
                },
                { tx: transaction },
              ),
            ),
          ),
        );
        continue;
      }
      outcome.attempted += 1;
      const result = await dispatch(
        reserved.data,
        provider,
        new Date(),
        deadline,
      );
      if (!result.success || result.data === "uncertain")
        outcome.uncertain += 1;
      else if (result.data === "accepted") outcome.accepted += 1;
      else
        outcome.held.push({
          prospectId: prospect.id,
          reason: "linkedin-dispatch-held",
        });
    }
    return outcome;
  });

/** Runs even when automation is paused: incoming replies must stop the email sequence. */
export const syncReplies = async (
  options: { maxProspects?: number; deadline?: number } = {},
  provider: Provider = Unipile,
) =>
  resultify(async () => {
    const maximum = z
      .number()
      .int()
      .min(1)
      .max(50)
      .parse(options.maxProspects ?? 20);
    const deadline = options.deadline ?? Date.now() + 120_000;
    const rows = value(
      await Jobs.find(Environment.SERVER, {
        where: and(
          eq(schema.outboundIntegrationJob.provider, "linkedin"),
          sql`exists (select 1 from outbound_prospect linkedin_prospect where linkedin_prospect.id = ${schema.outboundIntegrationJob.prospectId} and linkedin_prospect.status <> 'optedOut' and (linkedin_prospect.status <> 'replied' or exists (select 1 from outbound_conversation conversation where conversation.prospect_id = linkedin_prospect.id and conversation.channel = 'linkedin' and conversation.stage not in ('closed','notInterested'))))`,
          inArray(schema.outboundIntegrationJob.status, [
            "complete",
            "uncertain",
          ]),
        ),
        orderBy: [
          {
            column: sql`coalesce(${schema.outboundIntegrationJob.output}->>'historyCheckedAt','')`,
            direction: "asc",
          },
        ],
        limit: maximum * 2,
      }),
    );
    const seen = new Set<string>();
    const outcome = { checked: 0, replies: 0, blocked: 0 };
    for (const job of rows) {
      if (Date.now() > deadline - 45_000 || seen.size >= maximum) break;
      if (
        !job.prospectId ||
        seen.has(`${job.prospectId}:${job.input["accountId"]}`)
      )
        continue;
      seen.add(`${job.prospectId}:${job.input["accountId"]}`);
      const result = await resultify(async () => {
        const input = linkedinAttemptSchema.parse(job.input);
        const current = value(
          await Prospects.get(Environment.SERVER, input.prospectId),
        );
        if (!current || current.status === "optedOut") return;
        const checked = await history(
          input.accountId,
          input.recipientId,
          await attemptRows(input.prospectId),
          provider,
        );
        value(
          await checkpointHistory(input.prospectId, input.accountId, checked),
        );
        outcome.checked += 1;
        if (checked.reply && current.status !== "replied") {
          await recordReply(input.prospectId, checked.reply);
          outcome.replies += 1;
        } else if (!checked.clear) outcome.blocked += 1;
      });
      if (!result.success) {
        outcome.blocked += 1;
        const accountId =
          typeof job.input["accountId"] === "string"
            ? job.input["accountId"]
            : "";
        value(
          await checkpointHistory(job.prospectId, accountId, {
            chatId: null,
            checkedAt: new Date().toISOString(),
            reply: null,
            clear: false,
            reason: safeReason(result.error),
          }),
        );
      }
    }
    return outcome;
  });
