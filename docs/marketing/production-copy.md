# Production copy and review mode

Normal builds omit unresolved marketing copy before it reaches rendered HTML,
JSON-LD, metadata or the RSC/client message payload. `NEXT_PUBLIC_REVIEW=1` is the
explicit review build setting; it replaces pending values with a localized
confirmation label. It is not enabled by a URL parameter. Build and review the
two modes separately.

## Message boundary

`apps/web/src/i18n/request.ts` prepares the catalog through
`prepareMarketingMessages` before next-intl exposes it to `getMessages()` or
`getTranslations()`. Only `enterprise*` namespaces are transformed. Existing
user `about` keys, legal content, dashboard messages, and all other namespaces
retain their original values.

The helper clones the catalog, changes string leaves, and preserves every key,
array position and non-string value. It therefore keeps next-intl's inferred
catalog shape without a parallel message type or type assertions. Keeping array
positions also preserves program artwork mappings.

- `[NOTE: ...]` directions are removed in both modes.
- `{{TODO: ...}}` spans are removed in production. Confirmed sentences outside
  those spans remain, including negative product claims and limitations.
- Review mode replaces TODO spans with `enterpriseReview.pending`: “Pending
  confirmation” in English and “Pendiente de confirmar” in Spanish. Raw owner
  questions never enter the prepared catalog.
- Entirely unresolved values become empty strings in production. The copyright
  field is treated as entirely pending while its rights holder is unconfirmed;
  a bare year is not published as a completed copyright notice.
- The review label itself is empty in a production catalog, so it cannot become
  a placeholder through a later client scope expansion.

This is a publication guard, not a fact checker. Removing a marker must not make
an unverified sentence sound confirmed. The copy pass separately removed DPA
availability promises, made the security contact card informational, and labeled
the provider inventory as providers used in code rather than a confirmed
contracted subprocessor roster.

## Rendering omissions

The shared page renderer removes empty paragraphs, value-less definition rows,
cards without body or a useful link, empty fact groups, and unanswered FAQs.
FAQ filtering happens before both the visible FAQ and its JSON-LD. Grid column
counts and ordered steps follow the surviving cards.

Sections with only unresolved content are omitted. Sections supplied with real
`sectionChildren` content remain, as do deliberate link-only calls to action.
The footer does not render an empty rights-holder notice. Fil Rouge remains a
text program name; its unavailable artwork label is shown only in review mode.

On Security, every processing location currently needs confirmation. Production
shows the known provider and purpose columns, without an empty location column.
Review mode includes the location confirmation labels. The unpublished research
template remains outside public routing and the sitemap.

These guards currently affect operational security facts and contacts, corporate
details, founder portraits, partner terms and process details, pilot-method
questions, DUA implementation details, and unpublished app/asset notes. They do
not invent replacements for any missing fact.

## Review ownership and evidence

The raw EN/ES fragments remain the source of truth for pending questions. The
review-pack bridge reads them directly, maps their source keys to routes, and
reuses ownership from English for the matching Spanish key. It does not depend
on visible TODO text or `data-review-todo` attributes; neither is emitted.

The DUA starting-point question explicitly names Xhurian. The brief assigns the
missing research values and method to Alvi. Questions without an explicit owner
remain unassigned until the team confirms responsibility. No owner identity is
inferred merely from a technical topic.

## Validation

The focused Bun suite covers known/pending mixed prose, full omission, NOTE
removal in both modes, ordinary ICU strings and labels, source immutability,
array order, non-marketing isolation, rights-holder omission, both full locale
catalogs, and localized review labels without owner-question leakage.

Runtime validation must inspect complete raw responses, including scripts and
JSON-LD, rather than only visible text. It must also check that unanswered FAQs
and empty sections are absent and that no unverified mailbox was made active.
No form submission is needed. Separate chart approval guards are required for
datasets that do not come from localized catalogs.

### Part 1 production result

The final Part 1 production build on `http://localhost:3001` passed the complete
raw-response audit on 10 November 2026: 61 registered public marketing paths in
each locale, plus the unpublished research path and an unknown-path check in
both locales (126 responses total). All 122 public pages returned 200; the four
research/unknown checks returned real 404 responses; no response returned 500.

Across the full response bodies, including JSON-LD and serialized RSC scripts,
there were zero TODO/NOTE markers, zero localized pending labels, zero empty
links, zero unanswered FAQ schema entries and zero malformed JSON-LD blocks.
No resolved marketing section was an empty content shell. The 54 initially
flagged sections are explicitly labeled PPR loading skeletons in the initial
stream, followed by their resolved content; they are not omitted-copy sections.

Security renders only the known provider and purpose columns in both locales;
the unconfirmed processing-location column is absent. Contact retains its known
contact guidance and omits the unresolved company-details section. Both locale
research URLs remain inaccessible. The audit evidence and reproducible checker
are `/tmp/ecentic-part1-production-audit.json` and
`/tmp/ecentic-part1-production-audit.py`. The focused sanitizer suite passed 11
tests and 21 assertions. The release browser checks separately passed all four
captured states with no accessibility, horizontal-overflow or missing-image
findings, and the local fonts loaded.
