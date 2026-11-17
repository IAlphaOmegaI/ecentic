# Outbound mailbox history batches

Mailbox synchronization processes at most 25 fetched messages per database batch.
Under the workspace lock it loads existing event receipts, email attempts,
conversation-reply manifests and prospect matches once for the batch. Unmatched
historical Sent messages produce the same email/domain exclusions and individual
source-event receipts. Unmatched inbound messages retain their classification and
opt-out exclusions. Routine writes are bulk upserts; matched messages retain the
existing exact delivery/reply reconciliation path, including conversation storage
and stopping outreach.

The cursor advances only after every message in the provider page is applied and
the inbox connection version still matches. Routine-only batches commit their
receipts, exclusions and checkpoint together. If a matched message fails, earlier
receipts remain idempotent and the page is replayed without advancing its cursor.
Reconnecting during processing prevents the old connection from committing a
checkpoint, including an empty completion page. Selected folders and the history
date range are unchanged.

Cron sync accepts an absolute deadline, processes one page per inbox and
prioritizes stale or incomplete histories in order of their last attempt.
Processed inboxes move behind older work on the next tick. The email worker
reserves 60 seconds of its 240-second budget for downstream work. Deadline checks
leave unfinished pages unadvanced for the next tick. Direct UI `syncInbox` calls
retain their API without requiring a deadline.

The isolated `outbound-history-batch` fixture checks all 25 receipts and 50
exclusions for a historical Sent page, replay idempotence, matched messages,
unknown opt-outs, mid-batch reconnection, stale and empty checkpoints, page
bounds, deadline handling and inbox ordering without contacting providers.
