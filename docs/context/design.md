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

### Onboarding

Guided and progressive. A blue narrative plane and light task workspace explain the current
step on desktop. Persistent progress makes the next step predictable. Real logs and results
show computation; they are not decorative theater. On mobile, the task takes priority and
progress compresses into dots plus a count.

These modes share tokens, controls and semantic hierarchy. They intentionally use different
density, scale and amounts of illustration.

## 4. Color and typography

### Semantic color

The implementation source is `packages/shared/config/src/tailwind/globals.css`. The values below
describe the current palette; components use semantic utilities or semantic custom properties,
not copied hex values or raw palette classes.

| Role | Token | Current base / use |
| --- | --- | --- |
| Page canvas | `background` | `#f5f5f5` |
| Supporting surface | `background-dimmed` | `#e8e8e8`; bounded supporting regions |
| Reading/data surface | `background-rich` | White |
| High-emphasis text | `foreground-rich` | `#16181d` |
| Body text | `foreground` | `#404040` |
| Supporting text | `foreground-dimmed` | `#666666`; readable on the muted surface |
| Brand / action | `primary` | `#1572fa` |
| Blue text on light | `primary-text` | Contrast-adjusted `#0a5bd3` |
| Light blue on dark | `primary-rich` | `#5b9dff` |
| Dark workbench | `emphasis-dimmed`, `emphasis`, `emphasis-rich` | Related charcoal surfaces |
| Structural separator | `accent-foreground` | Quiet neutral rule |
| Outcomes | `success`, `warning`, `error`, `info` | Semantic status, with text/icon support |

Blue carries brand, active state or a deliberate major field. It does not need to color every
heading, border and icon. Real provider marks retain their genuine brand colors. Code syntax
and semantic outcomes can introduce supporting colors without becoming a decorative rainbow.

On dark or blue fields, use the appropriate light text tokens and opacity hierarchy. Audit
buttons separately: a section-wide text override must not make a primary or secondary button
label disappear. Disabled, focused, hovered and selected controls must all remain readable.

### Fonts and weight

Public headings use local **LT Superior** through `font-heading`. Body copy, controls and ordinary
numeric evidence use local **Red Hat Display** through `font-body`. Keep the established product
font wiring in dashboard and onboarding. Do not add page-local fonts.

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

Keep headings sentence case. Use existing `SectionKicker` conventions for operational indexes;
do not scatter new tracked uppercase micro-labels through marketing or dashboard cards.
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

Cutouts are part of ecentic's original geometry and extend beyond navigation. They work on
**white, blue and dark surfaces**, including workflow bands, pricing and footer compositions.
Use shallow stepped shoulders aligned with rails; keep copy, controls and focus rings away
from the clipped decoration. Clip a decorative surface layer rather than the interactive tree.

Structural grids and section fields remain predominantly square. Modest rounding is welcome on
inputs, compact menus, product thumbnails and purposefully contained logo stacks. Shared
`rounded-md` inputs are the default; the early radius-zero rule is superseded for controls.
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
form state. Inputs can be modestly rounded globally.

A store-address form sits directly in the hero's conversion row with its one primary submit
action and a nearby secondary demo action. Do not repeat “Check my store free” in a separate
button row above the same form. Avoid a gray calculator-style box around a simple hero input.

Validate real input and preserve the address through the existing handoff. Do not show fake scan
progress. Field errors explain how to fix the input and stay associated with their field.

### Actions, icons and states

**Use native shared primary/secondary/soft button variants with visible states on their actual
surface (rule 11).** The main action uses the primary gradient. Align related CTAs and
price/feature/action baselines; follow the [public pricing recipe](../../.agents/skills/ecentic-public-pages/SKILL.md#pricing)
for the three-plans-then-PAYG/Enterprise composition. Inputs use `rounded-md`; product/blog
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

### Dashboard shell and overview

Keep a persistent store switcher and grouped navigation. Use the established inner rails,
compact `28px`-class page heading, nearby subtitle and connected stat/data regions. Large values
have stronger weight than their labels. Reuse `SectionKicker` rather than inventing uppercase
micro-labels for every card.

The store overview should answer: current result, what changed, what requires attention, and
what the merchant can do next. An actionable issue or real scan result outranks decorative
background art. Charts keep metric definitions, selected time range and source limitations clear.

### Product tables and workspace scrolling

Use the shared DataTable/Table components. The product title owns the flexible column; long
names truncate or wrap intentionally without pushing actions away. Thumbnails are rounded
squares. Keep meaningful attributes, statuses, sorting/filtering and row actions consistent.
Do not hide critical identity to preserve an unnecessary decorative column.

For internally scrolling flex workspaces, every ancestor in the height chain needs the
appropriate `min-h-0 flex-1 overflow-hidden`. The table/log owns its scroll container. Avoid
scrolling the whole document from a log sentinel. Horizontal overflow must not destroy vertical
page navigation on ordinary public tables.

### Onboarding

The four steps are Connect → Products → Competitors → Scan. Each screen names the task and
explains the next action. The desktop narrative panel occupies its intended side of the split;
on smaller screens it yields to the task. Mobile progress shows four dots and the step count.

Catalog import, selected products and named competitors retain their actual behavior. Loading
and scan phases describe real work; no decorative success can get ahead of the result. Provide
a useful next step on failure or empty import. Footer navigation remains visible without
covering content. Logs scroll internally and do not pull the page or its ancestors.

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
