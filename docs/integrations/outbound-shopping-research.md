# Outbound shopping research

The Playbook's `researchInstructions` describes the per-lead research brief.
`requireShoppingEvidence` defaults to `false` for existing saved configurations.
When enabled, drafting, approval and delivery require a durable research receipt.
An ingredient detail or a proposed check cannot satisfy that requirement.
Automatic company qualification can still establish business fit, but holds the
lead before contact enrichment until actual shopping research is recorded.

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
competitor, the output schema permits only a contrast with the merchant's own
product. The model cannot paraphrase a quote or invent observation metadata.

Price claims additionally need exact local offer blocks from the answer and
merchant page. The server checks matching variant, explicit currency and
purchase terms, rejects conflicting known markets, and distinguishes current
prices from original prices. Different sizes are not a discrepancy. A matching
variant and current price elsewhere in the complete answer blocks an omission
claim. Ambiguous or conditional offers stay held. This comparison proof is a
wire-only assessment input; the durable receipt format is unchanged.

Selected email copy must fit a budget derived from the template's fixed wording,
up to 45 words for the observation and consequence. The assessor cannot discard
evidence qualifiers to make it fit. Recipient-facing copy uses ordinary words;
capture and receipt terminology stays in the supporting research.

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
