# Outbound workspace

Primary navigation follows the working loop: Overview, Campaigns, Prospects and
Conversations. Playbook, Integrations and Warmup remain under settings. Review
and the LinkedIn tools are optional inspection tools beneath Prospects.

Prospect detail opens as a read-first summary: saved company/contact identity,
the current email, LinkedIn and automatic-preparation states, a quoted product
insight with its source and check time, email verification, and the saved
sequence. Conversations opens the prospect's actual sending history. The full
edit form and individual research actions are inside a collapsed shared
Accordion. The editor loads on first expansion and then stays mounted to preserve
unsaved changes. The new-prospect form needs no existing prospect data.
Saved sequence previews do not replace immutable sent-message records.

Prospects reads 50 summary rows per page. Search and status, email-progress and
LinkedIn filters run over the full database set; the URL stores the current
query and page. Rows carry no email bodies, research receipts or suppression
records. Detail links do not prefetch every visible prospect. Each detail page
loads only its selected prospect through the same evidence and approval checks
as Review. Import forms load when opened. Manual preparation fetches fresh
candidate IDs only after Start is pressed.

Each route owns its data and client components beneath the shared page shell.
Playbook reads its policy and LinkedIn accounts; Integrations reads connection
status, public inbox metadata and bounded job metadata without stored job bodies
or transport secrets. Campaign breadcrumbs read only the campaign identity.
Navigation does not import authentication forms into every signed-in page.

The overview uses bounded database aggregates instead of loading the legacy
prospect workspace. Company progress uses active campaigns and current criteria
revisions. Insight counts require current `campaignAutomation` receipts with
matching campaign and Playbook revisions. Sequence-refresh jobs are not new
company discoveries. A contact count requires a saved prospect; a prepared
sequence requires a stored approval hash. Seven-day sending metrics use provider
acceptance times, not the last time a job's reply history was synchronized.

Reply attention uses stored conversation state. Meetings count distinct prospects
explicitly marked `meetingBooked` or `meetingHeld`, without double counting a
person across email and LinkedIn. A booking URL or interested reply does not
prove that a meeting was booked.

The existing `/replies` URL is the [Conversations workspace](./outbound-conversations.md).
Its selector offers All activity, Needs a reply, Sent and Scheduled. The first
two group real threads by prospect. The reply account selector binds the editor
to one actual thread and revision, and stays disabled during an unsaved edit.
Generating and saving a suggestion never sends it; sending uses the exact saved
draft. Unknown provider or browser-response outcomes block another send.

Sent combines email dispatch attempts, LinkedIn outreach attempts and manual
reply attempts. It keeps failed, running and uncertain states distinct from
provider acceptance and excludes test messages. `/sent` redirects here; immutable
email records remain secondary detail pages at `/sent/[attemptId]`.

Scheduled shows actual `nextSendAt` timestamps for active/approved prospects with
a saved next email step. Pauses, reply checks, recipient hours and inbox caps may
defer them. LinkedIn does not currently persist fixed future send times, so this
view does not invent them.

The Playbook's editable `meetingBookingUrl` supplies the booking-page shortcut.
It does not integrate with a calendar or automatically record a booking. Sender
inboxes are aliases for the same email identity; connected provider identities
remain intact. Pages stream data beneath server-rendered shells and matching
skeletons, with shared controls and seven localized catalogs.
