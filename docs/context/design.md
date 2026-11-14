# ecentic design system

The visual and interaction system for ecentic's public site, product workspace and onboarding.
Consolidated from the complete 10–12 November 2026 review archive and the user's subsequent
selections, through the [shopping-reference review](../marketing/review-16-shopping.md),
the [integrated-surface and editorial review](../marketing/review-17-surfaces.md),
the [recovery and conversion review](../marketing/review-18-recovery-demo.md),
the [seam and conversation review](../marketing/review-19-seams-and-conversation.md), and the
1535 Enterprise comment. The 12 November full-history learn-taste pass covered 428 numbered
comments across 26 source files; the user approved all 14 strengthened rules, the two remaining
conflict resolutions and the focused skill extraction with “write all”. This records accepted
rules, not a claim that the source violations found by the audit have been repaired.

This is the canonical guide. The repository-root `DESIGN.md` points to this file. It replaces the
previous accumulation of review addenda: a later, specific decision is incorporated into the
relevant rule below rather than left beside a contradictory older rule.

The [review history ledger](../marketing/design-review-history.md) records every source and the
important supersessions. [Product context](idea.md), [strategy](strategy.md),
[Shopify constraints](shopify.md) and the implementation rules in `docs/agents/` still govern
behavior and claims. A visual request does not establish a new product capability.

Quick navigation: [foundations](#4-color-and-typography) · [rails](#5-layout-rails-and-line-ownership) ·
[surfaces](#6-surface-light-and-cutouts) · [ASCII](#7-tonal-ascii) ·
[Hairline](#8-hairline-figures-and-commerce-illustrations) · [interactions](#10-reusable-interaction-patterns) ·
[page recipes](#13-public-route-recipes) · [implementation](#16-implementation-contract) ·
[retired alternatives](#17-settled-decisions-and-retired-alternatives) · [verification](#18-verification-and-delivery).

## 1. What the design should communicate

A merchant should understand the relationship between their catalog, an AI shopping decision,
the change they can make, and the evidence they can inspect afterward.

The signature is a precise structural grid carrying expressive commerce objects. Thin rules,
rail intersections, confident typography, tonal ASCII, responsive line drawings and carefully
placed light work together. The result should feel technical and understandable at the same time.

Four principles organize the system:

1. **Make the relationship visible.** Show sources connecting, a product being inspected, a
   record changing or a checkout progressing. A paragraph beside an unrelated object is weak.
2. **Give each surface a job.** Light editorial sections explain; dark workbenches demonstrate;
   blue fields focus attention; muted cells separate supporting information.
3. **Keep the structure continuous.** Sections share rails and a type hierarchy. Borders,
   cutouts, gradients and crosshairs belong to that structure.
4. **Keep the evidence honest.** Real interfaces and measurements remain real. Illustrations
   and scripted examples say what they are. Attractive complexity is not evidence of a capability.

The site has three complementary visual media. No single medium should replace the others:

| Medium | Best job | Recognition test |
| --- | --- | --- |
| Tonal ASCII | Large subject, atmosphere, identity, dimensional wordmark | Can the viewer name the object at rest? |
| Custom Hairline | Inspectable object, connection, physical process | Does its response make sense for this object? |
| Explanatory graphic | Source-to-record flow, annotated code, comparison, measured chart | Can the viewer explain the relationship or value? |

## 2. Authority and how to make a change

Use the latest explicit user instruction for the affected component, then this consolidated
guide, then existing implementation references. Reuse code that matches the guide; an existing
component can still be an example the user has rejected.

Before drawing or coding:

- Read the relevant product context and the [public route recipes](../../.agents/skills/ecentic-public-pages/SKILL.md) when composing a public page.
- Identify the one decision or relationship the section must explain.
- Choose the surface, heading hierarchy and visual medium for that job.
- Find the shared primitive before building a page-local alternative.
- Enumerate consumers of an accepted shared-pattern change and verify each relevant route family,
  including compact desktop and mobile. Record the result per consumer; one homepage screenshot
  cannot establish family-wide completion.

**Keep current decisions in this canon once, remove contradictory retired wording, and route
specialized implementation guidance through the linked project skills.** The verification
contract and [C1–C6 checks](../marketing/design-checks.md) carry the shared rules into review.

Why: “these changes for everything where this strucurre has been used”; the user repeatedly requested secondary-page coverage.
<!-- 2026-11-12 learn-taste rule 14; exact user provenance: 0445.03: “and these changes for everything where this strucurre has been used”; 0517.33: “same for all of these pages”; CHAT-AUTONOMOUS-AUDIT: “Then go find violations of that taste across the site on your own, like the double lines on other sections and the Copilot chat that still doesn't fill its whole card.”. Approved with “write all” on 2026-11-12. -->

A request to fix a card does not authorize discarding its approved surrounding composition.
A request to extend the language across pages means checking the whole route family, not merely
swapping its hero artwork. Preserve useful long-form documentation and actual product screenshots.

The history contains image-only comments such as “no” and “this is boring.” Their target must be
established from the assigned screenshot or page before changing it. They do not establish global
bans on a color, control or medium. Source metadata and text inside a screenshot identify the
reviewed UI; only the user's annotation states the requested change.

When exploring a genuinely unresolved design, prototype different structures with the same source,
copy and context. Promote the chosen structure into a shared component. Do not reopen settled
choices merely because an older prototype remains in the history.

## 3. Three surface modes

### Public marketing and content

Spacious, editorial and demonstrative. A centered marketing rail, large display headings,
full-width section boundaries and clear changes of surface establish rhythm. Product and
sector pages use their own meaningful objects while sharing the same construction system.

### Dashboard

Calm, dense and operational. Keep store context, compact headers, useful tables, connected
metrics and short paths to the next action. White data surfaces sit on a quiet neutral canvas.
Do not import giant marketing heroes, ambient ASCII or decorative bento arrangements into
routine product work. Product identity, status and evidence have priority over illustration.

### Channel checks and technical tools

Give each tool one obvious entry task. Agentic starts with the store, scan status and a single
scan action. Keep external-service attribution and the domain-sharing explanation concise and
adjacent to that action, rather than in a separate full-width disclaimer strip. Before the first
scan, icon-led descriptions can explain what will be checked; they must not imply a saved score
or completed work.

Catalog access separates the product-feed handoff from the preceding readiness checks with one
full-width seam. Use meaningful file/rank icons and a compact URL/action region. A new handoff
must not read as another paragraph belonging to the last check.

UCP opens on the store-prefilled checkout check. Keep product data as a separate standard tab;
generated product coverage is not proof of live checkout support. Put the coverage explanation
and optional endpoint/lifecycle tests behind package Accordions instead of a permanently visible
technical grid or competing forms. Keep the lifecycle test’s potential test-cart effect explicit.
Use light full-width sections, one border owner per seam and sparse edge crosses. Public versions
of shared tools retain their own approved composition.

### Onboarding

Guided and progressive. A blue narrative plane and light task workspace explain the current
step on desktop. Persistent progress makes the next step predictable. Real logs and results
show computation; they are not decorative theater. On mobile, the task takes priority and
progress compresses into dots plus a count.

These modes share tokens, controls and semantic hierarchy. They intentionally use different
density, scale and amounts of illustration.

## 4. Color and typography

### Semantic color

The implementation source is `packages/shared/config/src/tailwind/globals.css`. The 13 November
Brand review sets a site-wide budget: **at most seven interface color foundations and four
corner treatments, using Tailwind theme utilities only**. Do not add local hex/RGB/HSL colors,
raw palette classes, arbitrary radius values or one-off appearance values. The seven existing
foundations are:

| Foundation | Token | Base |
| --- | --- | --- |
| Off-white canvas | `background` | `#f5f5f5` |
| White paper / inverse text | `background-rich` | `#ffffff` |
| Ink | `foreground-rich` | `#16181d` |
| ecentic blue | `primary` | `#1572fa` |
| Success | `success` | `#059669` |
| Warning | `warning` | `#d97706` |
| Error | `error` | `#e11d48` |

Existing foreground, separator, surface and state shades are shared semantic mixes of these
foundations, never page-local additions. `primary-text` is the accessible blue for small text
on light surfaces; `primary-rich` is for inverse contexts. Secondary and informational colors
resolve to the primary family. Crosses and gradient endpoints also use the shared theme.
Opacity, antialiasing and gradients do not establish new independent palette foundations.
This budget is not a claim that every rendered pixel has one of seven literal values.

Blue carries brand, active state or a deliberate major field. It does not need to color every
heading, border and icon. Success, warning and error communicate actual outcomes with an icon
or text, never color alone. Genuine provider logos, product photos, tonal artwork, supplied
screenshots and rendered social-preview images retain their authentic colors; they are content,
not permission to copy those colors into buttons, panels or other interface chrome.

Use named theme-scale spacing, font sizes, tracking, shadows and radii. Replace an arbitrary
value with an exactly equivalent Tailwind utility when available. Necessary data-driven chart
coordinates, SVG/Hairline geometry, aspect calculations and shared responsive rail formulas
are geometry rather than a new appearance palette. Do not move one-off appearance values into
a local custom property merely to evade this rule. `bun run design:theme` inventories deviations.

On dark or blue fields, use the appropriate light text tokens and opacity hierarchy. Audit
buttons separately: a section-wide text override must not make a primary or secondary button
label disappear. Disabled, focused, hovered and selected controls must all remain readable.

### Fonts and weight

Public headings use local **LT Superior** through `font-heading`. Body copy, controls and ordinary
numeric evidence use local **Red Hat Display** through `font-body`. Keep the established product
font wiring in dashboard and onboarding. Do not add page-local fonts. Faithful third-party shopping previews may use a scoped provider font through a named theme token: Google previews use the licensed, self-hosted Google Sans Flex; ChatGPT previews use the system sans family from the supplied reference. This exception is confined to the simulated provider surface, not its dashboard frame.

Public type normally stays between regular and semibold. Use medium for confident display
headings and component titles; reserve semibold for stronger local emphasis. Existing dashboard
page titles and primary metrics can use their established bold style.

`font-mono` is for JSON keys/values, code, paths, scopes, HTTP methods, version requirements,
identifiers, timestamps and logs. It is not the default for marketing labels, prices, eyebrows,
workflow titles or large stage numbers. Use tabular numerals when aligned values need them.

### Shared hierarchy

| Element | Public default |
| --- | --- |
| Hero title | Shared responsive scale around 3–5rem; tight leading, medium weight |
| Main section title | Shared responsive scale around 2–3.5rem |
| Component / subsection title | Approximately 1.4–1.85rem; adjust through the shared hierarchy |
| Lead copy | 18–24px depending on hero or section |
| Body | 16–18px, comfortable line height |
| Supporting metadata | Usually 14px; enough contrast to read |
| Main section/stage index | Normal heading/body numerals, prominently scaled, commonly 24–30px |

**Equivalent public headings use `MarketingHeading` and the shared heading/subtitle hierarchy,
with sentence-case eyebrows and ordinary heading/body faces.** Reserve `font-mono` for actual
technical strings and version requirements. Match roles across pages, not every heading level's
font size. A helpful eyebrow leads into the title and nearby supporting paragraph; do not repeat
it as another giant title or separate the title from its explanation with a large void.

Why: Eyebrows “mad ethe whole site clearer”; technical mono was requested to make the content look like code.
<!-- 2026-11-12 learn-taste rule 10; exact user provenance: 1435-03: “different background color, and add those eyebrows back, they mad ethe whole site clearer”; 2255.21: “is this title like the others on the platform, all titles need to be the same across the platform”; 1435-06: “add an icon on the left here, for all official documentation sections everywher”; 1753-36: “mono font so it looks like code with a different color”. Approved with “write all” on 2026-11-12. -->

Keep headings sentence case. Public compositions may use existing `SectionKicker` conventions for operational indexes. Dashboard sections use plain headings: no decorative numbered eyebrows such as “01 Connection” or “02 All competitors”, and no tracked uppercase labels. Real workflow steps and question indexes can retain meaningful numbers. This 14 November correction supersedes the earlier dashboard kicker convention.
Balance display lines and keep prose near 55–70 characters per line. Compare equivalent titles
across Platform, Resources, Security, tools and integration pages before choosing a local size.

## 5. Layout, rails and line ownership

### Rail and rhythm

The marketing content rail is `min(1186px, 100dvw - 56px)`, reducing the outside allowance to
32px on small screens. Use `MarketingBand` and its shared `marketing-rail` shell rather than
reproducing this formula page by page.
Public shells and their vertical delimiters align across section transitions.

Full-screen heroes use viewport-relative height with real content allowed to grow. Keep the
outer reveal slim. Do not force a fixed-height layout that clips a translated heading, form,
keyboard focus ring or the defining part of an illustration.

Use `SectionGutter` for major hatched separations. Gaps between related controls should be
smaller than gaps between distinct sections. Repeated rows, prices, logos and actions share
baselines. A sparse text panel does not need a tall blank area just to match an arbitrary figure.

### One rule for full-width and internal lines

| Boundary | Where the line ends | Who owns it |
| --- | --- | --- |
| Major section or full-rail workbench transition | Viewport edges, through both outer gutters | Band or full-rail seam wrapper |
| Full-rail stage / diff / content row | Viewport edges when it is a structural row | Shared row renderer or seam helper |
| Column split inside a section | Its section's edges | Grid cell or grid shell |
| Individual card, accordion item, table or code row | Its own container | That component |

A black section is a section change: its top and bottom boundaries follow the same full-width
rule as a light section. Do not add `overflow-hidden` to the full section merely to trim artwork;
that also clips the intended boundary extensions.

The existing global renderer extends direct full-rail `border-t`, `border-b` and `border-y`
rows. Use `marketing-surface` only for a nested wrapper that spans the complete rail, or
`marketing-seam` for an explicit full-width boundary. These markers do **not** belong on a
single card, code pane, table row or nested accordion item.

**Each physical structural seam and rail intersection has exactly one owner (C1).**
`MarketingBand` owns exterior edges. A complete nested rail uses `marketing-surface` or
`marketing-seam`; card, code and table dividers stay inside their container. When a band or
`gap-px` grid already draws a stroke, the adjacent child does not add another border or cross.
Last accordion/roadmap rows leave the exterior bottom stroke and crosses to the band, retaining
only interior column junctions. If decoration follows the final row, select that row by type or
index: `:last-child` would select the decoration. Text may be padded inside the cell, but padding
on the separator owner must not shorten its line.

Why (originally inferred; accepted via “write all”, 2026-11-12): One continuous grid should not become broken or heavier where reusable components meet.
<!-- 2026-11-12 learn-taste rule 1; exact user provenance: r1-09: “horizontal lines should be full page width, they should go beyond the centered content, maybe figure out a formula margin-left calc(100dvw-idk something here but ther eexists a formula, figure it out in tailwind)”; r1-48: “for this internal lines not really needd to expand to edgeshorizontally”; 1511.01: “double lines here”. Approved with “write all” on 2026-11-12. -->

### Crosshairs

Use the shared `Plus` / grid junction helpers at real rail intersections. Crosses mark where a
structural horizontal rule meets a vertical delimiter. They do not decorate arbitrary corners.

Diff panels include their top header intersections and bottom annotation intersections in the
shared renderer. Stage groups and company-details sections follow the same rule. Never put two
crosses on the same intersection because both a parent and child try to own it.

### Responsive construction

Use `min-w-0` for grid/flex children and give shrinking text a real wrapping or truncation rule.
Split wide compositions into a meaningful mobile reading order. Preserve the full-width section
boundary after stacking; remove the obsolete desktop internal vertical divider where needed.
Source maps and integration arcs retain visible connections after stacking: use a continuous
vertical route and aligned branches rather than disconnected logo lists. A mobile roadmap axis
must not create a second exterior rail. Its gradient covers both the text and illustration.
Give the complete illustration enough height at compact widths; do not crop a product card to
preserve a desktop aspect ratio.

Side-by-side work areas stretch to their row's height. There should be no leftover gray strip
under the shorter panel. Desktop sticky illustrations are bounded by their own section, clear
of navigation, and return to normal flow on mobile. “Fixed while working” does not mean an
obstructive page-wide fixed overlay.

## 6. Surface, light and cutouts

### Surface roles

- **Light:** editorial reading, primary narrative and evidence around a diagram.
- **Muted:** a supporting note, a localized distinction or alternate data region.
- **Blue/gradient:** a hero, conversion field or a deliberately continuous explanation.
- **Charcoal:** a working demonstration, source inspector, replay, validator or technical tool.

Vary section surfaces deliberately. Repeated undifferentiated gray panels make the site flat.
A padded blue rectangle inside a white rectangle is not a useful explanation by itself.

### Continuous light

**A gradient or dark working surface covers the complete region it explains: heading, controls,
figure and result (C5).** Child backgrounds must not cut the field in half. Stretch participating
cells to its edge. A structural boundary may end the surface; an arbitrary inner rectangle may
not. Inspect the owner and its children together rather than banning every internal color change.

Why (originally inferred; accepted via “write all”, 2026-11-12): The region should read as one intentional composition instead of disconnected patches.
<!-- 2026-11-12 learn-taste rule 3; exact user provenance: 2133-07: “why dies the gradient cut off like that”; 0517.28: “not half black half white, do this whole section in black, and would be really cool if the hairline thing animates with the other things changing”; 2032-10: “and i meant a gradient of the whole footer”. Approved with “write all” on 2026-11-12. -->

For light around an isolated illustration, use `IllustrationGlow`. The radial field reaches
transparency before its clipping edge. Avoid a small hard rectangle of gradient behind an
otherwise open drawing. Match Hairline occlusion plates to the local surface.

The footer has **one continuous white-to-blue field** across its navigation, wordmark and legal
content. A gradient behind just the CTA or one footer cell does not fulfill that direction.
The security data-flow review has its own whole-region gradient and actual provider marks.

### Dark bento workbenches

A bento layout is an arrangement of related jobs with shared seams and aligned contents. It
is not permission to turn every paragraph into a separate box.

Use one coherent dark work area for a demonstration's title, controls, figure, transcript and
results. The Simulate problem section should not be half white and half black. Docs, API tools,
UCP tools and source inspectors use the same principle.

**An embedded chat or code document fills its owning grid cell (C2): no second decorative outer
frame, radius, tinted pad or spacer.** Its header and separators reach the cell edges. Keep
padding inside messages and code lines, meaningful internal dividers, and real product-result
cards. Stretch split work areas to the row height and keep the final answer reachable. Buttons
retain their native variant styles rather than inheriting a blanket workbench text color.

**No padded surfaces:** a code, chat or working document starts at the edges of its owning cell,
not inside an extra padded wrapper. Full-rail examples use the shared exterior seams and crosses.
Keep the readable gutter inside code lines, messages and prose; this rule removes padding between
surfaces, not the spacing that makes their content readable. It applies to docs quickstarts,
CLI/MCP examples and every equivalent shared consumer on mobile as well as desktop.
<!-- 2026-11-12 responsive review #10–11: “do this the whole space, no paddding on the sides and give it the crosses on the edges”; “add to the list rules that we cannot have padded surfaces”. -->

Why: The user explicitly rejected the nested framing: “you know we hate squares within square”.
<!-- 2026-11-12 learn-taste rule 2; exact user provenance: 0517.41: “no squares within squares, should be a black section”; 0703.09: “i dont like how its padded inside, you know we hate squares within square can we do this the whole square, but how do we differentiate form the left side, which also looks kinda ass”; 1511.02: “expand this to the whole card”. Approved with “write all” on 2026-11-12. -->

### Cutouts, radius and depth

Use only `rounded-none`, `rounded-sm`, `rounded-lg` and `rounded-full` (including their directional
variants). Square is for structural regions; small corners are for compact
menus; large corners are for inputs, buttons, dialogs, thumbnails and the workspace inner junction; full is for
avatars, dots and deliberate pills. Legacy theme names alias these values for compatibility;
new code uses the four approved names. Do not vary radii to decorate adjacent cards.

Cutouts are part of ecentic's original geometry and extend beyond navigation. They work on
**white, blue and dark surfaces**, including workflow bands, pricing and footer compositions.
Use shallow stepped shoulders aligned with rails; keep copy, controls and focus rings away
from the clipped decoration. Clip a decorative surface layer rather than the interactive tree.

Structural grids and section fields remain predominantly square. Modest rounding is welcome on
inputs, compact menus, product thumbnails and purposefully contained logo stacks. Shared
`rounded-lg` inputs are the default, matching buttons. This includes text/search fields, textareas, select/combobox triggers and upload controls; joined fields keep their inner seams square. The earlier small and zero-radius control defaults are superseded.
Blog thumbnails are slightly rounded squares. Do not make every long panel a rounded card.

Depth should describe the object. A complete product card can tilt or lift; rotating just its
content inside an unmoving frame looks broken. Subtle illumination or perspective supports a
physical illustration. Heavy floating shadows are not the main way to separate site sections.

## 7. Tonal ASCII

Use tonal dots from a clean recognizable source, preserving aspect ratio and scale (rule 4, C4).
Keep the recognizable winding path but render it with dots; code and protocol text stay literal.
ASCII coexists with Hairline and explanatory graphics. Before creating, converting or reviewing
ASCII, read the complete [ecentic-art contract](../../.agents/skills/ecentic-art/SKILL.md#tonal-ascii),
including accepted rationale, source provenance, production guidance and literal-text exceptions.

### Social previews and generic banners

Social previews share one composition across the site: official lockup, a concise localized title,
readable supporting copy, continuous rails and crosses, and contained tonal commerce artwork.
Keep raster artwork free of text so translated headings remain sharp. Fit complete CJK graphemes
and check long European titles at the actual 1200 × 630 export size.

The 13 November refresh uses an open blue shipping box with three product catalog cards. Generic
content banners may use its tonal silhouette in a separate full illustration plane. Preserve
page-specific Hairline figures, real brand marks, product photos and article imagery; those were
outside the requested refresh. Source, sampling settings and regeneration instructions live in
[social artwork](../marketing/social-artwork.md).

## 8. Hairline figures and commerce illustrations

Use meaningful custom subjects, complete recognizable silhouettes and no visible production/rest
labels; preserve accessible descriptions (rule 5, C3/C5). Integration heroes pair compact genuine
identity with a contextual figure (rule 6, X1). Before drawing or integrating a figure, read
[ecentic-art](../../.agents/skills/ecentic-art/SKILL.md#hairline-figures-and-commerce-illustrations)
for the subject map, fixed-engine contract, lifecycle, provenance and acceptance poses.

## 9. Explanatory graphics and measured charts

A graphic should show a concrete relationship: source → working catalog → chosen products,
question → product fields → result, or published change → destination. Start with that relationship
before adding a decorative line or animation.

Use the approved illustrated record/card vocabulary rather than a generic bordered list of keys.
Technical fields can remain visible in monospace with syntax colors; their container should read
as a coherent document or product card. An illustrative dimension chart uses supplied units and
must not imply an exact real-world fit from schematic proportions.

Connector paths are single, readable relationships with meaningful endpoints. Remove arrows
that point nowhere or imply a navigation/action that does not exist. A structural border and a
connector are different things; do not turn every border into a graph line.

Charts use the **thin-stroke measured grammar** in `MeasurementDial`, `MeasurementBars` and
`MeasurementRule`. They can respond to focus/pointer and reveal drawing strokes while retaining
quantitatively correct geometry. Do not use Hairline's decorative `Plot` to represent real scores,
prices or traffic.

- Read scores, prices, limits and series from their canonical data source.
- Keep tick positions, proportions, units and labels consistent with the value.
- Do not move a bar away from its value to produce a prettier animation.
- Use semantic color or one emphasized series with quieter alternatives.
- Provide the value in text and a table/equivalent accessible representation where appropriate.
- Limit grids and guide rules to those that aid reading; remove visual clutter around a small
  fee bar or dial.
- Reduced motion exposes the same complete result immediately.

A labeled sample score is not merchant performance. A fee estimator is a real calculation of
entered assumptions, not a fabricated forecast. Keep those distinctions visible.

## 10. Reusable interaction patterns

### Connected journeys

**Short ordered workflows use the shared connected journey/roadmap pattern (C6): a visible
spine, legible square markers, adjacent titles, meaningful figures and visible milestones.**
The approved Shopify and Connect steppers are the reference. Use `ConnectedJourney` for
setup/reference stages; keep the first useful explanation visible and disclose supporting detail
only where needed. A basic sequence must not depend on a text-only tab/button strip.

Use its static companion `JourneySteps` when every step is required reading. Feed setup and the
MCP handshake share that connected, icon-led sequence with all explanations visible. Keep
protocol methods in technical type, let long methods occupy their own mobile row, and put the
source document directly against the adjoining column's boundary.

Why: “i dont wanna click stuff”; the user explicitly asked to reuse the approved steppers.
<!-- 2026-11-12 learn-taste rule 7; exact user provenance: 2133-10: “can we do this like a roadmap or hairline or something, i dont wanna click stuff”; 0517.19: “pretty steppers. reuse this”; 0517.26: “youve done prettier stepers, use those”. Approved with “write all” on 2026-11-12. -->

For a process that must be understood without clicking, expose its ordered story and use the
shared `ItemCycle`, `StepPlayer` or sequence behavior as appropriate. Native Tabs can underlie a
real selection, but a bare text tab strip is not the complete presentation of a workflow.

Do not use large primary buttons as section-navigation controls. Simulate's changing stages use
proper square icon markers and synchronize the figure with the active explanation. Preserve
visible focus and the complete static reading order.

Carry the approved stage treatment across Shopify, WooCommerce, Merchant Center and AI channel
pages. Keep page-specific facts and outputs; consistent presentation does not make their
capabilities equivalent. Compact the content and art together rather than adding empty height.

### Source changes: one Git-style diff

**Before/after record examples use one visible shared Git-style diff (C1/C6).** Use `CodeDiff`
and `AnnotatedCodeComparison`: unchanged context, removed lines and added lines remain together.
The shared renderer owns header and annotation crosshairs so every consumer receives them.

Why (originally inferred; accepted via “write all”, 2026-11-12): A single readable change set shows the edit and its context without making the visitor toggle between hidden states.
<!-- 2026-11-12 learn-taste rule 9; exact user provenance: CHAT-DIFF: “can we make an git diff kinda thing, i think that would work best”; 0445.03: “and these changes for everything where this strucurre has been used”. Approved with “write all” on 2026-11-12. -->

- Concise filename/header, sample identity and meaningful change counts.
- Explicit `−` and `+` gutters as well as semantic color.
- Syntax highlighting and line numbers that match the source.
- A real copy action for the updated record, with localized feedback.
- A nearby explanation of why changed fields matter.
- Shared top and bottom structural intersections/crosses.
- Contained code wrapping or horizontal scrolling on narrow screens; no document overflow.

Remove Before/After toggle tabs, wipe controls and duplicated padded shells from this pattern.
Retain a genuine scenario selector if it changes the input record. Keep API previews and record
examples honest; do not add meaningless code complexity to make the product seem harder to use.

### Conversation and inspection

**Shopping examples use provider-appropriate query/message chrome, an assistant answer and
real or tonal product imagery (C2/C5).** Google AI Mode uses its own answer/search-result
composition. A quote block, table or workflow graphic alone is not a conversation. Adjacent
inspection supplies distinct concise evidence rather than duplicating the same product content.
Keep sample labeling and honest capability limits.

Why: The examples must look like their referenced shopping interfaces; quote blocks “look so ai”.
<!-- 2026-11-12 learn-taste rule 8; exact user provenance: 0626.12: “these examples should look like the chatgpt page or gemini page and with proper images of these products, can even be ascii products images but needs to look like proper gemini or chatgpt which i have attached the html off”; 0626.17: “no quotes, they look so ai”; 0703.11: “but make it look like ai mode proeply not this mockup, like ai mode”. Approved with “write all” on 2026-11-12. -->

The supplied Google AI Mode and ChatGPT captures are layout references: recognizable provider chrome,
a compact shopper message, a natural assistant response, actual product imagery and a coherent
shopping-result area. Use local sample imagery or clear tonal product images instead of generic
basket icons. Do not reproduce embedded scripts, ads, tracking or personal data from HTML captures.
Provider styling does not turn the illustration into an official or live provider session.

The conversation fills its owning section column. Do not put a rounded, bordered chat shell
inside a second padded or tinted panel. Internal message padding and actual product-result
tiles are useful; redundant decorative shells are not. Embedded previews start directly at their
structural divider; do not add another provider-logo pad or outer inset. Provider headers and
sample-note separators meet the column edges. Keep the complete answer and any following UCP
excerpt reachable. A fixed-height clip must not hide the final content, and
local horizontal overflow must not trap ordinary vertical page scrolling. Give Google AI Mode its
own query, answer and search-result composition instead of changing only the logo on a ChatGPT mockup.
Use small localized sample labeling without overwhelming the provider's interface hierarchy.

Differentiate the adjacent record inspection with a coherent technical surface and compact
source evidence. Do not repeat the same product thumbnail, full facts and explanation in both
columns. The shopper-facing answer and the source check must each contribute different information.
Travel and environmental photographs fill their image area with a deliberate crop; object product
photography may use contain when keeping the complete object is the purpose. Avoid inset white
padding around a room photo or letterboxing that wastes the result tile.

Inspection results should explain the evidence with a product/record and concise labeled facts.
Avoid long repeated rows of `null`, “Your listing” and “Comparison listing”, and avoid quote blocks
for ordinary product attributes. Keep a useful dark UCP excerpt as a distinct technical layer
below the shopping example; discovery does not establish checkout eligibility.

The first useful conversation and its evidence are visible at rest. Additional questions can
change the example, but the basic explanation must not require repeated clicking. The shared
replay can progressively write its scripted turns, show the fields inspected and settle on the
result. Its local transcript may scroll; the surrounding document must not jump.

Use “Example with sample data” in the active locale. A scripted response represents an
illustrative decision summary and supplied facts. It does not claim access to an AI provider's
private reasoning, a live provider session or a completed real purchase. Keep partial UCP
responses distinct from shopping-result cards and actual checkout behavior.

### Disclosure and selectors

Use native `@zenncore/web` Accordion, Tabs, Collapsible and other controls. Preserve their
keyboard and accessibility contracts. Useful applications include audience selection, fetched
file/surface selection, tool previews, FAQs and dense supporting research details.

Keep primary explanation visible. Use accordions for supporting evidence and long technical
reference material. There is no global ban on tabs or buttons: the rejected pattern is making a
simple sequential story dependent on a row of unlabeled or text-only clicks.
For integration setup, prefer a visible connected roadmap when every step is short and necessary.
Its content panels have deliberate confining rules and intersections; an unbounded gray expansion
beneath an accordion does not provide enough structure.

### Forms and conversion

All forms use `InferredForm`, Zod and `field()` descriptors. No raw-input clone or one-off manual
form state. Rectangular input chrome uses the shared `rounded-lg` default globally. Do not add a local `rounded-sm` override to a search field or prompt shell.

A store-address form sits directly in the hero's conversion row with its one primary submit
action and a nearby secondary demo action. Do not repeat “Check my store free” in a separate
button row above the same form. Avoid a gray calculator-style box around a simple hero input.

Validate real input and preserve the address through the existing handoff. Do not show fake scan
progress. Field errors explain how to fix the input and stay associated with their field.

### Actions, icons and states

**Use native shared primary/secondary/soft button variants with visible states on their actual
surface (rule 11).** The main action uses the primary gradient. Align related CTAs and
price/feature/action baselines; follow the [public pricing recipe](../../.agents/skills/ecentic-public-pages/SKILL.md#pricing)
for the three-plans-then-PAYG/Enterprise composition. Inputs use `rounded-lg`; product/blog
thumbnails are modestly rounded squares while structural bands remain predominantly square.
Do not duplicate a free-check CTA beside the same form.

Why (originally inferred; accepted via “write all”, 2026-11-12): Actions should be recognizable and comparable, while slight rounding is reserved for objects and controls rather than another outer panel.
<!-- 2026-11-12 learn-taste rule 11; exact user provenance: r1-05: “primary button, the one with the gradien”; 1844-01: “round the inputs off globally, its okay tonhave them a little round”; 1953-06: “the stable things need to be one row and thenpayg and the enterprise one row , and then the pricing needs to be here as well like what each tier offers”; 2032-09: “this buton is duplicated put the searchbar here and then the book a demo on the side of it”. Approved with “write all” on 2026-11-12. -->

Integration “Explore” may be primary; availability notification is secondary and left-aligned
on the same action row. A contact link remains a link, not a fake form submit.

Use **Nucleo UI outline-duo** subject and action icons through `@zenncore/icons`. Do not mix filled
duotone silhouettes with outline-duotone subjects in the same public system. Genuine provider
marks keep their identity; small structural arrows, chevrons, crosses and status marks can retain
their plain stroke where a second tone has no meaningful role. Fetch and generate through the
Nucleo/package workflow when a requested icon is absent. Do not approximate
icons with arbitrary inline SVG. Bare icons accompany source rows, contact routes, categories,
fields and recovery links at consistent alignment. A bare number is not a substitute for the
row's subject icon (rule 10). Size icons enough to read without inflating the row; do not add a
decorative icon to every paragraph.
<!-- 2026-11-12 responsive review #12: “can we commit to one maybe dutonoe outline? check every icon”. This supersedes the previous generic “commonly duotone” direction for public UI. -->

Status pairs a word with a semantic icon/color. Active controls have readable ink, a clear
marker and the appropriate full outline or component-selected treatment. They do not rely on
an isolated border fragment or color alone. Never override a button into invisible text.

## 11. Logos, media and evidence

Use `ProviderLogo` and the canonical provider asset map. Preserve official artwork, aspect ratio
and contrast. Do not replace a requested provider identity with an unrelated generic network.

Standalone logos and logo arcs are unframed. A deliberate **overlapping source stack** is the
exception: equal compact rounded holders keep silhouettes distinct and aligned. The approved
following-logo motion applies to that composed group, not a loose pile of images.

An arc needs room for its whole intended sweep or a clear ecentic box-logo endpoint. It must not
stop with a clipped partial card. Avoid showing the same prominent hero mark twice.

Official source/documentation rows share a legible bare icon at the left, title, URL/domain and
any verification metadata. Technical addresses use monospace. Preserve correct targets and
outbound-link behavior. Provider logos do not imply a commercial partnership or live capability.

Keep the original product film and genuine UI screenshots in their proof sections until separately
replaced. Do not put a dashboard screenshot inside the blue hero as decorative filler. Show
sample-store UI as sample-store UI, and do not suggest a merchant account was connected if it was
not. A drawing enhances the narrative; it does not replace proof that needs to be inspected.

Evidence components distinguish public studies, aggregate facts, live values and examples. Dense
methodology can be disclosed in an accordion. Do not invent KPI definitions, remove material
qualifications or use a dramatic graphic to blur simulation and observed traffic.

## 12. Motion and accessibility

### Purpose and implementation

**Requested illustrative replays use the established finite sequence with synchronized marker,
content and figure state (rule 13, C5).** Move the complete illustrated object when showing
depth. Charts use thin-line interaction while preserving real measured geometry. Keep the rest
and reduced-motion states and local scrolling; an illustration must never trigger a real action.
A static result still communicates the whole idea; “More animated” does not mean a loop per section.

Why (originally inferred; accepted via “write all”, 2026-11-12): Motion should explain a physical object, sequence or value rather than make unrelated pieces drift independently.
<!-- 2026-11-12 learn-taste rule 13; exact user provenance: 1753-30: “and it should move each stepper on its own”; 1844-07: “okay these cards are kinda offensice, inly the content is rotated and its kinda wired, maybe rething the cards only? the whole thing is perfect”; 2133-05: “i love this chart but can we have all charts be hairline stuff so theyre also animated and such? interactable and all that plus we use hairline more which i dont feel is eing used enough”; 0517.27: “this should be proper squares, and maybe icons instead of buttons and they should change on their own”. Approved with “write all” on 2026-11-12. -->

Use `Motion.Row`, `Motion.Up`, `Motion.Item` and `Motion.Stagger` for application animation.
The fixed Hairline engine is the explicit figure-runtime exception. Reuse existing shared
lifecycle and sequence helpers. Do not add a page-local animation library or a new perpetual
`requestAnimationFrame` loop for ordinary interface work.

Typical control/state transitions are 150–250ms and settle promptly. Coordinate a stage's text,
marker and figure through the same state. Keep light sweeps and reveal effects brief and
subordinate. Avoid scroll-jacking and pointer movement that makes information harder to read.

### Automatic examples

The user explicitly asked certain simulated demonstrations to advance themselves. This applies
to those explanatory sequences, not to real forms, billing choices or arbitrary site controls.

- Start only when the relevant example is visible and the visitor has not taken control.
- Progress through a finite story and stop at the end.
- Pause/stop on manual interaction, focus where necessary, hidden document or offscreen state.
- Offer the native playback control where useful; do not add a wall of Back/Next section buttons.
- Never move the page to follow new transcript lines. Scroll only the local log/transcript.
- Under reduced motion, present the complete static story or a complete meaningful final state.

### Universal baseline

Keyboard users can reach every real control and see focus. No required information is hover-only.
Use headings, landmarks, accessible names and associated field errors. Do not remove an image's
accessible description merely because its visible developer-style caption is removed.

Status and changes are communicated by text/symbols as well as color. Keep announcements useful;
a typing effect must not announce every character. Touch targets remain practical after mobile
compaction. Disable inappropriate mouse-hover effects on touch devices.

Server-rendered static content includes the important explanation, illustration rest pose and
recovery path. Loading, empty, error and no-JavaScript states should still be understandable.
No animation or lazy module is allowed to leave a blank primary section indefinitely.

## 13. Public route recipes

Before composing or reviewing a public route, read [ecentic-public-pages](../../.agents/skills/ecentic-public-pages/SKILL.md)
for its complete route-family recipe and scope limits. The recipes cover the homepage, platform,
integrations, channels, sectors, pricing, resources, legal/evidence pages, tools, support and recovery.
They preserve factual content and apply the shared canon; dashboard and onboarding remain below.

## 14. Shared navigation and footer

**Navigation keeps progressive blur and internal menu divisions without an opaque table-like
outer frame (rule 12, C5).** Cutouts structure white, blue and dark section surfaces along the
rails. The footer uses one continuous field across navigation, dimensional tonal wordmark and
legal content; the treatment must not stop at one cell.

Why (originally inferred; accepted via “write all”, 2026-11-12): The shell should feel continuous with the page, and cutout geometry should remain a recognizable part of ecentic beyond the navbar.
<!-- 2026-11-12 learn-taste rule 12; exact user provenance: r1-02: “progressive blur, progressive multiple layers of blur without the line at the bottom at all, just a blur graidnet”; 1844-10: “and the outside borders”; 1911-01: “for example this whole section can be with the cutouts”; 2032-10: “and i meant a gradient of the whole footer”. Approved with “write all” on 2026-11-12. -->

Navigation overlays the page without changing its scroll position. Blur fades without a hard
bottom edge; foreground contrast responds to the surface behind it, with reduced-motion support
and stable legibility on light, blue and dark backgrounds.
Mobile and desktop menus enter with a short centered fade and subtle blur, not horizontal travel.
Switching desktop menu groups also fades in place. Keep native focus trapping, Escape, focus
return and scrolling behavior. Under reduced motion remove scale and blur and reveal immediately.
<!-- 2026-11-12 responsive review #5: “fade in from the center or blur in, not slide from the right? same for the desktpp one ideally”. -->

Desktop mega menus have transparent bodies, useful internal rules and no outside table box.
Subtle header/footer tint is allowed. Mobile navigation preserves the same transparent/internal
rule direction rather than introducing a filled table. Keep centered geometry and sensible
scroll limits without forcing the underlying document to jump.

The locale selector is a recognizable flag control with clear affordance, transparent chrome
and space from Install. Keep assets under `public`, not bespoke flag React components. Mobile
menu logo remains left-aligned, with the language choice in the intended menu layout and proper
shared variants for the bottom actions.

The global closing CTA uses tonal artwork, one clear conversion hierarchy and the same geometry
on all public pages. Footer navigation, drawn tonal wordmark and legal content share the continuous
gradient described earlier. Keep real link groups accessible and consistently aligned; don't
turn the wordmark into a replacement for navigation.

## 15. Dashboard and onboarding recipes

### Store hub

`/dashboard` is the entry to the merchant's stores. Keep its logo and account
controls in the fixed header, with the working area scrolling below. The page heading and
rails remain in the server-rendered shell while store data streams in.

For an empty account, use one continuous split plane: a blue cutout with a recognizable
tonal catalog illustration, alongside the connection task. Provide one main connection
action and a distinct CSV-import option, followed by a short connected setup roadmap.
On mobile the task precedes the artwork. Avoid a dashed placeholder box or duplicated CTAs.

Connected stores use full-width entries with genuine platform identity, a readable name and
domain, connection state, metrics and an obvious dashboard link. A lone store owns its
metrics once; show cross-store aggregates only when there are multiple stores. Label
simulated win rate explicitly, retain the AI-visit time window and distinguish an unmeasured
rate from zero. Keep statuses and numbers localized. On narrow screens use readable
label/value rows; larger layouts align the metric values across columns even when labels wrap.
Each shared seam has one border owner.

### Dashboard shell and overview

Keep a persistent store switcher and six primary destinations: Overview, Products, Optimize, AI research, Channels and Results. This approved consolidation supersedes the earlier catalog/intelligence/channel accordions. Related routes expand inside their parent sidebar group using the package Accordion. Expand the active group automatically and keep subpage links compact; do not repeat the same links in a horizontal bar above the page. Technical tools remain nested under Channels. Preserve existing route URLs and their active parent in navigation. The latest 13 November Shopify
reference establishes a solid charcoal sidebar and top bar around an off-white workspace,
with a gently rounded inner junction. Use the negative trademark on the dark chrome. This
supersedes the earlier all-off-white navigation direction; the rejection of technical-looking
gradient rails, angular command decks and decorative chrome still applies. Keep blue for
primary actions, selection and measured data.

Navigation is a coherent workspace frame. Store identity, store switching and “All stores”
belong in one selector. Group account identity, settings, billing and the current plan in a
compact account menu rather than scattering a plan badge among unrelated utility icons.
Keep search directly reachable, including on mobile. The dashboard search opens as an opaque charcoal extension of its top-bar field, using the package Popover and Command components without a page backdrop. Match Judy’s emphasis charcoal and restrained vertical highlight. A short opacity/blur reveal uses the package Popover transition, with no lateral slide, zoom or delayed focus; remove the transition and blur for reduced motion. Keep the input immediately ready for typing, support arrow-key selection and Enter, and return focus to the field on Escape. Sidebar families use the package Accordion with a short height/opacity transition and rotating chevron; reduced motion removes these transitions. Keep child routes in the sidebar, never in a duplicate band above the page. Dashboard language selection lives in
Settings > Account, not in the top bar. Notifications belong inside the account menu, using
the shared menu components rather than a separate top-bar bell. Menus
are compact, gently rounded and separated before reset or destructive actions. Dropdowns,
submenus and compact explanatory popovers use the theme's `shadow-sm`; heavy floating shadows
must not make filters look like modal dialogs. Popup surfaces must be opaque and use declared
theme colors (`bg-background-rich`, `text-foreground`). Legacy component-library names such
as `bg-popover` do not exist in this theme and leave underlying table text visible. Inspect
the computed background, not merely the presence of a background class in source.

Use a compact 28–30px page heading and nearby subtitle. Do not interpret the hairline
identity as thin letterforms: page headings and key results are semibold, navigation and
product titles are medium-to-semibold, and supporting copy is regular. Hairlines provide
the fine detail; type provides hierarchy. Use one compact, function-specific Hairline drawing for each dashboard header through `DashboardHeaderFigure`. This 14 November direction supersedes the earlier mixed ASCII/header-icon treatment. Keep a recognizable rest pose and restrained pointer response; use product documents for catalogs, inspection equipment for data quality and paired product cards for comparisons. Freshness is a plain,
localized timestamp, not a tracked uppercase status pill.

The overview answers what needs attention, what changed, and what to do next. Lead with
real missing product facts, products not yet compared, and eligible listing opportunities,
each linked to the relevant work. Give the next-step section a compact light, subtly tinted heading and
connected light rows. Use real counts; missing-field counts may overlap and must not be
summed into a product total. An optimization queue is not proof that a draft exists or that
sales or win rates improved. Estimated lift must never be presented as observed lift.

Keep the latest simulated win rate and compact scan trend together as supporting evidence.
The headline and chart use the same completed scan results. Changes are percentage points;
separate scans can contain different products and competitors, so explain that limitation.
Use a fixed 0–100% scale, localized dates, keyboard-inspectable points and dark, high-contrast
tooltips. Avoid an oversized row repeating one number for every model. Unmeasured products
show an em dash rather than a losing score.

Separate observed AI-referral events from agent and crawler requests, state the time window,
and never relabel them as unique shoppers, purchases, citations or simulated wins. Exclude
tracker test pings from activity totals. Group detector identifiers into readable provider
rows with separate referral/request columns instead of a long stack of decorative bars.
Name a trend's actual provider coverage when it includes only a subset of the breakdown.
Keep recent scan activity as compact linked rows, with a quiet vertical connector and timestamps.
A pair of edge crosshairs can mark the section seam; avoid adding them to every row.
Distinguish queued, running, completed and failed states; do not show progress totals when
the accessor cannot provide a correct planned denominator.
Direct links should take the merchant to the corresponding scan, filtered catalog or action. The default Overview stops after its useful summary and recent activity; full catalogs and research tables belong in their task destinations. Existing `?view=products|competitors|agents` overview links remain compatible. Results shows store-scoped recorded referrals and requests; reports explicitly cover all stores in the account. Do not advertise report scheduling or a measured optimization lift that the saved data cannot establish. Account-level Reports and Settings use the same charcoal header and light, edge-to-edge workspace as the store dashboard. Hide unpersisted settings switches instead of presenting local state as a saved preference.

Structural surfaces reach the content pane edges: chart regions, scan activity, table headers
and rows, section rules and hatch gutters have no outer horizontal inset. Put reading padding
inside headings and cells rather than around a surface. Give each shared border one owner at
full hairline contrast. Keep crosshairs visible at pane-edge seams. The rounded shell does
not imply rounded data cards: use square connected regions and shared compact blue-selected
tabs rather than wide pastel selectors.

A bottom assistant dock uses Judy, a playful blue Fiat 500-inspired toy car with the grain
texture of the ecentic mark. The control is a compact black pill: `rounded-full`, `h-12`, `max-w-80`, with a `w-10 h-8` car so the illustration supports the label. A restrained vertical theme gradient and inner highlight give it a raised surface. Hover, pressed and open states remain charcoal, without inheriting the shared popover trigger’s light hover background. A small masked progressive backdrop blur and a low-opacity blurred surround melt the outside edge into the workspace; the title, image and controls remain crisp. This is an explicit exception to the light content-region rule. This replaces the earlier robot
and the more realistic Mini Cooper interpretation.
While its AI functionality is deferred, label it as a preview and explain that state on open;
do not imply that a prompt was sent or processed. Bottom scroll fades must be subtle and
pointer-transparent. Reserve enough space for the final rows and actions to clear the dock.
This dashboard treatment does not replace the public site's tonal ASCII and Hairline language.
Give every dashboard page its own function-specific Hairline drawing, including nested tools,
setup routes and account pages. Use the route `subject` API in
`dashboard/_components/header-figure.tsx`, so the subject is consistent in the shell and
loading state. Research uses a telescope, Questions uses conversation cards, Brand uses a
megaphone, and Catalog rank uses a shelf ladder. Do not fall back to the same document stack,
robot or generic network across unrelated pages. Retain genuine product thumbnails in the
product-detail header; its unique product-label drawing is the missing-image fallback.
Check every new drawing at actual header size, at rest, at pointer extremes and with reduced
motion. The SSR rest image and interactive figure must represent the same object.
Empty states use composed illustrative graphics rather than
another ASCII emblem. Data Quality specifically uses a custom interactive Hairline inspection tray with cards and a scanner; its header uses a compact inspection scanner. Their surface fills the remaining workspace instead of ending at an
arbitrary horizontal rule midway down an empty page.

The latest Products/Brand follow-up rejects black workspace cards against the black sidebar.
Keep content regions white, off-white or subtly primary-tinted, using ink text and continuous
hairlines for definition. The charcoal navigation frame stays distinct. Dark chart tooltips
and genuine code surfaces may retain their task-specific treatment; do not extend them into
large dark metric cells, content headers or diagnostic cards.

### Brand diagnostics

Brand uses a compact megaphone Hairline figure and heading on the workspace plane, without an inset vertical
rail or an uppercase context pill. Lead with the diagnosis and mention rates for questions
with and without the brand name, including the successful answer counts and denominators.
No sample is an em dash, not 0%. Remove decorative radar scores that obscure the evidence.
Keep rates aligned to the top. Long diagnoses start with a short preview and an accessible
expand control, so the first screen still exposes the evidence and next steps. Use the package soft variant for this and other secondary dashboard actions; avoid foreground-outline buttons. Both mention meters share the same red-to-green theme scale across the complete segmented strip, rather than repeating a gradient per square. Uncounted segments remain neutral and the count and denominator remain explicit.

Findings use a clear connected journey rather than oversized blocks of prose. A real company
or source identity uses its genuine logo or favicon; an unknown identity uses quiet initials.
Generic office or globe symbols must not masquerade as brand marks. Subject/action icons use
the shared outline-duotone family. AI evidence prose may emphasize a few important phrases in
semibold while preserving the complete sentence, including negation and qualifications; do not
create a colored-keyword rainbow or imply that a styled phrase is independently verified.
Contain genuine logos and favicons within consistent rounded light frames. Size the mark to
the available inner area with `object-contain`; a fixed image size must not overflow a smaller
saved-answer identity frame. Preserve authentic aspect ratios and brand colors.

Saved answer summaries are searchable and filterable by outcome. Keep suggestions, answers
and site checks in the standard compact tabs; all content surfaces reach the workspace
edges. Model-suggested sources must not be called verified citations. Identify the engines
actually used and make the simulated nature of the snapshot clear. Public file checks do
not establish indexing, recommendation or checkout readiness.
The current engine receives the audited brand as context even for unbranded question
wording; do not present those counts as a blind recall measurement. Keep this methodology
available through a compact, keyboard-accessible “How this works” disclosure beside report
metadata, rather than a full-width paragraph separating the summary from its tabs. A pair of
crosshairs at the pane's top seam and the tab seam is sufficient; no extra borders or marks
on every row.

The first-run state has one analysis action and a short explanation. Initial loading uses
a matching skeleton; an active analysis uses a clear in-progress state without fake
percentages. Retain a completed report while refreshing, disable duplicate run actions,
and display understandable failed-run and data-unavailable states. Keep raw provider errors
out of the UI. Test absent samples, long answers, empty filters and reduced motion as well
as populated desktop/mobile layouts.

### Product tables and workspace scrolling

Use the shared DataTable/Table components. The product title owns the flexible column; long
names truncate or wrap intentionally without pushing actions away. Thumbnails are rounded
squares. Keep meaningful attributes, statuses, sorting/filtering and row actions consistent.
Do not hide critical identity to preserve an unnecessary decorative column. Give dense tables
a minimum width that leaves at least 260px for product identity, with horizontal scrolling
contained in the table. The overview table shows the catalog in ten-row pages with decision-relevant columns, title/SKU
search, comparison-state filtering, sorting and a column menu.

The full Products list opens with a compact Hairline document stack, clear title and Add products
action. Follow it with one short summary strip: imported products, products with recorded AI
comparisons, and unique products missing at least one of the six catalog fields. The catalog
comes immediately next at the workspace edges. Keep overview charts, traffic and long scan
narratives on their own screens; do not place them ahead of the working catalog.
Make this a connected visual strip: a compact, lightly tinted inventory region can carry a recognizable
tonal catalog subject, while compared/incomplete counts use quiet light regions and bars against
the actual catalog total. Keep each original count and its explanation visible. Empty catalogs
must not show a `/0` denominator or a fabricated progress value.

Show product identity, price, AI win rate and field coverage by default. Model-specific results
and Updated remain optional columns. Sorting happens across the filtered catalog before server
pagination, with stable ties and missing prices/untested rates kept last. Preserve column choices
and search focus across queries; reset selection when the page or dataset changes. Selection is
explicitly current-page and enables a non-destructive CSV export with spreadsheet-formula
protection. Controls must change actual rows, not only their visual state. Keep pagination controls mounted at the first and last page; mark unavailable actions with `aria-disabled`, skip them in sequential focus, and guard their handlers so reaching a boundary does not drop the keyboard user’s focus.

A measured 0% is a real result; an untested product or model has no measured percentage. Field
coverage is presence of title, description, price, image, SKU and structured data, not an AI quality
assessment or an optimization status. Updated is the product record timestamp. Never label it
Last scan, guess a /100 capacity or infer published optimization from a score. Format numbers,
percentages and known currencies for the selected locale; an unknown currency must not become USD.

Empty and filtered-empty feedback occupies the viewport-width section, outside the wide table.
Retain search/filter recovery, a friendly retry with pending feedback, and matching reduced-motion
skeletons. Each toolbar, missing-field row, selection row and table/footer seam has one border
owner, with only a few crosses at true workspace edges.

Keep pagination compact and sentence case, with the range and page actions in one useful
footer. Avoid duplicate full-width count/pager rows, tracked uppercase labels and redundant
bottom padding. The workspace supplies clearance for Judy; the catalog must not add a second
empty spacer. Columns and filter triggers use the same restrained package Button treatment. The product filter builder is an explicit charcoal overlay exception: readable conditions, generous control widths and light nested menus, with the shared package Popover handling dismissal and focus. While a sort or filter loads, retain the old rows under a subtle blur and a centered Hairline inspection indicator; keep the toolbar sharp and disable duplicate row actions. Remove blur transitions for reduced motion. This loading feedback must reflect real pending work and must not invent a progress percentage.

### Individual product workspace

Open with the product itself: real image, saved title, status, price and source. A missing
image gets a clearly identified image placeholder, never invented product photography or an
unrelated catalog emblem. Use an initial Listing & channels tab with full-region previews,
source connection state and recorded feed facts. Move simulation metrics into Comparisons;
do not lead every product visit with duplicated model-score cards.

Storefront, Google and ChatGPT views are illustrative renderings of saved fields, not screenshots
or proof that a provider displays the product. Preserve real values and label the preview.
No fabricated rating, recommendation, approval, availability or checkout action belongs in it.
Google's submitted input and processed product are different states. Show exact recorded offer
identity, market/language and sent/verified timestamps when available; an override verified by
the existing job is not guaranteed shopper visibility. Unsupported supplemental sync, missing
connection, setup, no product record and failed reads must remain distinct.

Source sync is an import of the connected catalog. Offer management can affect published
optimizations across the store. Route users to those existing workflows with truthful labels;
do not invent a single-product sync action. Keep read-only page navigation free of writes and
paid AI work. AI content review starts from an explicit action, with pending/error/retry states,
while the saved-field checklist remains available immediately. Use Zenncore Tabs, Accordion,
DataTable, Popover, AlertDialog and Button for these controls.

### Optimize workbench

Lead with actionable, store-scoped work and real saved history. Candidate products are not saved drafts; the current generate-and-publish action needs an explicit explanation and confirmation. Do not show projected growth or synthetic `winRateAfter` values as observed improvements. Use standard tabs, compact search and flush light rows with real product identities and measured comparison denominators. Keep pending, failed, dismissed and published states distinct. Bulk actions operate only on the current store, report partial failures, and do not republish successful items on retry. Until a lightweight accurate queue count exists, omit the sidebar badge rather than display a published-history count as pending work.

Secondary inspection actions use the shared `Button` with `variant="soft"` and a neutral tone; preserve primary blue publishing/review actions. No custom popovers or ad hoc control styles.

### Data Quality

Data Quality explains deterministic checks of saved active-product data. It is not a live
channel approval report, an AI score, or proof of shopping visibility. Keep that scope near
the summary; use genuine provider marks for Google and ChatGPT and distinguish their checks
from shared catalog rules.

Use one connected, full-width summary followed by compact tabs for issues and product findings.
Group the issue queue by the highest applicable severity, then affected-product count; do not
truncate it to an arbitrary top-eight list. An issue counts each affected product once, even
when it has multiple findings. Surface and severity filters must change the actual issue queue
and searchable product results. Keep all advisories available and preserve links to official
rule references and the affected product's detail page.

Status buckets are disjoint. The share without blockers or warnings includes advisory-only
products, consistent with the existing rules engine, and must be labeled accordingly. No active
products is an empty scope with no percentage, never an all-clear report; draft products in
the catalog do not establish a populated active-product audit. A failed read is a separate
retryable state. Give loaded, empty, filtered-empty, error and loading surfaces equal care,
including mobile layouts and reduced-motion skeletons. Product lists and expanded issue
details stay flush to their containing region, with one owner for each separator.

For internally scrolling flex workspaces, every ancestor in the height chain needs the
appropriate `min-h-0 flex-1 overflow-hidden`. The table/log owns its scroll container. Avoid
scrolling the whole document from a log sentinel. Horizontal overflow must not destroy vertical
page navigation on ordinary public tables.

### Channel checks and technical tools

Give each tool one obvious entry task. Agentic starts with the store, scan status and a single
scan action. Keep external-service attribution and the domain-sharing explanation concise and
adjacent to that action, rather than in a separate full-width disclaimer strip. Before the first
scan, icon-led descriptions can explain what will be checked; they must not imply a saved score
or completed work.

Catalog access separates the product-feed handoff from the preceding readiness checks with one
full-width seam. Use meaningful file/rank icons and a compact URL/action region. A new handoff
must not read as another paragraph belonging to the last check.

UCP opens on the store-prefilled checkout check. Keep product data as a separate standard tab;
generated product coverage is not proof of live checkout support. Put the coverage explanation
and optional endpoint/lifecycle tests behind package Accordions instead of a permanently visible
technical grid or competing forms. Keep the lifecycle test’s potential test-cart effect explicit.
Use light full-width sections, one border owner per seam and sparse edge crosses. Public versions
of shared tools retain their own approved composition.

### Onboarding

The four steps are Connect → Products → Competitors → Scan. Each screen names the task and
explains the next action. The desktop narrative panel occupies its intended side of the split;
on smaller screens it yields to the task. Progress is a connected visual roadmap: relevant
commerce illustrations above one route, with completed segments and the current checkpoint
distinguished. Mobile retains the current illustration, stage label, count and compact route.

Catalog import, selected products and named competitors retain their actual behavior. Loading
and scan phases describe real work; no decorative success can get ahead of the result. Provide
a useful next step on failure or empty import. Footer navigation remains visible without
covering content. Logs scroll internally and do not pull the page or its ancestors.

Auth and onboarding retain the public visual language: full-plane blue gradients, clipped
cutout corners, a single owner for each hairline, and genuine store/model marks. The narrative
side can be expressive; the task surface remains direct. Distinguish sign-in methods from
illustrative AI providers: a model logo must not suggest another authentication option.
Keep form controls and step labels readable at narrow widths and with longer translations.

On desktop, the auth narrative panel fills the viewport while the form pane scrolls
independently beneath its header. Use the genuine negative trademark on the blue plane,
not a CSS filter that erases the box artwork. Keep the existing fonts and use medium
headings and stronger local labels to establish hierarchy. At narrow widths, return to
ordinary document flow rather than squeezing both panes together.

The platform directory is searchable and distinguishes direct connections, supported
feed/CSV import routes and planned integrations. A provider mark does not imply a live
native connection. Compose search as one compact field, with its icon and result count
inside the control and a properly associated accessible label. Uploads use one continuous
surface, localized picker copy and an
obvious way to replace the selected file. Empty product states pair a relevant illustration
with working store-connection and CSV-import actions.

Keep the shared flag language switcher visible in public, auth, onboarding and shared-report
chrome. Place it outside scrollable task content where the shell permits. In the dashboard,
including the store hub, language selection belongs in Settings > Account using the shared
Zenncore Select; the top bar contains search and the account menu. This supersedes the earlier
always-visible dashboard language rule. Preserve the current route, query and fragment when
switching, and keep Settings reachable without a billing entitlement.

Notifications appear at the top center, clear of the support launcher, with a dark opaque
surface, readable title/body contrast, a status icon and a visible dismiss control. Stacks
expand downward; motion respects reduced-motion preferences and mobile safe areas.

Errors explain the failed task and the recovery action in the current locale. Map stable server
error identities to controlled copy; never show raw provider/schema/SQL messages. An AI response
schema failure is a service problem, not a merchant input mistake. Required-field errors,
password visibility labels, pending states and streamed progress are part of localization too.

Do not introduce a marketing workbench simply to make onboarding look more elaborate. Clarity,
predictable progress and a meaningful first result are the design goal.

## 16. Implementation contract

Use the repository's documented `@zenncore/*` packages before local duplicates. Interactive UI
comes from `@zenncore/web`, forms from `InferredForm`/`field()`, icons from `@zenncore/icons`, and
shared utilities from `@zenncore/utils`. Page-only components belong in `_components/` beside
the route. Shared patterns belong in the shared component namespace.

For noninteractive code/table content in `ScrollArea`, use `viewportProps` to put the actual
scrolling viewport in the keyboard order with a meaningful region label. Focusing only an outer
wrapper does not make its inner scroller keyboard-accessible. See `docs/web/scroll-area.md`.

Use semantic Tailwind classes. Do not create new `.css` or `.module.css` files for marketing
variations. Put reusable structural rules in the existing global stylesheet when utilities are
insufficient. Inline styles are reserved for computed geometry or runtime values, not an
alternative static styling system. Do not hoist repeated class strings into arbitrary constants.

Keep all static user-facing copy in next-intl, with English and Spanish parity. Use catalog
fragments and the merge script; structured messages come from `getMessages` / `useMessages`.
Preserve role-based action keys and sentence-case copy. Do not mask a missing translation with
an English fallback. Check longer Spanish labels in the actual layout.

Every non-auth/onboarding `page.tsx` remains a server-rendered shell with real initial HTML.
Async data islands use Suspense and matching skeletons. Keep a small client boundary around
interactive examples instead of turning the entire marketing page into a client component.
Respect existing product gates, server actions and error handling.

Changes to presentation do not alter checkout, billing, attribution, access scopes, source data,
tracking or AI capability claims unless the user separately authorizes that behavior change.

### Implementation map

Paths below are relative to the repository root. These are assembly references; the guide above
states which patterns to repeat.

| Concern | Reference |
| --- | --- |
| Tokens | `packages/shared/config/src/tailwind/globals.css` |
| Public structural rules and surface themes | `apps/web/src/app/globals.css` |
| Fonts | `apps/web/src/components/marketing/fonts.ts` |
| Bands, rails, heading, closing CTA | `apps/web/src/components/marketing/primitives.tsx` |
| Shared page / hero mapping | `apps/web/src/components/marketing/page.tsx` |
| Crosses | `apps/web/src/components/plus.tsx` |
| Gutters and grid helpers | `apps/web/src/app/[locale]/(main)/dashboard/_components/grid.tsx` |
| Motion vocabulary | `apps/web/src/components/motion.tsx` |
| Navigation and footer | `apps/web/src/components/navbar.tsx`, `apps/web/src/components/footer.tsx` |
| Light field | `apps/web/src/components/marketing/illustration-glow.tsx` |
| Tonal art and wordmark | `apps/web/src/components/marketing/evolving-ascii.tsx`, `apps/web/src/components/marketing/ascii-atmosphere.tsx`, `apps/web/src/components/marketing/ascii-wordmark.tsx` |
| Provider identity | `apps/web/src/components/marketing/provider-logo.tsx`, `apps/web/src/components/marketing/provider-arc.tsx`; `apps/web/src/content/provider-logos.ts` |
| Figure vocabulary | `apps/web/src/components/marketing/commerce-figure.tsx` |
| Figure runtime and rest poses | `apps/web/src/components/hairline/`; `apps/web/public/hairline/custom/` |
| Measured charts | `apps/web/src/components/hairline/measurement-chart.tsx` |
| Connected setup stages | `apps/web/src/components/marketing/connected-journey.tsx` |
| Shared explanatory interactions | `apps/web/src/components/marketing/interactive/` |
| Unified diff | `apps/web/src/components/marketing/interactive/code-comparison.tsx`, `apps/web/src/components/marketing/interactive/source-diff.ts` |
| Shopping mockups and sample imagery | `apps/web/src/app/[locale]/(main)/solutions/_components/shopping-conversation.tsx`, `apps/web/src/app/[locale]/(main)/solutions/_components/shopping-products.ts` |
| Conversation replay | `apps/web/src/components/marketing/interactive/agent-replay.tsx`, `apps/web/src/components/marketing/interactive/replay-console.tsx`, `apps/web/src/components/marketing/interactive/replay-scene.tsx` |
| Finite sequence lifecycle | `apps/web/src/components/marketing/interactive/use-sequence.ts` |
| Public source/document links | `apps/web/src/components/marketing/sources.tsx` |
| After-scan explanation | `apps/web/src/components/marketing/tracking-overview.tsx` |
| Evidence and disclosures | `apps/web/src/components/marketing/evidence*.tsx` |
| Privacy overview and contents | `apps/web/src/app/[locale]/(main)/privacy-policy/_components/privacy-overview.tsx`, `apps/web/src/app/[locale]/(main)/privacy-policy/_components/privacy-contents.tsx` |
| Customer story evidence | `apps/web/src/app/[locale]/(main)/stories/_components/stories-evidence.tsx` |
| Current Enterprise review copy task | `docs/marketing/review-followups.md` |

## 17. Settled decisions and retired alternatives

| Earlier experiment / recurring failure | Current decision |
| --- | --- |
| Replacing unclear ASCII everywhere with line art | Tonal ASCII, custom Hairline and explanatory graphics coexist |
| Dense noisy characters or squashed hands | Recognizable source and tonal-dot image sampling with correct proportions |
| A mixed-character winding path exception | Keep the recognizable route; use tonal dots; actual code/protocol text stays literal |
| One Hairline figure per page, only on light | Meaningful figures across sections; match each actual light/dark surface |
| Generic drawers/baskets/hubs for every concept | Match the physical object to the flow, provider or sector |
| Outline-only footer wordmark | Dimensional tonal-dot wordmark with a finite drawing reveal |
| White-only or black-only use of cutouts | Cutouts work on white, blue and dark surfaces |
| Gradient behind one footer subsection | One continuous footer field |
| Repeated small padded blue/black boxes | Coherent section or workbench with meaningful internal structure |
| Chat card padded inside another panel | Conversation fills the column; distinct compact source inspection beside it |
| Flat logo filling the integration hero | Compact genuine identity and a semantic Hairline illustration |
| Bare Before/After tabs or wipe controls | One visible Git-style source diff |
| Text tabs / buttons concealing a simple sequence | Connected stages; visible story; native selection only where useful |
| Quoted prompts or a replay formatted as a table | Shopper/assistant conversation plus visible product inspection |
| A separate animated control for every stage | Synchronized icon markers and finite automatic examples where requested |
| Extending every nested line to the viewport | Full-width structural seams; contained internal dividers |
| Rotating only card contents | Move the complete illustrated object |
| Unframed overlapping logos | Rounded holders for overlaps; standalone marks/arcs remain unframed |
| Square-only form controls | Shared modestly rounded inputs |
| Public pricing in a tentative 2×2 arrangement | Three flat plans, then PAYG + Enterprise |
| Removing the cap as a billing change | Remove the callout only; preserve actual billing terms |
| Polishing the homepage and Shopify only | Audit and adapt every relevant public route family |

## 18. Verification and delivery

Verify the component and every page family affected by a shared change (rule 14). Enumerate
consumers first, then record the routes, widths, locales and states actually checked. A screenshot
of one hero does not establish that its code panel, mobile controls and footer also work.

Use [C1–C6 design checks](../marketing/design-checks.md) for scoped structural/embedded-surface
checks, visible art labels, source/renderer bindings, named visual states and explanatory-process
advisories. From `apps/web`, run `bun run design:source`, `bun run design:runtime`,
`bun run design:review` and `bun run design:test` as applicable to the changed pattern. Automated
checks do not manufacture a visual pass: C5 records reviewed/not-reviewed state and evidence.
Existing flags remain findings until a verified source change resolves them. Record exact
owners/routes and distinguish rule-writing delivery from source-fix delivery.

**Visual and responsive:** inspect representative wide desktop (1440/1508), compact desktop or
tablet (around 1135), and mobile (390), in English and Spanish. Check complete object silhouettes,
heading wraps, CTA baselines, line ownership, cross positions, continuous gradients, clean code
edges and no horizontal document overflow. Test sticky panels at their boundaries.

**Interaction:** use keyboard and pointer, open/collapse controls, change real selections, copy
code, validate invalid/empty input and inspect failure states. Check focus contrast on light and
dark backgrounds. Confirm automatic examples stop, pause appropriately and do not scroll the page.
Check reduced motion and the unenhanced/rest state.

**Semantics and accessibility:** verify titles/landmarks, labels, meaningful status text, real
links and sample-data labels. Run accessibility checks on affected pages and address serious or
critical issues. Do not claim an automated accessibility result that was not actually run.

**Engineering:** run scoped formatting/lint, appropriate tests, `bun run build:web`, translation
merge/type generation and `bun run i18n:check`. The repository has pre-existing TypeScript errors;
compare the baseline by diagnostic/file rather than declaring a clean check because a build passed.
Fix new diagnostics introduced by the change.

**Review hygiene:** assign screenshots by scope; keep them out of the main chat when requested.
Record source paths, checks and coverage in text. Do not copy old screenshot embeds into summaries.
Read the full review log before declaring a round covered, and check sibling components for an
explicitly global request.

Update this guide when a new direction is accepted. Put it in the relevant section, record the
supersession in the review ledger, and remove the obsolete instruction. A future agent should be
able to implement the current system without reconstructing the entire conversation.
