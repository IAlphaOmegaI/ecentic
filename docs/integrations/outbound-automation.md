# Outbound campaign automation

The owner authorized automatic contact selection and email sending on 15 November
2026. Automatic mode uses the saved Playbook and active campaigns; it replaces
the earlier requirement to approve every draft manually. It does not relax
company exclusions, source requirements, verification freshness, sender limits,
mailbox history, opt-outs, reply stops or the final delivery checks.

`automationEnabled` controls preparation and automatic approval. It defaults to
false. Campaigns must also be active. `sendingEnabled` and the mailbox/history
checks separately control delivery. The automation panel shows these states
separately and never treats a running preparation job as proof that mail can send.

On 17 November 2026 the owner accepted repeat-contact risk from missing Instantly
and Explee history. The editable `allowIncompleteHistory` setting records that
decision separately from `historyConfirmed`: either satisfies the past-campaign
import gate, but a waiver never marks those records imported. It defaults to
false, is recorded with actor/time in a `historicalContactPolicyChanged` event,
and can be switched off again without changing the approved message revision.
It does not enable sending or an inbox by itself. Connected-mailbox sync, known
suppression and reply records, existing Outbound attempts, sender checks and
limits remain enforced for email and LinkedIn. No contact or attempt ledger is
deleted or reset.

## Existing drafts and Playbook edits

The preparation cron also runs a bounded automatic review pass over unsent drafts
in active campaigns. It covers operator-researched leads as well as completed
campaign preparation. Current drafts keep their text. Drafts from an older
Playbook get one new AI draft using the saved factual finding and current writing
formula, followed by the same approval checks in one transaction.

Before claiming a review, a bounded pass renews expired DNS observations for
otherwise eligible drafts whose saved mail host is Google or another known host.
It records the actual result and observation time; unknown or Microsoft results
still fail the normal mail-host checks. DNS runs outside the transaction, and
application rechecks active automation, campaign, revisions and explicit holds.
This renewal does not purchase a provider request or send an email.

Every pass records a `draftReview` integration job before provider work. A current
work-email verdict must match an actual saved Apollo request, record, recipient
and provider verification date; editable email-status labels cannot approve a
lead. A newer standalone verification may supersede the original automation
verification when its recorded result matches the current recipient.

Explicit holds, closed sequences, any earlier email/LinkedIn attempt and uncertain
provider work are excluded. Editing a held draft or its prospect details retains
the hold and its reason; only an explicit Resume action returns it to review.
Failed checks do not starve later prospects. Updated
receipt timestamps or an explicit Resume action permit another known check;
unresolved provider requests never replay after a Playbook edit or Resume. A
pause during generation retains the checkpointed draft and applies it after
resuming without purchasing another draft. Pausing or editing while a request is
running is rechecked at the atomic approval boundary.

Shopping receipts now retain a research-policy fingerprint. Writing-only edits
can reuse those original observations without changing their capture times,
source hashes or research job. Changed research instructions, changed campaign
criteria, changed identities, expired evidence and legacy receipts without that
fingerprint still need research review. Approvals always bind the current
Playbook and exact current message version. No draft-review operation sends mail;
delivery continues through the existing sending, mailbox, history and rate gates.

## Processing

Since 19 November 2026, the preparation cron replenishes active campaigns through
`automatic-company-discovery.ts` before preparation. It buys at most two provider
operations per tick within a 40-second budget, with campaign-specific low-water
targets derived from inbox capacity, a rolling daily operation limit, fair campaign
rotation and cooldowns. Apollo runs first; Clay starts only after Apollo is
exhausted. Existing attempts, uncertain domains, usable unattempted companies,
pending jobs and approved unsent prospects determine demand. An atomic reservation
guard prevents concurrent ticks from buying the same page. Provider errors do not
silently change source; missing keys and unresolved outcomes hold acquisition.

When shopping evidence is required, ScrapeLLM and Firecrawl must both be connected
before any new company enrichment or contact work is admitted. The campaign panel
shows missing connections or provider cooldowns separately from delivery readiness.
Known account/quota errors pause new research for 24 hours, rate limits for 15
minutes; saving a replacement key permits another attempt. Existing source-backed
drafts may continue through review and delivery.

The worker calls `Automation.run` without a browser session. The staff action
`automation-actions.run({campaignId?})` runs at most three stages. The internal
service accepts `maxSteps` from 1 to 20 and a deadline; its default is three stages
and three minutes. Each stage reserves a three-minute lease under the shared
workspace lock before external work. Only one live automation lease runs at once.
An internal `jobId` scope can advance one already reserved job without admitting
other companies; staff actions do not expose that scope.

One company per active campaign is admitted at a time, with a bounded campaign
scan. A pending or uncertain company-domain reservation prevents another campaign
from starting the same company's work. The durable request key includes campaign,
company, campaign revision and Playbook revision. Known held outcomes do not
repeat under the same versions; the next eligible company proceeds in a later
tick. An uncertain operation is never replayed automatically, including after a
policy edit. Expired worker leases become uncertain.

| Stage | Result |
| --- | --- |
| Company details | One Apollo organization enrichment records actual country, size and other available source facts. Search filter values are not facts. |
| Qualification | Bounded permitted public pages establish a named own-brand product and priced offer; one Azure assessment evaluates saved criteria and a specific buying detail using quoted evidence. |
| Live shopping research | A concrete query is saved before one ScrapeLLM submission. The same job is polled; Firecrawl captures rendered merchant and cited competitor pages. An Azure assessment can select only an exact-quoted material contrast. No angle holds before contact spending. |
| Contact search | One page of up to 25 Apollo people is retained before deterministic selection. |
| Contact enrichment | Each provisional match is reserved before enrichment. Actual employer domain, identity, role and sourced address must match before promotion. A completed missing-email or unsuitable-role result advances to the next eligible saved search record, up to three distinct enrichments per company run. |
| Promotion | The company is atomically attached to one prospect, retaining the automation evidence job ID. |
| Email verification | One verification request is retained, then the same request is polled at bounded intervals. Exactly one returned email/record pair must match, with a current provider verification date. |
| Mail host | A fresh MX check holds unknown and Microsoft-hosted recipients according to the Playbook. |
| Apply shopping research | The completed receipt is bound to the verified contact under the same active lease, campaign and Playbook. An explicit hold or changed prospect prevents application. |
| Draft | One bounded Azure draft call is saved before the separate draft-write stage. Protected copy and lint rules still apply. |
| Approval | `Store.approveAutomatically` validates the current campaign, Playbook, prospect revision and durable source facts, then the existing worker can deliver within its normal gates. |

Provider outputs checkpoint before subsequent prospect mutations. Safe provider
receipts, qualification sources, selected identity, verification request/record
IDs and the current prospect revision live in `outbound_integration_job` JSON.
The provider discriminator `automation` uses its existing text column; no SQL
migration is required. Keys remain in encrypted provider storage.

`contactAttempts` records each selected person ID before its paid request, then
its actual enrichment receipt and outcome. Previously attempted people are
excluded from later selection, and the enriched title is checked again so an
assistant cannot inherit an eligible preliminary title. Fallback reuses the
stored search and company research; it does not purchase another search page.
Selection, campaign validation and final Playbook gates share the same role
comparison rules, including VP/vice-president, CMO and e-commerce spellings.
Comparisons never rewrite the provider's actual title or the saved criteria;
explicit exclusions and junior/assistant exclusions continue to apply.
An uncertain enrichment stops the company without trying another person. Only
one successful contact is promoted. The internal `resumeContactFallback` helper
can upgrade a known completed contact miss from an older worker version: it
counts the previous attempt, verifies unchanged campaign/policy versions, and
requeues selection without repeating that provider call. It rejects uncertain,
already promoted or competing company work.

Broad industry labels such as "beauty and personal care" cannot supply the
shopper noun in the email. Qualification and the pre-draft step replace those
labels with the exact already sourced product name. This deterministic change
requires the original product URL, source excerpt and observation time. An
existing unsent, unapproved prospect can be corrected through
`normalizeProductCategoryForJob`; the normal Store revision/revocation path,
job revision and before/after source audit update in one transaction. A changed
prospect, missing receipt or prior delivery attempt prevents the correction.

Apollo verification dates come from the actual provider response. A correlated
successful `email_verifier` request's completion time can supply the date when
the record omits its own date; the request/action/time provenance is retained.
`resumeVerificationDateCheck` can requeue a known verified-but-undated held
result for another read of that same request after a parser correction. It
validates the exact prospect revision, email, request and record ID and rejects
uncertain, changed or expired work. It never submits a fresh verification request.

Every stage rechecks active mode and the original campaign and Playbook revisions.
A changed context retains the result but stops advancement. Pause takes effect
before further stages; a request already in flight can finish and retain its
receipt. Existing suppression/history checks run before provider work and atomic
promotion, and the final delivery gate rechecks them before sending.

Holds are processing outcomes, not requests for mandatory human draft review.
They distinguish missing company/contact evidence, provider setup, uncertain
requests, verification, mail-host and draft/approval problems. Qualification
details and provider payloads are available internally; the status action exposes
only safe job metadata and stable reason codes.

`getStatus({campaignId?})` returns mode, active campaign count, all scoped job
counts, the latest 50 jobs, research readiness and separate delivery readiness.
The preparation stages consume campaign companies; the bounded discovery pass
supplies more when needed. Neither configures inboxes nor changes sender limits. It does not
send LinkedIn messages itself. A separate LinkedIn worker handles that channel.

## LinkedIn delivery

`linkedinAutomationEnabled` and `linkedinAccountId` bind automation to one actual
Unipile account. The account must be running and unlocked. Its real display name
supplies a signature; email founder-story tokens are held because they do not
establish the LinkedIn account holder's identity.

The worker resolves the exact saved person profile, checks current connection
state and bounded chat history, then reserves an immutable `linkedinOutreach`
job before a provider send. A blank invitation is allowed for a known distant
connection. A single message is allowed only after a first-degree connection is
confirmed. It never uses InMail. Repeated invocations cannot repeat the same
prospect/action; lost provider outcomes remain uncertain until reconciled.

Qualified public evidence, role identity, active campaign and policy revisions,
company exclusions, known contact history and recipient send windows remain
required. Email verification is specific to email and is not used to infer a
LinkedIn connection. Actual email and LinkedIn attempts enforce a 24-hour gap
between outreach channels. Shared account caps cover cold LinkedIn messages and
manual conversation replies, and unresolved sends hold the account regardless
of their age. Only provider-accepted receipts set invited/messaged state.

Shopping-research prospects retain the original qualified company and selected
contact evidence while using their separately validated current research receipt.
They no longer require the original prospect/Playbook revision to equal the newer
receipt's revision. Legacy published-data prospects retain the original strict
revision checks. Changed identity, campaign criteria, research instructions and
expired evidence still prevent dispatch.

Reply synchronization runs independently of the sending switch. It stores actual
messages in the unified conversation timeline and records shared reply/opt-out
stops. Stopped prospects without active conversations are filtered before the
bounded scan, preventing old rows from starving current conversations. See
[conversation storage and replies](outbound-conversations.md) for the thread,
identity and reply-send contracts.

## Verification

The isolated PostgreSQL suite covers disabled/inactive mode, concurrent claims,
cross-campaign domain reservation, uncertain outcomes, expired leases, criteria
and policy changes while a provider is running, held-company progression and
status pagination. Its complete-stage fixture runs real promotion, verification
application, draft persistence and automatic approval against mocked providers,
and asserts that the coordinator creates no send attempts itself.
