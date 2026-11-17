import "server-only";
import { resultify } from "@zenncore/utils";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  mailboxConnected,
  normalizeDomain,
  registeredSender,
  senderPool,
} from "@/lib/outbound";
import { db, schema, type TransactionScope } from "@/server/database";
import { credentialKeyIdentifier } from "@/server/utils/credential-encryption";
import { Environment } from "@/server/utils/environment";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/server/utils/error";
import * as Direct from "@/server/utils/outbound/direct-mailbox";
import * as Google from "@/server/utils/outbound/google";
import {
  addresses,
  classifyInbound,
  type Mail,
  messageIds,
} from "@/server/utils/outbound/inbound";
import { repository } from "@/server/utils/repository";
import * as Store from "./store";

const Inboxes = repository(schema.outboundInbox);
const Prospects = repository(schema.outboundProspect);
const Attempts = repository(schema.outboundSendAttempt);
const Events = repository(schema.outboundEvent);
export type Inbox = typeof schema.outboundInbox.$inferSelect;
const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
export const list = () => Inboxes.find(Environment.SERVER);
export const read = (id: string) => Inboxes.get(Environment.SERVER, id);
export const update = (
  id: string,
  input: Partial<Omit<Inbox, "id" | "createdAt">>,
) =>
  Inboxes.update(Environment.SERVER, id, { ...input, updatedAt: new Date() });

const connectionFailure = (
  code:
    | "invalid"
    | "not-registered"
    | "authentication"
    | "unavailable"
    | "encryption"
    | "save-failed",
) => ({
  success: false as const,
  error: new ValidationError(`direct-mailbox-${code}`),
});
const registeredMailbox = (
  email: string,
  settings: Awaited<ReturnType<typeof Store.policy>>["settings"],
) => registeredSender(email, settings);

const persistConnection = async (
  actor: string,
  email: string,
  credentials:
    | { transport: "google-app-password"; appPassword: string }
    | {
        transport: "gmail-oauth";
        token: {
          accessToken: string;
          refreshToken: string | null;
          expiresAt: string;
          scope: string;
        };
        historyId: string;
      },
) => {
  const saved = await resultify(() =>
    db.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
      );
      const settings = (await Store.policy(transaction)).settings;
      if (!registeredMailbox(email, settings))
        throw new ValidationError("direct-mailbox-not-registered");
      const previous = value(
        await Inboxes.find(
          Environment.SERVER,
          {
            where: eq(schema.outboundInbox.email, email),
            limit: 1,
          },
          { tx: transaction },
        ),
      )[0];
      const secrets = (() => {
        if (credentials.transport === "google-app-password")
          return {
            appPassword: credentials.appPassword,
            refreshToken: null,
            accessToken: null,
            accessTokenExpiresAt: null,
            syncStartHistoryId: null,
          };
        const refreshToken =
          credentials.token.refreshToken ??
          (previous?.transport === "gmail-oauth"
            ? previous.refreshToken
            : null);
        if (!refreshToken)
          throw new ValidationError("Offline access is required.");
        return {
          appPassword: null,
          refreshToken,
          accessToken: credentials.token.accessToken,
          accessTokenExpiresAt: new Date(credentials.token.expiresAt),
          syncStartHistoryId: credentials.historyId,
        };
      })();
      const activeSender = senderPool(settings).includes(email);
      const input = {
        email,
        transport: credentials.transport,
        // An inactive mailbox has no active sender profile. Connecting it must
        // not assign the current pool's identity to a different real person.
        fromName: activeSender
          ? settings.fromName
          : (previous?.fromName ?? email),
        signer: activeSender ? settings.signature : (previous?.signer ?? ""),
        dailyCap: settings.dailyCap,
        enabled: false,
        ...secrets,
        historyId: null,
        syncMode: "full" as const,
        syncPageToken: null,
        mailboxCheckpoint: null,
        lastSyncedAt: null,
        error: null,
        updatedAt: new Date(),
      };
      // Credential writes bypass repository errors, which include raw input values.
      const rows = await transaction
        .insert(schema.outboundInbox)
        .values({ ...input, connectionVersion: 1 })
        .onConflictDoUpdate({
          target: schema.outboundInbox.email,
          set: {
            ...input,
            connectionVersion: sql`${schema.outboundInbox.connectionVersion} + 1`,
          },
        })
        .returning({
          id: schema.outboundInbox.id,
          email: schema.outboundInbox.email,
        });
      const inbox = rows[0];
      if (!inbox) throw new Error("Mailbox was not stored.");
      value(
        await Events.create(
          Environment.SERVER,
          {
            actor,
            kind: "inboxConnected",
            detail: `${email}; delivery disabled until synchronization and review.`,
          },
          { tx: transaction },
        ),
      );
      return { inboxId: inbox.id, email: inbox.email };
    }),
  );
  if (saved.success) return saved;
  return connectionFailure(
    saved.error.name === ValidationError.errorName &&
      saved.error.message === "direct-mailbox-not-registered"
      ? "not-registered"
      : "save-failed",
  );
};

export const connectDirect = async (
  actor: string,
  input: { email: string; appPassword: string },
) => {
  const parsed = z
    .object({
      email: z
        .string()
        .trim()
        .pipe(z.email())
        .transform((email) => email.toLowerCase()),
      appPassword: z
        .string()
        .transform((password) => password.replace(/\s/g, ""))
        .pipe(z.string().regex(/^[A-Za-z0-9]{16}$/)),
    })
    .strict()
    .safeParse(input);
  if (!parsed.success) return connectionFailure("invalid");
  const policy = await resultify(() => Store.policy());
  if (!policy.success) return connectionFailure("save-failed");
  if (!registeredMailbox(parsed.data.email, policy.data.settings))
    return connectionFailure("not-registered");
  if (!resultify(() => credentialKeyIdentifier()).success)
    return connectionFailure("encryption");
  const checked = await resultify(() => Direct.verify(parsed.data));
  if (!checked.success) return connectionFailure("unavailable");
  if (!checked.data.success) {
    const message = checked.data.error.message;
    return connectionFailure(
      message === "direct-mailbox-authentication"
        ? "authentication"
        : message === "direct-mailbox-invalid"
          ? "invalid"
          : "unavailable",
    );
  }
  return persistConnection(actor, parsed.data.email, {
    transport: "google-app-password",
    appPassword: parsed.data.appPassword,
  });
};

export const connect = async (
  actor: string,
  token: {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: string;
    scope: string;
  },
  profile: { emailAddress: string; historyId: string },
) => {
  if (
    !Google.GOOGLE_SCOPES.every((scope) =>
      token.scope.split(" ").includes(scope),
    )
  )
    return connectionFailure("authentication");
  return persistConnection(actor, profile.emailAddress.trim().toLowerCase(), {
    transport: "gmail-oauth",
    token,
    historyId: profile.historyId,
  });
};

/** A completed old connection cannot overwrite a reconnect's sync state. */
export const updateSync = (
  inbox: Pick<Inbox, "id" | "connectionVersion">,
  input: {
    historyId?: string | null;
    syncMode?: "full" | "history" | null;
    syncPageToken?: string | null;
    syncStartHistoryId?: string | null;
    mailboxCheckpoint?: unknown;
    lastSyncedAt?: Date | null;
    error?: string | null;
  },
) =>
  resultify(async () => {
    const rows = await db
      .update(schema.outboundInbox)
      .set({ ...input, updatedAt: new Date() })
      .where(
        and(
          eq(schema.outboundInbox.id, inbox.id),
          eq(schema.outboundInbox.connectionVersion, inbox.connectionVersion),
        ),
      )
      .returning({ id: schema.outboundInbox.id });
    if (!rows.length)
      throw new ConflictError(
        "The mailbox connection changed during synchronization.",
      );
    return { id: rows[0]?.id };
  });

export const configure = (
  actor: string,
  input: { inboxId: string; enabled: boolean; dailyCap: number },
) =>
  resultify(() =>
    db.transaction(async (transaction) => {
      const parsed = z
        .object({
          inboxId: z.string().uuid(),
          enabled: z.boolean(),
          dailyCap: z.number().int().min(1).max(50),
        })
        .safeParse(input);
      if (!parsed.success)
        throw new ValidationError(
          "Choose an inbox and a daily cap from 1 to 50.",
        );
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
      );
      const inbox = value(
        await Inboxes.get(Environment.SERVER, input.inboxId, {
          tx: transaction,
        }),
      );
      if (!inbox) throw new NotFoundError("Inbox not found.");
      const settings = (await Store.policy(transaction)).settings;
      if (input.enabled && !senderPool(settings).includes(inbox.email))
        throw new ConflictError("direct-mailbox-inactive");
      if (
        input.enabled &&
        (!mailboxConnected(inbox) ||
          inbox.error ||
          !inbox.lastSyncedAt ||
          Date.now() - inbox.lastSyncedAt.getTime() > 10 * 60_000)
      )
        throw new ConflictError(
          "Finish a successful inbox synchronization before enabling it.",
        );
      value(
        await Inboxes.update(
          Environment.SERVER,
          inbox.id,
          {
            enabled: input.enabled,
            dailyCap: input.dailyCap,
            ...(senderPool(settings).includes(inbox.email)
              ? { fromName: settings.fromName, signer: settings.signature }
              : {}),
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      );
      value(
        await Events.create(
          Environment.SERVER,
          {
            actor,
            kind: "inboxConfigured",
            detail: `${inbox.email}: ${input.enabled ? "enabled" : "disabled"}, cap ${input.dailyCap}.`,
          },
          { tx: transaction },
        ),
      );
      return { inboxId: inbox.id };
    }),
  );

export const disconnect = (actor: string, id: string) =>
  resultify(() =>
    db.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
      );
      await transaction
        .update(schema.outboundInbox)
        .set({
          enabled: false,
          accessToken: null,
          refreshToken: null,
          appPassword: null,
          accessTokenExpiresAt: null,
          mailboxCheckpoint: null,
          historyId: null,
          syncMode: null,
          syncPageToken: null,
          syncStartHistoryId: null,
          connectionVersion: sql`${schema.outboundInbox.connectionVersion} + 1`,
          lastSyncedAt: null,
          error: "Inbox disconnected",
          updatedAt: new Date(),
        })
        .where(eq(schema.outboundInbox.id, id));
      value(
        await Events.create(
          Environment.SERVER,
          {
            actor,
            kind: "inboxDisconnected",
            detail: "Inbox disconnected; delivery disabled.",
          },
          { tx: transaction },
        ),
      );
      return { inboxId: id };
    }),
  );

export const access = (inbox: Inbox) =>
  resultify(async () => {
    if (
      inbox.accessToken &&
      inbox.accessTokenExpiresAt &&
      inbox.accessTokenExpiresAt.getTime() > Date.now() + 60_000
    )
      return inbox.accessToken;
    if (!inbox.refreshToken) throw new ValidationError("Reconnect this inbox.");
    const token = value(
      await Google.refreshToken({ refreshToken: inbox.refreshToken }),
    );
    const refreshed = await resultify(() =>
      db.transaction(async (transaction) => {
        await transaction.execute(
          sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
        );
        const current = value(
          await Inboxes.get(Environment.SERVER, inbox.id, { tx: transaction }),
        );
        if (
          !current?.refreshToken ||
          current.transport !== "gmail-oauth" ||
          current.connectionVersion !== inbox.connectionVersion ||
          current.refreshToken !== inbox.refreshToken
        )
          throw new ConflictError(
            "The inbox connection changed while refreshing. Retry with its current connection.",
          );
        await transaction
          .update(schema.outboundInbox)
          .set({
            accessToken: token.accessToken,
            refreshToken: token.refreshToken ?? current.refreshToken,
            accessTokenExpiresAt: new Date(token.expiresAt),
            updatedAt: new Date(),
          })
          .where(eq(schema.outboundInbox.id, inbox.id));
      }),
    );
    if (!refreshed.success)
      throw new ValidationError("Mailbox credential refresh failed.");
    return token.accessToken;
  });

/** Event idempotency is separate from outcome persistence: retrying outcomes only stops again. */
const storeConversationMail = async (
  inbox: Inbox,
  mail: Mail,
  prospectId: string,
  direction: "inbound" | "outbound",
  outcome?: ReturnType<typeof classifyInbound>,
) => {
  const Conversations = await import("./conversations");
  const from =
    direction === "outbound"
      ? inbox.email
      : addresses(mail.headers["from"] ?? "")[0];
  const to =
    direction === "inbound"
      ? inbox.email
      : addresses(mail.headers["to"] ?? "")[0];
  if (!from || !to || !mail.threadId) return;
  value(
    await Conversations.ingest({
      prospectId,
      channel: "email",
      accountId: inbox.id,
      accountLabel: inbox.email,
      providerThreadId: mail.threadId,
      counterpart: direction === "inbound" ? from : to,
      outcome,
      message: {
        providerMessageId: mail.id,
        direction,
        bodyText: mail.text,
        subject: (mail.headers["subject"] ?? "").slice(0, 1000),
        from,
        to,
        rfcMessageId: mail.headers["message-id"] ?? null,
        sentAt: new Date(Number(mail.internalDate)),
        isAutomated:
          outcome === "ooo" || outcome === "bounce" || outcome === "review",
        truncated: mail.textTruncated ?? mail.text.length >= 50000,
      },
    }),
  );
};

export const ingest = (inbox: Inbox, mail: Mail) =>
  resultify(async () => {
    const provider =
      inbox.transport === "google-app-password" ? "google-imap" : "gmail";
    const externalId = `${provider}:${inbox.id}:${mail.id}`;
    const previouslyHandled = Boolean(
      value(
        await Events.find(Environment.SERVER, {
          where: eq(schema.outboundEvent.externalId, externalId),
          limit: 1,
        }),
      ).length,
    );
    const senders = addresses(mail.headers["from"] ?? "");
    const recipients = addresses(
      `${mail.headers["to"] ?? ""} ${mail.headers["cc"] ?? ""} ${mail.headers["bcc"] ?? ""}`,
    );
    const ids = messageIds(
      `${mail.headers["in-reply-to"] ?? ""} ${mail.headers["references"] ?? ""}`,
    ).slice(0, 100);
    const attempts = value(
      await Attempts.find(Environment.SERVER, {
        where: and(
          eq(schema.outboundSendAttempt.inboxId, inbox.id),
          or(
            eq(schema.outboundSendAttempt.providerMessageId, mail.id),
            eq(
              schema.outboundSendAttempt.messageId,
              mail.headers["message-id"] ?? "",
            ),
            ...(ids.length
              ? [inArray(schema.outboundSendAttempt.messageId, ids)]
              : []),
          ),
        ),
      }),
    );
    const sentByInbox =
      mail.labelIds?.includes("SENT") && senders.includes(inbox.email);
    if (sentByInbox) {
      const Replies = await import("./conversation-send");
      if (value(await Replies.reconcile(inbox, mail)).matched)
        return { handled: true };
    }
    // A message copied into the inbox with our RFC ID is not proof of delivery.
    const own = sentByInbox
      ? attempts.find(
          (attempt) =>
            attempt.providerMessageId === mail.id ||
            attempt.messageId === mail.headers["message-id"],
        )
      : undefined;
    if (own) {
      if (own.test) {
        const MailboxTest = await import("./mailbox-test");
        if (!value(await MailboxTest.observe(inbox, mail)).matched)
          return { handled: false };
      }
      await storeConversationMail(inbox, mail, own.prospectId, "outbound");
      if (previouslyHandled && own.status === "accepted")
        return { handled: false };
      if (own.status === "uncertain" || own.status === "claimed")
        value(
          await Store.completeDelivery(`${provider}-reconciliation`, {
            attempt: own.id,
            status: "accepted",
            providerMessageId: mail.id,
            threadId: mail.threadId || own.messageId,
          }),
        );
      value(
        await Events.upsert(
          Environment.SERVER,
          {
            actor: provider,
            kind: "mailReconciled",
            detail: "Known outbound message reconciled.",
            prospectId: own.prospectId,
            externalId,
          },
          { target: [schema.outboundEvent.externalId] },
        ),
      );
      return { handled: true };
    }
    if (previouslyHandled && sentByInbox) return { handled: false };
    // Sent history predating this app must exclude recipients not yet in its prospect list.
    if (sentByInbox) {
      const ownDomain = inbox.email.split("@")[1];
      const historical = recipients.filter(
        (email) => email !== inbox.email && email.split("@")[1] !== ownDomain,
      );
      if (historical.length > 1000)
        throw new ConflictError(
          "Review the historical message recipient list before continuing.",
        );
      if (historical.length)
        value(
          await Store.importProspects(`${provider}-history`, {
            content: JSON.stringify(
              historical.map((email) => ({
                email,
                domain: email.split("@")[1],
                scope: "domain",
                reason:
                  "historic contact: mailbox sent history; cold outreach excluded",
              })),
            ),
          }),
        );
      value(
        await Events.upsert(
          Environment.SERVER,
          {
            actor: provider,
            kind: "mailHistoryImported",
            detail: `${historical.length} historical recipients excluded from cold outreach.`,
            externalId,
          },
          { target: [schema.outboundEvent.externalId] },
        ),
      );
      return { handled: true };
    }
    const classification = classifyInbound(mail);
    // A person may opt out before a prospect record exists. Keep that address excluded on later imports.
    if (classification === "optout") {
      const excluded = senders.filter((email) => email !== inbox.email);
      if (excluded.length)
        value(
          await Store.importProspects(`${provider}-optout`, {
            content: JSON.stringify(
              excluded.map((email) => ({
                email,
                scope: "email",
                reason: "optout: mailbox request to stop contact",
              })),
            ),
          }),
        );
    }
    const dsnRecipients =
      classification === "bounce" || classification === "review"
        ? addresses(
            (
              mail.text.match(
                /(?:Final|Original)-Recipient:\s*rfc822;[^\r\n]+/gi,
              ) ?? []
            ).join(" "),
          )
        : [];
    const other = [...new Set([...senders, ...dsnRecipients])];
    const domains = other.flatMap((email) =>
      email.split("@")[1] ? [email.split("@")[1] as string] : [],
    );
    const matchedAttempts = attempts.filter((attempt) =>
      ids.includes(attempt.messageId),
    );
    // Match in SQL instead of silently ignoring prospects after the first 5,000 rows.
    const candidates = value(
      await Prospects.find(Environment.SERVER, {
        where: or(
          and(
            eq(schema.outboundProspect.threadId, mail.threadId),
            eq(schema.outboundProspect.inboxId, inbox.id),
          ),
          ...(matchedAttempts.length
            ? [
                inArray(
                  schema.outboundProspect.id,
                  matchedAttempts.map((attempt) => attempt.prospectId),
                ),
              ]
            : []),
          ...(other.length
            ? [
                inArray(
                  sql<string>`lower(${schema.outboundProspect.details}->>'email')`,
                  other,
                ),
              ]
            : []),
          ...(domains.length
            ? [
                inArray(
                  sql<string>`lower(${schema.outboundProspect.details}->>'domain')`,
                  domains,
                ),
              ]
            : []),
        ),
      }),
    );
    const byThread = candidates.filter(
      (prospect) =>
        (prospect.inboxId === inbox.id &&
          prospect.threadId === mail.threadId) ||
        matchedAttempts.some((attempt) => attempt.prospectId === prospect.id),
    );
    const exact = candidates.filter((prospect) =>
      other.includes(prospect.details.email.toLowerCase()),
    );
    const byCompany = candidates.filter((prospect) =>
      domains.includes(prospect.details.domain.toLowerCase()),
    );
    const matches = byThread.length
      ? byThread
      : exact.length
        ? exact
        : byCompany;
    for (const prospect of matches) {
      if (matches.length === 1) {
        await storeConversationMail(
          inbox,
          mail,
          prospect.id,
          "inbound",
          classification,
        );
        if (prospect.details.source === "internal-mailbox-setup-test") {
          const MailboxTest = await import("./mailbox-test");
          value(await MailboxTest.observe(inbox, mail));
        }
      }
      if (previouslyHandled) continue;
      if (classification === "ooo") continue;
      value(
        await Store.recordOutcome(provider, {
          prospect: prospect.id,
          kind:
            classification === "optout"
              ? "optout"
              : classification === "bounce"
                ? "bounce"
                : "reply",
          note: `Mailbox ${mail.id}: ${classification}. ${mail.text.slice(0, 1500)}`,
        }),
      );
    }
    if (previouslyHandled) return { handled: false };
    value(
      await Events.upsert(
        Environment.SERVER,
        {
          actor: provider,
          kind: classification === "ooo" ? "outOfOffice" : "mailProcessed",
          detail: `${matches.length} prospect matches; ${classification}.`,
          prospectId: matches.length === 1 ? (matches[0]?.id ?? null) : null,
          externalId,
        },
        { target: [schema.outboundEvent.externalId] },
      ),
    );
    return { handled: true };
  });

type SyncPatch = Parameters<typeof updateSync>[1];
const batchTransaction = <Data>(
  inbox: Inbox,
  operation: (transaction: TransactionScope) => Promise<Data>,
  deadline?: number,
) =>
  db.transaction(async (transaction) => {
    if (deadline !== undefined) {
      if (Date.now() >= deadline - 1_000)
        throw new ConflictError(
          "Mailbox synchronization will continue in the next run.",
        );
      await transaction.execute(
        sql`select set_config('statement_timeout', ${String(Math.max(1, Math.min(10_000, deadline - Date.now() - 1000)))}, true)`,
      );
    }
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
    );
    const current = value(
      await Inboxes.get(Environment.SERVER, inbox.id, { tx: transaction }),
    );
    if (
      !current ||
      current.connectionVersion !== inbox.connectionVersion ||
      current.email !== inbox.email ||
      current.transport !== inbox.transport ||
      !mailboxConnected(current)
    )
      throw new ConflictError(
        "The mailbox connection changed during synchronization.",
      );
    return operation(transaction);
  });
const batchCheckpoint = async (
  transaction: TransactionScope,
  inbox: Inbox,
  patch: SyncPatch,
) => {
  const rows = await transaction
    .update(schema.outboundInbox)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(
        eq(schema.outboundInbox.id, inbox.id),
        eq(schema.outboundInbox.connectionVersion, inbox.connectionVersion),
      ),
    )
    .returning({ id: schema.outboundInbox.id });
  if (rows.length !== 1)
    throw new ConflictError(
      "The mailbox connection changed during synchronization.",
    );
};

/** One bounded page of historical mail. Matching replies and delivery receipts keep the exact existing path. */
export const ingestBatch = (
  inbox: Inbox,
  messages: Mail[],
  checkpoint?: SyncPatch,
  deadline?: number,
) =>
  resultify(async () => {
    if (messages.length > 25)
      throw new ValidationError(
        "Process at most 25 mailbox messages per batch.",
      );
    const provider =
      inbox.transport === "google-app-password" ? "google-imap" : "gmail";
    const unique = [
      ...new Map(messages.map((mail) => [mail.id, mail])).values(),
    ];
    const facts = unique.map((mail) => {
      const senders = addresses(mail.headers["from"] ?? "");
      const recipients = addresses(
        `${mail.headers["to"] ?? ""} ${mail.headers["cc"] ?? ""} ${mail.headers["bcc"] ?? ""}`,
      );
      const references = messageIds(
        `${mail.headers["in-reply-to"] ?? ""} ${mail.headers["references"] ?? ""}`,
      ).slice(0, 100);
      const classification = classifyInbound(mail);
      const dsn =
        classification === "bounce" || classification === "review"
          ? addresses(
              (
                mail.text.match(
                  /(?:Final|Original)-Recipient:\s*rfc822;[^\r\n]+/gi,
                ) ?? []
              ).join(" "),
            )
          : [];
      const other = [...new Set([...senders, ...dsn])];
      return {
        mail,
        senders,
        recipients,
        references,
        classification,
        other,
        domains: other.flatMap((email) =>
          email.split("@")[1] ? [email.split("@")[1] as string] : [],
        ),
        sent: Boolean(
          mail.labelIds?.includes("SENT") && senders.includes(inbox.email),
        ),
        externalId: `${provider}:${inbox.id}:${mail.id}`,
      };
    });
    const applied = await batchTransaction(
      inbox,
      async (transaction) => {
        if (!facts.length) {
          if (checkpoint) await batchCheckpoint(transaction, inbox, checkpoint);
          return { fallback: [] as Mail[], fast: 0 };
        }
        const identifiers = facts.map(({ mail }) => mail.id);
        const rfcIdentifiers = [
          ...new Set(
            facts
              .flatMap(({ mail, references }) => [
                mail.headers["message-id"] ?? "",
                ...references,
              ])
              .filter(Boolean),
          ),
        ];
        const participants = [...new Set(facts.flatMap(({ other }) => other))];
        const domains = [...new Set(facts.flatMap(({ domains }) => domains))];
        const threadIds = [...new Set(facts.map(({ mail }) => mail.threadId))];
        const [receipts, attempts, replies, prospects] = await Promise.all([
          Events.find(
            Environment.SERVER,
            {
              where: inArray(
                schema.outboundEvent.externalId,
                facts.map(({ externalId }) => externalId),
              ),
            },
            { tx: transaction },
          ),
          Attempts.find(
            Environment.SERVER,
            {
              where: and(
                eq(schema.outboundSendAttempt.inboxId, inbox.id),
                or(
                  inArray(
                    schema.outboundSendAttempt.providerMessageId,
                    identifiers,
                  ),
                  ...(rfcIdentifiers.length
                    ? [
                        inArray(
                          schema.outboundSendAttempt.messageId,
                          rfcIdentifiers,
                        ),
                      ]
                    : []),
                ),
              ),
            },
            { tx: transaction },
          ),
          transaction
            .select({ input: schema.outboundConversationSend.input })
            .from(schema.outboundConversationSend)
            .where(
              and(
                sql`${schema.outboundConversationSend.input}->>'channel' = 'email'`,
                sql`${schema.outboundConversationSend.input}->>'accountId' = ${inbox.id}`,
                rfcIdentifiers.length
                  ? inArray(
                      sql<string>`${schema.outboundConversationSend.input}->>'rfcMessageId'`,
                      rfcIdentifiers,
                    )
                  : sql`false`,
                inArray(schema.outboundConversationSend.status, [
                  "starting",
                  "uncertain",
                  "accepted",
                ]),
              ),
            ),
          Prospects.find(
            Environment.SERVER,
            {
              where: or(
                and(
                  eq(schema.outboundProspect.inboxId, inbox.id),
                  inArray(schema.outboundProspect.threadId, threadIds),
                ),
                ...(participants.length
                  ? [
                      inArray(
                        sql<string>`lower(${schema.outboundProspect.details}->>'email')`,
                        participants,
                      ),
                    ]
                  : []),
                ...(domains.length
                  ? [
                      inArray(
                        sql<string>`lower(${schema.outboundProspect.details}->>'domain')`,
                        domains,
                      ),
                    ]
                  : []),
              ),
            },
            { tx: transaction },
          ),
        ]);
        const existing = new Set(
          value(receipts).map((receipt) => receipt.externalId),
        );
        const knownAttempts = value(attempts);
        const knownProspects = value(prospects);
        const replyIds = new Set(
          replies.map((reply) => reply.input["rfcMessageId"]),
        );
        const fallback: Mail[] = [];
        const exclusions = new Map<
          string,
          typeof schema.outboundSuppression.$inferInsert
        >();
        const events: (typeof schema.outboundEvent.$inferInsert)[] = [];
        const exclude = (
          scope: "email" | "domain",
          address: string,
          reason: string,
          actor: string,
        ) => {
          if (address)
            exclusions.set(`${scope}:${address}`, {
              scope,
              value: address,
              reason,
              createdBy: actor,
            });
        };
        for (const fact of facts) {
          const referenced = knownAttempts.filter((attempt) =>
            fact.references.includes(attempt.messageId),
          );
          const own =
            fact.sent &&
            knownAttempts.some(
              (attempt) =>
                attempt.providerMessageId === fact.mail.id ||
                attempt.messageId === fact.mail.headers["message-id"],
            );
          const related =
            !fact.sent &&
            (referenced.length > 0 ||
              knownProspects.some(
                (prospect) =>
                  (prospect.inboxId === inbox.id &&
                    prospect.threadId === fact.mail.threadId) ||
                  fact.other.includes(prospect.details.email.toLowerCase()) ||
                  fact.domains.includes(prospect.details.domain.toLowerCase()),
              ));
          if (
            own ||
            related ||
            (fact.sent && replyIds.has(fact.mail.headers["message-id"]))
          ) {
            fallback.push(fact.mail);
            continue;
          }
          const handled = existing.has(fact.externalId);
          if (fact.sent) {
            if (handled) continue;
            const historical = fact.recipients.filter(
              (email) =>
                email !== inbox.email &&
                email.split("@")[1] !== inbox.email.split("@")[1],
            );
            if (historical.length > 1000)
              throw new ConflictError(
                "Review the historical message recipient list before continuing.",
              );
            for (const email of historical) {
              const reason =
                "historic contact: mailbox sent history; cold outreach excluded";
              exclude("email", email, reason, `${provider}-history`);
              exclude(
                "domain",
                normalizeDomain(email.split("@")[1] ?? ""),
                reason,
                `${provider}-history`,
              );
            }
            events.push({
              actor: provider,
              kind: "mailHistoryImported",
              detail: `${historical.length} historical recipients excluded from cold outreach.`,
              externalId: fact.externalId,
            });
            continue;
          }
          if (fact.classification === "optout")
            for (const email of fact.senders.filter(
              (email) => email !== inbox.email,
            ))
              exclude(
                "email",
                email,
                "optout: mailbox request to stop contact",
                `${provider}-optout`,
              );
          if (!handled)
            events.push({
              actor: provider,
              kind:
                fact.classification === "ooo" ? "outOfOffice" : "mailProcessed",
              detail: `0 prospect matches; ${fact.classification}.`,
              externalId: fact.externalId,
            });
        }
        // Bulk operations retain a receipt for every historical message and every distinct exclusion.
        const suppressed = [...exclusions.values()];
        for (const offset of Array.from(
          { length: Math.ceil(suppressed.length / 1000) },
          (_, index) => index * 1000,
        ))
          await transaction
            .insert(schema.outboundSuppression)
            .values(suppressed.slice(offset, offset + 1000))
            .onConflictDoUpdate({
              target: [
                schema.outboundSuppression.scope,
                schema.outboundSuppression.value,
              ],
              set: {
                reason: sql`excluded.reason`,
                createdBy: sql`excluded.created_by`,
              },
            });
        if (events.length)
          await transaction
            .insert(schema.outboundEvent)
            .values(events)
            .onConflictDoNothing({ target: schema.outboundEvent.externalId });
        if (!fallback.length && checkpoint)
          await batchCheckpoint(transaction, inbox, checkpoint);
        return { fallback, fast: facts.length - fallback.length };
      },
      deadline,
    );
    for (const mail of applied.fallback) {
      if (deadline !== undefined && Date.now() >= deadline - 10_000)
        throw new ConflictError(
          "Mailbox synchronization will continue in the next run.",
        );
      value(await ingest(inbox, mail));
    }
    if (applied.fallback.length && checkpoint)
      await batchTransaction(
        inbox,
        (transaction) => batchCheckpoint(transaction, inbox, checkpoint),
        deadline,
      );
    return {
      processed: messages.length,
      fast: applied.fast,
      matched: applied.fallback.length,
    };
  });

export const due = () =>
  Prospects.find(Environment.SERVER, {
    where: inArray(schema.outboundProspect.status, ["approved", "active"]),
    orderBy: [{ column: schema.outboundProspect.nextSendAt, direction: "asc" }],
    limit: 100,
  });

export const withSyncLock = <T>(id: string, operation: () => Promise<T>) =>
  resultify(() =>
    db.transaction(async (transaction) => {
      const lock = await transaction.execute(
        sql`select pg_try_advisory_xact_lock(hashtext(${`outbound-inbox-sync:${id}`})) as locked`,
      );
      if (!lock[0]?.["locked"])
        throw new ConflictError("This inbox is already being synchronized.");
      return operation();
    }),
  );
