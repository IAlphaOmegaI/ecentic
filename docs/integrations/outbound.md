# Internal outbound workspace

## Automatic mode and conversation workspace (16 November 2026)

Outbound supports automatic contact discovery, research, email sequences and
LinkedIn outreach under the saved campaign and Playbook policy. Automatic mode
requires explicit workspace configuration. Active campaigns now use the
[durable automatic pipeline](./outbound-automation.md): Azure assesses sourced
company evidence and drafts the saved formula, Apollo finds/verifies contacts,
and exact-version machine checks authorize eligible delivery. Automatic follow-ups [renew expired source and email receipts](./outbound-sequence-refresh.md) without changing sent messages. Manual review
remains available when automatic mode is off. Existing unsent drafts in active
campaigns now enter a bounded automatic review pass only when current shopping
research, saved provider verification and all eligibility checks match. Sent or
explicitly held sequences are never automatically rewritten. Source exclusions, opt-outs, identity checks and immutable
attempt records continue to apply.

The primary navigation follows Overview → Campaigns → Prospects → Conversations.
Conversations (`/replies`) groups both channels by prospect, with Needs reply,
Sent and Scheduled views. Each prospect timeline combines email, LinkedIn,
follow-ups and actual replies; meeting outcomes are recorded explicitly, never
inferred from a booking-link click. The editable Playbook booking link is used
in reply drafts. `/sent` redirects to the Sent view; `/sent/[id]` remains an
immutable email delivery detail. Manual review and LinkedIn operator controls
remain secondary prospect tools, not competing primary destinations.

Sent views show provider acceptance rather than claiming inbox delivery. Email
bodies are saved from the attempt's immutable revision, including the exact
original message quoted by follow-ups. Replies use the actual selected mailbox
or LinkedIn chat. Inbound replies and opt-outs stop cold follow-ups across both
channels. Opening a timeline never sends or retries anything.

Email targets may be set up to 100 messages per inbox per rolling 24 hours, including
follow-ups and conversational replies. With `sendingRampEnabled` (the default),
the effective limit starts at 15 (or a lower configured target) and rises by 5
only after a completed UTC day reached its then-current cap. Disabling the ramp
uses the configured limit directly. An observed bounce in the 60-day evaluation
history returns either mode to the starting limit. Test and warmup messages do
not advance the ramp. This measures actual volume, not reputation or inbox placement.
Individual mailbox caps, pacing, weekly target,
recipient windows and provider holds still apply. The worker runs every minute,
with bounded preparation work and at most one attempt per inbox per tick.
Only follow-ups whose scheduled time has arrived reserve capacity against first
emails; tomorrow's follow-ups do not consume today's remaining slots. The queue
filters due dates and currently open recipient windows before its row limit.
Waiting contacts and paced inboxes do not spend the worker's research/MX budget.
The final transaction still rechecks eligibility immediately before delivery.
A claimed attempt blocks the inbox while its transport is in flight. A single
uncertain attempt remains held on its recipient, is never retried automatically,
and counts toward rolling capacity; unrelated recipients can continue. Two
uncertain attempts started within the rolling 24 hours pause the inbox for
transport review. Older uncertainty retains its recipient hold without indefinitely
blocking unrelated deliveries. Unresolved conversation replies remain an inbox hold.
Raising a cap does not mark an uncertain attempt failed or erase its capacity use.


LinkedIn uses the explicitly selected saved Unipile account and its own limits;
the email 50 target does not apply to LinkedIn. Automatic invitations and a single
message after connection have durable reservations and provider receipts. Both
channels check replies and share a 24-hour gap between outbound touches. Unknown
provider outcomes are held and never automatically replayed.


13 November 2026. Outbound is a separate application in `apps/outbound` within
the ecentic monorepo. It has its own root workspace (`/`), staff sign-in
(`/sign-in`), build, deployment, environment and authentication cookie prefix.
It shares Zenncore components, ecentic design tokens and the existing PostgreSQL
staff identities and outbound records. The earlier integrated `/dev/outbound`
prototype and the Mac/SQLite proposal in `PLAN.md` are historical context.

Only ecentic staff can create a session or use outbound server actions. The app
uses its own `ecentic-outbound` cookies; being signed into the merchant dashboard
does not sign someone into Outbound. A Shopify `owner` or `administrator` role
does not grant staff access. The sign-in screen accepts existing staff
email/password credentials, offers no registration or provider login, and shows
a clear denial if a signed-in account no longer has staff access. Account state
and sign-out are available in the app's own navigation.

The workspace follows the current dashboard design: a charcoal sidebar and
top bar, the negative trademark, an off-white page canvas, white connected
content regions, compact semibold headings and hairline seams. Navigation uses
the dashboard's blue gradient and inset highlight for the selected destination,
shared icons, a mobile drawer and a compact staff account menu. Sign-in uses the
ecentic split blue artwork and light form layout, with a language selector.
Its structural crosshair is local to this app; all interactive controls and
forms use the shared Zenncore packages. There are no runtime imports from
`apps/web`.

The prospect list offers search, status filters and 50-row pagination. Imports
open in a dialog; prospect and playbook forms group related fields under
descriptive headings and keep save controls visible. All form sections remain
mounted so validation errors are reachable. Auth, navigation and page copy are
available in the app's seven locales.

Run `bun run dev:outbound` from the repository root and open
`http://localhost:3001`. Use `bun run build:outbound` and
`bun run typecheck:outbound` for the standalone build and TypeScript check.
Deploy `apps/outbound` as its own project with its own `APP_HOST` and environment.
See the [app README](../../apps/outbound/README.md) for commands and schema
ownership constraints.

Production has been deployed to [outbound.ecentic.ai](https://outbound.ecentic.ai)
on 15 November 2026 under the Vercel `zennit/ecentic-outbound` project. It uses
the shared PostgreSQL database and encryption key, its own authentication host,
Node.js 24 and the app's three minute-scheduled workers. The root repository's Vercel link
continues to identify the main ecentic project; follow the standalone staging
commands in the app README for redeployments. This first release is a CLI
snapshot. Production hosting does not enable delivery or complete the outstanding
provider, sender and historical-import checks.

## Screens and editable policy

Past campaign imports can be made optional in Playbook using
`allowIncompleteHistory`, following the owner's 17 November 2026 decision to
accept possible repeat contact without Instantly/Explee exports. This is an
audited, reversible operational choice; `historyConfirmed` stays false until
history is actually imported. Known opt-outs, bounces, replies and exclusions,
current-mailbox sync and existing Outbound send records still apply. Mailbox
readiness labels the choice “Previous campaign history optional.”

| Screen | Purpose |
| --- | --- |
| Overview | Current campaign pipeline, research and sending progress, conversations, meetings and actionable connection blockers. |
| Campaigns | Separate criteria and source progress for concurrent campaigns; generate Claude criteria previews or review pasted answers, explicitly save, find companies with Apollo and Clay, and open campaign-scoped contact/review work. |
| Prospects | Company/person details, source URLs, qualification evidence, verification dates and product findings. Import records, run public-page research or find a person through Apollo. |
| Review (secondary) | Inspect or edit exact drafts and resolve exceptions; automatic campaigns do not require per-message review. |
| LinkedIn (secondary) | Account-specific outreach status and exception handling; message history lives in Conversations. |
| Conversations | One prospect timeline across email and LinkedIn; Needs reply, Sent and Scheduled views, reply drafts, actual replies and meeting outcomes. |
| Playbook | Edit sender identity and inbox pool, templates, writing instructions, targeting, exclusions, verification validity, pacing and release checks. |
| Integrations | Provider configuration status, inbox connection and synchronization, enrichment jobs and a saved-queue preview. |
| Warmup | Mailbox access and DNS receipts, capped ramp plans, and explicit controls for registered mailboxes in a hosted Warmbly workspace. |

See [campaign discovery](./outbound-campaigns.md) for source entitlement,
deduplication and criteria revision rules, and [mailbox readiness and Warmbly](./outbound-warmup.md)
for checks, shared-network setup and delivery isolation. A valid provider key
alone does not establish that its plan permits the requested filters or warmup.

`/review` searches company, domain, contact name, email and first-email subject
in PostgreSQL. It returns at most 50 summaries per page, ordered by last update
and a stable ID tie-breaker. The queue includes saved messages in draft, held,
approved or active status. Search, status and page live in the URL. Draft bodies
and evidence load only when staff open `/review/[id]`; the queue does not load
the entire workspace or prefetch each row's full review. The back action retains
the queue filters and page, and asks before discarding unsaved message edits.

The saved playbook is application data. Email subjects, first-email and follow-up
bodies, the LinkedIn template, founder introduction, closing question, opt-out
line, signature and postal address are editable in forms. Previously sent first
emails can be saved as style examples; their facts are not evidence about new
prospects. Supported template
variables are `{first}`, `{name}`, `{company}`, `{product}`, `{productFeature}`, `{finding}`,
`{consequence}`, `{askAbout}`, `{personalLine}`, `{founderLine}`, `{callToAction}`, `{optout}` and `{signature}`.
Unsupported variables are rejected. Source material is evidence, never an
instruction to the model.

The November launch formula resolves the observation, consequence and question
topic from editable finding sections. Review counts and categories come
from saved prospect facts, never model guesses. The complete finding and founder
paragraphs must retain the rendered template wording during AI polishing and
manual review. Shared configured wording is exempt from repeated-sentence checks;
duplicate subjects and personal sentences are still held. If the optional
personal opening would exceed the body limit, it is omitted; required wording is
never shortened automatically, and an overlength result remains held.

First-email claim exclusions and reply-only reference wording are separate
Playbook fields. Percentages and configured names/phrases block first-email
approval. The claim list is a deterministic check, not a general fact checker.
Targeting notes guide human review; they do not create additional automatic rules.

The sender pool contains authorized mailboxes using the same
truthful display name and signature. The delivery path uses a connected,
deterministically assigned member of that pool and applies limits to each inbox. The inbox selected
for a started sequence remains its sender. Connecting an inbox leaves its
delivery switch off.

Inactive sender addresses remain saved separately and never enter rotation.
Only the active sender pool is eligible for delivery. Exact company names and aliases
can be excluded without guessing domains; matching ignores case, accents and
punctuation, but does not search arbitrary website text or infer corporate aliases.

Saving substantive playbook changes invalidates affected approvals. Editing a
prospect or its messages also requires review again. Pausing or resuming the
delivery switch alone does not change approved content. The approval record
binds the message revision, recipient, sender policy, identity, postal address
and evidence. Follow-ups use the approved first-email subject and quoted first
email; the delivery preview includes the postal footer and quoted history.

Defaults are 50 first emails per week, no more than 15 messages per inbox per
rolling 24 hours, a randomized 12–28 minute gap, and follow-ups on days 3 and 7.
The daily limit includes follow-ups and reserved/failed attempts. A weekly target
is not a guarantee of capacity. The first-email copy has a configurable maximum
of 99 words, before the separately displayed postal footer. Sending starts off.

### Operational Playbook options

These switches preserve the approved words and original source dates; changing
them does not claim a fresh capture, reset a provider budget, or automatically
replay an accepted, failed or uncertain paid query. Final eligibility checks use
the current settings, including for an already claimed email. Explicit recovery
of a definitively rejected provider request retains its saved checkpoint and audit.

| Setting | Default | Effect |
| --- | --- | --- |
| `automaticApolloEnabled` | `true` | Enables new automatic company searches, organization/contact enrichment and email verification. When off, stages needing new paid Apollo requests remain pending; saved facts, free identity search and polling an already accepted request can continue. Manual provider actions remain explicit. |
| `sendingRampEnabled` | `true` | Uses the observed-volume ramp described above. When off, the lower of the workspace and inbox caps applies directly, up to 100; bounce protection remains active. |
| `allowStaleEvidence` | `false` | Allows genuine saved product and shopping observations beyond the configured age limit. Missing, future-dated or changed receipts still fail. |
| `trustSavedContactVerification` | `false` | Allows an explicitly accepted, source-verified legacy contact and saved role to retain their original verification dates, including unknown dates. An immutable receipt binds the imported identity; this is not a new verification. Live MX, targeting, reply and suppression checks remain. |
| `allowProductObservations` | `false` | Allows a specific, truthful neutral product observation when no discrepancy is supported. Actual shopper-query and browser receipts remain required; invented issues, price discrepancies and sales-impact claims are not permitted as neutral observations. |

On 25 November 2026 the owner chose a configured 50-message inbox cap without
the gradual ramp, paused new automatic Apollo spending, and enabled the stale
evidence, accepted saved-contact and neutral-observation options. These are
dated operating decisions, not new defaults or a guarantee of daily send volume.

The overview report counts accepted first emails, accepted follow-ups, replies,
bounces, meetings and uncertain outcomes in the last seven days. Its prospect
and hold counts describe the current pipeline. Accepted means that the sending
provider accepted the message; it does not establish inbox delivery.

Country settings determine application eligibility; they do not grant legal
permission to contact someone. The initial allowed country is `US`; the default
held list is `DE, AT, CH, FR, ES, IT, NL, GB`. Microsoft-hosted recipients,
unknown mail hosts, shared inboxes, excluded roles and non-cold relationships
cannot pass the cold-email checks. Stale or undated verification fails unless
the explicit saved-contact policy and its bound import receipt apply. Qualification,
current-role and product evidence must be recorded with their sources.

Email receipt age is independent of product evidence age: the November launch
sets 30 days for the provider's actual email verification and 7 days for the
named product review. MX remains one day and role evidence 30 days. A personal
opening must have a publication date within nine months and a source reviewed
when a new draft is prepared; following up does not invent or renew that date.
Imported records cannot assert the staff's finding-review confirmation.

The automatic product checker reads raw HTML and preserves possible findings
as held candidates. It cannot establish absence after JavaScript renders. Staff
must review raw and rendered product data, the finding-specific exceptions, and
any matching retail product before confirming the finding in Prospects. The
delivery worker respects that dated confirmation within its configured validity;
it never substitutes a raw fetch timestamp for a rendered review. Expired
confirmations require review again. A live rendered-page collector is future work.

Apollo paid enrichment and verification, and Clay runs, check company policy,
relationships, prior contact, suppression and reviewed finding evidence before
reserving a provider job. Clay role/team inputs include title and company and
also require a usable email receipt and current non-Microsoft MX result. Clay
remains optional; these checks do not create a callable routine or enable result
application. See the [launch decisions](outbound-launch-decisions.md) for current
account, history and implementation boundaries.

## Existing research and history

The import form accepts a JSON array, JSONL, a JSON envelope containing
`prospects` or `leads`, and quoted CSV. A batch is limited to 5,000 records and
2 MB. It runs in one database transaction, with row-level import results.
Company domains are normalized for deduplication; a company has one active
prospect record. Recognized legacy snake-case fields are mapped to the current
schema. File-supplied approvals are never trusted.

Import history and do-not-contact records before releasing delivery. Known
previous contacts cannot restart a cold sequence through import; opt-outs and
bounces preserve their suppression scope. Domain/email/reason-only exclusion
records can be imported without inventing a person. Undated legacy verification
labels do not acquire a new verification date merely because they were imported.
The original outreach-pipeline files are not rewritten by this app, and there is
no automatic two-way synchronization with that folder or other CRMs.

**Prepare weekly research** works through candidates without evidence in
sequential batches of at most three. It stops when the saved weekly target has
enough recent findings, the candidate pool runs out, a request fails, or staff
choose **Stop after this batch**. Findings already checked within the last
24 hours count toward the research target. Progress distinguishes records
checked in this run, ready findings and holds; a shortfall is shown explicitly.

Keep the page open while research runs. Each company result is saved before the
next batch, so a later run uses the remaining candidates. Discovery examines
bounded public homepages and sitemaps, then at most eight product pages per
company. A blocked or ambiguous source becomes a hold. This preparation step
does not automatically buy enrichment, invoke AI drafting or send messages.

The release checkboxes record staff confirmation that historical sends and
exclusions have been imported, competing senders have been paused, and the sender
has passed a controlled send/reply test. They do not perform those tasks or
independently establish that the records are complete.

## Provider setup

### Preparing explicitly selected saved contacts

`server/app/outbound/saved-contact-preparation.ts` exposes an internal
`enqueue(actor, { batchId, campaignId, prospects, maxQueries })` operation and
a bounded `run({ batchId?, maxSteps?, deadline? })` worker. The prepare cron
resumes only these explicitly seeded jobs. Existing imported prospect IDs,
source-verification receipts and original observation dates remain intact;
the worker never calls Apollo or sends mail directly.

Each job checkpoints live MX, public product evidence, a source-bound business
address for local sending hours, qualification, one ScrapeLLM query, its poll
result, browser captures, assessment, applied research and draft generation.
The normal automatic-review and sending workers handle the resulting draft.
Public sources with no supported finding retain their actual receipts for
review. Playbook observation policy controls whether an accurate neutral
product observation can qualify. Missing facts are never replaced with guesses.

A batch permits at most 50 reserved ScrapeLLM submissions, with the limit
saved before any provider call. More contacts can be added to the same batch
without resetting its budget. A lost paid-stage response becomes uncertain
and is not replayed. Quota, access, configuration or unknown rate-limit failures
pause further paid stages for that batch. A verified per-minute HTTP 429 from
Firecrawl session creation keeps the same saved shopping answer and browser
stage pending, with at most three retries after 60, 120 and 240 seconds (or the
provider's longer delay). Browser claims share a durable 60-second batch limit.
An execute failure or uncertain outcome never creates a replacement browser.
`resumeBrowserRateLimit` can recover one older paused creation rejection after
an audited review of exact job and batch snapshots; query reservations remain
unchanged. Replies, suppression, changed identity,
manual holds, campaign changes and existing delivery attempts are rechecked
before each stage. Provider captures are retained even if a hold arrives while
the external request is running.

An operator can review a completed product-parser hold and call `retryCollection`
once with its job ID, current update timestamp, a unique request ID and the
review reason. Only the exact missing-product hold with an original same-site
product receipt is eligible. The worker checks the current contact, campaign
and Playbook bindings, preserves the original collection and review audit, then
resumes free public collection. Restricted pages, missing product receipts,
changed bindings and any shopping submission or result cannot be retried this
way. Repeating the same review is idempotent and does not reset the query budget.

`resumeLocation` applies the same reviewed-request contract to a completed
missing-address hold. It must resolve one business timezone from the original
saved company and location receipts after a parser correction, or use an
explicitly enabled US market window for a recorded US contact. It retains the
entire held state, reviewer audit and original address observation timestamp,
then resumes qualification without fetching pages or submitting shopping work.
Ambiguous addresses, third-party policy addresses, changed campaign or contact
bindings, and any prior paid work remain ineligible.

The operational Playbook preference `allowUsMarketWindow` defaults to false.
When enabled, contacts recorded in the US whose timezone is blank may qualify
without a postal address. Their actual timezone remains blank; saved metadata
labels the schedule as a chosen market window. The same scheduling resolver
governs readiness, email reservation and final dispatch, and LinkedIn sending:
Monday–Thursday, 18:00 inclusive through 21:00 exclusive UTC. Known timezones
retain 08:00–14:00 local scheduling. Unknown countries, non-US countries and
malformed nonempty timezones do not qualify for this fallback. Switching the
preference changes no approved message or approval revision, but each send
rechecks the current preference.

Company qualification uses a bounded catalog of unchanged source excerpts.
Azure selects excerpt IDs; local code supplies their original text and URLs,
then validates the same company-fit and product-insight requirements. Unknown
IDs are rejected. An explicitly reviewed qualification correction can repair
a known quote/source error using the saved receipts, while retaining the
original model assessment, reviewer, reason and timestamp. It resumes at
company application and does not repeat a model or shopping query.

The existing `apps/web` migration history remains the owner of the shared
PostgreSQL schema. Apply migrations there with `bun run db:migrate` when needed.
The `apps/outbound` schema is a runtime projection of staff and outbound tables;
never run `db:push` or a reset against it, since other application tables share
the database. Extraction does not require another import. Provider credentials
can be saved in Integrations; the deployment still needs its database,
authentication and encryption secrets. A local environment edit does not
configure a hosted deployment.
Configuration badges report available settings, not successful authorization,
API-plan entitlement or remaining credits.

| Provider | Required settings | Behavior |
| --- | --- | --- |
| Apollo | API key saved in Integrations, or `OUTBOUND_APOLLO_API_KEY` fallback | Checks authentication with `GET /api/v1/auth/health` before saving. Exact-company person search, work-email enrichment and asynchronous email verification. No phone or personal-email reveal is requested. |
| Clay | API key saved in Integrations; optional routine ID for enrichment, or `OUTBOUND_CLAY_API_KEY` / `OUTBOUND_CLAY_ROUTINE_ID` fallback | Checks authentication with `GET /public/v0/me` without running a billable routine. A key can be saved before routine setup. Enrichment stays unavailable until a routine is configured; the routine's output is retained for review and does not confer verification or approval. |
| Azure | Existing `AZURE_RESOURCE_NAME`, `AZURE_API_KEY` and `AZURE_DEPLOYMENT_GPT` (or legacy `AZURE_DEPLOYMENT_GPT4O`) | Uses the application's GPT model rail to prepare drafts from saved evidence and the playbook. Model output still needs human approval. |
| Claude | Console API key saved in Integrations; optional workspace ID, or `OUTBOUND_CLAUDE_API_KEY` / `OUTBOUND_CLAUDE_WORKSPACE_ID` fallback | Direct structured campaign-criteria previews using selected Playbook context and staff notes. Key validation lists available models; it does not prove available credit. Previews retain source revisions and require explicit review/save. See [Claude setup and credits](./outbound-claude-api.md). |
| Google mailboxes | Mailbox email and Google App Password entered in Integrations; shared `CREDENTIAL_ENCRYPTION_KEY` | Checks SMTP and IMAP access without sending, then stores the app password encrypted. SMTP sends approved messages and IMAP reconciles replies and recent history. Google OAuth remains an advanced connection option. |
| Unipile V2 | Global or Scoped Account API key saved in Integrations (Service keys also work), or `OUTBOUND_UNIPILE_API_KEY` fallback; existing `APP_HOST` | Read-only key verification, encrypted key storage, hosted LinkedIn account connection, reconnect and account-status refresh. Account credentials are entered on Unipile. |
| Scheduler | `CRON_SECRET` | Authenticates the outbound maintenance endpoint. |

Apollo and Clay require accounts with access to the specific APIs and sufficient
credits. Keep enrichment explicit and bounded. Provider configuration does not
purchase a subscription or establish that an account's response contract has
been verified with real data.

Credential forms require `CREDENTIAL_ENCRYPTION_KEY`. Provider keys and OAuth
client secrets share the encrypted `outbound_provider_credential.api_key` column;
only the Clay routine ID and Google client ID are stored as non-secret
configuration. Per-mailbox app passwords use encrypted `outbound_inbox.app_password`.
Apply provider and direct-mailbox migrations through `apps/web`.
Saved key/configuration pairs take precedence together over environment values,
and changing them takes effect without a restart. Unipile, Apollo and Clay saves
check authentication without sending a message or buying enrichment. A Clay key
check does not execute or verify the selected routine. Google settings are shown
as saved until the inbox OAuth flow completes. Form validation,
provider failures and storage errors cannot return the submitted secret.

Clay's workspace API key is separate from a routine ID. Save the key first;
routine setup is optional for connection and required only for enrichment.
Key-only saves replace the complete saved key/configuration pair, including an
empty routine, rather than combining a new key with an old or environment
routine. The UI distinguishes key connection from enrichment readiness, and
the server refuses enrichment before reserving a job when no routine exists.

On 14 November 2026, signed-in browser verification showed that
`https://app.clay.com/functions` is not a stable routine-setup destination.
Its sidebar exposes **Workflows**, **Claygents**, and **API and CLI**, but no
Functions section. The current developer documentation still links the old
destination; do not present that link as a verified setup route or assume a
Workflow ID is interchangeable with a custom-function ID. Open
[Clay](https://app.clay.com) and use the navigation available in the actual
workspace. Custom functions use `function:t_...` when that capability is
available, according to Clay's
[custom-function documentation](https://developers.clay.com/routines/custom-functions).
The public API currently has no documented routine list/create endpoint; an API
key alone cannot discover or create a missing function. The separately
authenticated [official CLI](https://github.com/clay-run/agent-plugins) can list
routines, inspect their input schemas, and create Workflows. Its current
[routine instructions](https://github.com/clay-run/agent-plugins/blob/main/clay/skills/routines/SKILL.md)
support `clay routines create workflow <workflowId> --name "..."` to register a
Workflow as `workflow:<workflowId>`. Registration and publication are distinct
steps; validate the graph, test its real output, publish, and verify the registered
routine before using that ID in Outbound. Use only a manual trigger for this
role/team check; adding a routine must not add a schedule or send messages.

For initial setup, [Apollo Basic](https://www.apollo.io/pricing) is the lowest
paid candidate using unified credits; test the workspace's endpoint access
before an annual commitment. Existing Google mailboxes can be connected
directly. Clay is optional: its current
[developer platform supports all plans, including Free/trial](https://university.clay.com/docs/clay-api-cli),
and the documented [routine API](https://developers.clay.com/routines/api) matches
this adapter. Test the routine on Free/trial, then choose
[Launch](https://www.clay.com/pricing) if more credits are needed. The older
pricing FAQ's Enterprise-only wording should not be applied to this Public API.

### Direct Google mailbox connection

Google mailboxes can connect directly to Outbound. In Integrations, enter the
mailbox email and its **App Password**; the regular password, 2FA code and 2FA secret are not needed.
Google's [app-password guidance](https://support.google.com/accounts/answer/185833?hl=en)
describes account eligibility. No additional mailbox subscription is required
for this connection method.

The staff-only action checks both `smtp.gmail.com:465` and `imap.gmail.com:993`
using verified TLS, without sending a message. It accepts only addresses in the
playbook's active or inactive inbox lists. Inactive inboxes can
connect and synchronize history, but cannot be enabled for delivery. They keep
their existing identity, or use their mailbox address until one is configured;
connecting them does not assign the active sender pool's identity.
Saving or replacing a connection clears
the other transport's credentials and synchronization checkpoints and disables
delivery for that inbox. App passwords are never returned to the browser or
included in provider error messages. Connection versions prevent an older sync
or send operation from using a replacement connection's state.

Choose **Sync replies** after connecting. Synchronization is checkpointed in
bounded pages across Gmail All Mail, Spam and Trash, covering the last 180 days
from initial connection. The browser continues through pages and shows a checked
message count until complete or stopped; stopping finishes the current batch.
Scheduled runs can also resume from the saved checkpoint. Sending remains held
until synchronization completes. Recent Sent history also
creates exclusions for recipients not yet in Outbound's prospect list. Missing
messages or oversized/unreadable text keep reconciliation incomplete for
operator review; they are not silently skipped. Large attachment payloads are
omitted while headers and bounded message text are read through IMAP MIME parts.
This mailbox scan does not replace an import of
older contacts and suppressions from Instantly.

SMTP uses the existing exact-message approval and immutable attempt ledger,
including stable RFC Message-IDs and reply references. Only an accepted SMTP
receipt or a matching provider Sent message can reconcile an uncertain attempt.
SMTP failures retain only an allowlisted command, error code and numeric response
code in a versioned `deliveryTransportFailure` audit event. Raw server responses,
credentials, envelopes and message content are discarded. These diagnostics do
not change delivery status or authorize a retry; a timeout can remain ambiguous
even when its reported command is `CONN`.
No automatic retry or locally appended Sent copy is used to assert acceptance.
Connecting does not enable delivery or transfer Instantly campaigns.

Before cutover, import remaining historical contacts and suppressions, pause
competing Instantly campaigns, and complete a controlled send/reply test.
The playbook's delivery checks and each inbox's delivery switch remain explicit
release steps. Local implementation tests do not establish that the owner's
mailboxes have authenticated or successfully sent mail.

Local verification on 14 November 2026: production build, typecheck, 624-message
validation across seven locales, 214 unit tests and 30 disposable-Postgres tests
passed. Browser checks covered the masked connection form, required fields,
advanced OAuth disclosure and Clay routine guidance. No real mailbox app password
was supplied during that initial verification.

### Advanced Google OAuth connection

Create a Google OAuth client with the exact callback URL
`https://<outbound-host>/api/integrations/outbound/google/callback`, shown read-only
in Integrations. The server derives it from `APP_HOST`; the legacy
`OUTBOUND_GOOGLE_REDIRECT_URI` variable is no longer used. Enable the Gmail API and configure the
consent screen for the intended Workspace accounts. The requested scopes are
`https://www.googleapis.com/auth/gmail.send` and
`https://www.googleapis.com/auth/gmail.readonly`; offline access is required.
Account eligibility and any Google verification requirements must be resolved in
that Google project. See the [Gmail scope reference](https://developers.google.com/workspace/gmail/api/auth/scopes).

The staff-only connection endpoint is
`GET /api/integrations/outbound/google`. OAuth binds state and PKCE to the staff
session, preserves the UI locale, and returns to this app’s `/integrations` page.
The callback checks that the connected mailbox is permitted by the
playbook and that both scopes were granted. Access and refresh tokens use the
existing encrypted database type. Configure the same `CREDENTIAL_ENCRYPTION_KEY`
used for existing inbox grants before
connecting an inbox; follow the [credential encryption runbook](./credential-encryption.md)
for key storage and rotation. The new deployment must be able to decrypt the shared inbox records.

## Delivery and replies

Only the standalone Outbound deployment should schedule its worker.
Three endpoints require `Authorization: Bearer <CRON_SECRET>` and each runs every
minute: `/api/cron/outbound` reconciles mail and dispatches eligible emails;
`/api/cron/outbound-prepare` renews factual receipts and prepares active campaign
prospects; `/api/cron/outbound-linkedin` synchronizes chats and dispatches eligible
LinkedIn actions. Separate bounded budgets prevent research from consuming the
LinkedIn send window. Each route has a 300-second maximum, with a 240-second
work budget. Email and LinkedIn remain subject to their saved enablement and
final delivery checks. The
integration screen's queue preview calls the worker with `dryRun: true`: it uses
saved data, does not refresh provider data, and does not send email. That preview
does not establish that a live send will pass every final gate.

A live run reconciles inboxes first, performs at most twenty product checks and
attempts at most one message per inbox per tick, with at most ten inboxes. Delivery
requires a current approval, enabled and matching sender, completed history
reconciliation within ten minutes, current eligibility and verification, clear
suppression/history checks, remaining inbox capacity, and the recipient's
Monday–Thursday 08:00–14:00 window. MX records are refreshed before dispatch.
Legacy raw-HTML findings also recheck their product page; structured product and
shopping findings retain their dated captures and revalidate their receipt bindings.
Changed or unavailable required evidence holds the sequence. `allowStaleEvidence`
only relaxes observation age: exact approved words, original timestamps, receipt
bindings and schedules stay intact. Missing, future-dated, contradictory or
tampered evidence, replies and opt-outs still fail. Turning it off restores age
checks at final dispatch, including already claimed sends. Automatic sequences
renew stale email and product receipts when current policy requires renewal;
MX age alone does not create a paid renewal. Failed, changed or uncertain
renewal receipts hold the sequence.
First-email approval expires
after seven days. Follow-ups need the existing conversation and at least
24 hours since the previous message. SMTP uses RFC reply references; OAuth
requires a genuine Gmail thread identifier. Switching an active SMTP sequence
to OAuth holds that follow-up until its Gmail conversation is resolved.

Postgres serializes policy changes, review decisions and delivery claims with a
workspace advisory lock. Message revisions and send attempts are durable; each
prospect/step has a unique attempt and Message-ID. A timeout or uncertain provider
result is not permission to retry the same email automatically. Resolve the
recorded outcome before continuing. The latest first-email cohort also has a
hard-bounce stop in the delivery gate.

Initial mailbox synchronization reconciles the last 180 days, then catches up
with new mail through IMAP UIDs or Gmail API history, according to the connection.
Each page is checkpointed; expired history or a changed IMAP UIDVALIDITY restarts
reconciliation and keeps delivery held. Events are deduplicated. Replies stop
the cold sequence; opt-outs prevent further contact even if the sender has not
yet been imported as a prospect, and bounces suppress the affected address.
Older or separate sending history still needs the import step. Disconnecting
removes the local grant and disables that inbox; it does not delete the prospect
or contact history.

## LinkedIn

`/linkedin` is a searchable PostgreSQL-backed queue, with status filters and
50 rows per page. The query selects summaries only. Each person opens at
`/linkedin/[id]`; Back preserves the search and page, and warns before discarding
unsaved changes. Missing template inputs leave the generated draft blank with
an explanation. Profile links, editable drafts, next-action dates and notes
remain available. Recording invitations is capped at 15 per day and 50 per week.
Recording a LinkedIn reply stops the email sequence as well.

The owner selected Unipile on 14 November 2026. Create a **V2** application at
[Unipile's V2 dashboard](https://dashboardv2.unipile.com), then paste its Global
or Scoped Account API key into Integrations → LinkedIn and choose **Save API key**.
Service keys also work. V1 and V2
accounts are separate. The staff-only action checks access through a read-only
Unipile request before replacing the encrypted database value; a rejected key
leaves the previous value intact. The form clears after a successful save, and
the saved key is never included in page data or returned to the client. Provision
the shared `CREDENTIAL_ENCRYPTION_KEY` before saving. The optional
`OUTBOUND_UNIPILE_API_KEY` environment value is a fallback when no key is saved.
App-saved key changes apply immediately; environment changes require a local
restart or deployment update.
The key is stored in `outbound_provider_credential` with AES-256-GCM encryption;
configuration reads select metadata only. Apply
`20261114203000_outbound_provider_credential` through `apps/web` before using the
form and `20261114213000_outbound_provider_configuration` for the other provider
settings. The verification request is `GET /v2/accounts/?limit=1&provider=linkedin`;
the response contents are discarded. It accepts account keys supported by hosted
authentication, without requiring API-key administration permissions. Database and provider failures
return fixed error codes without the submitted key or underlying query details.
The API origin is fixed at `https://api.unipile.com`; no custom endpoint is needed.
Use Integrations → LinkedIn → Connect account to open
[Unipile hosted authentication](https://developer.unipile.com/v2.0/docs/authenticate-with-hosted-auth).
The redirect is `${APP_HOST}/api/integrations/outbound/linkedin/callback`.
The callback binds a ten-minute nonce to the signed-in staff member, verifies the
returned account with Unipile, and stores account metadata in
`outbound_linkedin_account`. Refresh and reconnect operate only on saved accounts.
Apply `20261114193000_unipile` through the existing `apps/web` migration owner.

The server transport adapter covers profile lookup, invitations, first DMs and
messages in an existing chat using verified V2 contracts. Requests never retry
automatically after an uncertain POST. Provider-side limits are surfaced rather
than inferred as successful sends. No account was connected or live message sent
during implementation; adapter tests use mocked documented responses.

**Current execution boundary:** the app connects accounts and prepares drafts;
it does not yet dispatch LinkedIn sequences or synchronize incoming messages.
The transport methods are not exposed as staff send actions or wired into cron.
Activating automated delivery requires an immutable LinkedIn approval/attempt
ledger and reply/webhook reconciliation, with the existing cross-channel contact
and suppression checks applied before each send. Connecting an account does not
approve a draft or enable delivery. Unipile is a third-party integration, not an
official LinkedIn messaging API grant.

The [outbound skills guide](./outbound-skills.md) records how the project adapts
the outreach conductor and external sales-writing skills to ecentic's current
policy. Skills do not grant send permission or replace concrete-message review.

## Source map and validation

- `apps/outbound/src/lib/outbound.ts`: schemas, defaults, template rendering and shared checks.
- `apps/outbound/src/server/database/outbound.ts`: companies, people, prospects, revisions, events, suppressions, inboxes, attempts and provider jobs.
- `apps/outbound/src/server/app/outbound/`: staff actions, transactional storage, imports, integrations and the delivery worker.
- `apps/outbound/src/server/utils/outbound/`: provider HTTP contracts, public-page evidence, AI drafts, Gmail transport and inbound classification.
- `apps/outbound/src/app/[locale]/(workspace)/`: streaming pages and forms.
- `apps/outbound/messages/fragments/outbound.*.json`: all seven UI locales; user-entered templates and evidence remain application data.

Run the focused outbound specs and the application's i18n checks after changes.
Provider mocks and a successful build validate local behavior; they do not prove
mailbox authorization, vendor API entitlement, deliverability or production cron
execution. Complete the controlled mailbox test and history reconciliation before
enabling real prospect delivery.


## Local validation

Run tests from `apps/outbound` without loading production credentials:

```sh
DATABASE_URL=postgres://fixture:fixture@127.0.0.1:1/never_connect OUTBOUND_TEST_DATABASE_URL= bun --no-env-file test src
bun run i18n:check
bun run typecheck
```

Database lifecycle suites run only when `OUTBOUND_TEST_DATABASE_URL` names a
local disposable database named `outbound_test`. They recreate or truncate
fixture tables. Never point them at the application database. Transport and
provider tests use mocked services; a passing test is not a live mailbox or
provider-access receipt.

Private source briefs, account history, exclusions and live verification exports
are application/operator data and are not bundled with this source checkout.
