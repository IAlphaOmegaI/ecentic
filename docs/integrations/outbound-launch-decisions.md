# Outbound launch configuration

The live Playbook and campaign records hold workspace-specific decisions. This
public source document describes their implementation boundary; it contains no
private source brief, sender list, customer history or exclusion export.

## Configuration

Use [the setup questionnaire](outbound-claude-questions.md) to prepare criteria,
sender identity, supported claims, research instructions, voice, sequence and
limits. Save those settings in the app. Keep authenticated provider keys and
mailbox credentials in Integrations, where they are encrypted before storage.
The repository does not ship an operator script that overwrites a live
workspace with a historic launch brief.

## Research and drafting

Campaigns support separate company criteria and discovery progress. Apollo is
the primary source and Clay is an optional fallback. Source results alone do
not authorize contact: current-role evidence, verified work-email receipts,
company exclusions and prior-contact history remain relevant checks.

The [shopping-research contract](outbound-shopping-research.md) records observed
queries, product pages, variants, market uncertainty and checkout scope. A
source-bound finding must be supported before drafting. The saved writing
formula uses a warm first-person research opening, one specific contrast, the
sender introduction and a short meeting question. A policy change invalidates
affected approvals; existing draft text must be regenerated to adopt it.

## Delivery readiness

Connect each authorized mailbox, reconcile its history, import any older or
separate contact/suppression records, and complete the controlled mailbox test.
Pause competing senders before cutover. Confirmations record the operator's
completed work; they do not perform history import or prove deliverability.

Manual review remains available. Automatic mode uses exact-version checks and
the [durable pipeline](outbound-automation.md), bounded by the saved campaign
state and provider/mailbox limits. Both channels stop cold follow-ups on a reply
or opt-out. Unknown transport outcomes are held for reconciliation. Connecting
a provider or saving a Playbook never implicitly enables delivery.

## Verification

Use an isolated local test database for lifecycle tests and mocked transports
for provider behavior. Test production credentials only through an explicitly
chosen setup action. Build/test success does not establish vendor entitlement,
actual mailbox access, history completeness or inbox placement.
