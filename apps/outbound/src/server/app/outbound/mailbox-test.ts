import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  deliveredBody,
  type Message,
  mailboxConnected,
  prospectSchema,
  senderPool,
} from "@/lib/outbound";
import { db, schema, type TransactionScope } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { ConflictError } from "@/server/utils/error";
import * as Direct from "@/server/utils/outbound/direct-mailbox";
import * as Google from "@/server/utils/outbound/google";
import { IntegrationError } from "@/server/utils/outbound/http";
import {
  addresses,
  classifyInbound,
  type Mail,
  messageIds,
} from "@/server/utils/outbound/inbound";
import { assertWarmupPaused } from "@/server/utils/outbound/warmup-guard";
import { repository } from "@/server/utils/repository";
import * as Conversations from "./conversations";
import * as Store from "./store";

export const MAILBOX_TEST_SOURCE = "internal-mailbox-setup-test";
const Jobs = repository(schema.outboundIntegrationJob);
const Inboxes = repository(schema.outboundInbox);
const Prospects = repository(schema.outboundProspect);
const Companies = repository(schema.outboundCompany);
const Attempts = repository(schema.outboundSendAttempt);
const Revisions = repository(schema.outboundRevision);
const Replies = repository(schema.outboundConversationSend);
const Threads = repository(schema.outboundConversation);
const ThreadMessages = repository(schema.outboundConversationMessage);
const Events = repository(schema.outboundEvent);
type Inbox = typeof schema.outboundInbox.$inferSelect;
type Job = typeof schema.outboundIntegrationJob.$inferSelect;
const inputSchema = z
  .object({
    requestId: z.string().uuid(),
    inboxId: z.string().uuid(),
    recipient: z.literal("xhuri@ecentic.ai"),
  })
  .strict();
const manifestSchema = inputSchema.extend({
  operation: z.literal("mailboxTest"),
  prospectId: z.string().uuid(),
  attemptId: z.string().uuid(),
  revision: z.number().int(),
  playbookRevision: z.number().int(),
  connectionVersion: z.number().int(),
  from: z.email(),
  fromName: z.string(),
  signer: z.string(),
  messageId: z.string(),
  messageDate: z.string().datetime(),
  subject: z.string(),
  body: z.string(),
  raw: z.string(),
  rawHash: z.string(),
  contentHash: z.string(),
});
const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");
const normalize = (text: string) => text.replace(/\r\n/g, "\n").trimEnd();
const value = <Data>(result: Result<Data, Error>): Data => {
  if (!result.success) throw result.error;
  return result.data as Data;
};
const within = <Data>(
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
const view = (job: Job) => {
  const input = manifestSchema.parse(job.input);
  return {
    id: job.id,
    requestId: input.requestId,
    inboxId: input.inboxId,
    prospectId: input.prospectId,
    attemptId: input.attemptId,
    from: input.from,
    recipient: input.recipient,
    messageId: input.messageId,
    status:
      job.status === "pending"
        ? ("awaitingReply" as const)
        : job.status === "complete"
          ? ("passed" as const)
          : job.status,
    replyReceived: Boolean(job.output?.["replyReceipt"]),
    confirmedAt:
      typeof job.output?.["confirmedAt"] === "string"
        ? job.output["confirmedAt"]
        : null,
  };
};
const immutable = async (
  transaction: TransactionScope,
  input: z.infer<typeof manifestSchema>,
) => {
  const version = value(
    await Revisions.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundRevision.prospectId, input.prospectId),
          eq(schema.outboundRevision.revision, input.revision),
        ),
        limit: 1,
      },
      { tx: transaction },
    ),
  )[0];
  const message = version?.messages[0];
  const rebuilt = Google.buildMessage({
    from: input.from,
    fromName: input.fromName,
    to: input.recipient,
    subject: input.subject,
    body: input.body,
    messageId: input.messageId,
    date: new Date(input.messageDate),
  });
  if (
    !version ||
    !message ||
    version.messages.length !== 1 ||
    message.step !== 1 ||
    message.subject !== input.subject ||
    deliveredBody(message, message, version.manifest.postalAddress) !==
      input.body ||
    version.manifest.recipient !== input.recipient ||
    version.manifest.sender !== input.from ||
    version.manifest.fromName !== input.fromName ||
    version.manifest.signature !== input.signer ||
    version.manifest.playbookRevision !== input.playbookRevision ||
    version.contentHash !== input.contentHash ||
    Store.contentHash(version.messages, version.manifest) !==
      input.contentHash ||
    digest(input.raw) !== input.rawHash ||
    !rebuilt.success ||
    rebuilt.data.raw !== input.raw
  )
    throw new ConflictError("mailbox-test-changed");
};
const inboxForTest = async (transaction: TransactionScope, inboxId: string) => {
  const policy = await Store.policy(transaction);
  const inbox = value(
    await Inboxes.get(Environment.SERVER, inboxId, { tx: transaction }),
  );
  if (
    policy.settings.sendingEnabled ||
    !inbox ||
    inbox.transport !== "google-app-password" ||
    !mailboxConnected(inbox) ||
    !inbox.appPassword ||
    !senderPool(policy.settings).includes(inbox.email) ||
    inbox.fromName !== policy.settings.fromName ||
    inbox.signer !== policy.settings.signature ||
    inbox.syncMode ||
    inbox.error ||
    !inbox.lastSyncedAt ||
    Date.now() - inbox.lastSyncedAt.getTime() > 600_000
  )
    throw new ConflictError("mailbox-test-inbox-unavailable");
  return { inbox, policy };
};
const capacity = async (
  transaction: TransactionScope,
  inbox: Inbox,
  exclude?: string,
) => {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const attempts = value(
    await Attempts.find(
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
          exclude
            ? sql`${schema.outboundSendAttempt.id} <> ${exclude}`
            : undefined,
        ),
      },
      { tx: transaction },
    ),
  );
  const replies = value(
    await Replies.find(
      Environment.SERVER,
      {
        where: and(
          sql`${schema.outboundConversationSend.input}->>'channel' = 'email'`,
          sql`${schema.outboundConversationSend.input}->>'accountId' = ${inbox.id}`,
          inArray(schema.outboundConversationSend.status, [
            "starting",
            "accepted",
            "uncertain",
          ]),
          or(
            sql`${schema.outboundConversationSend.createdAt} >= ${since}`,
            inArray(schema.outboundConversationSend.status, [
              "starting",
              "uncertain",
            ]),
          ),
        ),
      },
      { tx: transaction },
    ),
  );
  if (
    attempts.some((attempt) =>
      ["claimed", "uncertain"].includes(attempt.status),
    ) ||
    replies.some((reply) => ["starting", "uncertain"].includes(reply.status))
  )
    throw new ConflictError("mailbox-test-inbox-unresolved");
  const limit = (
    await Store.inboxCapacity(
      inbox,
      (
        await Store.policy(transaction)
      ).settings,
      transaction,
    )
  ).dailyCap;
  if (attempts.length + replies.length >= limit)
    throw new ConflictError("mailbox-test-inbox-capacity");
};

/** One owner-authorized setup message. Reusing a request UUID only returns its saved state. */
export const start = (
  actor: string,
  input: z.infer<typeof inputSchema>,
  dependencies: {
    send: typeof Direct.send;
    warmup: typeof assertWarmupPaused;
  } = { send: Direct.send, warmup: assertWarmupPaused },
) =>
  resultify(async () => {
    const parsed = inputSchema.parse(input);
    const reserved = value(
      await within(async (transaction) => {
        const previous = value(
          await Jobs.find(
            Environment.SERVER,
            {
              where: eq(
                schema.outboundIntegrationJob.requestId,
                `mailbox-test:${parsed.requestId}`,
              ),
              limit: 1,
            },
            { tx: transaction },
          ),
        )[0];
        if (previous) {
          const original = manifestSchema.parse(previous.input);
          if (
            original.inboxId !== parsed.inboxId ||
            original.recipient !== parsed.recipient
          )
            throw new ConflictError("mailbox-test-request-mismatch");
          return { job: previous, existing: true };
        }
        const { inbox, policy } = await inboxForTest(
          transaction,
          parsed.inboxId,
        );
        await capacity(transaction, inbox);
        await dependencies.warmup(inbox.email);
        const company = value(
          await Companies.find(
            Environment.SERVER,
            {
              where: eq(schema.outboundCompany.domain, "ecentic.ai"),
              limit: 1,
            },
            { tx: transaction },
          ),
        )[0];
        if (
          company &&
          value(
            await Prospects.find(
              Environment.SERVER,
              {
                where: eq(schema.outboundProspect.companyId, company.id),
                limit: 1,
              },
              { tx: transaction },
            ),
          ).length
        )
          throw new ConflictError("mailbox-test-contact-exists");
        // The company is ecentic's documented US business. No product, role or verification facts are fabricated.
        const saved = await Store.saveProspectWithin(
          transaction,
          actor,
          prospectSchema.parse({
            company: "ecentic",
            domain: "ecentic.ai",
            website: "https://ecentic.ai",
            country: "US",
            name: "Xhuri",
            first: "Xhuri",
            email: parsed.recipient,
            relationship: "warm",
            source: MAILBOX_TEST_SOURCE,
            notes:
              "Owner-authorized internal mailbox setup test. Not a sales prospect or campaign; no product research or email verification is asserted.",
          }),
        );
        const revision = saved.revision + 1;
        const messageId = `<outbound-mailbox-test.${parsed.requestId}@${inbox.email.split("@")[1]}>`;
        const message: Message = {
          step: 1,
          afterDays: 0,
          subject: "Outbound mailbox setup test",
          body: `This is the Outbound mailbox setup test from ${inbox.fromName}. Please reply Received so we can verify that replies arrive in Outbound.\n\n${inbox.signer}`,
        };
        const manifest = {
          recipient: parsed.recipient,
          sender: inbox.email,
          fromName: inbox.fromName,
          signature: inbox.signer,
          postalAddress: policy.settings.postalAddress,
          playbookRevision: policy.revision,
          evidence: "",
          evidenceCheckedAt: "",
        };
        const body = deliveredBody(message, message, manifest.postalAddress);
        const messageDate = new Date();
        const built = value(
          Google.buildMessage({
            from: inbox.email,
            fromName: inbox.fromName,
            to: parsed.recipient,
            subject: message.subject,
            body,
            messageId,
            date: messageDate,
          }),
        );
        const contentHash = Store.contentHash([message], manifest);
        value(
          await Revisions.create(
            Environment.SERVER,
            {
              prospectId: saved.prospect,
              revision,
              messages: [message],
              manifest,
              contentHash,
            },
            { tx: transaction },
          ),
        );
        value(
          await Prospects.update(
            Environment.SERVER,
            saved.prospect,
            {
              status: "skipped",
              holdReason: "internalMailboxTest",
              messages: [message],
              revision,
              playbookRevision: policy.revision,
              approvedAt: null,
              approvedBy: null,
              approvalHash: null,
              nextSendAt: null,
              inboxId: inbox.id,
              linkedinStatus: "closed",
            },
            { tx: transaction },
          ),
        );
        const attemptId = randomUUID();
        value(
          await Attempts.create(
            Environment.SERVER,
            {
              id: attemptId,
              prospectId: saved.prospect,
              inboxId: inbox.id,
              step: 1,
              revision,
              messageId,
              status: "claimed",
              contentHash,
              test: true,
            },
            { tx: transaction },
          ),
        );
        const job = value(
          await Jobs.create(
            Environment.SERVER,
            {
              provider: "automation",
              prospectId: saved.prospect,
              requestId: `mailbox-test:${parsed.requestId}`,
              status: "starting",
              input: manifestSchema.parse({
                ...parsed,
                operation: "mailboxTest",
                prospectId: saved.prospect,
                attemptId,
                revision,
                playbookRevision: policy.revision,
                connectionVersion: inbox.connectionVersion,
                from: inbox.email,
                fromName: inbox.fromName,
                signer: inbox.signer,
                messageId,
                messageDate: messageDate.toISOString(),
                subject: message.subject,
                body,
                raw: built.raw,
                rawHash: digest(built.raw),
                contentHash,
              }),
              output: { actor },
            },
            { tx: transaction },
          ),
        );
        return { job, existing: false };
      }),
    );
    if (reserved.existing) return view(reserved.job);
    return value(
      await within(async (transaction) => {
        const job = value(
          await Jobs.get(Environment.SERVER, reserved.job.id, {
            tx: transaction,
          }),
        );
        if (!job) throw new ConflictError("mailbox-test-missing");
        if (job.status !== "starting") return view(job);
        const input = manifestSchema.parse(job.input);
        const checked = await resultify(async () => {
          const { inbox, policy } = await inboxForTest(
            transaction,
            input.inboxId,
          );
          const attempt = value(
            await Attempts.get(Environment.SERVER, input.attemptId, {
              tx: transaction,
            }),
          );
          const prospect = value(
            await Prospects.get(Environment.SERVER, input.prospectId, {
              tx: transaction,
            }),
          );
          if (
            inbox.connectionVersion !== input.connectionVersion ||
            policy.revision !== input.playbookRevision ||
            inbox.email !== input.from ||
            inbox.fromName !== input.fromName ||
            inbox.signer !== input.signer ||
            attempt?.status !== "claimed" ||
            !attempt.test ||
            attempt.contentHash !== input.contentHash ||
            attempt.prospectId !== input.prospectId ||
            attempt.inboxId !== input.inboxId ||
            attempt.revision !== input.revision ||
            attempt.messageId !== input.messageId ||
            prospect?.status !== "skipped" ||
            prospect.revision !== input.revision ||
            prospect.details.source !== MAILBOX_TEST_SOURCE ||
            prospect.details.email !== input.recipient
          )
            throw new ConflictError("mailbox-test-changed");
          await immutable(transaction, input);
          await capacity(transaction, inbox, attempt.id);
          await dependencies.warmup(inbox.email);
          return inbox;
        });
        const sent = await (async () => {
          if (!checked.success) return checked;
          const response = await resultify(() =>
            dependencies.send({
              email: checked.data.email,
              appPassword: checked.data.appPassword ?? "",
              to: input.recipient,
              raw: input.raw,
              messageId: input.messageId,
            }),
          );
          if (!response.success) return response;
          if (
            response.data.success &&
            response.data.data.providerMessageId !== input.messageId
          )
            return {
              success: false as const,
              error: new IntegrationError(
                "google",
                "uncertain",
                "Mailbox test acceptance receipt did not match.",
              ),
            };
          return response.data;
        })();
        const status = sent.success
          ? ("accepted" as const)
          : !checked.success ||
              (sent.error instanceof IntegrationError &&
                ["input", "access", "configuration"].includes(sent.error.code))
            ? ("failed" as const)
            : ("uncertain" as const);
        await Store.completeDeliveryWithin(transaction, actor, {
          attempt: input.attemptId,
          status,
          ...(sent.success
            ? {
                providerMessageId: sent.data.providerMessageId,
                threadId: input.messageId,
              }
            : {
                error:
                  status === "uncertain"
                    ? "Mailbox test outcome needs reconciliation."
                    : "Mailbox test did not send.",
              }),
        });
        const completedAt = new Date();
        if (sent.success)
          await Conversations.ingestWithin(transaction, {
            prospectId: input.prospectId,
            channel: "email",
            accountId: input.inboxId,
            accountLabel: input.from,
            providerThreadId: input.messageId,
            counterpart: input.recipient,
            message: {
              providerMessageId: sent.data.providerMessageId,
              direction: "outbound",
              bodyText: input.body,
              subject: input.subject,
              from: input.from,
              to: input.recipient,
              rfcMessageId: input.messageId,
              sentAt: completedAt,
              isAutomated: false,
              truncated: false,
            },
          });
        const saved = value(
          await Jobs.update(
            Environment.SERVER,
            job.id,
            {
              status: sent.success
                ? "pending"
                : status === "failed"
                  ? "failed"
                  : "uncertain",
              error: sent.success
                ? null
                : status === "uncertain"
                  ? "mailbox-test-uncertain"
                  : "mailbox-test-failed",
              output: {
                ...job.output,
                ...(sent.success
                  ? {
                      smtpReceipt: {
                        providerMessageId: sent.data.providerMessageId,
                        acceptedAt: completedAt.toISOString(),
                        connectionVersion: input.connectionVersion,
                      },
                    }
                  : {}),
              },
              updatedAt: completedAt,
            },
            { tx: transaction },
          ),
        );
        if (!saved) throw new ConflictError("mailbox-test-missing");
        return view(saved);
      }),
    );
  });

/** Called only by actual mailbox ingestion; neither a copied RFC ID nor an unrelated reply is proof. */
export const observe = (inbox: Inbox, mail: Mail) =>
  within(async (transaction) => {
    const references = messageIds(
      `${mail.headers["in-reply-to"] ?? ""} ${mail.headers["references"] ?? ""}`,
    );
    const candidates = value(
      await Jobs.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundIntegrationJob.provider, "automation"),
            sql`${schema.outboundIntegrationJob.input}->>'operation' = 'mailboxTest'`,
            sql`${schema.outboundIntegrationJob.input}->>'inboxId' = ${inbox.id}`,
            or(
              sql`${schema.outboundIntegrationJob.input}->>'messageId' = ${mail.headers["message-id"] ?? ""}`,
              ...(references.length
                ? [
                    inArray(
                      sql<string>`${schema.outboundIntegrationJob.input}->>'messageId'`,
                      references,
                    ),
                  ]
                : []),
            ),
          ),
        },
        { tx: transaction },
      ),
    );
    if (candidates.length !== 1 || !candidates[0]) return { matched: false };
    const job = candidates[0];
    const input = manifestSchema.parse(job.input);
    const current = value(
      await Inboxes.get(Environment.SERVER, inbox.id, { tx: transaction }),
    );
    if (
      !current ||
      current.connectionVersion !== input.connectionVersion ||
      inbox.connectionVersion !== input.connectionVersion ||
      current.email !== input.from ||
      mail.textTruncated
    )
      return { matched: false };
    const from = addresses(mail.headers["from"] ?? "");
    const to = addresses(mail.headers["to"] ?? "");
    const at = new Date(Number(mail.internalDate));
    if (
      !Number.isFinite(at.getTime()) ||
      at < job.createdAt ||
      at.getTime() > Date.now() + 60_000
    )
      return { matched: false };
    const sent =
      mail.labelIds?.includes("SENT") &&
      from.length === 1 &&
      from[0] === input.from &&
      to.length === 1 &&
      to[0] === input.recipient &&
      mail.headers["message-id"] === input.messageId &&
      normalize(mail.text) === normalize(input.body);
    const replied =
      !mail.labelIds?.includes("SENT") &&
      from.length === 1 &&
      from[0] === input.recipient &&
      to.includes(input.from) &&
      references.includes(input.messageId) &&
      classifyInbound(mail) === "reply" &&
      Boolean(mail.headers["message-id"] && mail.text.trim());
    if (!sent && !replied) return { matched: false };
    await immutable(transaction, input);
    const receipt = {
      providerMessageId: mail.id,
      rfcMessageId: mail.headers["message-id"],
      from: from[0],
      to: sent ? input.recipient : input.from,
      inReplyTo: references,
      observedAt: new Date().toISOString(),
      sentAt: at.toISOString(),
      connectionVersion: input.connectionVersion,
      bodyHash: digest(normalize(mail.text)),
    };
    value(
      await Jobs.update(
        Environment.SERVER,
        job.id,
        {
          output: {
            ...job.output,
            ...(sent ? { sentReceipt: receipt } : { replyReceipt: receipt }),
          },
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    return { matched: true };
  });

/** Confirm an accepted setup attempt and a real correlated reply on the same current connection. */
export const confirm = (actor: string, input: { requestId: string }) =>
  within(async (transaction) => {
    const requestId = z.string().uuid().parse(input.requestId);
    const job = value(
      await Jobs.find(
        Environment.SERVER,
        {
          where: eq(
            schema.outboundIntegrationJob.requestId,
            `mailbox-test:${requestId}`,
          ),
          limit: 1,
        },
        { tx: transaction },
      ),
    )[0];
    if (!job) throw new ConflictError("mailbox-test-missing");
    const manifest = manifestSchema.parse(job.input);
    const { inbox, policy } = await inboxForTest(transaction, manifest.inboxId);
    const attempt = value(
      await Attempts.get(Environment.SERVER, manifest.attemptId, {
        tx: transaction,
      }),
    );
    const prospect = value(
      await Prospects.get(Environment.SERVER, manifest.prospectId, {
        tx: transaction,
      }),
    );
    const receiptSchema = z.object({
      providerMessageId: z.string().min(1),
      rfcMessageId: z.string().min(1),
      from: z.email(),
      to: z.email(),
      connectionVersion: z.number().int(),
      inReplyTo: z.array(z.string()),
      sentAt: z.string().datetime(),
      bodyHash: z.string().length(64),
    });
    const proof = receiptSchema.safeParse(job.output?.["replyReceipt"]);
    const smtp = z
      .object({
        providerMessageId: z.string(),
        acceptedAt: z.string().datetime(),
        connectionVersion: z.number().int(),
      })
      .safeParse(job.output?.["smtpReceipt"]);
    const sent = receiptSchema.safeParse(job.output?.["sentReceipt"]);
    const accepted =
      (smtp.success &&
        smtp.data.providerMessageId === manifest.messageId &&
        smtp.data.connectionVersion === manifest.connectionVersion) ||
      (sent.success &&
        sent.data.rfcMessageId === manifest.messageId &&
        sent.data.connectionVersion === manifest.connectionVersion &&
        sent.data.bodyHash === digest(normalize(manifest.body)));
    if (
      inbox.connectionVersion !== manifest.connectionVersion ||
      inbox.email !== manifest.from ||
      inbox.fromName !== manifest.fromName ||
      inbox.signer !== manifest.signer ||
      !attempt?.test ||
      attempt.status !== "accepted" ||
      attempt.contentHash !== manifest.contentHash ||
      attempt.prospectId !== manifest.prospectId ||
      attempt.inboxId !== manifest.inboxId ||
      attempt.messageId !== manifest.messageId ||
      attempt.revision !== manifest.revision ||
      !accepted ||
      prospect?.status !== "replied" ||
      prospect.revision !== manifest.revision ||
      prospect.details.source !== MAILBOX_TEST_SOURCE ||
      prospect.details.email !== manifest.recipient ||
      !proof.success ||
      proof.data.connectionVersion !== manifest.connectionVersion ||
      proof.data.from !== manifest.recipient ||
      proof.data.to !== manifest.from ||
      !proof.data.inReplyTo.includes(manifest.messageId)
    )
      throw new ConflictError("mailbox-test-reply-not-confirmed");
    await immutable(transaction, manifest);
    const threads = value(
      await Threads.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundConversation.prospectId, manifest.prospectId),
            eq(schema.outboundConversation.channel, "email"),
            eq(schema.outboundConversation.accountId, manifest.inboxId),
          ),
        },
        { tx: transaction },
      ),
    );
    const messages = threads.length
      ? value(
          await ThreadMessages.find(
            Environment.SERVER,
            {
              where: and(
                inArray(
                  schema.outboundConversationMessage.conversationId,
                  threads.map((thread) => thread.id),
                ),
                eq(
                  schema.outboundConversationMessage.providerMessageId,
                  proof.data.providerMessageId,
                ),
              ),
            },
            { tx: transaction },
          ),
        )
      : [];
    const reply = messages[0];
    if (
      messages.length !== 1 ||
      !reply ||
      reply.direction !== "inbound" ||
      reply.from !== manifest.recipient ||
      reply.to !== manifest.from ||
      reply.rfcMessageId !== proof.data.rfcMessageId ||
      reply.isAutomated ||
      reply.truncated ||
      reply.sentAt.toISOString() !== proof.data.sentAt ||
      digest(normalize(reply.bodyText)) !== proof.data.bodyHash
    )
      throw new ConflictError("mailbox-test-reply-not-confirmed");
    if (job.status === "complete") return view(job);
    await Store.savePlaybookWithin(
      transaction,
      actor,
      { ...policy.settings, senderTested: true },
      policy.revision,
    );
    const confirmedAt = new Date().toISOString();
    value(
      await Events.create(
        Environment.SERVER,
        {
          prospectId: manifest.prospectId,
          kind: "mailboxTestPassed",
          actor,
          detail: `SMTP acceptance and correlated reply confirmed for ${manifest.from}; connection ${manifest.connectionVersion}.`,
          externalId: `mailbox-test:${requestId}:passed`,
        },
        { tx: transaction },
      ),
    );
    const saved = value(
      await Jobs.update(
        Environment.SERVER,
        job.id,
        {
          status: "complete",
          error: null,
          output: { ...job.output, confirmedAt, confirmedBy: actor },
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    if (!saved) throw new ConflictError("mailbox-test-missing");
    return view(saved);
  });

export const get = (input: { requestId: string }) =>
  resultify(async () => {
    const requestId = z.string().uuid().parse(input.requestId);
    const job = value(
      await Jobs.find(Environment.SERVER, {
        where: eq(
          schema.outboundIntegrationJob.requestId,
          `mailbox-test:${requestId}`,
        ),
        limit: 1,
      }),
    )[0];
    if (!job) throw new ConflictError("mailbox-test-missing");
    return view(job);
  });
