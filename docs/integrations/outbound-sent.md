# Outbound email history

The staff-only Sent view is now part of [Conversations](./outbound-conversations.md)
at `/replies?view=sent`. It combines email, LinkedIn and manual reply attempts.
`/sent` redirects there. `/sent/[id]` remains a secondary immutable email record
with sequence activity. Opening a record never sends, retries or changes a sequence.

## Meaning of the records

- **Accepted** means the sending provider accepted the request. It does not
  establish delivery to an inbox or inbox placement.
- **Failed** is a recorded provider failure. **Uncertain** means acceptance is
  unknown. **Preparing** represents an existing delivery claim.
- A **bounced** marker describes the prospect's current sequence status. The
  available bounce record is not attributed to an individual message, so the
  attempt keeps its actual provider status.
- The next eligible follow-up time is the sequence's current schedule. Delivery
  still depends on the normal sending gates and limits.

Recipients, senders, subjects and message bodies come from the immutable revision
referenced by the attempt. Both the stored hash and a recalculated hash must match.
The reader never substitutes an edited draft when a snapshot is missing or
invalid. Follow-up bodies quote the accepted first message and its original
postal footer, even if later drafts changed. Company and campaign labels provide
current prospect context; they are not claims about an immutable company record.

## Queries and access

The retained email-only read API supports `q`, `status`, `kind`, `page`, `campaign`
and `prospect`, including tests for diagnostics. The consolidated Conversations
Sent view uses its own bounded read of the three dispatch ledgers and excludes
tests. Campaign and prospect scopes require UUIDs. Pages contain 50 attempts;
email detail activity is limited to the latest 100 relevant events and displays
when older activity was omitted. Times are shown in UTC.

Only authorized staff actions expose these queries. Results contain no mailbox
credentials, provider keys or raw event diagnostics. Existing tables and indexes
are reused; this feature requires no SQL migration.

Implementation: `apps/outbound/src/server/app/outbound/sent-read.ts`,
`sent-actions.ts`, `src/lib/outbound-sent.ts`, and
`src/app/[locale]/(workspace)/sent/`. The isolated PostgreSQL fixture verifies
snapshot integrity, original-message quoting, search/filter pagination and
bounded activity without contacting email providers.
