# Outbound setup questionnaire

Use this questionnaire with the workspace owner or a research assistant that has
approved company context. Answers are configuration proposals, not evidence of
connected accounts, provider access, completed research or permission to send.
Do not include API keys, passwords, 2FA secrets, private customer conversations or
raw contact-history exports. Store private answers and exclusions in the
workspace, not in this public repository.

The runtime contracts are in [Outbound](outbound.md), [campaign discovery](outbound-campaigns.md),
[shopping research](outbound-shopping-research.md) and [automatic mode](outbound-automation.md).
The Playbook remains the source of truth for the current workspace's identity,
voice, criteria, cadence, limits and release confirmations.

## 1. Sender identity and ownership

What truthful display name, introduction and signature should each authorized
mailbox use? Which mailboxes belong to one sender pool, and who answers replies?
The app uses one configured voice for that pool. Adding an address does not
connect it or authorize sending. Record actual addresses privately in Playbook
and Integrations.

## 2. Offer and permitted claims

What specific next step should the first email offer? Supply one primary offer
and one closing question. List any permitted customer, partner, background or
performance claims with exact wording, source/date, anonymity requirements and
which sender may make them. Visits must not become sales; pilots must not become
customers. Missing evidence stays unknown.

## 3. Campaign company criteria

For each independent campaign, rank categories, countries, size ranges,
platforms, technology signals and buyer roles. Distinguish strong matches,
review cases and exclusions. Explain missing revenue or headcount handling.
Keep actual customer, investor, partner, prior-contact and opt-out lists private;
import them through the workspace's supported history and suppression paths.

## 4. Provider responsibilities

Apollo is the primary company/contact source; Clay should fill a specific gap.
Choose the first useful Clay job and rank later additions: company
qualification, contact fallback, current-role checks, team size or personal
research. Define inputs, outputs, success conditions and stopping rules. Assign
each step to Apollo, Clay, Outbound, the drafting model or an operator. Avoid
paying a second provider to duplicate already-established evidence.

## 5. Callable Clay routine

Verify the selected workspace's current routine capability. Identify the actual
object and input schema only after inspecting it; otherwise mark the routine as
not created. Keep workspace/account identifiers outside source configuration.
The adapter sends each prospect UUID as `id` and known string fields under
`inputs`, including `name`, `domain`, `linkedin_url` and `email`. Preserve IDs
across results. Do not guess missing contact details to satisfy required fields.
The [role/team configuration](../../apps/outbound/config/clay-role-team-check/README.md)
provides a reusable draft, not a live connection.

## 6. Output and handoff

Provide a field dictionary with type, nullability, meaning, source, actual
observation date and destination field. Separate factual observations from
suggested marketing copy. Define pass, hold and exclude outcomes with reason
codes, conflict handling and replay behavior. A routine's run time is not an
email-verification date. Supply synthetic success, ambiguity and failure
examples; label them as examples rather than provider receipts.

## 7. Contact and email verification

Specify the provider order and exact fallback conditions. Which verdicts
establish a usable work address, and how long do they remain valid? Preserve
verification receipts and current-role sources. Guessed, catch-all, unknown or
stale addresses remain held. Define what happens when no supported contact can
be found; missing a target should produce a shortfall, not reduced standards.

## 8. Research and personalization

Which product/category questions should be researched? Record actual query,
surface, market, locale, sign-in state and time. Compare like-for-like products
and promotion terms. Rank useful findings and explain what would invalidate
each. Check UCP and checkout separately; profile presence alone proves neither
checkout eligibility nor a completed checkout.

Write the selected finding as a natural first-person account of the research:
what the sender was looking at, what they saw, and the concrete contrast. A
short interpretation must remain scoped to that observation. Do not invent a
purchase, gift occasion, product use, failed checkout or lost sale to make an
email feel personal. See the [writing direction](outbound-shopping-research.md#writing-direction).

## 9. Drafting formula

Supply the subject/body shape, founder introduction, closing question, word
limit, voice and banned phrases. Distinguish authentic sent examples from new
sample copy, and keep real recipients out of shared examples. Supported
variables and protected lines are documented in [Outbound](outbound.md).
Templates, voice and Humanizer notes are editable in Playbook; changes must be
saved and affected unsent drafts regenerated.

## 10. Sequence, replies and meetings

Define follow-up timing and wording, email/LinkedIn coordination, cross-channel
stops, reply ownership and the meeting handoff. Distinguish interested, referral,
later, opt-out, out-of-office and bounce responses. State which actions are
manual and which are allowed by the saved automatic policy. Account connection
alone does not activate a campaign. Store the booking link in Playbook.

## 11. Spend and readiness

Set useful limits per company, usable draft and week, plus the maximum fallback
depth. Separate observed charges from estimates. Define behavior after quota
errors, rate limits, failed items and uncertain paid starts; retain provider jobs
and do not blindly retry uncertain actions. Verify mailbox connection, history
reconciliation, warmup state, competing sender cutover and an authorized
send/reply test before enabling delivery. A provider health score is not proof
of inbox placement.

## 12. Learning and implementation order

Define a qualified positive reply and meeting, cohort, observation window and
denominator. Propose one experiment with a single changing variable and a
keeping/rejection rule. Do not infer causal lift from a small unfinished cohort.
Prioritize minimum launch, next iteration and later work. Label whether each
item needs a Playbook change, implementation, provider setup or an owner decision.

## Answer format

Start with the highest-impact decisions. For each answer provide:

| Field | Content |
| --- | --- |
| Decision | Specific proposed choice |
| Basis | Confirmed context/source/date, recommendation or unknown |
| Deliverable | Exact setting, copy, field map, rule or schema |
| Implementation | Playbook, code, provider setup or operator process |
| Unknowns | Facts still needed to make the decision |

Keep answers and live account/history details in the private workspace. Never
report a connection, routine, test or delivery as successful without a receipt.
