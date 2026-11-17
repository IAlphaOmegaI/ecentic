# Outbound mailbox setup test

`apps/outbound/src/server/app/outbound/mailbox-test.ts` provides an explicit, server-only setup test for the operator-allowlisted test recipient. It is separate from campaign approval and never enables campaign delivery.

## Run and confirm

1. Call `start(actor, { requestId, inboxId, recipient: approvedTestRecipient })` once, with a newly generated UUID that is retained for all later reads.
2. Read `get({ requestId })`. SMTP acceptance returns `awaitingReply`; a failed or unknown result never causes an automatic resend. Calling `start` again with the same UUID only returns its stored state.
3. Have the owner reply to that exact message, then run the normal mailbox synchronization. `transport-store.ingest` preserves the actual conversation, applies the normal reply stop, and records an exact reply receipt.
4. Call `confirm(actor, { requestId })`. It sets only `senderTested` after validating the accepted test attempt, immutable message, actual stored human reply and current inbox connection version. History confirmation, inbox activation and global sending remain independent.

The selected direct Google inbox must be registered in the Playbook, connected, freshly synchronized, and have the same sender identity. Global sending must be paused. The test obeys actual rolling inbox capacity, blocks unresolved sends, and checks that Warmbly warmup is paused.

## Persistence and recovery

The reservation holds the normal workspace lock and creates an internal warm contact with source `internal-mailbox-setup-test`, status `skipped`, no campaign, no approval, and no invented research or verification. It creates a single immutable revision and `outbound_send_attempt.test = true` before SMTP. The integration job records the exact envelope, body, raw MIME hash, RFC message ID and connection version; it contains no mailbox credentials.

Accepted messages appear in Conversations. They count toward actual daily mailbox traffic but not sales or ramp metrics. The internal contact never receives follow-ups. An actual Sent-folder copy can reconcile an uncertain SMTP outcome only when the sender, recipient, RFC ID and full body match the immutable test. Unrelated messages, automatic replies, truncated bodies, copied IDs, manual outcome notes and credentials from another connection cannot pass confirmation.

There is deliberately one setup test per internal contact in the current schema. A second request UUID is refused if an `ecentic.ai` prospect already exists, including an earlier setup test. No existing contact or attempt is overwritten. Repeated setup tests would require a separately reviewed attempt-index migration; this implementation does not perform that migration.

The isolated regression suite is `src/server/spec/outbound-mailbox-test.test.ts`. It requires a local database named `outbound_test`; transport and warmup dependencies are mocked and no real email is sent.
