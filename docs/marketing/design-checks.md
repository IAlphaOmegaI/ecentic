# Design checks

These checks enforce the approved [design canon](../context/design.md). The user approved the
14 full-history rule updates and C1–C6 checks with “write all” on 12 November 2026. They inspect
source and rendered layouts; they never rewrite components or remove borders automatically.

Run from `apps/web` with Bun. Runtime checks use the already-installed `agent-browser` CLI and a
running local app on port 3000. Source checks and review receipts do not need a browser.

```sh
bun run design:test
bun run design:source --out ../../output/design-source.json
bun run design:runtime --out ../../output/design-runtime.json
bun run design:review --out ../../output/design-visual.json
```

The defaults report findings as warnings/advisories. `--strict` returns a nonzero status for
findings; malformed registries, source parse failures and browser execution failures are errors.
No baseline suppresses existing defects or future instances of the same pattern. This is a
reporting tool, not a claim that every visual criterion can be enforced with a static rule.

## C1: one structural stroke owner

The runtime check compares visible computed border intervals for registered structural owners.
It reports overlapping horizontal joins and their selectors, rather than banning `border-y`.
Layered illustration cards, progress fills, real table borders and separated cards are excluded.
The TSX source advisory also catches terminal roadmap rows whose `last:border-b-0` is defeated
by a following decorative sibling.

Major section rules reach the viewport edges; internal dividers stay in their container. The
numeric geometry tolerance accounts for fractional pixels and is not a new spacing token.
Crosshair ownership and pseudo-element gutter extensions that cannot be proven reliably are
reported as needing visual review, not silently passed. See the output's coverage/limitations.

## C2: full-column embedded documents

Registered conversation/code surfaces are compared with their owning column edges. The check
distinguishes a redundant padded outer shell from useful internal message padding and product
cards. Height equality applies only to layouts explicitly requiring stretched siblings; stacked
mobile children need not each fill their parent's combined height.

MCP's formerly padded handshake is a regression case, repaired as a flush source document beside
an always-visible connected sequence. Perplexity and Travel conversations are useful negative
cases. The current Copilot composition contains a workflow figure, not a chat, so it
must not produce a fabricated chat-padding result. Reachability and scroll limits are reported
separately from visual fidelity.

## C3: visible production labels

The runtime art registry checks visible production captions such as “At rest” or “rest”, not
accessible names. Screen-reader-only descriptions, SVG titles, actual customer statuses and
unrendered source strings are not caption defects. A source-wide string match is insufficient.

## C4: tonal artwork source and renderer

The source registry records meaningful subjects, source provenance, renderers and consumers.
Image-derived ASCII uses clean-source tonal dots. The winding route keeps its meaning but also
uses tonal dots under the approved conflict resolution. The old mixed-character binding was
replaced by circular, shaded point layers with a finite reveal. Actual code, protocol text/trees and readable lettering
are not sampled artwork and stay literal.

Registry coverage is explicit. A missing file, missing production binding or incomplete provenance
is reported; finding one correct renderer does not certify every illustration on the website.

## C5: recorded visual acceptance

`scripts/design/visual-review.json` names visual states for continuous light, meaningful figures,
provider-specific shopping composition, pricing baselines, measured charts, finite replay,
navigation/footer, common heading hierarchy and the local Enterprise separation. Each state has a route, locale, width,
criterion, user-evidence IDs and source dependencies. These are review tasks, not automatic
predictions of visual quality.

Create a receipt template, then have a reviewer inspect the listed states:

```sh
bun run design:review --template ../../output/design-receipts.json
bun run design:review --records ../../output/design-receipts.json --out ../../output/design-visual.json
```

Templates start as `notChecked` and never overwrite an existing receipt file. A completed state
requires `passed` or `failed`, a named reviewer, timestamp, written observation and existing
evidence files. Evidence paths are repository-relative or absolute. Keep screenshots in delegated
agents when requested; a text report can reference the private evidence without embedding it.

The receipt binds to a digest of the registered source contents and the complete review target,
including route, locale, viewport and criterion. Changing either makes the recorded state stale
and `notChecked`. Register all relevant visual owners and dependencies;
the digest covers that registry, not an inferred complete dependency graph. A screenshot existing
on disk alone cannot make a state pass. Conflicting duplicate receipts cannot pass, and receipts
for unknown states are errors. No receipt means `notChecked`, not success. `--strict` also fails
on unreviewed states.

The Enterprise criterion is a local accepted redesign target, not a universal prohibition on
two-column sections. The later authorized repair separated intake and security into distinct
bands with their own headings and surface treatment. Likewise, a measured
chart must retain quantitatively correct values; a decorative Hairline figure is not a substitute.

## C6: scoped component-pattern advisories

The TypeScript parser inspects registered component roles for obsolete narrative tabs,
disconnected local process renderers and record-comparison display controls. Real endpoint,
header, format, model and scenario selectors are valid. Advisory findings require contextual
review; they are not permission to remove all tabs, monospace or local ordered lists.

Six explicit visual contracts also inspect direct monospace classes on ordinary heading/prose
nodes, shared section-heading usage and canonical icon bindings in repeated rows. Technical
strings and code are exempt. Computed/inherited typography, delegated renderers and icon meaning
or alignment are explicitly `not-checked` where source inspection cannot establish them.

The source output includes exact files/lines, evidence, registered coverage and consumer paths.
Keep the registry's component role current when a component changes its job. Missing expected
coverage must remain visible rather than being mistaken for a clean scan.

## Runtime coverage

The default runtime registry covers the 49 routes from the full-history audit at 1135px in
English. Run narrower cases while developing checks, and wider matrices when reviewing a shared
change:

```sh
bun run design:runtime --routes /docs/mcp,/ai-channels/perplexity,/solutions/sectors/travel-and-experiences --width 390,1135 --locale en,es
bun run design:runtime --check seams --width 390,1135,1508 --locale en,es
```

The CLI creates its own browser session and closes only that session. It does not submit forms,
purchase anything, edit account data or emit screenshots. The JSON report separates findings,
errors and checks that were not performed. A successful command means the inspection ran; a
warning-mode exit status is not a declaration that the site is defect-free.

## Review workflow

Use findings to identify shared causes, then inspect affected consumers. Keep genuine internal
dividers, accessibility labels, truthful product facts and legitimate controls. After an authorized
source fix, rerun the relevant source/runtime cases and inspect the affected visual states.

The original full-history audit is preserved outside the app repository under the local artifact
archive recorded in the [review ledger](design-review-history.md), at
`output/learn-taste-2026-11-12/` within that archive. Its
33 measured structural joins and other findings describe that snapshot, not a frozen expected
failure count. Current command output is authoritative for the current tree. Historical provenance
remains in the [review ledger](design-review-history.md).
