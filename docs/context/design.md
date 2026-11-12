# ecentic design system

The visual and interaction system for ecentic's public site, product workspace and onboarding.
Consolidated from the complete 10–12 November 2026 review archive and the user's subsequent
selections, through the 51-comment review at `round-11-12-0517-51-comments`.

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

- Read the relevant product context and route-family recipe below.
- Identify the one decision or relationship the section must explain.
- Choose the surface, heading hierarchy and visual medium for that job.
- Find the shared primitive before building a page-local alternative.
- Check siblings that use the same pattern. A shared correction must propagate to them.

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

Use `MarketingHeading` and the public shell's heading scale. A section begins with a concise
sentence-case eyebrow when it helps identify the topic, followed by a title and a nearby
supporting paragraph. Do not repeat the eyebrow as another giant title or insert a large void
between the title and its explanation.

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

Only one element owns a given stroke. If the band or `gap-px` grid already draws it, remove the
redundant adjacent child border. Last accordion rows must not double the section boundary.
Text may be padded inside a cell; padding on the separator-owning shell must not shorten its line.

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

Place the gradient on the wrapper whose meaning it serves: the whole card, column, section or
footer. Child backgrounds should not sever it midway. Stretch participating cells so the light
reaches the intended edge without a gap.

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

Flatten nested shells. A code document does not need a bordered box inside a padded bordered
card inside another framed section. Keep one outer structure, local text padding and meaningful
internal dividers. Buttons keep their native variant styles rather than inheriting a blanket
workbench text color.

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

### Selected treatment

**Tonal dots** is the approved image-to-ASCII direction. Sample a recognizable source image into
a regular dot field whose dot size/tone carries shape, shading and volume. Literal character
ASCII remains appropriate for legible lettering or a meaningful path; dots do not ban characters.

Do not replace ASCII throughout the site with Hairline. Improve unclear artwork by changing its
subject, source or sampling. Retain a readable silhouette, defining features and enough negative
space. The viewer should recognize a cart, bag, product or word without reading its caption.

### Composition rules

- Give a hero subject its own plane, clear of the title, copy and conversion row.
- Background art may deliberately crop; a featured contained object must keep the features that
  identify it. Cards and logos must not end with an accidental cut edge.
- Preserve physical aspect ratio when sampling and displaying an image. A character grid's cell
  width and height are not equal; do not squash the source into its raw row/column ratio.
- Scale enough to read at desktop and tablet widths. Recheck dot density and contrast at 390px.
- Do not repeat the same ambiguous texture across unrelated page heroes.
- Keep texture subordinate where it shares a plane with essential information.

The homepage hero, audience panel, integration arc and global closing CTA may use tonal artwork.
The global closing subject is now a tonal shopping bag; it is not the former generic Hairline
basket. The footer identity is a large **dimensional tonal-dot wordmark** with a drawing/reveal
behavior. It remains readable before enhancement and under reduced motion.

Blog can pair a line-drawn book with ASCII behind it. Sector artwork can pair a relevant sampled
product with a separate line-drawn object. Use one dominant foreground explanation rather than
letting two animated objects compete.

### Production

Keep source images, generated assets, sampling parameters and provenance reproducible. Relevant
assets live under `apps/web/public/images/ascii/tonal/`. `EvolvingAscii` and `AsciiAtmosphere`
provide shared rendering/composition; `FooterWordmark` owns the shared brand treatment.

For new image generation on this Mac, use the configured Azure image command described in
`AGENTS.md`. Do not introduce an unrelated image API or key requirement. Compare alternatives
with the same source and context if the treatment itself needs review.

Reveal and pointer response enhance an already legible rest state. Avoid frantic glyph
substitution, unrequested perpetual loops or motion that prevents the shape from resolving.

## 8. Hairline figures and commerce illustrations

### Choose a subject, not a convenient preset

Use the `hairline-create` workflow for a requested new figure. Start with the physical subject
and one meaningful pointer response. A renamed stock figure is not a custom drawing.

| Context | Current subject / reference |
| --- | --- |
| Shopify | Custom shopping bag with handle/mark and catalog cards that lift toward the pointer |
| AI selection | Custom shopping bot inspecting product cards |
| Connect hero | Product document stack with folded corners and inspectable pages |
| Fix | Repair tools; a recognizable fixing action |
| Sell / financial outcome | Money stack where the section calls for payment/value |
| Readiness | Custom scanner inspecting a product record |
| Connections | Actual connected plugs, hub or network relationship |
| Blog | Custom open book, optionally over tonal artwork |
| Contact / support | Communication, documents or repair objects appropriate to the task |
| Sample replay product | Office chair or headphones matching the sample record |
| Home and furniture | Sofa |
| Consumer electronics | Headphones / recognizable electronics |
| Beauty and personal care | Lipstick |
| Wine and spirits | Bottle |
| Food and beverage | Packaged food |
| Fashion | Shoe |
| Health and wellness | Relevant wellness container |
| Travel and experiences | Luggage |

WooCommerce and Google Merchant Center currently use large genuine brand marks in their hero
illustration planes. Do not duplicate the same large identity beside the title. Semantic mappings
belong in `CommerceFigure` / the shared page configuration, not scattered route-level substitutions.

A page can use several figures where they explain different things. There is no current
one-figure-per-page cap. Keep one dominant graphic per explanation and avoid repeating the same
object beside every paragraph. Existing figures remain useful where their meaning fits.

### Construction and runtime contract

- Work with the fixed Hairline engine and its documented projection, path and occlusion helpers.
  Do not rewrite its kernel to make one drawing easier.
- Keep the shared thin stroke, theme-aware edge and restrained primary highlight.
- Preserve a strong recognizable rest pose and stable hit areas throughout the interaction.
- The pointer inspects, lifts, opens, turns or connects something physically plausible.
- Use matching occlusion surfaces; a visible white plate on charcoal is a defect.
- Keep explanatory labels outside the drawing. Brand lettering is allowed where it identifies
  the requested object. The Shopify drawing's debug-like visible name is removed; its accessible
  name remains.
- Generate server-rendered rest geometry. JavaScript failure or lazy loading must not leave a
  blank illustration plane.
- Load interactive figure code near the viewport and sleep when inactive. Do not create an
  independent always-running animation loop for each section.
- Reduced motion exposes the complete rest state and disables motion-producing interaction.
  Zero intensity alone is not sufficient for the pinned library's pointer behavior.

`HairlineFigure`, `CustomHairlineFigure` and `CommerceFigure` own integration. Custom figure code
lives in `apps/web/public/hairline/custom/`, with captured rest geometry in
`apps/web/src/components/hairline/rest/`. Keep figure IDs, rest geometry, readouts and registry
mappings coherent in both locales.

The pinned library's PURE-annotation patch exists for tree-shaking. It does not change runtime
behavior. Verify bundle behavior before changing or removing that patch. Do not introduce
always-running stock figures as a shortcut around the shared lifecycle.

### Figure acceptance

Review the figure independently and inside its actual page. Inspect rest plus the eight
standard pointer poses, motion, overlap/occlusion and a small roughly 240px presentation.
A blind viewer should name the subject. Then check desktop, tablet, mobile, dark/light surfaces,
keyboard alternatives where applicable and reduced motion. Screenshot review stays with the
assigned subagent when the user requests screenshot isolation.

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

The approved Shopify and Connect steppers are the reference: a visible connected spine,
well-scaled numbers/icons, clear stage titles and an adjacent explanation or object.
Use `ConnectedJourney` for setup/reference stages. All milestone titles stay discoverable;
accordion expansion can disclose supporting detail. Keep the first useful explanation visible.

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

The user selected a **Git diff** for before/after records. Use `CodeDiff` and the shared
`AnnotatedCodeComparison` adapter. The default is one document showing unchanged context,
removed lines and added lines together.

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

Use an actual conversation composition for sector questions and simulated decisions: a shopper
message, a writing/assistant response, relevant product illustration and a visible record or
inspection result. A quoted prompt, table of steps or transcript-shaped card grid alone does
not satisfy this pattern.

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

### Forms and conversion

All forms use `InferredForm`, Zod and `field()` descriptors. No raw-input clone or one-off manual
form state. Inputs can be modestly rounded globally.

A store-address form sits directly in the hero's conversion row with its one primary submit
action and a nearby secondary demo action. Do not repeat “Check my store free” in a separate
button row above the same form. Avoid a gray calculator-style box around a simple hero input.

Validate real input and preserve the address through the existing handoff. Do not show fake scan
progress. Field errors explain how to fix the input and stay associated with their field.

### Actions, icons and states

Use the shared primary gradient button for the main action and appropriate secondary/soft/link
variants for the rest. Keep related CTAs aligned with the content and with each other.
Integration “Explore” may be primary; availability notification is secondary and left-aligned
on the same action row. A contact link remains a link, not a fake form submit.

Use Nucleo icons through `@zenncore/icons`; keep the existing family, commonly duotone. Fetch and
generate through the Nucleo/package workflow when a requested icon is absent. Do not approximate
icons with arbitrary inline SVG. Bare icons accompany source rows, contact routes, categories,
fields and recovery links. Size them enough to read without inflating the row unnecessarily.

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

Motion either explains a state change or gives an object a meaningful physical response.
A static result must still communicate the whole idea. “More animated” does not mean every
section runs a separate loop.

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

Each recipe supplies a composition, not a requirement to reuse identical content blocks.
The public design audit includes every route family and both locales.

### Homepage `/`

A legible large tonal commerce subject supports the hero's category statement and conversion.
The five-stage Connect → Simulate → Fix → Sell → Track story is a connected roadmap, with normal
font numerals and an object that matches each stage. Use tools for fixing, money for the relevant
selling/value story and a meaningful connection/network where the narrative asks for one.

Audience sections combine their own copy with tonal artwork. The integrations arc can have
ASCII atmosphere while genuine provider marks stay clear. Capability cards use complete
illustrated objects; remove heavy, misaligned tag strips and accidental edge clipping.
Dense catalog findings belong behind supporting disclosure. Keep the original proof media.

### Platform overview and stage pages

The overview's five-stage explanation can be a dark connected workbench. Each stage has its own
record, figure and outcome; avoid repeated `product.json` boxes with abrupt gradient edges.

Connect uses document/source identity, a continuous problem gradient, an illustrated working
catalog and the approved connected setup rhythm. Keep the principles' product example relevant.
A bounded sticky introduction can accompany a long source explanation on desktop.

Simulate uses a wholly dark problem field, synchronized square stage markers and figure behavior,
visible product illustrations, a shared source diff and an actual scripted chat replay. Branding
and available model claims come from product context, not the demonstration's animation.

Fix uses repair/record-change imagery and the shared Git diff. Sell uses the actual supported
checkout stages and distinguishes setup from a successful purchase. Track explains the metrics
with measured charts and meaningful source/attribution qualifications. Reuse `TrackingOverview`
for the after-scan explanation instead of another unrelated card/tab design.

### Integrations

Provider identity is prominent, unique and correctly proportioned. Shopify has the custom bag;
WooCommerce and Merchant Center have genuine large marks. Use consistent status and availability
language, larger readable directory logos and useful subscription explanations.

Read/write field comparisons remain normal semantic tables when tabular comparison is the job.
Use icons and monospace for scopes/technical fields. Installation and channel flow use approved
connected journeys, not sparse text tabs. Distinguish readiness, permissions and publishing with
different meaningful graphics. The same illustration should not stand for all three.

Preserve import-versus-publish behavior, actual permissions, Merchant Center destination semantics
and the merchant's checkout/payment responsibilities. A layout change must not modify a scope.

### AI channels

Use genuine identity, concise capability context and a connected explanation of what the channel
reads or supports. Shared stage presentation applies across Google/Gemini, ChatGPT, Claude,
Perplexity, Copilot and Amazon while their actual capabilities remain distinct.

Shopping examples show a readable result/conversation and relevant product fields. Explain
terms such as a merchant program or buying mode rather than presenting an unexplained tab.
Keep live, simulated, experimental and unavailable statuses factual. The directory comparison
can occupy a dark workbench with native filters and accessible results.

### Solutions, audiences and sectors

Make the primary audience-selector heading prominent and all action variants visible. Show
workflow and product facts rather than a stack of quoted shopper prompts.

Every sector shares the conversation-and-inspection pattern, source-diff structure and title/
subtitle system. Use the subject mapping in section 8, including a sofa, headphones and lipstick
where requested. Do not reuse the generic connected hub for all sector hero identities.

Place the attribute qualification strip **directly after the attribute heading**, with the same
contrasting surface and placement across sectors. Keep the stated limits intact. Illustrate
measurements or relevant attributes without implying an unverified exact fit.

Rules sections explain how ecentic's actual product-data and workflow capabilities help, alongside
what remains the merchant's responsibility. Custom agentic checkout discussion does not imply
that age verification, channel policy, payment consent or jurisdictional eligibility disappears.
Reference brands, if used for context, are separate from invented sample products and results.

The Enterprise pilot can contain reviewable illustrative text because the user requested it.
It is not a real customer engagement. The final-copy task remains in
[review follow-ups](../marketing/review-followups.md). Icons, color and a visible pilot progression
should make the draft assessable before final copy arrives.

### Pricing

Lead with a compelling, labeled AI Agent Score illustration and clear plan choices. Use the
approved measured dial/chart language, not ornamental numeric output. Show value and included
capabilities in the same card as the price.

On desktop, **Compete, Scale and Dominate share one row**. **Pay-as-you-go and Enterprise share the
next row**. Align plan titles, prices, feature groups and CTAs. Stack cleanly on small screens.
This public-page decision does not redesign the dashboard paywall.

The fee estimator keeps its useful native inputs and canonical calculation while using a clear
visual comparison instead of line clutter and dense explanatory prose. Add a genuine section
separation before the full plan table. Horizontal table overflow is contained; ordinary vertical
page scrolling must chain through it.

The user explicitly chose to **remove the $500 cap callout while preserving billing terms**.
Do not remove the backend cap, alter calculator behavior or create an uncapped pricing claim.
Rates, rounding, thresholds and plan amounts come from the canonical pricing source.
The partnership bundle uses a coherent breakdown followed by its price/action; do not leave a
sparse unrelated second column merely to preserve a grid.

### Resources, docs, API and blog

Use the same main-title system as Platform. Directories expose clear icon-led choices and useful
metadata. Quickstart/navigation rows may form 2×2 or 1×4 grids depending on width, with controlled
color or ASCII supporting the subject.

Docs/API source workbenches are full dark regions. Flatten nested card shells and remove padding
between a code document and its owning frame. Keep local code gutters, syntax, line numbering,
copy actions and real fetched content readable. Failed fetches retain a usable source link.
Do not convert real source previews into illustrative mock responses.

Blog uses a custom book with optional tonal backdrop. Archive images are square with slight
rounding and predictable cropping. Long editorial prose retains a comfortable reading measure,
heading hierarchy and readable neutral surface.

### Public tools

Compare, the WebMCP scanner, UCP validator, UCP playground and tool directory belong to the same
public system. Avoid an unrelated gray side rail or a one-off title treatment.

Input/session/source work areas can be complete charcoal bands with shared outer seams. The
validator's checks remain visible and understandable instead of a maze of small nested cards.
Use the selected tonal ASCII where a decorative subject is needed. Connection and result panes
match heights and preserve loading, validation, empty and failure states.

Real tool controls must still call the correct workflow. A polished disconnected state is not a
simulated connection. Keep native input validation, server errors and actual results intact.

### Security, Contact, Support and Partners

Security emphasizes the public-data pilot option and makes store access/data flow inspectable.
Use icons and meaningful infrastructure/provider graphics. The data-flow review's continuous
gradient uses actual provider marks; its unapproved connector copy remains behind the existing
review gate until approved. Styling approval is not content approval.

Contact routes have relevant communication artwork and icons bound to the actual route identity,
even if optional rows are filtered out. Company details begin with the structural line and crosses.
Support uses a meaningful document/repair illustration, Nucleo route icons and a bounded sticky
explanatory plane while the visitor works on desktop. Preserve mobile flow.

Partners follows the same readable hero, explicit program choices and form hierarchy. A generic
hub or barely recognizable ASCII texture is not sufficient identity for the page's purpose.

### Recovery / 404

Use a full-width first-screen composition with oversized **dimensional tonal-dot 404** numerals
and a companion Hairline question mark. Keep recovery copy, actions and icon-led discovery links
clear of dense dots. Preserve the actual 404 status, noindex behavior, locale and keyboard paths.
The error illustration must not replace the useful way out of the page.

## 14. Shared navigation and footer

Navigation overlays the page without changing its scroll position. Progressive multilayer blur
fades without a hard bottom edge. The navigation foreground responds to the surface behind it,
with reduced-motion support and stable legibility on light, blue and dark backgrounds.

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
| Conversation replay | `apps/web/src/components/marketing/interactive/agent-replay.tsx`, `apps/web/src/components/marketing/interactive/replay-console.tsx`, `apps/web/src/components/marketing/interactive/replay-scene.tsx` |
| Finite sequence lifecycle | `apps/web/src/components/marketing/interactive/use-sequence.ts` |
| Public source/document links | `apps/web/src/components/marketing/sources.tsx` |
| After-scan explanation | `apps/web/src/components/marketing/tracking-overview.tsx` |
| Evidence and disclosures | `apps/web/src/components/marketing/evidence*.tsx` |
| Current Enterprise review copy task | `docs/marketing/review-followups.md` |

## 17. Settled decisions and retired alternatives

| Earlier experiment / recurring failure | Current decision |
| --- | --- |
| Replacing unclear ASCII everywhere with line art | Tonal ASCII, custom Hairline and explanatory graphics coexist |
| Dense noisy characters or squashed hands | Recognizable source and tonal-dot image sampling with correct proportions |
| One Hairline figure per page, only on light | Meaningful figures across sections; match each actual light/dark surface |
| Generic drawers/baskets/hubs for every concept | Match the physical object to the flow, provider or sector |
| Outline-only footer wordmark | Dimensional tonal-dot wordmark with a finite drawing reveal |
| White-only or black-only use of cutouts | Cutouts work on white, blue and dark surfaces |
| Gradient behind one footer subsection | One continuous footer field |
| Repeated small padded blue/black boxes | Coherent section or workbench with meaningful internal structure |
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

Verify the component and every page family affected by a shared change. A screenshot of one
hero does not establish that its code panel, mobile controls and footer also work.

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
