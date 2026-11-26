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
or transport secrets. Campaign headings read only the campaign identity.
Navigation does not import authentication forms into every signed-in page.

The overview uses bounded database aggregates instead of loading the legacy
prospect workspace. Company progress uses active campaigns and current criteria
revisions. Insight counts require current `campaignAutomation` receipts with
matching campaign and Playbook revisions. Sequence-refresh jobs are not new
company discoveries. A contact count requires a saved prospect; a prepared
sequence requires a stored approval hash. Seven-day sending metrics use provider
acceptance times, not the last time a job's reply history was synchronized.

Reply attention uses stored conversation state. Meetings count distinct prospects
explicitly marked `meetingHeld`, including recorded held-stage events after a
conversation is archived or reopened. Duplicate records across email and
LinkedIn count once. Bookings and booking URLs are not held meetings.

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

The current workspace uses ecentic’s rounded charcoal frame with a white outer
reveal and a separately scrolling, rounded inner content surface. Top-bar
breadcrumbs are omitted; the page heading and selected navigation identify the
screen. Prospects groups All prospects, Review and LinkedIn in a shared
Accordion. On mobile the opaque charcoal navigation slides from the left using
Sheet, with focus containment, Escape dismissal and reduced-motion support.
Imports use a right-hand Sheet and return focus to More after closing.

The prospect working list uses the shared DataTable provider with server-owned,
one-based pagination. Company identity has its own wide column; contact name,
email and role stay together. Secondary progress prioritizes holds and active
research before scheduled and sent history. Page controls remain mounted and
focusable during a transition while their handler prevents duplicate requests.
The wide table is keyboard-scrollable and does not use per-row backdrop blur.

Sign-in keeps the branded blue narrative/light form split, server-rendered
heading and staff footer, controlled localized errors and guarded submission.
Review evidence and conversation editors use light connected panels, shared
controls and single-owner seams. They retain their existing revision and
unsaved-edit safeguards.

The overview shows seven-day first-email, follow-up and human-reply counts on a
shared measured chart scale, with keyboard-accessible value tooltips. Current
company, qualification, contact and sequence counts remain separate and are not
presented as a conversion rate. Report details expose source and hold summaries.
The report reads only projected prospect identity/status/source and bounded
attempt/event fields; evidence details are fetched only for held prospects
without a saved reason. No draft bodies or raw provider receipts are sent to the
chart.

The measured funnel covers all saved contacts, including held and archived
history, and excludes internal mailbox tests. Research outcomes use each
contact's latest recorded decision. Research receipts, findings, no-gap results
and blocked or incomplete checks remain distinct. Copy passes and approvals
refer to the current exact saved revision and current Playbook; a copy pass
also requires the completed writing job's identical saved messages and complete
six-check verdict. These counts do not predict replies or imply conversion rates.

Lifetime accepted-email counts use non-test cold-send acceptance receipts, not
timeline copies or proof of delivery. Human replies exclude automated messages;
explicit staff outcome records remain visible. Positive replies require a
recorded positive outcome or an interested stage with a human reply. The
seven-day report labels its older `meeting` outcomes as recorded bookings,
separately from lifetime held meetings.

Research cost is acknowledged search purchases divided by distinct contacts
with a historical first-email approval. Provider search IDs are deduplicated
across active jobs, archived searches and copied research proofs. Reserved or
unknown submissions without an acknowledged search ID are shown separately.
An approval remains in this historical denominator after a reply, completion
or revocation; approvals after the first send do not create a first-email
approval. A zero denominator displays no ratio. The funnel reads one aggregate
row; raw research, draft bodies and provider responses stay in the database.
