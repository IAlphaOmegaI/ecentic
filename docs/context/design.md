# ecentic design canon

> The single source of truth for visual design, interaction design, and page composition at ecentic.
> Read this before creating or revising any user-facing surface.

This guide is derived from the strongest implemented patterns on the landing page, pricing, the
store dashboard, product analytics, onboarding, and the shared footer. It deliberately does not
canonize every detail currently in code. Where an implementation accident conflicts with this
document, this document is the direction to follow.

---

## 0. The shortest useful version

ecentic should feel like **refined commerce infrastructure**.

It is editorial enough to explain a new market, technical enough to make machine commerce credible,
and calm enough to carry dense operational data. Its visual signature is not a decorative style
applied to ordinary cards. It comes from exposing the structure of the system:

- vertical rails establish the page;
- hard one-pixel seams reveal how information is assembled;
- crosshairs register important intersections;
- slim hatched gutters separate major systems;
- primary blue signals action and strategic emphasis;
- semantic color reports outcomes;
- motion reveals progress, causality, and changing state.

The recurring tension is intentional:

> **Sharp structure, considered softness.**

The canvas, rails, grids, cells, and section boundaries are sharp. Controls, status pills, media,
progress tracks, and truly elevated panels may be rounded. Do not soften the whole interface.

### The four-part philosophy

1. **Rails** create continuity. Content belongs to a larger system instead of floating as isolated
   cards.
2. **Seams** make structure legible. Adjacent cells share a one-pixel gap rather than each drawing
   its own box.
3. **Signals** carry meaning. Blue means brand, action, selection, or strategic emphasis. Status
   colors mean measurable outcomes, never decoration.
4. **Reveals** explain change. Motion introduces hierarchy, progress, or live computation. It does
   not perform for its own sake.

### Product intent

ecentic helps merchants understand and improve how AI shopping agents evaluate their products. The
core loop is:

> **Simulate → Diagnose → Optimize → Publish → Repeat.**

The user is usually a merchant or commerce operator who needs to answer three questions quickly:

1. Are AI agents choosing my products?
2. Why am I winning or losing?
3. What should happen next?

Every composition should make one of those answers easier to see or act on.

---

## 1. How to use this document

Use this order for every new page:

1. Identify the surface mode: marketing, dashboard, or onboarding.
2. Write the page's single primary job as a verb.
3. Choose the correct shell and rail pattern.
4. Establish hierarchy with type and spacing before adding decoration.
5. Use semantic surfaces and `@zenncore` primitives.
6. Add grid seams, crosshairs, or a hatch gutter only where they clarify structure.
7. Add motion only where it explains entry, progress, or state change.
8. Design loading, empty, error, disabled, hover, focus, and success states.
9. Run the checklist in §20.

### Precedence

When sources disagree, use this order:

1. This design canon.
2. Product intent in `docs/context/`.
3. Engineering conventions in `docs/agents/`.
4. Package contracts in `docs/web/` and `docs/shared/`.
5. Existing implementation.

The last item is evidence, not authority. Preserve strong patterns; correct accidental drift.

---

## 2. Design territory

### Domain concepts

The design belongs to the world of:

- commerce infrastructure;
- product catalogs and structured records;
- machine inspection and registration marks;
- competitive scorecards;
- live agent decisions;
- fulfillment loops and continuous optimization;
- storefronts translated into machine-readable data.

### Physical analogy

If ecentic were a physical space, it would be a bright operations room inside a modern fulfillment
facility: pale work surfaces, precise registration marks, clipped reports, blue control lights,
shipping-grid geometry, and live status displays. It would not be a dark cyberpunk terminal, a soft
consumer wellness app, or a generic glassmorphic AI dashboard.

### Color world

The palette comes from this environment:

- paper-white inspection surfaces;
- warm-neutral structural gray;
- graphite text and machine labels;
- electric control blue;
- restrained green, amber, and rose status signals;
- dark slate only for media or machine-output insets.

### Signature

The signature is the **registered rail grid**: content held between vertical rails, divided by
one-pixel seams, and marked with small crosshairs at consequential intersections.

It should be identifiable in at least five places across a full experience:

- the main content rails;
- a stat or feature grid;
- a section boundary;
- a progress or table region;
- a closing footer or action band.

### Defaults we reject

- Generic rounded cards floating on an empty page. Use connected cells, rails, or clear section
  bands.
- Decorative blue-purple AI gradients. Use a neutral system with one deliberate blue.
- Three identical icon-title-description cards as a universal answer. Let information type determine
  composition.
- Oversized shadows as hierarchy. Use surface changes, seams, and spacing first.
- Motion on everything. Animate only entry, progress, selection, or state.
- A dashboard that treats all numbers equally. Lead with the decision-driving metric.

---

## 3. Surface modes

The brand has one system expressed in three modes.

### 3.1 Marketing mode

**Purpose:** explain the category, create conviction, and move visitors toward installation,
pricing, or a conversation.

**Feeling:** spacious, editorial, confident, and visually demonstrative.

**Traits:**

- centered `max-w-6xl` rail;
- selective full-bleed sections;
- large display type;
- long vertical rhythm;
- image or video used as evidence, not filler;
- fewer but stronger calls to action;
- asymmetric or split compositions mixed with `gap-px` grids.

### 3.2 Dashboard mode

**Purpose:** help a merchant assess performance, find the reason, and take the next action.

**Feeling:** calm, dense, precise, and operational.

**Traits:**

- persistent store context and navigation;
- `mx-8` inner rails;
- compact page headers;
- numbered section kickers;
- connected stat and chart regions;
- white data surfaces over a light-gray canvas;
- semantic color tied to measurable status;
- PPR and streaming with shape-matched skeletons.

### 3.3 Onboarding mode

**Purpose:** move a new merchant to a meaningful first result with minimal uncertainty.

**Feeling:** guided, optimistic, progressive, and technically credible.

**Traits:**

- blue narrative panel plus light task workspace on large screens;
- persistent four-step progress;
- large instructional headings;
- generous rails and clear footer navigation;
- sharp selection grids;
- live computation represented by logs and progress;
- mobile progress condensed to dots and a step count.

Do not flatten these modes into one universal page template. They share the same materials but use
different density, scale, and rhythm.

---

## 4. Tokens and color

All application code uses semantic tokens. Raw hex values below explain the palette; they are not
permission to hardcode colors at call sites.

### 4.1 Surfaces

- `bg-background` (`#f5f5f5`): the page canvas and dashboard workspace.
- `bg-background-dimmed` (`#e8e8e8`): structural cells, inset regions, quiet hover states, and
  supporting panels.
- `bg-background-rich` (`#ffffff`): data tables, chart panels, elevated content, and high-legibility
  reading surfaces.
- `bg-primary` (`#1572fa`): strategic hero blocks, selected pricing, primary actions, and the
  onboarding narrative plane.
- `bg-emphasis`: dark media, code, or terminal-like insets when darkness improves comprehension.

Use one neutral hue family. Elevation is a small lightness change, not a jump into another color.

### 4.2 Text hierarchy

- `text-foreground-rich`: page titles, decisive values, high-emphasis labels.
- `text-foreground`: default headings and body content.
- `text-foreground-dimmed`: explanations, metadata, captions, placeholders, and inactive states.
- `text-primary`: links, selected values, active navigation, and strategic emphasis.
- `text-white` with `/60`, `/70`, `/80`, or `/90`: hierarchy on primary or emphasis surfaces.

Do not use color to compensate for weak typography. Establish hierarchy with size, weight, spacing,
and placement first.

### 4.3 Borders

Use `border-accent-foreground` for structural rails, seams, table boundaries, and hatch stripes.

Use a semantic border only when the boundary itself communicates state:

- `border-error/40` for a danger or validation region;
- `border-primary/20` for a selected or informational callout;
- focus rings from the control primitive.

Do not color whole containers merely to make them more interesting.

### 4.4 Status colors

Status colors always pair with a number, icon, or text label.

- `success`: a strong result, completed state, positive delta, or win rate of 60% and above.
- `warning`: an intermediate result, attention state, or win rate from 30% through 59%.
- `error`: a weak result, missing field, failed state, or win rate below 30%.
- `info`: neutral progress or model information where primary blue would imply an action.

Status colors are not a chart rainbow. A model may have a stable semantic identity in a comparative
chart, but the interface must remain legible without color.

### 4.5 Primary blue

Primary blue is the only loud brand color. It may:

- fill one major block;
- identify one recommended or selected option;
- mark active navigation;
- carry a primary call to action;
- highlight the ecentic or pay-as-you-go column in a comparison;
- fill progress that is not success/warning/error.

It should not appear on every icon, every heading, and every border at once.

---

## 5. Typography

### 5.1 Typeface

Use `font-body`, currently Red Hat Display through `--font-redhat-display`. It gives the system an
engineered but human tone and supports both large editorial display and compact operational UI.

Use `font-mono` only for:

- timestamps and live logs;
- machine-readable data;
- section indices;
- identifiers where character distinction matters;
- aligned technical output.

Never introduce a page-local font.

### 5.2 Weight philosophy

- `font-light`: explanatory copy, subtitles, table body text, captions.
- normal body weight: general reading text and restrained marketing headings.
- `font-medium`: component titles, labels, prices, navigation, onboarding headings.
- `font-semibold`: high-emphasis marketing moments, panel titles, table headers.
- `font-bold`: dashboard page titles, primary metrics, score reveals.

Avoid the blunt regular/bold binary. Weight should reveal hierarchy before color does.

### 5.3 Marketing scale

Use this range, then adjust for line length and composition:

- Primary hero: `text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight`.
- Blue campaign or pricing hero: `text-5xl md:text-7xl font-semibold`.
- Major section heading: `text-3xl md:text-5xl font-medium`; reserve `md:text-6xl` or
  `md:text-[76px]` for one dominant statement, not every section.
- Grid feature title: `text-2xl md:text-4xl font-medium`.
- Lead description: `text-lg md:text-2xl font-light`.
- Body description: `text-base` or `text-lg font-light`.
- Caption: `text-sm font-light`.

Keep marketing headings sentence case. Do not use uppercase eyebrows as a default. A short numbered
section kicker may use uppercase when it behaves like technical metadata, not ad copy.

Use `text-wrap: balance` for display headings and `text-wrap: pretty` for prose where available.
Keep reading paragraphs to roughly 55–70 characters per line.

### 5.4 Dashboard scale

- Page title: `text-[28px] font-bold tracking-[-0.02em] text-foreground-rich`.
- Page subtitle: `text-sm text-foreground-dimmed`.
- Panel title: `text-lg font-semibold text-foreground-rich`.
- Stat label: `text-[10px] font-medium uppercase tracking-[0.08em] text-foreground-dimmed`.
- Stat value: `text-4xl font-bold tracking-[-0.02em] text-foreground-rich`.
- Stat suffix: `text-xl font-medium text-foreground-dimmed`.
- Stat delta: `text-xs` plus semantic color and a visible direction.
- Section kicker: `text-[11px] font-medium uppercase text-foreground-dimmed`, with the index in
  `font-mono font-semibold text-primary`.
- Table header: `text-[11px] font-semibold uppercase tracking-[0.06em]`.
- Table cell: `text-sm font-light text-foreground`.

Dashboard titles must be consistent. Do not alternate between `text-3xl` and an arbitrary 28px value
for equivalent page headers.

### 5.5 Onboarding scale

Onboarding sits between marketing and app typography:

- Step title: `text-4xl font-medium text-foreground`.
- Step lead: `text-2xl font-light text-foreground-dimmed`.
- Narrative-panel headline: `text-5xl xl:text-6xl font-medium leading-none text-white`.
- Narrative bullet: `text-sm font-light text-white/90`.
- Secondary section heading: `text-xl font-medium text-foreground`.
- Live-log heading: compact `font-medium`; use uppercase only when it reads as a machine panel label.

The title should describe the action, not the software area: “Connect your store,” “Choose products,”
“Add competitors,” “Run your first scan.”

### 5.6 Numbers

Large numbers should use tabular figures when values update or align vertically. Pair a number with:

- its unit;
- its comparison period;
- its state or direction;
- the action it should prompt, when applicable.

A number without context is decoration.

---

## 6. Geometry, rails, and seams

### 6.1 Marketing rail

The default marketing shell is:

```tsx
<main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 border-accent-foreground border-x md:gap-12">
  {/* sections */}
</main>
```

Use `p-6 md:p-12` for major section interiors and `p-4` or `p-6` for grid cells.

### 6.2 Full-bleed breakout

Use a full-viewport breakout when a major idea needs to change the page's energy:

```tsx
<section className="relative -left-[calc(50vw-50%)] w-screen border-accent-foreground border-y">
  <div className="mx-auto max-w-6xl border-accent-foreground border-x">
    {/* contained content */}
  </div>
</section>
```

Do not make every section full bleed. The contrast only works when most content respects the rail.

### 6.3 Dashboard rail

Store-scoped pages use an inset rail inside the scrolling application shell:

```tsx
<div className="mx-8 border-accent-foreground border-x">
  <div className="-mx-8 border-accent-foreground border-b">
    <header className="relative mx-8 px-6 py-8">{/* ... */}</header>
  </div>
  {/* streamed sections */}
</div>
```

The `mx-8` rail is a recurring alignment datum. Do not replace it with unrelated card margins on
each section.

### 6.4 Onboarding rail

The task pane uses `px-8` around a continuous inner `border-x` rail. Headers, work areas, and footer
navigation align to the same vertical edges. Keep `min-h-0 flex-1 overflow-hidden` through the flex
chain when an inner table or log panel needs to scroll.

### 6.5 The seam grid

Connected grids use a one-pixel gap over the border color:

```tsx
<div className="grid gap-px bg-accent-foreground md:grid-cols-2">
  <article className="bg-background-rich p-6">{/* ... */}</article>
  <article className="bg-background-rich p-6">{/* ... */}</article>
</div>
```

Rules:

- grid cells remain sharp;
- cells do not each add their own border;
- adjacent cells use a consistent surface family;
- hover may shift a cell one surface step;
- do not add shadows to cells inside a connected grid.

### 6.6 Crosshairs

Crosshairs are registration marks, not icons. They indicate a consequential intersection in the
layout system.

Use:

- `Crosshair` from `dashboard/_components/grid.tsx` in dashboard compositions;
- `Plus` from `components/plus.tsx` in marketing and onboarding.

Place them at section corners with half-size translations so the mark centers on the seam. Keep them
muted, `pointer-events-none`, and `aria-hidden`.

Good placements:

- the four corners of a major bordered band;
- the transition from header to data grid;
- the start and end of a footer system;
- a progress rail intersection.

Do not:

- place one on every card;
- use it as a bullet;
- enlarge it into a decorative star;
- let it overlap readable content.

### 6.7 Hatched gutters

`SectionGutter` is a 16px structural pause:

```tsx
<div className="h-4 bg-grid-stripes opacity-60" />
```

Use it between major dashboard systems or before a materially different pricing/content section.
It is not a generic spacer. Marketing pages may use whitespace instead when a hatch would interrupt
the editorial flow. Onboarding generally favors continuous rails and should use a hatch only at a
true phase boundary.

### 6.8 Section numbering

Dashboard and technical content sections use:

- `01 — Performance`
- `02 — Catalog`
- `03 — Traffic`
- `04 — Insights`

The index is primary, monospaced, and semibold. The label is muted and uppercase. Do not add a
decorative rectangle before this implemented kicker. Marketing may use large standalone numerals
when they participate in the composition, but ordinary marketing eyebrows remain sentence case.

---

## 7. Borders, radius, and depth

### 7.1 Border-first hierarchy

ecentic is primarily a border-and-surface system, not a shadow system.

- Structural rails: one pixel, `border-accent-foreground`.
- Connected cells: one-pixel gap seam.
- Reading/data surface: background shift plus border only when containment needs to be explicit.
- Focus: component-provided focus ring.
- Error or selection: semantic tint and border, with text or icon confirmation.

Borders should be easy to find and easy to stop noticing.

### 7.2 Radius eligibility

Sharp by default:

- page rails;
- section wrappers;
- grid cells;
- table rows;
- structural dividers;
- onboarding platform tiles;
- footer link columns.

Rounded where the object is interactive, transient, inset, or materially separate:

- `rounded-sm`: progress fills, key hints, compact tags;
- `rounded-md`: buttons, inputs, small badges, avatars;
- `rounded-lg`: search fields, tabs, log/code insets, popovers;
- `rounded-xl`: a major elevated comparison or campaign panel;
- `rounded-2xl`: cinematic media only when the media needs a distinct frame;
- `rounded-full`: status dots, pills, avatar circles, continuous progress tracks.

Never round a connected grid cell. Never use `rounded-xl` merely because a section looks empty.

### 7.3 Shadows

Use no shadow inside the structural grid.

Permitted depth:

- `shadow-sm`: selected tab thumb or resting elevated control;
- `shadow-md`: dropdown, tooltip, popover, or hover lift on a genuinely separate card;
- stronger shadow: modal or cinematic media only, and with restrained tint.

If a surface can be distinguished through spacing, border, and lightness, it does not need a shadow.

---

## 8. Backgrounds and imagery

### 8.1 Landing background

The landing hero uses the hands artwork from `public/images/background.webp`:

- fill the hero;
- `object-top`;
- approximately `opacity-20`;
- `invert` over the light canvas;
- keep it behind a restrained primary radial glow.

The hands imply an agent-mediated handoff without resorting to robot imagery. Text must remain the
dominant layer.

### 8.2 Pricing and content hero texture

Blue content heroes may use `public/images/blog.png`:

- low opacity;
- `brightness-0 invert`;
- biased to the right so it does not fight the headline;
- clipped inside the blue hero.

Use the texture to give a large primary surface depth, not to decorate every blue block.

### 8.3 Onboarding artwork

The onboarding narrative panel uses `public/images/onboarding.png`:

- bottom aligned;
- inverted;
- reduced opacity;
- subordinate to the wordmark, headline, and benefit list.

Hide the narrative panel below `lg`; the task pane must remain fully usable alone.

### 8.4 Product film and media

The landing product film uses `/videos/banner.mp4` in a dark emphasis frame. Media is evidence of the
product, so it may receive stronger separation, a larger radius, and a controlled shadow than
ordinary sections.

Always provide:

- a clear play affordance;
- a poster or stable first frame;
- captions where speech carries meaning;
- keyboard access;
- reduced-motion behavior;
- an accessible dialog title when expanded.

### 8.5 Imagery rules

Prefer:

- real product interface;
- model/platform marks where identity matters;
- merchant/product imagery from actual data;
- the canonical background assets above.

Avoid:

- generic robots, glowing brains, or orbital AI art;
- unrelated stock commerce photography;
- decorative gradients with no informational role;
- multiple ambient glows in one section;
- imagery inside data-dense dashboard regions.

---

## 9. Motion and interaction

### 9.1 Two motion layers

**Layer one: control feedback**

- default duration: 150ms ease;
- table row background: 100ms ease;
- properties: color, background, border, shadow, opacity, and small transforms;
- pressed state may scale subtly through the primitive;
- focus remains immediate and visible.

**Layer two: purposeful reveal**

- used for section entry, sequential onboarding content, progress, changing numbers, or live logs;
- may be longer than 150ms when the duration represents an understandable process;
- use decelerating or gentle spring behavior;
- preserve reading order;
- never delay the primary action.

### 9.2 Approved animation vocabulary

Use only:

- `Motion.Stagger` for ordered groups;
- `Motion.Item` for children of a stagger;
- `Motion.Up` for a single vertical reveal;
- `Motion.Row` for table/list entry where motion adds comprehension.

Do not import raw motion into server components. Client-only progress and presence transitions may
use the established local implementation when a primitive cannot express the state, but should not
create a new animation dialect.

### 9.3 Motion behavior

Use motion to show:

- which onboarding step became active;
- that a result is still being computed;
- the order in which a scan discovers evidence;
- that a progress value changed;
- that a panel or row entered the current context.

Do not use motion to:

- make static cards hover continuously;
- bounce professional controls;
- slide every heading from a different direction;
- animate layout dimensions when `transform` or `opacity` will do;
- create scroll-jacking.

### 9.4 Smooth scroll

Native smooth scrolling is acceptable for page anchors. In a bounded log panel, scroll the
`overflow-y-auto` container with `scrollTo`; do not use `scrollIntoView` on a sentinel when it may
move ancestor or page scrollers.

### 9.5 Reduced motion

Respect `prefers-reduced-motion`:

- remove nonessential entry transforms;
- make number updates immediate;
- keep progress understandable without animated interpolation;
- do not autoplay expanded media with sound;
- preserve focus and state feedback.

---

## 10. UX hierarchy and content

### 10.1 One primary job

Every page must have one dominant job:

- landing: understand the promise and install or continue;
- pricing: choose a payment model;
- overview: assess store health and run the next simulation;
- products: find products that need attention;
- onboarding: complete the current step;
- scan: understand progress, then receive the first meaningful result.

Secondary actions should not visually compete with this job.

### 10.2 Progressive disclosure

Lead with the answer, then evidence, then detail:

1. status or key result;
2. short explanation;
3. comparison or trend;
4. drill-down;
5. action.

Tabs are appropriate when views answer related questions about the same entity. Do not use tabs to
hide unrelated sections merely to reduce page length.

### 10.3 Copy

- Use “AI agents” when referring to shopping agents.
- Brand is `ecentic` in lowercase.
- Prefer plain, specific claims over category jargon.
- Use sentence case for headings, buttons, tabs, and marketing labels.
- Reserve uppercase for technical section kickers, stat labels, and machine-panel labels.
- Avoid exclamation marks, “Oops,” and generic AI phrases such as “unlock,” “revolutionize,” or
  “seamless.”
- Name the action and consequence: “Run simulation,” “Approve and publish,” “Add products.”

### 10.4 Density

Data density is a feature when hierarchy is clear. Do not solve density by:

- shrinking all text;
- hiding important columns without an alternative;
- placing every value in a separate card;
- using color as the only grouping mechanism.

Use alignment, shared baselines, fixed column roles, compact metadata, and progressive drill-down.

---

## 11. Core component doctrine

### 11.1 Buttons and links

Use `Button` from `@zenncore/web/components/button`. For navigation:

```tsx
<Button color="primary" render={<Link href="/onboarding/connect" />}>
  Install now
</Button>
```

Rules:

- primary action: flat primary;
- secondary action: accent outline;
- tertiary action: ghost or text link;
- destructive action: error color;
- icon-only actions require an accessible label;
- buttons in one row have equal height;
- do not override primitive typography, padding, height, border, or color with `className`;
- layout-only classes such as `w-full`, `mt-auto`, or responsive width are acceptable.

### 11.2 Page header

A dashboard header contains:

1. optional status pill;
2. page title;
3. one-line subtitle;
4. one primary action and, only when necessary, one secondary action.

It lives inside the page rail with `px-6 py-8`. Crosshairs may mark its bottom corners where it meets
the first data region.

### 11.3 Stat grid

A stat cell contains:

- compact uppercase label;
- decisive value and suffix;
- comparison or explanation;
- optional muted icon, only if it improves scanning.

Stat cells are connected through `gap-px`, use `bg-background-rich`, and usually use `p-5` or `p-6`.
Do not put each stat in a rounded shadow card.

### 11.4 Tables

Use `DataTableProvider` and `DataTable`; do not hand-build application tables.

Table behavior:

- approximately 52px rows;
- no zebra striping;
- white or rich surface;
- muted uppercase headers;
- one subtle row hover;
- left-align labels and text;
- right-align comparable numbers where it improves scanning;
- use tabular figures;
- show image, title, and key metadata as one product identity cell;
- include a visible route or action affordance;
- preserve useful columns through horizontal scrolling or a deliberate mobile representation.

Never restyle `Table*` or `DataTable` primitives at call sites. Fix a primitive in the package if its
base style is wrong.

### 11.5 Progress and win rates

Track:

- neutral track: `bg-background-dimmed` or the local seam color;
- fill: primary or semantic;
- height: 4–6px;
- radius: small or full;
- width transition: purposeful, not theatrical.

Always display the numeric value near the bar. Apply the shared thresholds from §4.4.

### 11.6 Tabs

Use `@zenncore/web/components/tabs`.

Dashboard segmented tabs:

- dimmed container;
- small internal padding;
- rich active thumb;
- restrained radius;
- medium sentence-case labels.

Onboarding may use a sharper full-width tab rail when tabs represent alternate discovery methods.
The indicator may align to the top or seam. This is a context exception, not a reason to create a
new tab primitive.

### 11.7 Status pills and badges

Pills are compact metadata, not miniature calls to action.

- pair tint with semantic text;
- use `text-[11px]` or `text-xs`;
- use medium or semibold weight;
- include a readable label;
- use `rounded-full` for continuous status and `rounded-sm/md` for categories or tags.

### 11.8 Charts

Charts should answer a named question. Every chart needs:

- a specific title;
- a time range or comparison context;
- an accessible text summary;
- semantic or restrained colors;
- a rich tooltip with border and modest shadow;
- an empty state;
- no 3D effects or decorative gradients.

Lead aggregate data with primary blue. Use status colors only where the plotted meaning is positive,
intermediate, or negative.

### 11.9 Forms

Use `InferredForm` plus `field()` for forms. Use established `@zenncore/web` compound controls for
isolated interactive fields.

- labels remain visible;
- helper text explains consequence, not obvious format;
- validation appears next to the field;
- errors use error tint, border, icon/text, and a recovery path;
- keyboard focus is visible;
- preserve entered data after recoverable failure;
- group fields through rails and spacing before adding card shells.

### 11.10 Live logs and machine output

Live panels use:

- compact header with status dot, label, and progress;
- monospace timestamps or keys;
- readable body text;
- line-by-line reveal in causal order;
- reduced opacity for older lines, never below accessible readability;
- an internal scrolling container;
- a clear complete/error state.

Use a light `bg-background-rich` intelligence panel in onboarding to preserve continuity with the
task workspace. Use `bg-emphasis` for replay/code output when contrast is essential to compare
machine reasoning.

### 11.11 Empty, loading, and error states

**Loading**

- shape-matched skeletons for streamed dashboard data;
- inline spinner only inside a control performing a short action;
- progress and live explanation for work longer than roughly five seconds;
- avoid a page-level spinner.

**Empty**

- one relevant monoline icon or restrained illustration;
- specific headline;
- one sentence explaining why the state exists;
- one primary next action.

**Error**

- state what failed;
- preserve successful partial data;
- offer retry or a direct recovery action;
- use toast for transient action feedback and inline treatment for persistent field/region errors;
- never rely on color alone.

---

## 12. Shared chrome

### 12.1 Marketing navigation

The marketing navbar is fixed and belongs to the centered rail. It contains:

- ecentic trademark/wordmark;
- a concise desktop navigation;
- one primary installation action;
- a mobile sheet below the desktop breakpoint.

Decorative SVG rail pieces may frame it, but they must not obscure the active page, focus state, or
tap targets. Navbar text uses `font-body`; do not depend on an undefined `font-header` utility.

### 12.2 Dashboard shell

The store-scoped shell contains:

- 240px desktop sidebar;
- 56px topbar;
- store switcher;
- active navigation with a 3px primary left rail and light primary tint;
- centered global search with keyboard hint;
- notifications, subscription context, and account control.

The current desktop shell is the baseline. New work must also provide a usable small-screen
navigation; hiding the sidebar without a replacement is not acceptable.

### 12.3 Footer

The shared footer closes the same rail system rather than becoming a separate visual world.

It contains:

1. a CTA band with a restrained primary radial glow;
2. the wordmark and brand statement;
3. a concise navigation grid;
4. social links in square bordered controls;
5. a live system-status line;
6. legal/copyright information;
7. crosshairs at major outer intersections.

Footer rules:

- use a full-bleed outer wrapper with a `max-w-6xl` inner rail;
- keep link columns sharp and border-connected;
- use sentence-case CTA language;
- uppercase is acceptable for tiny navigational column labels;
- retain strong vertical spacing;
- do not turn the footer into an oversized link farm;
- the `stacked` variant continues an existing bordered page shell.

---

## 13. Route recipe: landing `/`

### Job

Explain why AI-agent selection matters and move a visitor toward installation or a product
conversation.

### Composition

1. **Fixed navbar** inside the centered rail.
2. **Light hero** with hands artwork, restrained primary glow, direct value proposition, installation
   CTA, trust note, and product film.
3. **Proof** as a full-bleed statement plus connected metric grid.
4. **Partner evidence** through a compact logo strip and partnership banner.
5. **Three-step loop** inside one dominant primary block.
6. **Feature system** in a sharp 2×2 seam grid.
7. **Comparison** using the data-table language rather than decorative cards.
8. **Case study** with narrative and measurable outcomes.
9. **Testimonials** with restrained rating evidence.
10. **Booking** as the high-intent conversion region.
11. **Shared footer**.

### Design rules

- Keep the hero light; reserve the large primary field for the process/steps section.
- Use full bleed selectively for proof, process, or social evidence.
- Do not reintroduce dormant sections merely because they exist in code.
- Feature icons use `@zenncore/icons` and semantic tokens, not raw color utilities.
- Maintain long-form breathing room with `gap-8 md:gap-12`.
- Product video is the strongest elevated object and may receive the most depth.

---

## 14. Route recipe: pricing `/pricing`

### Job

Help a merchant understand the free scan, choose how to pay, and trust that the commercial model
matches value delivered.

### Composition

1. **Primary hero** with low-contrast texture, headline, explanation, and assurance pills.
2. **Free Scan** as an entry product and proof of immediate value.
3. **Choose how you pay** with a connected three-column plan grid.
4. **Fee explainer** after a hatch gutter, using numbered steps.
5. **Comparison** with one intentionally emphasized column.
6. **Enterprise/partnership band** for needs outside standard plans.
7. **FAQ** in the shared split content layout.
8. **Decision footer** with primary and secondary paths.

### Emphasis

The currently preferred pay-as-you-go model may own the primary-blue card. Do not hardcode
“Dominate is always blue” into the system. Highlight the recommended commercial decision, not a
specific historical tier.

### Alignment rules

- plan titles, prices, descriptions, feature-list starts, and CTA baselines align across columns;
- one plan receives strong emphasis;
- other plans remain rich or neutral surfaces;
- enterprise uses a horizontal band instead of a fourth tower;
- explain performance fees before asking for commitment;
- comparison tables scroll horizontally when they cannot collapse without losing meaning.

---

## 15. Route recipe: store overview `/dashboard/[store]`

### Job

Give the merchant a real-time scorecard and the clearest next action.

### Composition

1. Header with active status, title, subtitle, and “Run simulation.”
2. Four connected stat cells.
3. `SectionGutter`.
4. Performance region with model rates, trend, and recent activity.
5. `SectionGutter`.
6. Tabbed detail region for top products, competitors, and agent visits.

### Hierarchy

- the overall win rate is the leading metric;
- values include comparison context;
- recent activity supports the performance story rather than becoming a competing feed;
- tabs keep related detail in one stable region;
- the simulation action remains visible without dominating every section.

### Rendering

The page is a server component with a static header and section shell. Each data region is an async
server component wrapped in `Suspense` with a shape-matched skeleton.

---

## 16. Route recipe: products `/dashboard/[store]/products`

### Job

Help the merchant find products that need attention, understand why, and drill into action.

### Composition

1. Header with last-scan context and “Add products.”
2. Four connected catalog stat cells.
3. `01 — Performance`: model rates, trend, quality distribution, optimization breakdown.
4. `02 — Catalog`: paginated product table.
5. `03 — Traffic`: agent visits and model/source breakdown.
6. `04 — Insights`: scan findings and priority actions.

Separate major regions with a 16px hatch gutter.

### Product table

The identity cell combines image, title, and supporting metadata. Performance columns use compact
bars plus values. Quality and scan recency remain visible. Add search, filters, sorting, and bulk
actions only when they have a real data contract and responsive plan; do not render dead controls.

The page must work with wide data:

- preserve the most decision-relevant columns;
- allow horizontal scroll where necessary;
- do not silently omit a model from the real table while showing it in a skeleton;
- maintain consistent pagination language and page size.

---

## 17. Route recipe: onboarding `/onboarding/**`

### Job

Reach the first credible win-rate result quickly while teaching the user what the system is doing.

### Flow

1. **Catalog**: choose Shopify, WooCommerce, feed, CSV, or another supported connection.
2. **Select products**: choose the catalog subset to evaluate.
3. **Competitors**: auto-detect, search, add by URL, review, or intentionally skip to auto-match.
4. **Run scan**: confirm inputs, observe progress, and receive the first result.

Nested connect routes and competitor review belong to their parent step; the progress indicator
continues to show four major steps.

### Desktop shell

- full-height split;
- left narrative panel at roughly 55%;
- right task workspace;
- persistent progress rail at top;
- page-specific action footer at bottom;
- internal work area owns scrolling.

### Mobile shell

- hide the narrative panel;
- replace full step labels with progress dots and “Step n of 4”;
- preserve the task title, input context, and primary action;
- avoid viewport-height assumptions that break mobile browser chrome.

### Progress

- active step uses a primary fill;
- completed steps use primary text;
- future steps are visibly muted;
- connectors fill as steps complete;
- transitions clarify movement but do not block navigation.

### Scan phases

**Pre-scan**

- summarize selected products, competitors, and models;
- make the start action unambiguous;
- explain expected duration.

**Running**

- show per-model progress and win/loss counts;
- maintain a light live-intelligence log;
- reveal lines in causal order;
- scroll only the log container;
- announce progress to assistive technology.

**Complete**

- lead with the win rate or primary result;
- show model-level outcomes;
- identify one top finding;
- provide the next action into the store dashboard.

---

## 18. Responsive behavior

### Marketing

- maintain side rails as long as they fit; reduce internal padding before removing structure;
- stack 2-column grids below `md`;
- keep full-bleed sections full bleed while their inner content respects page padding;
- convert navigation to a sheet at `lg`;
- allow wide comparison tables to scroll;
- ensure media controls remain large enough to tap.

### Dashboard

- desktop uses the full sidebar and topbar;
- tablet/small screens require an explicit navigation replacement, not a hidden sidebar alone;
- stat grids move from 1 to 2 to 4 columns;
- chart regions stack before labels or data become cramped;
- tables preserve identity and primary metric first;
- page rails may reduce from `mx-8`, but alignment remains consistent across all sections.

### Onboarding

- narrative panel appears at `lg`;
- labeled stepper appears at `sm`;
- task content is usable at the narrowest supported viewport;
- footer actions wrap or stack without reversing their semantic order;
- inner tables and logs scroll independently.

### Touch and keyboard

- minimum practical target is 40×40px, preferably 44×44px for isolated mobile controls;
- no hover-only actions;
- focus order follows visual order;
- sticky or fixed chrome must not cover anchor targets or focused elements.

---

## 19. Accessibility and implementation architecture

### Accessibility baseline

- Meet WCAG 2.1 AA contrast.
- Use one `h1` and a logical heading hierarchy.
- Provide a skip-to-content link.
- Show visible focus on every interactive element.
- Pair color with a number, icon, shape, or label.
- Label icon-only controls.
- Give charts an accessible title and summary.
- Announce live scan progress without reading every decorative update.
- Preserve meaningful alt text; use empty alt only for truly decorative imagery.
- Respect reduced motion.
- Keep error messages specific and associated with the relevant field or region.

### Next.js page architecture

Outside auth and onboarding:

- `page.tsx` is a server component that exports real HTML;
- page title, description, and section structure are static shell content;
- data fetching lives in async server components;
- each async region is wrapped in `Suspense`;
- skeletons match the eventual region;
- client components are pushed down to the smallest interactive boundary.

Onboarding and auth may be client-heavy, but static headings should remain server-rendered where the
flow permits.

### Package discipline

- UI controls: `@zenncore/web`.
- Icons: `@zenncore/icons`.
- Tables: `DataTableProvider` plus `DataTable`.
- Forms: `InferredForm` plus `field()`.
- Class merging: `cn` from `@zenncore/utils`.
- Motion: the approved `Motion` vocabulary.
- Colors: semantic tokens only.

---

## 20. What not to copy from current code

The following are implementation debt, not design patterns:

- raw classes such as `text-blue-500`, `text-green-500`, `text-red-500`, or `bg-[#EEE]`;
- an undefined `font-header` utility;
- padding, height, text size, border, or color overrides on `Button`;
- call-site restyling of `Table*` or `DataTable`;
- a hidden mobile dashboard sidebar without replacement navigation;
- inconsistent equivalent dashboard title sizes;
- skeletons that describe columns absent from the rendered table;
- `scrollIntoView` in bounded streaming logs;
- raw inputs where an `@zenncore/web` control or `InferredForm` is appropriate;
- decorative Unicode stars or emoji in place of the icon system;
- model colors used without semantic tokens or non-color labels;
- `animate-pulse` treated as the only loading strategy;
- every exported animation primitive treated as approved product vocabulary;
- dormant landing sections treated as part of the active page;
- obsolete unscoped routes such as `/dashboard/products`; store pages use `/dashboard/[store]/*`;
- hardcoded plan emphasis that no longer matches the commercial strategy.

When improving an existing page, remove these patterns opportunistically within the requested scope.
Do not preserve them for visual consistency.

---

## 21. Pre-design prompt

Use this before designing or revising a page:

> You are designing an ecentic surface for commerce operators working in the AI-agent economy.
> Start by naming the user's immediate context, the single action they must complete, and the
> decision the page must make easier. Choose marketing, dashboard, or onboarding mode. Build the
> composition from ecentic's registered rail grid: continuous vertical rails, one-pixel seams,
> connected `gap-px` cells, muted crosshairs at consequential intersections, and a 16px hatched
> gutter only between genuinely different systems. Keep structural geometry sharp. Round only
> controls, pills, media, progress, inset code/log panels, and genuinely elevated surfaces. Use Red
> Hat Display through `font-body`; establish hierarchy with size, weight, tracking, and spacing
> before color. Use the light neutral surface stack, one deliberate primary blue, and semantic
> success/warning/error colors only for measurable meaning. Use `@zenncore/web`,
> `@zenncore/icons`, `InferredForm`, and `DataTable`; never invent raw controls or colors. Use motion
> only to reveal order, progress, selection, or live state, through `Motion.Stagger`,
> `Motion.Item`, `Motion.Up`, or `Motion.Row`. Design responsive, keyboard, reduced-motion,
> loading, empty, error, disabled, hover, focus, and success states. The result should feel like
> refined commerce infrastructure: editorial when explaining, dense when operating, and guided
> when onboarding.

### Component checkpoint

Before writing a component, answer:

```text
Human:
What happened immediately before they reached this surface?

Job:
What single verb must they complete here?

Decision:
What should be clearer when they leave?

Mode:
Marketing, dashboard, or onboarding?

Rails:
Which existing shell and alignment datum does this continue?

Hierarchy:
What is primary, supporting, metadata, and optional detail?

Surfaces:
Which background level belongs to canvas, structure, data, and elevation?

Geometry:
What stays sharp? What is eligible for radius or shadow, and why?

Signals:
Where is blue meaningful? Which statuses need semantic color plus text?

Motion:
What state change requires explanation? If none, do not animate.

States:
Loading, empty, error, success, disabled, hover, focus, reduced motion?

Responsive:
What survives first on a narrow screen, and where does navigation move?
```

---

## 22. Visual and UX QA

### Intent

- Can the page's primary job be stated as one verb?
- Is the intended user and moment clear?
- Does the page feel specific to commerce optimization for AI agents?
- Would the composition still make sense if all decoration were removed?

### Structure

- Does the page continue the correct marketing, dashboard, or onboarding rail?
- Are major edges aligned to a shared datum?
- Are connected cells built with `gap-px` rather than doubled borders?
- Are crosshairs marking real intersections rather than decorating cards?
- Are hatch gutters limited to major system boundaries?
- Do structural cells remain sharp?

### Hierarchy and typography

- Is there one unmistakable primary heading or result?
- Are equivalent headings consistent in size and weight?
- Is secondary copy visibly quieter without becoming inaccessible?
- Are paragraphs kept to a readable line length?
- Are labels sentence case except for technical metadata?
- Are changing numbers tabular and contextualized?

### Color and depth

- Are all colors semantic tokens?
- Is primary blue concentrated in action, selection, or strategic emphasis?
- Do status colors carry measurable meaning and have a non-color cue?
- Is the surface stack subtle and consistent?
- Are shadows reserved for actual elevation?
- Could any rounded container become a sharp section or connected cell?

### Components

- Are controls from `@zenncore/web`?
- Are icons from `@zenncore/icons`, visually consistent, and necessary?
- Are forms built with the established form system?
- Are tables built with the data-table system?
- Are primitive styles left intact at call sites?
- Do all controls have hover, pressed, focus, and disabled states?

### Motion

- Does each animation explain order, progress, selection, or state?
- Is motion drawn from the approved vocabulary?
- Are transforms and opacity used instead of layout-thrashing properties?
- Is reduced-motion behavior complete?
- Do bounded logs scroll internally?

### Responsive and accessibility

- Is the page fully usable without the desktop sidebar or narrative panel?
- Is navigation still available on small screens?
- Do grids stack before content becomes cramped?
- Are wide tables handled deliberately?
- Is focus order logical and visible?
- Are live updates announced appropriately?
- Are touch targets practical?
- Does contrast meet AA?

### Data states and architecture

- Does each streamed region have a shape-matched skeleton?
- Is there a designed empty state with one next action?
- Are errors specific and recoverable?
- Is partial successful data preserved?
- Does `page.tsx` render a real server shell outside onboarding/auth?
- Are interactive client boundaries as small as practical?

### Final craft tests

- **Squint test:** hierarchy remains visible; no border or color shouts without reason.
- **Swap test:** replacing the rail grid with generic rounded cards would visibly destroy the
  identity.
- **Signature test:** the registered rail system appears in multiple specific, useful places.
- **Restraint test:** removing one glow, color, shadow, badge, or animation makes the page weaker,
  not cleaner.
- **Action test:** the user can identify what to do next within a few seconds.

---

## 23. Canonical source map

Use these files as implementation references:

- Tokens: `packages/shared/config/src/tailwind/globals.css`
- App utilities and transitions: `apps/web/src/app/globals.css`
- Root font: `apps/web/src/app/[locale]/layout.tsx`
- Marketing crosshair: `apps/web/src/components/plus.tsx`
- Dashboard grid helpers: `apps/web/src/app/(main)/dashboard/_components/grid.tsx`
- Approved motion wrapper: `apps/web/src/components/motion.tsx`
- Marketing landing: `apps/web/src/app/(main)/page.tsx`
- Pricing: `apps/web/src/app/(main)/pricing/page.tsx`
- Shared content layout: `apps/web/src/app/(main)/_components/content.tsx`
- Store overview: `apps/web/src/app/(main)/dashboard/[store]/page.tsx`
- Store products: `apps/web/src/app/(main)/dashboard/[store]/products/page.tsx`
- Dashboard shell: `apps/web/src/app/(main)/dashboard/[store]/layout.tsx`
- Onboarding shell: `apps/web/src/app/(auth)/onboarding/_components/onboarding-layout.tsx`
- Onboarding narrative panel: `apps/web/src/components/onboarding.tsx`
- Footer: `apps/web/src/components/footer.tsx`

These references show how the system is assembled. This document determines which patterns should be
repeated and which should be corrected.
