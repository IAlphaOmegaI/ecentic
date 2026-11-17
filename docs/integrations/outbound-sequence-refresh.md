# Automatic follow-up receipt refresh

Automatic email sequences can outlive their original product, email-verification and MX receipts. `apps/outbound/src/server/app/outbound/automatic-sequence-refresh.ts` refreshes those receipts before a due follow-up without changing the message or recipient.

The cron calls `run({ maxSteps, deadline })` before processing due delivery. The module admits only active, automatically approved sequences in an active campaign, with one or two accepted steps, an unchanged Playbook revision, an original automatic evidence job, and an expired receipt. It reserves at most one refresh job per approved prospect revision. The job uses provider `automation` and operation `sequenceRefresh`; campaign preparation jobs remain scoped to `campaignAutomation`.

Each stage is claimed and checkpointed under the shared Outbound workspace lock:

1. Revisit the exact original product URL after reading its robots rules. Apply the normal public-page guard and bounded reads. Compare the original product name, brand, URL, description, price and currency with the same positive raw-HTML observation. Do not find a replacement product, infer absent data, or claim rendered-page inspection.
2. If the existing email verification is expired, make one Apollo verification request for the original recipient and persist its request ID and record association.
3. Poll that recorded request. A matching provider check date is required. A successful, exactly correlated `email_verifier` completion can supply its unchanged provider `request_completed` timestamp when the email record has no date; the saved proof identifies that source. Local request time and webhook dispatch time never substitute for verification time.
4. Check the recipient domain’s MX provider.
5. Revalidate current identity, campaign, policy, messages, original approval and every receipt inside `Store.applyAutomaticSequenceRefresh`. Create a new immutable approval revision with identical message text and semantic content hash. Complete the refresh job in that same transaction.

The original source job, message revision content, manifest and accepted send attempts remain available. `automationEvidenceId` continues to identify the original qualification; `automationRefreshId` identifies the completed renewal, whose `appliedProspectRevision` and `appliedAt` bind the fresh receipt to the new approval. Sender delivery checks continue to verify this lineage. A renewed receipt does not bypass suppression, replies, sending windows, warmup holds, pacing or mailbox checks.

A lost or ambiguous billable verification request becomes uncertain and is never resubmitted automatically. Expired leases on read-only product/MX/poll stages may resume. Pausing a campaign during a successful provider request keeps its checkpoint for later continuation. Changed product facts or recipient identity prevent renewal; a still-matching sequence is held rather than rewritten. The worker must hold a delivery claim while a matching refresh is pending, starting or uncertain.

Validation lives in `src/lib/spec/outbound-sequence-refresh.test.ts` and `src/server/spec/outbound-sequence-refresh.test.ts`. The latter runs a guarded local `outbound_test` fixture when `OUTBOUND_TEST_DATABASE_URL` is set. It exercises the real Store renewal transaction, historical-record preservation, uncertain requests, changed facts, recipient races, lease expiry, pause/resume and concurrent cron ticks. Product HTTP fixtures use mocked responses and reject unexpected network calls.
