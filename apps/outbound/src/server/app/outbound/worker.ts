import "server-only";
import { resultify } from "@zenncore/utils";
import {
  inSendWindow,
  mailboxConnected,
  normalizeDomain,
  prospectIssues,
  recipientMailHostAllowed,
  senderForProspect,
} from "@/lib/outbound";
import { usesFindingFormula } from "@/lib/outbound-finding-copy";
import { ConflictError } from "@/server/utils/error";
import * as Direct from "@/server/utils/outbound/direct-mailbox";
import * as Google from "@/server/utils/outbound/google";
import * as MX from "@/server/utils/outbound/mx";
import * as Research from "@/server/utils/outbound/research";
import * as Store from "./store";
import * as Mailboxes from "./transport-store";

const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};

const assertSyncBudget = (deadline: number | undefined, reserve = 25_000) => {
  if (deadline !== undefined && Date.now() >= deadline - reserve)
    throw new ConflictError(
      "Mailbox synchronization will continue in the next run.",
    );
};
export const syncInbox = (
  inboxId: string,
  { deadline }: { deadline?: number } = {},
) =>
  resultify(async () => {
    const synced = value(
      await Mailboxes.withSyncLock(inboxId, async () => {
        assertSyncBudget(deadline);
        const inbox = value(await Mailboxes.read(inboxId));
        if (!inbox || !mailboxConnected(inbox))
          throw new ConflictError("Connect this inbox before synchronizing.");
        if (inbox.transport === "google-app-password") {
          if (!inbox.appPassword)
            throw new ConflictError("Reconnect this mailbox.");
          const page = await Direct.syncPage({
            email: inbox.email,
            appPassword: inbox.appPassword,
            checkpoint: inbox.mailboxCheckpoint,
          });
          if (!page.success) {
            value(
              await Mailboxes.updateSync(inbox, {
                error:
                  "Mailbox synchronization failed. Check the connection before delivery resumes.",
              }),
            );
            throw page.error;
          }
          value(
            await Mailboxes.ingestBatch(
              inbox,
              page.data.messages,
              {
                mailboxCheckpoint: page.data.checkpoint,
                syncMode: page.data.complete ? null : "full",
                lastSyncedAt: page.data.complete ? new Date() : null,
                error: page.data.complete
                  ? null
                  : "Mailbox history is being reconciled; delivery remains paused.",
              },
              deadline,
            ),
          );
          return {
            complete: page.data.complete,
            processed: page.data.messages.length,
          };
        }
        const token = value(await Mailboxes.access(inbox));
        assertSyncBudget(deadline);
        const profile = value(await Google.getProfile({ accessToken: token }));
        const mode = inbox.syncMode ?? (inbox.historyId ? "history" : "full");
        const start =
          inbox.syncStartHistoryId ?? inbox.historyId ?? profile.historyId;
        if (!inbox.syncMode)
          value(
            await Mailboxes.updateSync(inbox, {
              syncMode: mode,
              syncStartHistoryId: start,
              syncPageToken: null,
            }),
          );
        assertSyncBudget(deadline);
        const listing =
          mode === "history"
            ? await Google.listHistory({
                accessToken: token,
                startHistoryId: start,
                pageToken: inbox.syncPageToken ?? undefined,
              })
            : await Google.listMessages({
                accessToken: token,
                query: "newer_than:180d",
                pageToken: inbox.syncPageToken ?? undefined,
              });
        if (!listing.success) {
          if (mode === "history" && listing.error.statusCode === 404) {
            value(
              await Mailboxes.updateSync(inbox, {
                syncMode: "full",
                syncStartHistoryId: profile.historyId,
                syncPageToken: null,
                lastSyncedAt: null,
                error:
                  "Mailbox history expired; historical reconciliation is in progress.",
              }),
            );
            return { complete: false, processed: 0 };
          }
          value(
            await Mailboxes.updateSync(inbox, { error: listing.error.message }),
          );
          throw listing.error;
        }
        // Apply every provider reference in bounded batches. Only the final batch may advance its page cursor.
        const next = listing.data.nextPageToken;
        const patch: NonNullable<Parameters<typeof Mailboxes.ingestBatch>[2]> =
          next
            ? {
                syncPageToken: next,
                error:
                  "Mailbox reconciliation is continuing; delivery is paused.",
              }
            : mode === "full"
              ? {
                  historyId: start,
                  syncMode: "history",
                  syncStartHistoryId: start,
                  syncPageToken: null,
                  error:
                    "Historical mail processed; checking subsequent arrivals.",
                }
              : {
                  historyId:
                    "historyId" in listing.data
                      ? listing.data.historyId
                      : profile.historyId,
                  syncMode: null,
                  syncPageToken: null,
                  syncStartHistoryId: null,
                  lastSyncedAt: new Date(),
                  error: null,
                };
        const offsets = Array.from(
          { length: Math.max(1, Math.ceil(listing.data.messages.length / 25)) },
          (_, index) => index * 25,
        );
        for (const offset of offsets) {
          const messages: Awaited<ReturnType<typeof Google.getMessage>>[] = [];
          for (const reference of listing.data.messages.slice(
            offset,
            offset + 25,
          )) {
            assertSyncBudget(deadline);
            messages.push(
              await Google.getMessage({
                accessToken: token,
                message: reference.id,
              }),
            );
          }
          const failed = messages.find((message) => !message.success);
          if (failed && !failed.success) {
            value(
              await Mailboxes.updateSync(inbox, {
                error: failed.error.message,
              }),
            );
            throw failed.error;
          }
          value(
            await Mailboxes.ingestBatch(
              inbox,
              messages.map(value),
              offset === offsets.at(-1) ? patch : undefined,
              deadline,
            ),
          );
        }
        return {
          complete: !next && mode !== "full",
          processed: listing.data.messages.length,
        };
      }),
    );
    if (!synced.complete) return synced;
    const activation = await Mailboxes.completePendingActivation(inboxId);
    return activation.success
      ? synced
      : { ...synced, error: activation.error.message };
  });

export const prioritizeInboxSync = (
  inboxes: Mailboxes.Inbox[],
  now = Date.now(),
) =>
  inboxes.filter(mailboxConnected).sort((first, second) => {
    const stale = (inbox: Mailboxes.Inbox) =>
      Boolean(
        inbox.syncMode ||
          !inbox.lastSyncedAt ||
          now - inbox.lastSyncedAt.getTime() >= 300_000,
      );
    return (
      Number(stale(second)) - Number(stale(first)) ||
      first.updatedAt.getTime() - second.updatedAt.getTime() ||
      first.id.localeCompare(second.id)
    );
  });
export const syncAll = ({ deadline }: { deadline?: number } = {}) =>
  resultify(async () => {
    const inboxes = prioritizeInboxSync(value(await Mailboxes.list()));
    const results = [] as {
      inboxId: string;
      complete: boolean;
      processed: number;
      error?: string;
    }[];
    for (const inbox of inboxes) {
      if (deadline !== undefined && Date.now() >= deadline - 35_000) break;
      const synced = await syncInbox(inbox.id, { deadline });
      results.push(
        synced.success
          ? { inboxId: inbox.id, ...synced.data }
          : {
              inboxId: inbox.id,
              complete: false,
              processed: 0,
              error: synced.error.message,
            },
      );
      if (!synced.success)
        await Mailboxes.updateSync(inbox, {
          error:
            "Inbox synchronization failed. Resolve it before delivery resumes.",
        });
    }
    return results;
  });

export const run = ({ dryRun = true }: { dryRun?: boolean } = {}) =>
  resultify(async () => {
    const deadline = Date.now() + 240_000;
    const result = {
      dryRun,
      synced: 0,
      sent: 0,
      held: 0,
      errors: [] as string[],
    };
    if (!dryRun) {
      const synced = value(await syncAll({ deadline: deadline - 60_000 }));
      result.synced = synced.filter((inbox) => inbox.complete).length;
      result.errors.push(
        ...synced.flatMap((inbox) => (inbox.error ? [inbox.error] : [])),
      );
    }
    const settings = (await Store.policy()).settings;
    const inboxes = value(await Mailboxes.list());
    const prospects = value(await Mailboxes.due(settings));
    const budget = { researched: 0, inboxes: new Set<string>() };
    for (const prospect of prospects) {
      if (!dryRun && Date.now() >= deadline - 20_000) break;
      const inbox = inboxes.find(
        (inbox) =>
          inbox.email === senderForProspect(prospect, settings) &&
          (!prospect.inboxId || inbox.id === prospect.inboxId),
      );
      if (inbox && budget.inboxes.has(inbox.id)) continue;
      // These cheap scheduling checks precede evidence/MX work and its run budget.
      // The transaction repeats them immediately before reserving and sending.
      const now = new Date();
      if (
        !inSendWindow(prospect.details, now, settings) ||
        (prospect.nextSendAt && prospect.nextSendAt > now) ||
        (inbox?.nextSendAt && inbox.nextSendAt > now)
      )
        continue;
      if (
        !inbox?.enabled ||
        !settings.sendingEnabled ||
        inbox.error ||
        !inbox.lastSyncedAt ||
        Date.now() - inbox.lastSyncedAt.getTime() > 600_000 ||
        prospectIssues(prospect.details, settings).filter(
          (issue) =>
            ![
              "mxUnknown",
              ...(usesFindingFormula(settings) ? [] : ["evidenceMissing"]),
            ].includes(issue.code),
        ).length ||
        !prospect.details.evidence ||
        !prospect.details.productUrl ||
        normalizeDomain(prospect.details.productUrl) !==
          normalizeDomain(prospect.details.domain)
      ) {
        result.held += 1;
        continue;
      }
      if (dryRun) continue;
      if (budget.researched >= 20 || budget.inboxes.size >= 10) break;
      budget.researched += 1;
      // Legacy drafts still recheck raw evidence. Staff-reviewed structured findings
      // retain their original dated rendered-review receipt; never renew it from raw HTML.
      const evidenceReceipt = { checkedAt: prospect.details.evidenceCheckedAt };
      if (!usesFindingFormula(settings)) {
        // Public research is safe to repeat. A changed or blocked finding revokes eligibility.
        const finding = await Research.checkProduct({
          url: prospect.details.productUrl,
        });
        if (
          !finding.success ||
          finding.data.status !== "verified" ||
          finding.data.product !== prospect.details.product ||
          finding.data.gap !== prospect.details.gap ||
          finding.data.evidence !== prospect.details.evidence
        ) {
          const held = await Store.reviewProspect("outbound-worker", {
            prospect: prospect.id,
            revision: prospect.revision,
            decision: "hold",
            reason: "Product evidence changed or could not be reverified.",
          });
          if (!held.success) result.errors.push(held.error.message);
          result.held += 1;
          continue;
        }
        evidenceReceipt.checkedAt = finding.data.checkedAt;
      }
      const mx = await MX.check(prospect.details.email);
      if (!mx.success) {
        result.errors.push(mx.error.message);
        result.held += 1;
        continue;
      }
      const refreshed = await Store.patchProspect(
        "outbound-worker",
        prospect.id,
        {
          evidenceCheckedAt: evidenceReceipt.checkedAt,
          mxProvider: mx.data.provider,
          mxCheckedAt: mx.data.checkedAt,
        },
        prospect.revision,
      );
      if (!refreshed.success) {
        result.errors.push(refreshed.error.message);
        result.held += 1;
        continue;
      }
      if (!recipientMailHostAllowed(mx.data.provider, settings)) {
        result.held += 1;
        continue;
      }
      const token =
        inbox.transport === "google-app-password"
          ? { success: true as const, data: "" }
          : await Mailboxes.access(inbox);
      if (!token.success) {
        result.errors.push(token.error.message);
        result.held += 1;
        continue;
      }
      const claimed = await Store.claimDelivery("outbound-worker", {
        prospect: prospect.id,
        inbox: inbox.id,
      });
      if (!claimed.success) {
        result.held += 1;
        continue;
      }
      budget.inboxes.add(inbox.id);
      const dispatched = await Store.dispatchDelivery(
        "outbound-worker",
        {
          attempt: claimed.data.attempt,
          connectionVersion: inbox.connectionVersion,
        },
        async (claim) => {
          const message = Google.buildMessage({
            from: claim.manifest.sender,
            fromName: claim.manifest.fromName,
            to: claim.manifest.recipient,
            subject: claim.message.subject,
            body: claim.message.body,
            messageId: claim.messageId,
            inReplyTo: claim.references.at(-1),
            references: claim.references,
            unsubscribeEmail: claim.manifest.sender,
          });
          if (!message.success) return message;
          const sent =
            inbox.transport === "google-app-password"
              ? await Direct.send({
                  email: inbox.email,
                  appPassword: inbox.appPassword ?? "",
                  to: claim.manifest.recipient,
                  raw: message.data.raw,
                  messageId: claim.messageId,
                })
              : await Google.sendMessage({
                  accessToken: token.data,
                  raw: message.data.raw,
                  threadId: claim.threadId ?? undefined,
                });
          if (!sent.success) return sent;
          return {
            success: true as const,
            data: {
              providerMessageId:
                "providerMessageId" in sent.data
                  ? sent.data.providerMessageId
                  : sent.data.id,
              // SMTP conversations use their original RFC message ID, not a fabricated Gmail thread ID.
              threadId:
                inbox.transport === "google-app-password"
                  ? (claim.threadId ?? claim.references[0] ?? claim.messageId)
                  : "threadId" in sent.data
                    ? sent.data.threadId
                    : claim.messageId,
            },
          };
        },
      );
      if (dispatched.success && dispatched.data.status === "accepted")
        result.sent += 1;
      else {
        result.errors.push(
          dispatched.success
            ? "A send outcome is uncertain. Reconcile the sender mailbox before retrying."
            : dispatched.error.message,
        );
        result.held += 1;
      }
      // One attempt per inbox in this tick; the database enforces rolling caps and pacing.
    }
    return result;
  });
