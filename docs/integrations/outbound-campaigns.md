# Outbound campaigns and company discovery

Campaigns live at `/campaigns` in the standalone `apps/outbound` staff app. Each
campaign has a name, status, editable company criteria, reviewed Claude answers,
its own company queue, and an independent discovery cursor. Company discovery
precedes selecting a person; a source company is not represented by a fabricated
contact or work email.

## Staff workflow

1. Create a named audience. Defaults come from the current Playbook: allowed
   countries, target/excluded roles and domain exclusions. Size and revenue bounds
   start empty, rather than introducing an unapproved minimum.
2. Generate a Claude criteria preview in the app using the saved Playbook,
   current criteria and optional staff context. Review and edit the preview,
   then explicitly save. The manual path remains: copy the campaign questionnaire,
   paste Claude's complete JSON answer and review it through the same fields.
   Direct generation needs the [Claude Console connection](./outbound-claude-api.md);
   it never saves targeting or starts discovery automatically.
3. Find companies in bounded batches. A normal request searches one Apollo page
   of at most 25 companies. After Apollo is exhausted, the next request uses Clay.
   Staff can choose a source explicitly. Authentication, billing, validation or
   rate-limit failures are shown; they do not silently trigger a second provider.
4. Review companies and choose **Find contact**. Apollo people search uses the
   campaign roles and the shared role exclusions. Select a returned person or
   enter a researched contact manually, then save through the prospect form.
5. Continue the existing evidence, role, work-email verification, drafting and
   exact-message review workflow. Campaign links scope the Review and LinkedIn
   queues. Discovery and contact selection do not approve or send messages.

The question/answer document configures targeting data only. The parser accepts
an exact JSON document or a single fenced JSON block with the complete criteria
schema. Unknown fields and instructions outside the JSON are rejected. It cannot
set sender identities, secrets, sending switches, limits or approval state.
Countries use ISO two-letter codes. Unsupported bounds, reversed ranges,
duplicate platforms and oversized provider filter lists are rejected on save.

## What stays shared

The Playbook governs sender identities, draft formula, postal footer, operational
release checks, delivery windows and caps. Multiple active campaigns share those
caps; a new campaign does not create an additional sending allowance. Each
message still needs the current exact-version approval.

Company and contact history, relationship exclusions, company-name/domain
exclusions and opt-outs apply across campaigns and inboxes. Existing prospect
records remain unique by company. A company already owned by another campaign
queue is shown as excluded from a new queue. Concurrent promotion transactions
cannot create a second outreach prospect for the same company.

Legacy prospects keep `campaign_id = null`. The migration does not move them,
remove their history, reset their approvals, or create additional prospects.

## Company qualification

Source filters are discovery hints, not proof that a company satisfies every
criterion. Unknown country, platform, headcount and revenue values remain empty.
Clay's size/revenue ranges are not converted into invented point estimates.
Staff must verify the real storefront, its own-product fit, the team/funding or
distribution evidence, the current role, and the product finding in the existing
prospect workflow. The campaign's qualification notes carry requirements that
cannot be reliably enforced by a provider query.

Known country/platform/numeric mismatches are excluded. Missing numeric values
can proceed to contact research, but a campaign with a numeric bound cannot
approve that prospect while the source value remains unknown. Country and
platform are checked against the reviewed prospect fields at approval. The
initial UI does not yet provide an independent manual headcount/revenue evidence
editor; remove an unnecessary numeric bound through a reviewed criteria change
or obtain a source result with that observation.

The first current-criteria source record is preserved for a campaign company.
Later duplicate source receipts remain in the run ledger and do not overwrite
known Apollo facts with missing Clay values or count as new companies.

## State, concurrency and provider receipts

`outbound_campaign` stores the criteria and independent Apollo/Clay cursors.
`outbound_campaign_company` stores one row per campaign/domain, source provenance,
the criteria revision and an optional linked prospect.
`outbound_campaign_run` records the snapshot, operation, cursor and outcome before
each provider request. Only one starting or uncertain run can exist per campaign.

An Apollo request reads one explicit page. Clay creates a search ID, commits it,
then consumes one page from that search's stateful iterator. Each step has a
separate durable receipt. A lost response or an unexpected successful-response
shape is uncertain: the app does not automatically retry a potentially charged
request or restart Clay's iterator. A starting/uncertain receipt requires
reconciliation before another batch. The initial UI displays this condition;
reconciliation is an operator action, not an automatic reset button.

Criteria edits increment the criteria revision, reset future discovery cursors,
mark unpromoted candidates stale, and revoke the affected campaign's approvals.
Provider responses from an older revision remain in their receipt but cannot
populate the current queue. Name/status edits preserve the criteria revision, so
activating a campaign does not invalidate its researched companies. Paused or
archived campaigns cannot research new contacts, run discovery, approve messages
or pass final delivery checks.

The workspace advisory lock is shared with company promotion, Playbook updates,
approval and delivery claims. It is held only around database work; external
provider calls happen after their run reservation is committed. This permits
different campaigns to discover concurrently while preserving shared dedupe.

## Sources and ownership

- UI: `apps/outbound/src/app/[locale]/(workspace)/campaigns/`.
- Criteria/questionnaire: `apps/outbound/src/lib/outbound-campaigns.ts`.
- Staff actions and service: `server/app/outbound/campaign-actions.ts` and
  `campaigns.ts`; contact research uses `campaign-contacts.ts`.
- Provider adapters: `server/utils/outbound/company-discovery.ts`.
- Canonical migration:
  `apps/web/drizzle/20261115160000_outbound_campaigns/migration.sql`.
- Schema copies: `apps/web/src/server/database/outbound.ts` and the standalone
  app's runtime projection. Apply migrations through the main app's migration
  owner; do not run `db:push` against the reduced standalone schema.

Current API contracts were checked against [Apollo organization search](https://docs.apollo.io/reference/organization-search)
and [Clay searches](https://developers.clay.com/searches.md), including Clay's
authenticated query reference. Apollo technology IDs include `shopify` and
`woo_commerce`. Clay company search uses the Public API key and query-mode search;
it does not require the separately configured custom enrichment routine.

Apollo company search now follows the [official CLI request builder](https://github.com/apolloio/apollo-io-cli/blob/main/src/commands/companies.ts)
and [HTTP client](https://github.com/apolloio/apollo-io-cli/blob/main/src/api.ts):
POST a JSON body with array fields without `[]`, nested `revenue_range`, and
numeric `page`/`per_page`. This differs from the generated reference's query
parameter annotations. Each run preserves safe request filters, returned
breadcrumbs, original pagination, partial-result flags and raw result count in
its receipt. An acknowledged filter-value mismatch stores the receipt and holds
the run without populating companies or permitting automatic replay. Missing
acknowledgements remain absent; they are never fabricated from the request.

The first live connection checks on 15 November 2026 confirmed both saved keys,
but the requested platform/advanced filters were rejected by the accounts' plan
entitlements: Apollo returned a free-plan filter restriction (HTTP 422), and Clay
returned a paid-plan requirement (HTTP 403). No companies or contacts were added
by those rejected searches. The app keeps the criteria intact and displays a
specific plan requirement; it does not substitute a broader audience to force
the search to succeed. Account upgrades must be verified with a subsequent
bounded run before either connection is described as ready for company sourcing.

Validation includes provider fixtures and isolated PostgreSQL tests for
cross-campaign dedupe, request reservation, stateful Clay pagination, stale
criteria, uncertain outcomes, approval revocation, promotion races and final
campaign gates. These tests do not substitute for verifying a particular
workspace's provider entitlement or a mailbox's readiness to send.

## Dashboard presentation

Campaigns use the shared DataTable, edge-to-edge section borders, compact headings,
blue primary actions and soft secondary actions. Settings and criteria start
collapsed; previewing Claude answers closes the saved criteria form, and preview
values are not persisted until the user saves them. Discovery waits while a
preview is open and names the saved criteria revision it will use. Country and
keyword input prefills preserve list separators through browser normalization.
Discovery reports the provider run outcome separately from settings-save
feedback. A rejected search shows a bounded failure state rather than an
overflowing empty table. Contact research uses the same
table presentation and a dedicated page with matching streamed loading content.

`apps/outbound/src/components/dashboard-header-figure.tsx` maps each screen to an
approved function-specific Hairline subject. The standalone app contains local
copies of the canonical rest geometry, CSS, fixed kernel and matching scripts;
there are no runtime imports from `apps/web`. Provenance is recorded next to the
copies in `src/components/hairline/README.md`. Rest geometry renders before
hydration and reduced-motion preferences disable the pointer response.
