# Automatic company and contact qualification

The owner's automatic workflow uses `automation-qualification.ts` through the
durable campaign coordinator. Loading this helper never starts work: the caller
must reserve the company-facts and qualification stages before provider requests.
No live provider calls or email sends are made by the test fixtures.

Company search filters are hints, not observations. A separate Apollo
organization-enrichment request supplies country, estimated team size, revenue
and platform when the provider actually returns them. Missing facts remain null;
the response must match the exact company domain. Its receipt is saved before
the next stage. An interrupted paid request has an uncertain outcome and is not
automatically repeated.

Public research checks robots rules first and reads at most seven same-origin
resources. Every read uses the existing public-URL/redirect guard, byte limit,
request timeout and access-wall detection. An access denial stops collection.
Documents are bounded at 8 MiB, while saved source excerpts remain capped at
18,000 characters. An oversized document, timeout or unavailable server is
reported separately from an actual access denial. Cross-host redirects remain
held until the destination host's access rules are verified.
The helper reads the homepage, a bounded product/sitemap set and a linked company
page when available. It stores source URLs, timestamps, hashes and bounded text.

The automatic positive angle is `product-published-data`. It requires an
unambiguous product heading and structured product name, the company brand,
and a positive priced offer. Digital products and gift cards do not qualify as
physical goods. The observation is only that the public page lists the named
product. It does not claim missing barcode/rating/markup, rendered-page coverage,
lost sales, missing AI visibility or a technical defect. The existing negative
finding types still need their stronger evidence; this path never upgrades them.

One bounded Azure request interprets the collected company evidence against
the campaign objective, qualification notes and Playbook targeting notes.
Every qualified result requires source quotations for own-brand physical goods,
an established business and the material criteria. Quotations must match the
stored source text exactly. A priced product alone cannot establish company
maturity. Unknown required facts produce a hold; known mismatches are skipped.
Provider headcount remains an explicitly labelled estimate. The model has no
tools, no mailbox identities, no credentials in its prompt and no automatic
retry. Public pages are data, never instructions. The whole helper uses a
90-second deadline and retains usage/request receipts.

Apollo API Search currently returns first names, obfuscated surnames and the
current employer name, without full email, domain or timezone. A matching employer
name and target role may select a **provisional** person ID for enrichment. That
selection has no confirmed role-source date. Enrichment must confirm the actual
employer domain and full name before it becomes nonprovisional. Apollo's explicit
`time_zone` is retained; company headquarters never supply the recipient zone.
Founder/CEO selections require a sourced team-size observation below 20.
Search/enrichment email status never becomes a fresh verification: selected
addresses remain `unknown` until the existing live verification job supplies
its own address-specific verdict and genuine timestamp.

Automatic approval is a separate store operation. It binds the exact persisted
product/company evidence to the coordinator job and keeps `findingReviewed`
false for the positive angle. Final identity, verification, history, opt-out,
mailbox readiness and delivery limits remain enforced by their existing gates.

Official response contracts checked on 15 November 2026:

- [Apollo organization enrichment](https://docs.apollo.io/reference/organization-enrichment)
- [Apollo people API search](https://docs.apollo.io/reference/people-api-search)
- [Apollo people enrichment](https://docs.apollo.io/reference/people-enrichment)
- Azure uses the existing configured deployment through `@ai-sdk/azure` with a required-property structured schema and no automatic retries.

The isolated fixture exercises the actual Azure SDK and Apollo adapters against
mocked HTTP: positive evidence, mismatch/absence rejection, exact quotations,
access-wall stopping, source privacy, single-request uncertainty, missing-country
handling, provisional identity and sourced timezone. No live qualification or
deliverability outcome is implied by those tests.
