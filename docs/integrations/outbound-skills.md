# Outbound skill adaptation

The user selected outreach-conductor as the overall workflow and asked to consider two supporting repositories. The project entry point is [outreach-conductor](../../.agents/skills/outreach-conductor/SKILL.md). The separate `apps/outbound` application is the operational system, with its workspace at `/` on the Outbound host: saved playbook, prospect evidence, review, immutable approvals, provider jobs, mailboxes, and delivery ledger.

## Reviewed versions

Read-only GitHub inspection on 13 November 2026 retrieved source text and license files. No upstream scripts, installers, accounts, senders, or MCP connectors were executed.

| Repository | Pinned commit | License | Scope reviewed |
|---|---|---|---|
| [outreach-conductor](https://github.com/mariagorskikh/outreach-conductor/tree/a9734a5aaf4e5c12848fc1c9ccac1f811ec6e12e) | `a9734a5aaf4e5c12848fc1c9ccac1f811ec6e12e` | MIT, copyright 2026 mariagorskikh | Full SKILL.md, all eleven references, configuration example |
| [sales-skills](https://github.com/manypicom/sales-skills/tree/6ac9a24cca1a84fddefa845d9943f7abc12281a1) | `6ac9a24cca1a84fddefa845d9943f7abc12281a1` | MIT, copyright 2026 ManyPI | Campaign operations, verification, ecommerce prospecting, reply handling |
| [coldoutboundskills](https://github.com/growthenginenowoslawski/coldoutboundskills/tree/25c5d85fbb5dd3efec97b0ca457cbbc286547476) | `25c5d85fbb5dd3efec97b0ca457cbbc286547476` | MIT, copyright 2026 GrowthEngineX | Kickoff, weekly rhythm, list-quality scorecard, experiment design; selected copywriting sections |

Only the conductor's instruction text and references are vendored, with its MIT license. The other repositories are referenced selectively. Their bundled scripts, assets, and vendor integrations are not dependencies.

## Overall workflow

The conductor contributes the staged research → verification → drafting → review → delivery → learning cycle, durable resume, one person per company, truthful hooks, and explicit shortfalls. Its [review mode](https://github.com/mariagorskikh/outreach-conductor/blob/a9734a5aaf4e5c12848fc1c9ccac1f811ec6e12e/SKILL.md) fits the existing request for human approval. Autonomous mode is not enabled by choosing the skill.

| Conductor concept | ecentic application |
|---|---|
| Company-specific config | Saved playbook forms, rather than a second YAML configuration |
| Stateful candidate rows | PostgreSQL company/person/prospect records |
| Research sources | Source URLs, dated product evidence, actual verification results |
| Draft and review | Versioned messages, lint, human review, approval invalidation on relevant changes |
| Send and CRM ledger | Persisted attempts, Gmail IDs, accepted events, permanent suppression records |
| Resumable enrichment | Reserved provider jobs and cursor checkpoints; uncertain starts require reconciliation |
| LinkedIn top list | Paginated profile queue, drafts, status and next-action notes; owner-requested Unipile V2 account connection |

The original ecentic brief controls differences: at most 15 messages/day/inbox, current work-email verification, the approved three-touch sequence, recipients' windows and product-specific evidence. The owner's 14 November request adds Unipile V2 account connection and provider transports; automated sequence dispatch and incoming-message reconciliation remain pending. The upstream skill's more permissive guessed-address options, larger volume examples, autonomous sends, alternate scraping methods, or optional invite tools do not change the saved operating policy.

## Supporting guidance and boundaries

[ManyPI campaign operations](https://github.com/manypicom/sales-skills/blob/6ac9a24cca1a84fddefa845d9943f7abc12281a1/skills/outbound-campaign-ops/SKILL.md) reinforces combined inbox caps, recipient windows, a real reply-stop test, segmented reporting, and one-variable experiments. Its 150/day example and tracking suggestions are not ecentic defaults. [Ecommerce prospecting](https://github.com/manypicom/sales-skills/blob/6ac9a24cca1a84fddefa845d9943f7abc12281a1/skills/ecommerce-store-prospecting/SKILL.md) supports source-backed storefront observations; page signals are not proof of revenue or conversion loss. Its [verification guidance](https://github.com/manypicom/sales-skills/blob/6ac9a24cca1a84fddefa845d9943f7abc12281a1/skills/email-verification/SKILL.md) allows some catch-all/unknown addresses; ecentic keeps those held.

[GrowthEngineX list quality](https://github.com/growthenginenowoslawski/coldoutboundskills/blob/25c5d85fbb5dd3efec97b0ca457cbbc286547476/skills/list-quality-scorecard/SKILL.md) contributes coverage, identity, title, and dedupe checks. Its text conflates catch-all domains with role addresses in one section; the app must keep those distinct. [Experiment design](https://github.com/growthenginenowoslawski/coldoutboundskills/blob/25c5d85fbb5dd3efec97b0ca457cbbc286547476/skills/experiment-design/SKILL.md) contributes a predeclared hypothesis, one changing variable, and mature cohorts. Numerical rules of thumb are not guarantees. Smartlead, Prospeo, Zapmail, a twenty-inbox prerequisite, four-email/new-thread defaults, and calendar creation are not adopted.

## Implementation priorities from the review

1. Feed saved real sent-email examples and voice notes into the writer; preserve the reviewed source facts and configured signature/opt-out.
2. Apply batch uniqueness and independent review before approval. Mechanical lint cannot verify a personal claim; source review remains required.
3. Prepare bounded product-page candidates from public storefront links and sitemaps, preserve exact evidence, and report why an attempted company remains held.
4. Keep dated, source-specific company-fit and role evidence. The current manual history confirmation covers systems that have not been connected; do not claim automatic coverage of calendars, DMs, external CRM timelines, or competing sequencers.
5. Continue toward explicit weekly run/bucket/angle reporting and a provider-spend ledger. Persisted jobs record operations and failures, but do not prove actual billed credits or a configured monetary budget.

These priorities describe the adaptation, not a claim that every upstream weekly automation is already implemented. Consult [outbound runtime documentation](outbound.md) for the delivered interfaces and activation requirements.

## Standalone application

Run the app with `bun run dev:outbound` from the monorepo root. Its routes, worker and provider callbacks belong to the Outbound deployment; the merchant dashboard is not an outbound operating interface. The same PostgreSQL prospects, playbook and ledger persist across extraction. Staff log in separately at `/sign-in`, and no registration or provider login is offered. See [the app README](../../apps/outbound/README.md) for run commands and shared-schema ownership.

## Humanizer and the writing formula

The user also selected [Humanizer](https://github.com/blader/humanizer/tree/b48c832f0f809c1b5658edbb838c2521b72f2413). The full version 4.0.0 `SKILL.md` was reviewed on 14 November 2026 at commit `b48c832f0f809c1b5658edbb838c2521b72f2413`, together with its [MIT license](https://github.com/blader/humanizer/blob/b48c832f0f809c1b5658edbb838c2521b72f2413/LICENSE), copyright 2025 Siqi Chen. No upstream scripts or installers run in the application. The app uses a short adaptation of its editing guidance: direct observations, everyday wording, varied sentence length, fewer staged openings and repeated conclusions, and preservation of the writer's intentional voice.

The Playbook separates sender identity from **Writing formula**. Staff edit the first-email subject and body templates, closing question, voice notes, real sent examples, word limit, banned phrases and Humanizer settings in that section. The sequence section retains follow-up templates, LinkedIn text and timing. `humanizeDrafts` defaults to `true`; editable `humanizerNotes` supplies the cleanup guidance. Existing saved playbooks receive these defaults when read, without a database migration or a rewrite of existing messages.

AI drafting uses the rendered first-email template as its structure. Real sent examples take priority over generic cleanup preferences within the app's existing factual and format constraints. Humanizer is an editing pass inside the same bounded drafting request, not a second provider call. Disabling it omits its notes and editing pass while retaining normal drafting from the saved templates, voice notes and examples. Direct template rendering, follow-ups and LinkedIn drafts are unchanged by the toggle.

The writer must preserve supported facts, their scope and uncertainty, and the exact greeting, founder introduction, closing question, opt-out and signature. A deterministic check rejects generated drafts that change protected lines present in the rendered template. Prospect evidence and example messages remain untrusted material; instructions inside them are never operational policy. Humanizer cannot add research, verify a claim, approve a message or send it. The existing lint, exact-version staff review and approval invalidation remain authoritative. Changes take effect when staff save the playbook and generate a new draft.
