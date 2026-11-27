/** Expected scheduling deferrals do not assert either mailbox health or failure. */
export type MailboxSyncDeferral = "busy" | "budget";

// This is a plain Error subclass, not the error() factory whose prototype is reset.
export class MailboxSyncDeferredError extends Error {
  readonly reason: MailboxSyncDeferral;

  constructor(reason: MailboxSyncDeferral) {
    super(
      reason === "busy"
        ? "This inbox is already being synchronized."
        : "Mailbox synchronization will continue in the next run.",
    );
    this.name = "mailbox-sync-deferred";
    this.reason = reason;
  }
}
