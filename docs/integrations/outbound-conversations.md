# Outbound conversations

Conversations group activity by prospect. Email threads and LinkedIn chats keep
their own account, recipient and provider identifiers underneath that shared
timeline. The Sent ledger remains immutable; the Conversations activity views
combine it with accepted replies and LinkedIn receipts rather than copying or
recounting deliveries. `/sent` opens the Sent view under Conversations.

## Persistence and reads

The additive migration
`apps/web/drizzle/20261116093000_outbound_conversations/migration.sql` creates
`outbound_conversation`, `outbound_conversation_message` and
`outbound_conversation_send`. Both app schema exports mirror these tables.

Threads are unique by channel, account and provider thread. Messages retain
plain text, actual subject/from/to, provider ID, direction, timestamp and
truncation flag. Provider IDs deduplicate ingestion; an exact RFC Message-ID
also deduplicates a sent email that later arrives under a different IMAP ID.
Untrusted HTML is converted to plain text and attachments are excluded. Bodies
over 50,000 characters and snippet-only fallback bodies are marked incomplete.
Incomplete inbound messages cannot supply a sendable reply draft.

`list({page,q,channel,stage,needsReply})` returns 25 prospect groups, with all
their channels and thread count. `get({id,threadId?,page?})` accepts a prospect ID
or an existing thread ID and returns 50 merged timeline messages. An explicit
thread selector must belong to that prospect. The draft, revision and send
attempts always belong to the selected real thread, never an inferred account.

`summary()` counts distinct prospects needing replies, recorded booked meetings,
held meetings and the union of recorded meetings. A booking link is not a
booking event. `meetingBooked` and `meetingHeld` are explicit staff stage changes.

## Reply drafting

The staff actions are `listConversations`, `getConversation`,
`updateConversationStage`, `generateConversationReply`,
`saveConversationReply` and `sendConversationReply`. Mutations require the
selected thread ID and its current revision. Each inbound human message marks
attention and invalidates drafts tied to an older inbound message.

Azure suggestions reserve an immutable generation UUID before one bounded call
with no automatic paid retry. They use actual correspondence and saved factual
notes, never invented pricing, availability, calendar bookings or customer
results. Email uses the saved shared email persona; LinkedIn uses the real
account display name and omits email founder context, voice notes and signature.
The exact saved `meetingBookingUrl` is allowed only for an interested/booked
stage and a meeting request. Suggestions remain editable. Recovering an old
generation cannot overwrite a newer thread revision or staff edit.

## Exact reply delivery

Sending is a staff action on the saved draft. A workspace-locked reservation
stores the exact body, recipient, original thread/account, policy and thread
revisions, inbound message ID, connection version and a SHA-256 manifest hash.
The provider call is made only after the reservation has committed. Final checks
repeat under the same shared lock used for cold outreach.

Email replies require the original connected, enabled and recently synchronized
mailbox with the current sender identity. SMTP replies retain an RFC Message-ID
and In-Reply-To; Gmail replies pass the actual provider thread ID. LinkedIn
replies verify the real account user and that the actual chat belongs to the
recipient. They cannot silently open a different chat. Shared opt-outs and
suppression rules continue to block sending.

Cold email and replies share the effective rolling mailbox cap. LinkedIn cold
messages and replies share the account message cap. Starting or uncertain
attempts block another send on the same mailbox/account regardless of age;
known failed attempts do not consume capacity. Concurrent clicks can reserve
only once per thread revision. A lost or malformed provider response becomes
uncertain and is never replayed automatically.

An actual Sent-folder copy can reconcile an uncertain email reply only when
the account, RFC Message-ID, recipient and full body match its immutable
manifest. Reconciliation records the provider receipt and timeline message
without resending. Accepted cold emails and LinkedIn actions also enter the
timeline; an accepted blank invitation is shown as an action, not a fabricated
chat message. No send changes a meeting stage automatically.

## Validation

Isolated PostgreSQL fixtures cover provider/RFC deduplication, full-body history
backfill, prospect grouping with selected-thread validation, exact sender and
recipient binding, concurrent clicks, changed inbound revisions, paid generation
recovery, uncertainty and Sent reconciliation, shared capacity and channel
identity. Provider fixtures cover Gmail HTML-only messages, attachment exclusion
and incomplete-body flags. These checks use mocked providers and do not send
live messages.
