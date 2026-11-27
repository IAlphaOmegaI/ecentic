# Outbound shopping research

The Playbook's `researchInstructions` describes the per-lead research brief.
`requireShoppingEvidence` defaults to `false` for existing saved configurations.
When enabled, drafting, approval and delivery require a durable research receipt.
An ingredient detail or a proposed check alone cannot satisfy that requirement.
Automatic company qualification can still establish business fit, but holds the
lead before contact enrichment until actual shopping research is recorded.

## Held discovery review, 27 November revision

The owner’s revised review is staged in a separate set of 21 integration jobs.
It preserves the original jobs, prospect rows, revoked revisions, sender assignments,
policy and holds. No draft, approval, send or release is applied. Both reviews share
the original 42-search batch, with at most two purchases per contact. Fourteen
purchases already belong to the first review. Repeated operator invocations cannot
create a new budget or repeat a reserved purchase.

New shopper queries use `shopper-query-v2`: 2–8 words in natural order, a category
plus one attribute or use, with ordinary product-title words allowed. Brand, model
and product-line names remain excluded. A source-bound semantic review must confirm
that the exact product is an obvious candidate before shopping is purchased. Each
old paid query receives the same review without changing its original bytes. An
invalid old query can receive one corrected purchase, even if its old answer was
favourable. A valid saved answer is reused. Uncertain submissions or a valid query
with a failed provider answer do not authorize a replacement.

Grouped cards do not establish rank. Only an explicitly numbered or ranked answer
supports a position claim. A valid initial query showing the merchant in unranked
cards can receive one broader query. Two verified presences produce `no-gap`; the
original and broader captures remain in the audit. An invalid original query remains
audit-only and cannot support a factual claim in its corrected receipt.

Current copy uses `discovery-email-v2` with four writer fields: subject, opening,
result and relevance. The opening permits the owner-approved invented shopping
reason, but contains the exact query, at most 22 words and no asserted purchase,
use, test, product fact, price or recipient fact. The result names two or three
brands through an exact answer-bound brand projection; sellers, full listing titles
and interface suffixes are excluded. Relevance never repeats the query. The gift
line is reserved for actual gift products; other absence findings default to
“That’s the kind of search a new customer starts with.”

Day 3 is exactly `Bumping this!`; day 7 is `{first}?`, or `Worth a chat?` without a
first name. Transport keeps both in the first email’s thread and quotes its body,
including the opt-out and postal address. New writer schemas and checks have no
`followupFact`. Historical v1 snapshots remain readable with their original
canonical hashes, but cannot be promoted into a current approval.

An unchanged v2 bump can be delivered after the original evidence ages past seven
days. The delivery gate first binds it to the accepted first attempt, unrevoked
original approval, immutable three-message revision and trusted completed writing
job. It then replays that exact receipt and raw proof at the original approval
time; it never buys new research or copy for a bump. Changed receipt hashes, text,
sender policy or prospect identity fail. Current contact checks, suppression,
cancellation, thread and delivery controls still apply. First emails, new approvals
and historical factual follow-ups retain current-time freshness checks.

The second review pack includes every passing sequence, all held reasons, both
captures where another search was authorized, and the shared purchase count. Run
`held-discovery-review.ts --review-round 2 --instructions <reviewed-prompt>` for a
read-only preflight; adding `--execute` stages and advances only these unpublished
review jobs. The reviewed sections 7 and 16 are bound by a canonical SHA-256 hash.
The older protected-fragment workflow described below remains historical context.

Two explicit reconciliation operations preserve failed review evidence. An exact
second writer candidate rejected only by deterministic checks can be replayed under
the corrected checks and staged for its first judgment, without another writer or
search call. Its original two candidates and errors remain intact; an existing or
uncertain judgment cannot be retried. A completed brand-selection failure with no
writer or judgment can receive an operator-selected set of two or three exact
brand proofs from the same saved answer. This preserves the original failed output,
query, captures and receipt hash, then stages the normal first draft. Both operations
are instruction-bound, dry-run by default and confined to the held review jobs.

The copy judge receives each projected brand beside its exact source quotation.
Leading answer excerpts are labelled non-exhaustive; other saved product cards can
establish additional brands. Contradictions still fail and completed verdicts are
never rewritten by this input clarification. Presence replay also treats an
uppercase shortened merchant name as a possible identity when the merchant's own
structured Product brand, Product name and rendered title corroborate it. This
can veto absence but cannot establish a rank or definite merchant identity.

Future application of a reviewed round-two receipt needs an explicit, separately
authorized adoption change. The existing `LeadResearch` capture-proof snapshot
stores only the current `answer` and `browser`. A receipt with a separate
`queryReview` or `captureHistory` also needs its bound current query review and
immutable `previous` evidence persisted and replayed at save, approval and delivery.
Until that additive snapshot path is implemented and verified, such review receipts
remain unapplied; dropping the previous proof or copying a passed review flag is
not a compatible adoption path. Newly generated ordinary v2 queries already carry
their semantic review inside the immutable prepared query.

## Explicit third-review query and evidence contract

The third review uses an explicit `shopper-query-v3` mode; ordinary new-query
callers still default to v2. Existing queries, their raw responses and their review
hashes are unchanged. A v3 broad search may use the grounded category alone,
including a one-word category, with no invented use or occasion. Specific queries
still use 2–8 words and a category plus one supported attribute or use. Every new
question retains the natural-language, obvious-product-fit, unbranded and rendered
product-grounding checks.

For v3 product grounding only, the grammatical verb forms `corrects` and
`correcting` share a comparison token. Thus an exact `color correcting concealer`
query can use product-body evidence that says it `color corrects`; word order,
semantic product fit, navigation exclusions and exact excerpt provenance still
apply. This does not equate `corrector` with `concealer`, add general synonyms or
change merchant matching. V1/v2 normalization, saved questions, captures and
review hashes remain unchanged.

`prepareShopperQuery` accepts an operator-supplied exact phrase and makes one
semantic review that identifies its category, attribute and exact supporting
excerpts. Its output cannot contain a replacement question. A successful result
records zero generation attempts, a v3 review and the unchanged supplied phrase;
an invalid or interrupted review does not regenerate or repair it. The durable
third-review operator must bind and authorize that phrase before using this API.

For an explicitly authorized v3 broad search, complete full-answer merchant
presence in both the current and a valid same-product previous search establishes
`no-gap` with `repeated-presence-v2` proof. An informational previous mention can
satisfy presence; it establishes neither rank nor recommendation preference.
Unknown or incomplete presence, invalid previous queries and other-product
captures cannot support this conclusion. The prior v2 grouped-card rule remains
unchanged.

Complete prior product captures stay in `captureHistory`, marked `auditOnly` and
replayed against their own original product. Failed or uncertain acknowledged
purchases without completed answers use separate `purchaseHistory` metadata:
original job, query hash, product, submission time, failure reason and raw-response
hashes. It never fabricates an answer. Both history types are replayed during
validation and never supply facts to the current answer's claims ledger. Research
and copy previews remain subject to their existing holds and adoption gate.

## Automatic live captures

The Integrations page has a **Live shopping research** section for encrypted
ScrapeLLM and Firecrawl keys. Environment fallbacks are
`OUTBOUND_SCRAPELLM_API_KEY` and `OUTBOUND_FIRECRAWL_API_KEY`. Firecrawl is verified
through its credit-usage endpoint without starting a scrape. ScrapeLLM has no
documented non-billable key-validation endpoint, so its status is honestly
**saved**, with account access checked by the first actual research job.

`live-shopping.ts` submits an asynchronous live Google AI Mode query, persists its
job ID, and polls that same job. Cached, mismatched or undated answers are held;
the original timestamp is never replaced with the poll time. Transient polling
errors retry only the known GET job within a bounded poll count. An uncertain
submission never purchases a replacement automatically. Provider responses and
their SHA256 digests are checkpointed before later stages.

Firecrawl Interact opens a fresh short-lived browser, records rendered product
text, selected options, structured offers and a screenshot, then deletes the
session. A 120-second TTL backs up cleanup. URLs are checked, robots rules are
respected, and a fixed read-only program permits only HTTPS GET/HEAD requests,
with public-address checks and no cross-origin navigation. It does not add items
to a cart, buy anything or bypass access restrictions. Missing content under
these limits is not a merchant defect. Checkout remains `notTested`.

A saved product name written as `name | color` can also be verified when the
rendered page splits those values: one matching product heading, the same first
visible line, and one matching `Color:` line in its leading product block must
agree with a top-level `ProductGroup` whose name, URL and `#product` identity
exactly match the selected product. Navigation, recommendations, other colors,
other product URLs and ambiguous groups do not qualify. The pure
`replayHeldProductCapture` helper can reconstruct only the specific saved
identity-verification hold from intact robots, UCP and browser-execution records.
It preserves the original selected name, raw bodies, hashes and capture dates;
it performs no browser or network request. A reconstructed view still needs
normal query grounding, semantic review and freshness checks before purchase.

Only direct answer citations can supply competitor URLs. The automatic assessor
must quote both the actual answer and rendered merchant page, plus a rendered
competitor source for any comparison. It can select a specific price, variant,
link or promotion contrast; unsupported or ambiguous differences hold before
contact lookup. Requested routing country does not establish result market,
interface locale or signed-in state; these remain unknown. HTTP product evidence
alone never satisfies this automatic path.

The model selects stable IDs from a bounded catalog of unchanged source excerpts;
server code supplies the exact quotations and captured scope. Unknown IDs,
duplicate selections and uninspected competitor IDs hold. Without an inspected
competitor, the output schema permits a contrast with the merchant's own product
or an explicitly enabled neutral product observation. The model cannot
paraphrase a quote or invent observation metadata.

Price claims additionally need exact local offer blocks from the answer and
merchant page. The server checks matching variant, explicit currency and
purchase terms, rejects conflicting known markets, and distinguishes current
prices from original prices. Different sizes are not a discrepancy. A matching
variant and current price elsewhere in the complete answer blocks an omission
claim. Ambiguous or conditional offers stay held. This comparison proof is a
wire-only assessment input; the durable receipt format is unchanged.

Selected email copy must fit the space remaining after the template's fixed
wording, a small identity allowance, and repeated finding/consequence slots.
There is no separate 45-word ceiling; the saved full-email limit still applies.
A completed, factually valid assessment that exceeds the remaining budget gets
at most one copy revision within the original assessment deadline. That revision
cannot change the selected quotes, products, offer comparison or conditions, and
must pass the same factual and copy checks again. Interrupted provider outcomes
are never retried. Both completed request IDs and combined usage are retained.
The assessor cannot discard evidence qualifiers to make it fit. Recipient-facing
copy uses ordinary words; capture terminology stays in the supporting research.

When `allowProductObservations` is enabled, a completed proposal rejected by a
local comparison, price or recipient-wording check can instead receive one
Azure-only neutral assessment. Its schema permits only `product-observation`,
with no price comparison or competing products, and supplies only the unchanged
shopper-answer and merchant-product excerpts. Every recipient-facing fact must
come from its named source; merchant-only details cannot be attributed to the
answer. Numeric percentages, including ingredient or clinical percentages, are
held before drafting to match the email rules.

There are at most two Azure calls in total: the initial assessment and either a
copy revision or this neutral fallback, within the original deadline. It never
repeats the shopping query or browser capture. Model-declared holds, damaged or
future-dated captures, unknown initial outcomes and failed fallback checks do
not start another attempt. The saved `neutralFallback` audit retains the initial
structured output, projected assessment, rejection reason, attempt time and
outcome; both known request IDs and usage are retained. An interrupted fallback
stays held with an uncertain audit outcome for reconciliation. A successful
fallback still passes the normal capture, drafting, approval and delivery gates.

`saveAutomaticAndApply` shares the operator receipt validator but additionally
checks the current automation lease, exact captured receipt, policy fingerprint,
active campaign and unheld prospect in one transaction. Captures are identified
as `provider-observed`, not operator observations. The same selected-contact
lineage remains required.

Provider contracts: [ScrapeLLM async submission](https://docs.scrapellm.com/api-reference/endpoint/create-async-job),
[polling](https://docs.scrapellm.com/api-reference/endpoint/get-job-status),
[Firecrawl browser execution](https://docs.firecrawl.dev/api-reference/endpoint/browser-execute).

## Operator application

`server/app/outbound/lead-research.ts` exports the server-only operation:

```ts
await LeadResearch.saveAndApply(actor, {
  requestId, // UUID retained across retries
  prospectId,
  expectedRevision,
  expectedPlaybookRevision,
  receipt,
});
// Result<{ researchId, prospectId, revision, repeated }>
```

This operation records supplied captures; it does not browse, call a model,
approve a message or send one. Use the normal Azure draft operation afterwards.
The same request UUID with identical inputs returns the recorded result without
applying it twice. Reusing it with different inputs fails.

The shared workspace transaction checks the current prospect and Playbook
revisions, the campaign criteria, and the originally selected contact identity.
Only unsent open prospects without existing email or LinkedIn attempts can have
their research replaced. Applying new evidence invalidates previous approval.

## Receipt and copy contract

The complete bounded schema is `lib/outbound-shopping-research.ts`:

- `product`: exact product name and HTTPS URL, including the inspected variant.
- `sources`: source ID, kind, URL, capture time, HTTP/browser/provider capture
  method, actual captured content and artifact reference.
- `queries`: executed text, actual surface, market, interface locale, signed-in
  state, time, coverage and referenced search captures. Unknown market remains
  `unknown`; a localized interface does not establish shopper location.
- `ucp`: the same merchant's checked URL, actual HTTP outcome and capabilities.
- `checkout`: whether an actual path was observed, blocked or not tested.
  Observed checkout requires an associated browser or provider checkout capture.
- `competitors`: named products with their own source or a captured query answer
  that actually names them. An answer mention alone does not prove superiority.
- `selected`: one observation, question/consequence, optional template subject
  fragment (`askAbout`), scope, finding kind and exact source quotations.

The selected `observation` fills `{finding}`, `consequence` fills
`{consequence}`, and `askAbout` fills `{askAbout}` in the editable body template.
Only fields used in that template need to appear in the draft. Azure returns an
editable subject and optional short opening; server code keeps every rendered
body paragraph unchanged, including source-bound text, sender, call-to-action,
opt-out and signature. An existing verified personal line leaves no room for a
second generated opening. The opening's budget is the remaining word allowance,
up to 24 words. Invalid or oversized opening edits are omitted only when the
original sequence passes all checks. An invalid protected body is returned with
its actual issues before another model call; it cannot be rescued by silently
rewriting the evidence. Subjects remain editable under word and claim checks.

UCP presence does not prove successful AI checkout. A product's public data can
be compared with its rendered page without claiming a checkout failed. A sale
applied in the cart is not automatically a false published price. Captured
queries support only the answer and conditions actually observed, not general
AI visibility, sales loss or claims that a purchase was personally made.

### Writing direction

The writing direction uses warmer first-person research openings:
what the sender was looking at or comparing, what they observed, and the specific
contrast. Write the selected finding in that voice before saving the receipt;
the drafting step then preserves its facts and wording. “I was looking at blush
sticks in Google AI Mode” requires the recorded query. A page-only finding must
describe that page check instead. First-person research context does not imply a
purchase, personal product use or a gift occasion.

The saved Playbook controls the body template, research instructions, voice and
Humanizer notes. Use ordinary words and contractions, with a short “Looks
like…” interpretation only when the observed result supports it. Keep the
founder introduction, meeting question and opt-out. A factual note should feel
personal without turning the finding into a question about the merchant's
intent. Regenerate existing unsent drafts after saving a writing change; do not
expect new voice notes to rewrite their protected finding paragraphs.

## Durable gates

The existing integration-job table stores `provider: "automation"` and
`input.operation: "leadResearch"`. The completed job contains the research-policy fingerprint, receipt,
its hash, individual source hashes, applied prospect details, original
campaign/Playbook revisions, actor and applied prospect revision. No schema
migration is required.

`assertShoppingEvidence` verifies the saved receipt, exact bound identity and
finding fields, current policy and campaign revisions, and freshness. Manual
draft writes, Azure drafting, manual approval and final delivery use these
gates. A research-instruction change or expired source requires fresh reviewed research;
changing a saved contact cannot repurpose another contact's qualification.
Existing automatic selection checks remain in force for automatically sourced
contacts even when their product research changes. Newly saved receipts may survive a
writing-only Playbook change when their research-policy fingerprint still
matches. Validation still uses the current freshness limit and exact campaign,
identity and source bindings. No capture time or historical job is rewritten.
Receipts created before the fingerprint was recorded continue to require an
explicit reviewed application after a Playbook revision change.

The operator is responsible for supplying faithful captures. Hashes protect
the saved receipt from accidental changes; they do not independently attest a
browser session. Arbitrary web text remains source data, never instructions.

## Verification

`outbound-shopping-research.test.ts` covers mixed browser/HTTP evidence,
merchant and private-domain binding, actual checkout and competitor captures,
exact quotes, observed locale/market scope, idempotent application, stale
policy/receipt rejection, source-bound drafting, approval/delivery freshness,
and contact-selection preservation. Persistence fixtures run only against a
local database named `outbound_test`.

The held third-review operator is an isolated `heldDiscoveryRound3` workflow.
It binds the exact authorized instruction digest and four selected replacement
products to immutable second-review parents. Its separate control record permits
only eleven additional one-time reservations against the existing budget,
starting at 27 and stopping at 38 of 42. It has no approval, application or send
stage. The prospect rows, sender assignments and both earlier review rounds stay
unchanged. Failed and interrupted purchases remain in the audit history.

The three authorized copy rechecks judge the original saved text first. A failed
recheck stops. An unchanged passing message may reuse that fresh verdict only
with matching text, identity, receipt and context; mechanical wording changes
require a verdict for the changed text. The final preview records whether a
judgment was reused or a new final quality evaluation was requested; this is
not a model-usage counter. The operator's optional
`--drain --steps 400` mode is a finite foreground run; it stops between stages
when the private `round3-stop-between-runs` file exists. It does not schedule an
automation or retry an uncertain provider call.

The supplemental `heldDiscoveryRound3FixedResult` operation is restricted to five
saved copy failures under that same instruction digest. Diamond Dotz and Terrapin
Ridge Farms may replace only the final second candidate's result with the user's
literal no-brand sentence. Peepers may keep all three messages unchanged and
receive one judgment under the explicit non-exhaustive two-or-three-brand rule.
D'IYANU may receive its first judgment of the already-saved prefix edit after the
exact pre-compose timeout. Danessa may only reuse its original passing recheck
locally after the exact pre-generation timeout, with identical original text,
sender, receipt and context. No other uncertain job qualifies. These paths never
call a writer or shopping provider and never repeat an original copy recheck.

`scripts/outbound/held-third-fixed-result.ts` requires `TZ=UTC` and defaults to
read-only inspection. Explicit execution binds the original row's SQL SHA-256,
output, context, receipt and selected parts before creating a separate job. The
main cohort must be terminal. Current held status, policy, raw evidence and
duplicate-story checks replay before reservation and after judgment. Each new
judgment has one durable reservation; a late or unbound response is retained as
unapplied, and an interrupted reservation cannot be retried. The original failed
rows, candidates, verdicts and budget remain unchanged. The exporter independently
replays these bindings and presents the supplemental outcome beside its source
failure. `outbound-held-third-fixed-result.test.ts` covers all five modes, source
and hold changes, expired and superseded leases, and interrupted judgments.

The one-time `heldDiscoveryRound3QueryPreparationRepair` audit is limited to the
four exact unspent LA Girl, Spyderco, Só Dança and Good American children. The
operator supplies all four original SQL row/output hashes together after the
entire main cohort is terminal. One transaction archives the exact canonical
original rows and outputs, then requeues those same four children for preparation;
a failed request or write rolls back the whole batch. The other seventeen children,
all prospects and the shared reservation budget remain unchanged. Good American's
captured view may only be reconstructed from its original held raw bytes using
the same-page ProductGroup/color proof. Original captures and their dates remain
in the immutable archive.

`scripts/outbound/held-third-query-repair.ts --requests <four-requests.json>
--instructions <authorized-instruction.txt>` defaults to read-only inspection and
requires `TZ=UTC`; `--execute` stages the atomic repair. Each child receives its
explicit authorized phrase through the audited state reference while its original
input remains unchanged. Resuming the ordinary main coordinator requires a fresh
semantic review of that exact phrase. The repair itself calls no model or shopping
provider, records no semantic pass, and reserves no search. Ended or uncertain
semantic reviews cannot be reopened by repeating the repair command. Normal query
reservation limits and provider pacing still apply. The readiness guard and
exporter replay the archive, reference, exact product capture and original history
through later query and polling stages. `outbound-held-third-query-repair.test.ts`
covers four-row rollback, idempotence, tamper rejection, the normal preparation
path with a test model, one purchase per child and zero purchases after failed reviews.
