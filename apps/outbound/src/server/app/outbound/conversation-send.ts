import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { mailboxConnected, normalizeDomain } from "@/lib/outbound";
import { conversationSendSchema } from "@/lib/outbound-conversations";
import { schema, type TransactionScope } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { ConflictError } from "@/server/utils/error";
import * as Direct from "@/server/utils/outbound/direct-mailbox";
import * as Google from "@/server/utils/outbound/google";
import { IntegrationError } from "@/server/utils/outbound/http";
import { addresses, type Mail } from "@/server/utils/outbound/inbound";
import { assertLinkedinCapacity } from "@/server/utils/outbound/linkedin-capacity";
import { smtpFailureFrom } from "@/server/utils/outbound/smtp-failure";
import * as Unipile from "@/server/utils/outbound/unipile";
import { repository } from "@/server/utils/repository";
import * as Conversations from "./conversations";
import * as Store from "./store";
import * as Mailboxes from "./transport-store";

const Sends = repository(schema.outboundConversationSend);
const Inboxes = repository(schema.outboundInbox);
const Accounts = repository(schema.outboundLinkedinAccount);
const Prospects = repository(schema.outboundProspect);
const Suppressions = repository(schema.outboundSuppression);
const EmailAttempts = repository(schema.outboundSendAttempt);
const checkCapacity = async (
  inbox: Mailboxes.Inbox,
  transaction: TransactionScope,
  exclude?: string,
) => {
  const settings = (await Store.policy(transaction)).settings;
  const cap = (await Store.inboxCapacity(inbox, settings, transaction))
    .dailyCap;
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const cold = value(
    await EmailAttempts.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundSendAttempt.inboxId, inbox.id),
          inArray(schema.outboundSendAttempt.status, [
            "claimed",
            "accepted",
            "uncertain",
          ]),
          or(
            sql`${schema.outboundSendAttempt.createdAt} >= ${since}`,
            inArray(schema.outboundSendAttempt.status, [
              "claimed",
              "uncertain",
            ]),
          ),
        ),
      },
      { tx: transaction },
    ),
  );
  const replies = value(
    await Sends.find(
      Environment.SERVER,
      {
        where: and(
          sql`${schema.outboundConversationSend.input}->>'channel' = 'email'`,
          sql`${schema.outboundConversationSend.input}->>'accountId' = ${inbox.id}`,
          or(
            sql`${schema.outboundConversationSend.createdAt} >= ${since}`,
            inArray(schema.outboundConversationSend.status, [
              "starting",
              "uncertain",
            ]),
          ),
          inArray(schema.outboundConversationSend.status, [
            "starting",
            "accepted",
            "uncertain",
          ]),
          exclude
            ? sql`${schema.outboundConversationSend.id} <> ${exclude}`
            : undefined,
        ),
      },
      { tx: transaction },
    ),
  );
  if (
    cold.some((attempt) => ["claimed", "uncertain"].includes(attempt.status)) ||
    replies.some((attempt) =>
      ["starting", "uncertain"].includes(attempt.status),
    )
  )
    throw new ConflictError("conversation-inbox-reconciliation");
  if (cold.length + replies.length >= cap)
    throw new ConflictError("conversation-inbox-capacity");
};
const value = <Data>(result: Result<Data, Error>): Data => {
  if (!result.success) throw result.error;
  return result.data as Data;
};
const safeFailure = (error: Error) =>
  error instanceof IntegrationError
    ? `conversation-provider-${error.code}`
    : error.name === "conflict-error"
      ? error.message
      : "conversation-send-uncertain";
const manifestSchema = z.object({
  channel: z.enum(["email", "linkedin"]),
  conversationId: z.string().uuid(),
  prospectId: z.string().uuid(),
  accountId: z.string().min(1),
  recipient: z.string().min(1),
  providerThreadId: z.string().min(1),
  from: z.string().min(1),
  fromName: z.string(),
  subject: z.string(),
  body: z.string().min(1).max(10000),
  revision: z.number().int(),
  playbookRevision: z.number().int(),
  inboundId: z.string().uuid(),
  connectionVersion: z.number().int().nullable(),
  accountUserId: z.string().nullable(),
  rfcMessageId: z.string().nullable(),
  inReplyTo: z.string().nullable(),
  raw: z.string().nullable(),
  contentHash: z.string().length(64),
});
type Manifest = z.infer<typeof manifestSchema>;
const hash = (manifest: Omit<Manifest, "contentHash">) =>
  createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
const allowed = async (
  transaction: TransactionScope,
  id: string,
  revision: number,
) => {
  const thread = await Conversations.requireConversation(id, transaction);
  if (thread.revision !== revision)
    throw new ConflictError("conversation-changed");
  if (["notInterested", "closed"].includes(thread.stage))
    throw new ConflictError("conversation-closed");
  const prospect = value(
    await Prospects.get(Environment.SERVER, thread.prospectId, {
      tx: transaction,
    }),
  );
  if (!prospect || ["optedOut", "bounced"].includes(prospect.status))
    throw new ConflictError("conversation-suppressed");
  const suppression = value(
    await Suppressions.find(Environment.SERVER, {}, { tx: transaction }),
  ).some((entry) =>
    entry.scope === "domain"
      ? entry.value === normalizeDomain(prospect.details.domain)
      : entry.value === thread.counterpart.toLowerCase(),
  );
  if (suppression) throw new ConflictError("conversation-suppressed");
  const inbound = await Conversations.latestInbound(thread.id, transaction);
  if (
    !inbound ||
    thread.draftBasedOnMessageId !== inbound.id ||
    !thread.draftBody.trim()
  )
    throw new ConflictError("conversation-draft-stale");
  if (inbound.truncated)
    throw new ConflictError("conversation-message-truncated");
  return { thread, prospect, inbound };
};

/** Staff send action: one immutable reservation per reviewed thread revision. */
export const send = (actor: string, input: unknown) =>
  resultify(async () => {
    const parsed = conversationSendSchema.parse(input);
    const reserved = value(
      await Conversations.withinConversation(async (transaction) => {
        const { thread, inbound } = await allowed(
          transaction,
          parsed.id,
          parsed.expectedRevision,
        );
        const unresolved = value(
          await Sends.find(
            Environment.SERVER,
            {
              where: and(
                eq(schema.outboundConversationSend.conversationId, thread.id),
                inArray(schema.outboundConversationSend.status, [
                  "starting",
                  "uncertain",
                ]),
              ),
              limit: 1,
            },
            { tx: transaction },
          ),
        );
        if (unresolved.length)
          throw new ConflictError("conversation-send-unresolved");
        const policy = await Store.policy(transaction);
        const inbox =
          thread.channel === "email"
            ? value(
                await Inboxes.get(Environment.SERVER, thread.accountId, {
                  tx: transaction,
                }),
              )
            : null;
        const account =
          thread.channel === "linkedin"
            ? value(
                await Accounts.get(Environment.SERVER, thread.accountId, {
                  tx: transaction,
                }),
              )
            : null;
        if (
          thread.channel === "email" &&
          (!inbox ||
            !mailboxConnected(inbox) ||
            !inbox.enabled ||
            inbox.error ||
            inbox.syncMode ||
            !inbox.lastSyncedAt ||
            Date.now() - inbox.lastSyncedAt.getTime() > 600_000 ||
            inbox.fromName !== policy.settings.fromName ||
            inbox.signer !== policy.settings.signature)
        )
          throw new ConflictError("conversation-inbox-unavailable");
        if (
          thread.channel === "linkedin" &&
          (!account || account.isLocked || account.status !== "running")
        )
          throw new ConflictError("conversation-account-unavailable");
        if (inbox) await checkCapacity(inbox, transaction);
        if (account)
          await assertLinkedinCapacity(transaction, {
            accountId: account.id,
            action: "message",
            settings: policy.settings,
          });
        const subject = /^re:/i.test(thread.subject)
          ? thread.subject
          : `Re: ${thread.subject}`;
        const rfcMessageId = inbox
          ? `<${randomUUID()}@${inbox.email.split("@")[1]}>`
          : null;
        const message = inbox
          ? value(
              await Google.buildMessage({
                from: inbox.email,
                fromName: inbox.fromName,
                to: z.email().parse(inbound.from),
                subject,
                body: thread.draftBody,
                messageId: rfcMessageId ?? undefined,
                inReplyTo: inbound.rfcMessageId ?? undefined,
                references: inbound.rfcMessageId ? [inbound.rfcMessageId] : [],
              }),
            )
          : null;
        const unsigned: Omit<Manifest, "contentHash"> = {
          channel: thread.channel,
          conversationId: thread.id,
          prospectId: thread.prospectId,
          accountId: thread.accountId,
          recipient: inbound.from,
          providerThreadId: thread.providerThreadId,
          from: inbox?.email ?? account?.providerUserId ?? "",
          fromName: inbox?.fromName ?? account?.name ?? "",
          subject,
          body: thread.draftBody,
          revision: thread.revision,
          playbookRevision: policy.revision,
          inboundId: inbound.id,
          connectionVersion: inbox?.connectionVersion ?? null,
          accountUserId: account?.providerUserId ?? null,
          rfcMessageId,
          inReplyTo: inbound.rfcMessageId,
          raw: message?.raw ?? null,
        };
        const manifest = manifestSchema.parse({
          ...unsigned,
          contentHash: hash(unsigned),
        });
        const attempt = value(
          await Sends.create(
            Environment.SERVER,
            {
              conversationId: thread.id,
              revision: thread.revision,
              status: "starting",
              input: manifest,
              createdBy: actor,
            },
            { tx: transaction },
          ),
        );
        return { attempt, manifest, inbox, account };
      }),
    );
    const token =
      reserved.inbox?.transport === "gmail-oauth"
        ? await Mailboxes.access(reserved.inbox)
        : null;
    const prepared = await resultify(async () => {
      if (token && !token.success) throw token.error;
      if (reserved.account) {
        const live = value(await Unipile.getAccount(reserved.account.id));
        if (
          live.status !== "running" ||
          live.is_locked ||
          live.user_id !== reserved.account.providerUserId
        )
          throw new ConflictError("conversation-account-unavailable");
        const chats = value(
          await Unipile.getUserChats(
            reserved.account.id,
            reserved.manifest.recipient,
          ),
        );
        if (
          !chats.data.some(
            (chat) => chat.chat_id === reserved.manifest.providerThreadId,
          )
        )
          throw new ConflictError("conversation-thread-mismatch");
      }
    });
    if (!prepared.success) {
      value(
        await Sends.update(Environment.SERVER, reserved.attempt.id, {
          status: "failed",
          error: safeFailure(prepared.error),
          completedAt: new Date(),
        }),
      );
      throw new ConflictError(safeFailure(prepared.error));
    }
    return value(
      await Conversations.withinConversation(async (transaction) => {
        const saved = value(
          await Sends.get(Environment.SERVER, reserved.attempt.id, {
            tx: transaction,
          }),
        );
        if (!saved || saved.status !== "starting")
          throw new ConflictError("conversation-send-unresolved");
        const manifest = manifestSchema.parse(saved.input);
        const { contentHash, ...unsigned } = manifest;
        if (hash(unsigned) !== contentHash)
          throw new ConflictError("conversation-message-changed");
        const current = await resultify(async () => {
          if (
            (await Store.policy(transaction)).revision !==
            manifest.playbookRevision
          )
            throw new ConflictError("conversation-changed");
          const { thread } = await allowed(
            transaction,
            manifest.conversationId,
            manifest.revision,
          );
          if (
            thread.draftBody !== manifest.body ||
            thread.counterpart !== manifest.recipient ||
            thread.accountId !== manifest.accountId ||
            thread.providerThreadId !== manifest.providerThreadId
          )
            throw new ConflictError("conversation-changed");
          if (reserved.inbox) {
            const inbox = value(
              await Inboxes.get(Environment.SERVER, reserved.inbox.id, {
                tx: transaction,
              }),
            );
            if (
              !inbox ||
              !inbox.enabled ||
              !mailboxConnected(inbox) ||
              inbox.connectionVersion !== manifest.connectionVersion ||
              inbox.email !== manifest.from ||
              inbox.fromName !== manifest.fromName ||
              inbox.error ||
              inbox.syncMode
            )
              throw new ConflictError("conversation-inbox-unavailable");
            await checkCapacity(inbox, transaction, saved.id);
          }
          if (reserved.account) {
            const account = value(
              await Accounts.get(Environment.SERVER, reserved.account.id, {
                tx: transaction,
              }),
            );
            if (
              !account ||
              account.status !== "running" ||
              account.isLocked ||
              account.providerUserId !== manifest.accountUserId
            )
              throw new ConflictError("conversation-account-unavailable");
            await assertLinkedinCapacity(transaction, {
              accountId: account.id,
              action: "message",
              settings: (await Store.policy(transaction)).settings,
              excludeSendId: saved.id,
            });
          }
        });
        if (!current.success) {
          value(
            await Sends.update(
              Environment.SERVER,
              saved.id,
              {
                status: "failed",
                error: safeFailure(current.error),
                completedAt: new Date(),
              },
              { tx: transaction },
            ),
          );
          return {
            id: manifest.conversationId,
            attempt: saved.id,
            status: "failed" as const,
          };
        }
        const sent = await resultify(async () => {
          if (manifest.channel === "linkedin") {
            const receipt = value(
              await Unipile.sendMessage(
                manifest.accountId,
                manifest.providerThreadId,
                manifest.body,
              ),
            );
            if (typeof receipt.message_id !== "string")
              throw new IntegrationError(
                "unipile",
                "uncertain",
                "Missing message receipt.",
              );
            return receipt.message_id;
          }
          if (!reserved.inbox || !manifest.raw || !manifest.rfcMessageId)
            throw new ConflictError("conversation-inbox-unavailable");
          if (reserved.inbox.transport === "google-app-password")
            return value(
              await Direct.send({
                email: reserved.inbox.email,
                appPassword: reserved.inbox.appPassword ?? "",
                to: manifest.recipient,
                raw: manifest.raw,
                messageId: manifest.rfcMessageId,
              }),
            ).providerMessageId;
          if (!token?.success)
            throw new ConflictError("conversation-inbox-unavailable");
          return value(
            await Google.sendMessage({
              accessToken: token.data,
              raw: manifest.raw,
              threadId: manifest.providerThreadId,
            }),
          ).id;
        });
        const acceptedAt = new Date();
        if (!sent.success) {
          const certain =
            sent.error instanceof IntegrationError &&
            [
              "configuration",
              "input",
              "access",
              "quota",
              "rate-limit",
            ].includes(sent.error.code);
          value(
            await Sends.update(
              Environment.SERVER,
              saved.id,
              {
                status: certain ? "failed" : "uncertain",
                error: safeFailure(sent.error),
                completedAt: acceptedAt,
              },
              { tx: transaction },
            ),
          );
          await Store.recordSmtpFailureWithin(transaction, {
            actor,
            prospectId: manifest.prospectId,
            attemptId: saved.id,
            source: "conversation",
            smtpFailure: smtpFailureFrom(sent.error),
          });
          return {
            id: manifest.conversationId,
            attempt: saved.id,
            status: certain ? ("failed" as const) : ("uncertain" as const),
          };
        }
        value(
          await Sends.update(
            Environment.SERVER,
            saved.id,
            {
              status: "accepted",
              providerMessageId: sent.data,
              error: null,
              completedAt: acceptedAt,
            },
            { tx: transaction },
          ),
        );
        await Conversations.ingestWithin(transaction, {
          prospectId: manifest.prospectId,
          channel: manifest.channel,
          accountId: manifest.accountId,
          accountLabel:
            reserved.inbox?.email ??
            reserved.account?.name ??
            manifest.fromName,
          providerThreadId: manifest.providerThreadId,
          counterpart: manifest.recipient,
          message: {
            providerMessageId: sent.data,
            direction: "outbound",
            bodyText: manifest.body,
            subject: manifest.subject,
            from: manifest.from,
            to: manifest.recipient,
            rfcMessageId: manifest.rfcMessageId,
            sentAt: acceptedAt,
            isAutomated: false,
            truncated: false,
          },
        });
        return {
          id: manifest.conversationId,
          attempt: saved.id,
          status: "accepted" as const,
        };
      }),
    );
  });

/** A real Sent-folder message can reconcile a lost SMTP/Gmail response without resending it. */
export const reconcile = (inbox: Mailboxes.Inbox, mail: Mail) =>
  Conversations.withinConversation(async (transaction) => {
    if (
      !mail.labelIds?.includes("SENT") ||
      !addresses(mail.headers["from"] ?? "").includes(inbox.email) ||
      !mail.headers["message-id"]
    )
      return { matched: false };
    const matches = value(
      await Sends.find(
        Environment.SERVER,
        {
          where: and(
            sql`${schema.outboundConversationSend.input}->>'channel' = 'email'`,
            sql`${schema.outboundConversationSend.input}->>'accountId' = ${inbox.id}`,
            sql`${schema.outboundConversationSend.input}->>'rfcMessageId' = ${mail.headers["message-id"]}`,
            inArray(schema.outboundConversationSend.status, [
              "starting",
              "uncertain",
              "accepted",
            ]),
          ),
          limit: 2,
        },
        { tx: transaction },
      ),
    );
    if (matches.length !== 1 || !matches[0]) return { matched: false };
    const attempt = matches[0];
    const manifest = manifestSchema.parse(attempt.input);
    const normalize = (text: string) => text.replace(/\r\n/g, "\n").trimEnd();
    if (
      !addresses(mail.headers["to"] ?? "").includes(manifest.recipient) ||
      normalize(mail.text) !== normalize(manifest.body)
    )
      return { matched: false };
    const acceptedAt = new Date(Number(mail.internalDate));
    if (!Number.isFinite(acceptedAt.getTime())) return { matched: false };
    if (attempt.status !== "accepted")
      value(
        await Sends.update(
          Environment.SERVER,
          attempt.id,
          {
            status: "accepted",
            providerMessageId: mail.id,
            error: null,
            completedAt: acceptedAt,
          },
          { tx: transaction },
        ),
      );
    await Conversations.ingestWithin(transaction, {
      prospectId: manifest.prospectId,
      channel: "email",
      accountId: inbox.id,
      accountLabel: inbox.email,
      providerThreadId: manifest.providerThreadId,
      counterpart: manifest.recipient,
      message: {
        providerMessageId: mail.id,
        direction: "outbound",
        bodyText: manifest.body,
        subject: manifest.subject,
        from: inbox.email,
        to: manifest.recipient,
        rfcMessageId: manifest.rfcMessageId,
        sentAt: acceptedAt,
        isAutomated: false,
        truncated: false,
      },
    });
    return { matched: true };
  });
