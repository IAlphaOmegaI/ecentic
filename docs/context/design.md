# écentic — Design System & Visual Build Guide

> **This is THE single source of truth for everything design‑related at écentic.** It merges the
> UI/UX *Design Refresh* mandate (precedence), the rendered landing‑page brand language (formerly
> `DESIGN.pdf`), the codebase‑grounded style guide (formerly `style.md`), and the full dashboard
> information architecture (formerly `dashboard.md`) into one document. Read it before building any
> page, component, or section. If anything you build disagrees with this file, this file wins.

---

## 0. How to use this document (read first)

You are building or refreshing the visual surface of **écentic** — an autonomous optimization
platform for the AI‑agent shopping economy. Your job is to produce **beautiful, consistent, on‑brand
pages every time**. This document gives you the bones, the skin, and the recipes.

### The one‑line philosophy

> **Same bones, new skin.** The brutalist grid is the structural DNA and is *non‑negotiable*. Everything
> that surrounds the grid — typography, color application, spacing, component polish, iconography,
> motion — must feel modern, precise, and engineered. Brutalist, but refined. Infrastructural, not
> decorated.

### Precedence order (resolve every conflict in this order)

1. **The Design Refresh mandate** (§2, §5–§9) — the modernization direction. It wins.
2. **Real `@zenncore` semantic tokens & classes** (§4) — the only vocabulary the code understands.
   The refresh was authored in raw px/hex; this document has already translated that intent into
   tokens. **Never** ship raw hex or `text-gray-*`.
3. **Brand visual language** (§3, §10, §11) — the grid DNA, motifs, and page recipes.

### Build checklist (run this for every page)

1. **Shell** — `page.tsx` is a **server component** that exports real HTML (title, headings, layout). Not a thin wrapper around one client component. (§12)
2. **Stream** — wrap each data region in `<Suspense fallback={<Skeleton/>}>` with a shape‑matched skeleton. (§12)
3. **Scaffold the grid** — `gap-px` cells on `bg-accent-foreground`, `+` crosshair corners, hatched dividers, section numbering. (§3)
4. **Apply tokens** — semantic only. Blue = `primary`. Borders = `accent-foreground`. (§4)
5. **Set type** — pick the Display scale (marketing) or App scale (dashboard). (§5)
6. **Drop in components** — use `@zenncore/web` primitives as‑is; never re‑style them. (§7, §8)
7. **Add the skin** — radius/shadow on interactive & elevated elements only, 150ms transitions, focus rings, shimmer loads. Grid cells stay sharp. (§6)
8. **Place a motif** if the surface calls for one (crosshair, hatch, human‑vs‑agent panel, the box). (§9)
9. **QA** against the master Do/Don't checklist. (§15)

---

## 1. What écentic is (so your design decisions are correct)

AI shopping agents (GPT‑4, Claude, Gemini, Perplexity) increasingly decide what consumers buy. They
ignore ads, branding, and emotional copy — they parse **structured product data**, compare specs, and
pick a winner in milliseconds. If a merchant's data is incomplete, agents skip them.

écentic imports a merchant's catalog, runs **simulated purchase decisions** across multiple models
against real competitors, **diagnoses** exactly why agents pick competitors, and **auto‑generates +
publishes** optimized listings. Core loop:

> **Simulate → Diagnose → Optimize → Publish → Repeat.**

**What this means for design:**

- **The human/agent duality is the central brand idea.** Pretty product photo vs. cold machine‑readable
  JSON. Lean into that contrast (see the "What Humans See / What Agents See" motif, §9).
- **Data density is a feature, not a problem.** Tables, scores, deltas, per‑model breakdowns. Make
  density legible and calm, never cramped.
- **The feeling is "infrastructure for commerce."** Confident, precise, slightly austere. The blue is
  the only loud color; everything else is restrained grayscale.
- **Language:** always "AI agents," never just "AI." Brand is **écentic** (lowercase, accented *é*).

---

## 2. The Design Mandate (Keep / Fix) — *takes precedence*

### KEEP — non‑negotiable structural DNA

- Brutalist grid: `+` crosshair corner markers, hatched section dividers, hard 1px cell borders.
- White / very‑light‑gray content temperature (`background` `#f5f5f5`, `background-rich` `#ffffff`).
- Left sidebar navigation; top search bar + header bar layout.
- Blue primary action color (`primary` `#1572fa` — keep the hue, the token already refines weight).
- Data‑dense table layouts.
- Section numbering convention ("01 — PERFORMANCE", "02 — CATALOG", …).

### FIX — everything else (this is the refresh)

Typography hierarchy, color *application*, spacing rhythm, component polish, iconography (no emoji),
and motion. The sections below specify exactly how.

### Same bones, new skin

You are modernizing the **aesthetics** without touching the **architecture**. Do not redesign the
grid. Re‑skin what surrounds it.

---

## 3. The Brutalist Grid DNA (the bones — do not change)

### 3.1 The `gap-px` grid philosophy

Grids of cards/cells never use explicit per‑cell borders. Use a 1px gap over an
`accent-foreground` background so the gap *is* the seam:

```tsx
<div className="grid grid-cols-2 gap-px bg-accent-foreground">
  <div className="bg-background-dimmed p-6">Cell 1</div>
  <div className="bg-background-dimmed p-6">Cell 2</div>
</div>
```

Sharp edges only. **No rounded corners on grid cells.** No explicit `border` between cells.

### 3.2 Section borders & rails

- Horizontal dividers between sections: `border-accent-foreground border-b` / `border-t`.
- Vertical column dividers: `divide-x divide-accent-foreground` (or `border-r` on all but last).
- Full section wrap: `border-accent-foreground border-y`.
- Main container side rails: `border-accent-foreground border-x` on `<main>`.

### 3.3 The `+` crosshair corner markers

Small plus/crosshair glyphs that mark grid intersections — the signature brutalist tell. Keep them.
Render lighter than before (use `text-foreground-dimmed` at reduced opacity, e.g. `/60`). They are
decorative registration marks; never let them compete with content.

### 3.4 The hatched section dividers (the `bg-grid-stripes` utility)

The diagonal hatch is a real utility already in the codebase:

```css
/* -45° repeating 1px stripes in the border color, 8px tile */
@utility bg-grid-stripes { /* accent-foreground stripes, 8px 8px */ }
```

**Refresh rules for hatch bands:**

- Make them **intentional and slim** — band height **16px** (down from ~40px), `opacity ~0.6`.
- Keep the `+` markers inside lighter.
- A hatch band signals a deliberate seam between major sections — don't sprinkle them.

### 3.5 Full‑bleed sections (landing)

Sections that break past the `max-w-6xl` container:

```tsx
<section className="relative -left-[calc(50vw-50%)] w-screen border border-accent-foreground">
  <div className="mx-auto max-w-6xl">{/* contained content */}</div>
</section>
```

The hero uses this with `-z-1` so it sits behind the main container's `border-x` rails.

### 3.6 Section numbering

Major sections carry a monospace‑feeling index + label: **"01 — PERFORMANCE"**, **"02 — CATALOG"**.
Keep the convention. Render the label as a section‑label bar (see §5.4), not a raw `■`.

---

## 4. Design Tokens — the only vocabulary (`@zenncore`)

> **Rule Zero — never override package styles.** Components from `@zenncore/web` (`Button`, `Table`,
> `TableHead`, `TableCell`, `TableRow`, `DataTable`, `Tabs`, …) ship their own base styles and are the
> source of truth. Do **not** pass `className` to change their padding/size/border/color. If a base
> style is wrong, fix it in `packages/web/src/components/`, not at the call site. The only acceptable
> `className` additions are layout (`w-full`, `mt-auto`) or an explicit one‑off the user requested.

**Never use raw colors** (`text-gray-500`, `bg-white`, `#hex`). Semantic tokens only. Every family has
`{base}`, and most have `-dimmed`, `-rich`, and `-foreground` variants.

### 4.1 Surfaces (backgrounds)

| Token | Value | Use |
|---|---|---|
| `bg-background` | `#f5f5f5` | Page background (body, dashboard main). |
| `bg-background-dimmed` | `#e8e8e8` | Section fills, card backgrounds, grid cells, hover states. |
| `bg-background-rich` | `#ffffff` | Table headers, elevated/white cards, the comparison table. |
| `bg-primary` | `#1572fa` | Hero, Dominate pricing card, footer CTA, primary fills. |
| `bg-emphasis` *(family)* | dark gray (oklch ~20%) | Dark surfaces: the replay terminal, code insets. |

### 4.2 Text

| Token | Value | Use |
|---|---|---|
| `text-foreground-rich` | `#16181d` | Near‑black: strong headings, stat values, emphasis numbers. |
| `text-foreground` | `#404040` | Primary body text, headings. |
| `text-foreground-dimmed` | `#919191` | Secondary text, captions, stat labels, muted icons, crosshairs. |
| `text-primary` | `#1572fa` | Brand accent, CTA labels, active states, links. |
| `text-white` | — | Text on `bg-primary`/dark surfaces. |
| `text-white/70`, `/60`, `/80` | — | Muted copy on blue (subtitles, feature lists). |

### 4.3 Borders — one token, everywhere

```
border-accent-foreground   /* ≈ light gray; ALL grid borders, dividers, rails, hatch stripes */
```

No `border-gray-200`, no `border-primary` on containers. `border-primary` appears only on specific
`Button` outlines where the component requires it for CTA emphasis.

### 4.4 Semantic status & data colors

Use these for **meaning**, never for decoration. Map win‑rate and status here:

| Meaning | Token | Value | Where |
|---|---|---|---|
| Brand / primary action | `primary` | `#1572fa` | CTAs, links, active nav, highlighted column/card. |
| Win rate **high** (> 60%) | `success` | `#059669` | Win‑rate bars/text, "Stronger", positive deltas. |
| Win rate **medium** (30–60%) | `warning` | `#d97706` | Mid win‑rate, "Weak", UCP score pill (amber). |
| Win rate **low** (< 30%) | `error` | `#e11d48` | Low win‑rate, "Missing", FATAL/agent‑rejected, danger zone. |
| Informational status | `info` | blue (oklch ~259) | Neutral status pills, "in progress". |

Each has `-dimmed` (deep/tint‑bg), `-rich` (light), and `-foreground` (on‑color text) — e.g. a success
pill is `bg-success-dimmed text-success` or `bg-success/10 text-success`.

### 4.5 Premium / gold accent

For premium/UCP "shine" moments there is `animate-gold-shine` (an animated gold gradient clipped to
text). Use sparingly — premium tier highlights, score celebrations. Default UCP status uses `warning`
(amber), not gold.

---

## 5. Typography

**Font:** set via `font-body` on `<body>` and inherited everywhere (currently resolves to Red Hat
Display via `--font-redhat-display`). Global letter‑spacing `tracking-[-4%]`. Use the `font-body`
class — never hardcode a typeface.

There are **two scales**. Pick by surface.

### 5.1 Display scale — marketing / landing

| Element | Classes | Notes |
|---|---|---|
| Hero h1 | `font-semibold text-4xl sm:text-5xl md:text-[76px]` | The one place `font-semibold` is right. |
| Section h2 | `font-body text-3xl md:text-6xl` | **No** `font-medium`/`font-semibold` — natural `font-body` weight is correct. |
| Card / feature title (grid) | `font-body font-medium text-2xl md:text-4xl` | |
| Description / subtitle | `font-light text-foreground-dimmed text-lg` (or `md:text-2xl` near hero) | |
| Small caption | `font-light text-foreground-dimmed text-sm` | |

### 5.2 App scale — dashboard (refresh hierarchy, in tokens)

| Element | Intent (refresh) | Classes |
|---|---|---|
| Page title | 28px / 700 / tracking ‑0.02em | `text-[1.75rem] font-bold tracking-[-0.02em] text-foreground-rich` |
| Page subtitle | 14px / 400 / secondary | `text-sm text-foreground-dimmed` |
| Stat **label** | 10px / 500 / tracking 0.08em / ALL‑CAPS | `text-[10px] font-medium uppercase tracking-[0.08em] text-foreground-dimmed` |
| Stat **value** | 36px / 700 / tracking ‑0.02em | `text-4xl font-bold tracking-[-0.02em] text-foreground-rich` |
| Stat **value suffix** (`%`, `/100`) | 20px / 500 | `text-xl font-medium text-foreground-dimmed` |
| Stat **delta / sub** | 12px / semantic color | `text-xs text-success` \| `text-error` \| `text-foreground-dimmed` |

> **Precedence note:** where the old style guide said dashboard titles were `font-medium text-3xl`, the
> refresh wins: titles are **bold, 28px, tight tracking, `foreground-rich`**.

### 5.3 Tables

- Cell text: `font-light text-foreground text-sm` (DataTable base handles it).
- Header text: `font-medium text-foreground text-sm` (TableHead base handles it).
- Do **not** add `text-sm`/padding to Table primitives at the call site.

### 5.4 The section‑label bar (replaces the `■` square)

The eyebrow that precedes a section title. Replace any `■` with a **3px × 14px primary rectangle bar**
(`rounded-[2px]`) followed by ALL‑CAPS label text:

```tsx
<div className="flex items-center gap-2">
  <span className="h-[14px] w-[3px] rounded-[2px] bg-primary" />
  <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-foreground-dimmed">
    01 — Performance
  </span>
</div>
```

### 5.5 Weight rules

| Weight | When |
|---|---|
| `font-light` | Descriptions, subtitles, secondary text, table cells. |
| (none) | Landing section h2s (natural `font-body`). |
| `font-medium` | Card titles, table headers, button text, prices, labels. |
| `font-semibold` | Hero h1, large emphasis numbers (#1, scores). |
| `font-bold` | Dashboard page titles, stat values, score numbers (72/100). |

---

## 6. The "new skin" — radius, shadow, spacing, motion

This is the polish layer. **It never touches the grid.** Grid cells, section dividers, and rails stay
sharp (`rounded-none`). Radius/shadow apply only to **interactive** and **elevated** elements
(buttons, pills, chips, inputs, suggestion cards, progress bars, donuts, avatars).

### 6.1 Radius scale

| Token | Radius | Use |
|---|---|---|
| `rounded-sm` | 4px | ⌘K chip, progress bars, small tags. |
| `rounded-md` | 6px | Buttons, plan badge, inputs. |
| `rounded-lg` | 8px | Suggestion cards, panels, search field, segmented control. |
| `rounded-xl` | 12px | Larger elevated cards, modals. |
| `rounded-full` | — | Pills, badges, avatars, status dots, icon chips. |

### 6.2 Shadow scale

Keep shadows **whisper‑soft** — this is a light, flat, infrastructural UI, not Material.

| Level | Use |
|---|---|
| `shadow-sm` | Active segmented‑control thumb, resting suggestion card. |
| `shadow-md` | Hover lift on cards, dropdowns, popovers. |
| (none) | Default for everything inside the grid. |

### 6.3 Spacing rhythm

**Landing:** section gaps `gap-8 md:gap-12`; section padding `p-4 md:p-8` or `p-6 md:p-12`; cell
padding `p-4`/`p-6`.

**Dashboard:** content wrapper `mx-8` with `border-x` rails; section separators = `h-8` spacer +
`border-t border-accent-foreground` wrapper; full‑bleed borders via `-mx-8 border-b`; card padding
`px-6 py-8`.

**Tables:** cell padding `px-4 py-3` (base component). Row height ≈ **52px**. Don't add custom padding.

### 6.4 Motion

- **150ms ease** transitions on every interactive element (`button`, `a`, `[role="tab"]`,
  `[role="menuitem"]` already wired globally; rows transition `background-color` in 100ms).
- **Focus rings** on all inputs/controls: `focus-visible:ring-2 focus-visible:ring-primary/40`.
- **Shimmer** loading on skeletons (not spinners) for content placeholders.
- **Hover**: subtle `bg-background-dimmed` on rows/nav; `shadow-md` + `ring-1 ring-accent-foreground`
  lift on suggestion cards.
- Keep motion functional and quick. No bouncy, no long durations.

### 6.5 Progress bars (unified)

One style everywhere: track `bg-background-dimmed`, fill semantic (`bg-success`/`warning`/`error` or
`bg-primary`), height ~4–6px, `rounded-sm`/`rounded-full`, 150ms width transition.

---

## 7. Iconography

- Family: **`@zenncore/icons`** (monoline SVG). One family only — never mix icon sets, never emoji.
- Size **20×20**, stroke‑weight **1.5**, `currentColor`.
- Default color **muted** (`text-foreground-dimmed`). Only color an icon `success`/`warning`/`error`
  when it is itself a **status indicator**.
- In stat cards, icons sit in a **36×36 rounded chip**: `bg-background-dimmed rounded-md` (or
  `rounded-full`), icon centered, top‑right of the card.
- Sidebar icons: **16px**, `currentColor`, inherit the nav item's state color.

> Emoji are banned from the UI. Where older specs used 📉 ✅ ⚡ 🔒 (e.g. notification types), use the
> matching monoline icon tinted by semantic color instead.

---

## 8. Component specifications

All of these are the refresh, expressed in real tokens. Build with `@zenncore/web` primitives; the
specs below describe composition and the surrounding skin, not overrides of base styles.

### 8.1 Stat card

```
┌─────────────────────────────┐
│ LABEL                  [◧]   │  label: §5.2 stat label · chip: 36px §7
│ 87%                          │  value §5.2 + suffix §5.2
│ ▲ 4.2% vs last week          │  delta: text-xs, success/error
└─────────────────────────────┘
```

- Container: grid cell (sharp, `bg-background-dimmed`, `p-6`) — or elevated `rounded-lg` card off‑grid.
- Icon chip top‑right (§7). No emoji.
- Delta uses a semantic arrow + color; neutral deltas `text-foreground-dimmed`.

### 8.2 Page header

```
┌ 3px bar  01 — PERFORMANCE                                   [● Active] ┐
│ Win Rate Overview                                                      │
│ How AI agents rank your catalog against competitors, updated daily.    │
```

- Section‑label bar (§5.4) → Title (`text-[1.75rem] font-bold` …) → Subtitle (`text-sm text-foreground-dimmed`).
- **Status pill:** tinted bg, semantic text, `text-[11px] font-semibold uppercase tracking-[0.05em]`,
  `px-2 py-0.5 rounded-full` — e.g. `bg-success/10 text-success`.

### 8.3 Navigation sidebar (240px, collapsible to 64px)

- **Active item:** `border-l-[3px] border-primary` + `bg-primary/8` tint + `font-semibold text-primary`.
- **Inactive:** `text-foreground-dimmed`; **hover:** `bg-background-dimmed`; 150ms transitions.
- Icons 16px, `currentColor`.
- **Badge counts:** `bg-primary/10 text-primary text-[11px] font-semibold rounded-full px-2`.
- **UCP completeness badge:** amber — `bg-warning/10 text-warning`.
- **User avatar:** primary→purple gradient, `rounded-full`, white bold initial.
- Bottom: prominent "Run New Simulation" primary button; live "Simulation in progress… 67%" status;
  free‑tier upgrade CTA.

### 8.4 Top header bar (64px)

- **Search:** `bg-background-rich`, `border border-accent-foreground`, `rounded-lg`, `h-9`, focus ring.
  Position is fixed — center; keep the ⌘K affordance.
- **⌘K chip:** `bg-background-rich border border-accent-foreground rounded-sm text-[10px]` inside the field, right‑aligned.
- **Plan badge** ("Dominate"): outlined‑primary `rounded-md font-semibold` button → billing.
- **Avatar:** 32px primary→purple gradient circle.
- Left: écentic logo → dashboard home. Right also holds the notification bell (unread count badge).

### 8.5 Tables

- Row height ~**52px**; zebra off; hover `bg-background-dimmed` (100ms).
- Headers `text-[11px] font-semibold uppercase` muted; left‑aligned.
- Inline **progress bars** 4px `rounded-sm` (win‑rate, data quality).
- **Ghost row arrow:** a muted `→` chevron that appears on row hover, signaling drill‑in.
- Win‑rate cells: colored bar + value using `success`/`warning`/`error`.
- Never restyle `Table*`/`DataTable` via `className`/`classList` (Rule Zero).

### 8.6 Tabs / segmented control

- Container: `bg-background-dimmed rounded-lg p-1`.
- Active thumb: `bg-background-rich shadow-sm rounded-md`.
- Labels: sentence case, **no ALL‑CAPS**, `font-medium`. 150ms transition on the thumb.

### 8.7 Agent‑replay terminal

- Surface: dark slate (`bg-emphasis` family), `rounded-lg`, mono font.
- Top **header bar** with traffic‑light affordance / run label.
- Body: monospace decision log; **green** (`text-success`) for attribute wins, **red** (`text-error`)
  for losses/`[not specified]`. Typewriter reveal on first run.

```
→ Read product: Pro Earbuds ($139)
→ Read competitor: SoundMax X3 ($129)

Evaluating attributes:
  battery_life:
    Pro Earbuds = [not specified]   ✕   (error)
    SoundMax X3 = "8 hours"         ✓   (success)

DECISION: Selected SoundMax X3
```

### 8.8 Forms / settings

- Inputs: `rounded-md border-accent-foreground`, focus ring `ring-primary/40`.
- Group sections with grid rails + section‑label bars.
- **Danger zone:** wrapped block with `border-error/40` + `bg-error/5`, destructive button `error`.
- Use `InferredForm` + `field()` — never inline `<input>` or hand‑rolled RHF registration.

### 8.9 Tags & badges

Pill containers (`rounded-full`, `text-[11px] font-semibold`, tinted bg + semantic text):

- **Type** badges → `info`/neutral tint.
- **Priority** (High/Med/Low) → `error`/`warning`/`foreground-dimmed`.
- **Win‑rate** badges → `success`/`warning`/`error`.
- **Status** (Missing/Weak/Stronger/Equal) → `error`/`warning`/`success`/`foreground-dimmed`.

### 8.10 Optimize suggestion cards

- `rounded-lg`, resting `shadow-sm`, hover `shadow-md` + `ring-1 ring-accent-foreground`.
- **Model dots:** small `rounded-full` dots indicating which models flagged the suggestion.
- **Button trio:** Approve & Publish (`primary` flat) · Edit (`outline`) · Dismiss (`ghost`) — identical heights.

### 8.11 Charts

- **Donut/competitor palette:** lead with `primary`, then a restrained tonal set (`primary-rich`,
  `info`, `success`, `warning`) — never a rainbow. Keep grayscale for "other".
- Bars/lines: `primary` for aggregate; semantic colors only where they carry win/loss meaning.
- Recharts; tooltips on `bg-background-rich` with `border-accent-foreground` + `shadow-md`.

### 8.12 Buttons (`@zenncore/web/components/button`)

Never hand‑code buttons with `<Link>`/`<a>`/`<div>`. Use `render={<Link href="…" />}` for links.

| Context | Variant | Color | Extra |
|---|---|---|---|
| Primary CTA (on white) | `flat` | `primary` | `w-full` if full‑width |
| Primary CTA (on blue) | `flat` | `primary` | `bg-white text-primary border border-white/30` |
| Secondary action | `outline` | `accent` | `border-primary text-primary` |
| Ghost / icon‑only | `ghost` | `accent` | `size="icon"` |

Never add `text-sm`/`text-lg`/`py-*`/`px-*` to buttons (the component sizes itself). All buttons in a
row share identical height/padding.

### 8.13 Loading, empty & error states

- **Loading:** skeletons that match content shape (8 skeleton rows for tables, chart‑area blocks),
  shimmer not spin; disabled buttons show an inline spinner; progress UI for > 5s operations.
- **Empty:** every page has a designed empty state — monoline icon, headline, one‑line description,
  primary CTA.
- **Errors:** toast with retry; offline banner; per‑store sync error cards; show partial results if one
  model fails; custom 404; optimistic updates revert on failure.

---

## 9. Visual motifs library (the brand language)

These motifs carry écentic's identity. The landing reconstruction (§10) shows them in context; reuse
them deliberately.

### 9.1 Crosshair `+` corners & hatched bands
The brutalist registration marks (§3.3) and slim diagonal seams (§3.4). The structural signature.

### 9.2 The package / box motif — *the hero illustration*
An **isometric opening cardboard box** rendered as `primary`‑blue line‑art, with a **glowing white
sphere/pearl** rising out of it. Meaning: *the product the agent reaches in and picks.* It appears
two ways:
- **Hero top corners:** die‑cut box flaps double as the crosshair corner markers.
- **Footer CTA:** the full box + pearl, centered, as the closing brand image.
This is écentic's primary illustration — favor it over generic stock imagery.

### 9.3 Human‑vs‑Agent duality panel — *the core conceptual motif*
A two‑cell `gap-px` comparison:
- **"What Humans See":** a polished product card — photo, friendly title, marketing description, blue
  "Add to Cart" button.
- **"What Agents See":** a monospace JSON inset (`bg-background-dimmed`, `rounded-lg`) of the same
  product, with missing fields **struck through in `error`** and annotated `// FATAL: Agent rejected`,
  ending in a `RESULT:` line ("Dropped from consideration set…").
Use it anywhere you contrast human perception with machine parsing.

### 9.4 The closed‑loop diagonal stepper
Three nodes — **Simulate → Diagnose → Optimize (Auto)** — staggered diagonally across a blue
full‑bleed section, joined by a dotted connector and crosshair grid. Each node: monoline icon
(magnifier / breakdown / lightning), title, one short paragraph.

### 9.5 Highlighted‑column comparison table
A capability matrix where competitor columns get `—`/✓ and the **écentic column is tinted `primary`**
and visually elevated. The "audits tell you what's broken, écentic fixes it" device.

### 9.6 Circuit / topographic hero texture
A faint, low‑contrast circuit‑line or topographic texture inside `bg-primary` blocks. Keep it whisper
‑low so white headline copy stays crisp.

### 9.7 ASCII‑art illustration (kept)
The Simulations page keeps its **ASCII‑art illustration** (explicit product decision). Do not replace
it with a dot‑grid or other treatment.

---

## 10. Landing / marketing page recipe (full reconstruction)

> This reconstructs the canonical landing design (formerly `DESIGN.pdf`) so it survives without the
> binary. Build top to bottom with full‑bleed sections (§3.5), `gap-px` grids, and the motifs above.
> Copy below is the reference copy (design is the deliverable; treat copy as illustrative content).

**Header** — on the blue hero. Left: `écentic` wordmark (lowercase, accented *é*, small blue box
glyph). Center: rounded pill `Menu · 0%`. Right: `Get Started`. White text on blue.

**1 · Hero** — `bg-primary`, full‑bleed, faint circuit texture (§9.6); box‑flap crosshair corners
(§9.2).
- h1 (white, Display): **"Win every agent's cart."**
- Sub (`text-white/70`): "écentic simulates how AI shopping agents choose between your products and
  competitors, then automatically rewrites your listings to get picked first. Not monitoring. Not
  auditing. Autonomous optimization."

**2 · The Blind Spot** — `bg-background`.
- Eyebrow: `●` primary dot + "The Blind Spot".
- h2: **"Your products are invisible to the buyers that matter most."**
- Body: "AI agents are already shopping for your customers. They don't see ads or scroll your page.
  They read data, compare specs, and choose in milliseconds. You don't know how often they pick you or
  how to change it."
- **Human‑vs‑Agent panel** (§9.3): left = "Pro Wireless Earbuds – Light" card + `Add to Cart · $139`;
  right = JSON with `battery-life: null` and `warranty: null` struck through in `error`, `// FATAL`,
  then `RESULT: Dropped from consideration set. Competitor chosen due to explicit spec verification.`

**3 · Three steps** — `bg-primary`, full‑bleed. h2 (white) **"From blind to winning in three steps."**
+ sub "A closed‑loop system designed exclusively for the AI agent economy." Then the **diagonal
stepper** (§9.4): *Simulate* (run purchases across GPT‑4, Claude, Gemini, Perplexity vs real
competitors) → *Diagnose* (per‑product attribute breakdown of why agents pick competitors) →
*Optimize (Auto)* (auto‑generated titles/descriptions/structured data; one‑click or auto‑publish;
re‑optimized as models drift).

**4 · Infrastructure** — `bg-background-dimmed`, crosshair grid. h2 **"Infrastructure for the agent
economy."** 2×2 `gap-px` feature grid:
- **Agent Win Rate Dashboard** (bar icon, primary) — selection rate per product vs competitors, by model, daily.
- **Multi‑Model Engine** (circle icon, success) — every product tested across 5+ agent models and their selection biases.
- **Competitor Battlecards** — which competitor products beat yours, on which attributes.
- **UCP Readiness & Structured Data** (`</>`) — generate your `/.well-known/ucp` profile; extract attributes from images/descriptions.

**5 · Comparison table** — `bg-background-rich` card. h2 **"Audits tell you what's broken. "** +
`text-primary` "écentic fixes it." Columns: *Capabilities · Audit Tools · GEO Monitoring · écentic*
(écentic column tinted `primary`, §9.5). Rows: AI‑ready check (✓/—/✓) · brand mentions in AI search
(—/✓/✓) · simulates agent purchasing (—/—/✓) · win rate vs specific competitors (—/—/✓) ·
auto‑generates optimized listings (Partial/—/✓) · re‑optimizes when models update (—/—/✓).

**6 · Pricing** — `bg-background`, crosshair grid. h2 **"Start free."** + "Pay when agents start
picking you." Tier cards in a `gap-px` grid:
- **Scan — Free** ("See where you stand"): win rate for top 5 products · one‑time sim across 3 models · basic attributes → `Start Free Scan` (outline).
- **Compete — $149/mo** ("Know your enemy"): up to 100 products · daily simulations · competitor battlecards · manual optimization suggestions → `Start Competing` (outline).
- **Dominate — $449/mo** ("Win on autopilot") — **highlighted `bg-primary` card, white text**: up to 1,000 products · continuous simulations · auto‑optimization + one‑click publish · model‑drift alerts · UCP generation → `Start Dominating` (white bg / primary text).
- **Enterprise** (full‑width row, `bg-background-dimmed`): "For teams that need custom limits, enterprise security, and dedicated support." → `Contact Sales` (outline).

**7 · Footer CTA** — `bg-primary` gradient, full‑bleed. Large white `écentic` wordmark. "The next era
of commerce isn't about who ranks #1 on Google." + emphasized "It's about who gets picked by the
agent." → `Get your free Win Rate Report` (white bg / primary text). Below: the **box + pearl
illustration** (§9.2).

---

## 11. Dashboard information architecture

The logged‑in app. Every screen follows the PPR/streaming page pattern (§12), the grid DNA (§3), and
the components in §8. (Stack note: this app is **Next.js 16 App Router + Better Auth + Drizzle/Postgres
+ `@zenncore/web`** — ignore any legacy mention of shadcn/Clerk/Supabase in older briefs.)

### 11.1 Shell

- **Topbar (64px):** logo → home · centered global search + ⌘K · right: notification bell, plan badge, avatar dropdown (settings, billing, help, sign out). (§8.4)
- **Sidebar (240px → 64px):** Overview · Products (badge: count) · Competitors · Optimize (badge: pending) · UCP & Data (badge: completeness %) · Reports · Settings. Bottom: Run New Simulation, live sim status, upgrade CTA. (§8.3)
- **Responsive:** ≥1280 full sidebar · 768–1279 icon sidebar · <768 hamburger + bottom tabs.

### 11.2 Overview (`/dashboard`)
4 stat cards (Overall Win Rate + sparkline · Products Scanned `47/100` + ring · Top Performer · Biggest
Opportunity) → Win‑Rate‑by‑Model horizontal bars (7/30/90/All) → Win‑Rate Trend line (per‑model +
aggregate, optimization/drift annotations) → Top‑10 product win‑rate table (per‑model columns, gap,
status, action) → Recent Activity feed → Quick Actions bar.

### 11.3 Products (`/dashboard/products`)
Data‑dense table: debounced search · category/win‑rate/model/status/store filters · sort · table/grid
toggle · bulk actions. Columns: checkbox, 48px image, title+subtitle, price, win‑rate bar, GPT‑4,
Claude, Gemini, Perplexity, competitor gap, data‑quality ring, last simulated, actions. Pagination
25/50/100. "Add Products" modal (sync / CSV / manual).

### 11.4 Product detail (`/dashboard/products/:id`) — 5 tabs (segmented control §8.6)
Header: 200px image, title (editable for manual), price, category, SKU, large win‑rate + trend, store
badge, actions.
1. **Win Rate Overview** — trend line, per‑model breakdown cards, win‑rate‑by‑competitor bars (worst first).
2. **Agent Decision Replay** — the terminal (§8.7): model tabs, run selector, diff/compare, red/green attribute highlighting.
3. **Attribute Gap Analysis** — table: Attribute · Your Product · Top Competitor · Status (Missing/Weak/Stronger/Equal) · Impact (High/Med/Low). "Fix This" per row; data‑quality score vs category benchmark.
4. **Competitor Battlecard** — per‑competitor: win‑rate bar, "You Win On" vs "They Win On", counter‑moves with estimated lift, "Apply All".
5. **Optimization Panel** — side‑by‑side current vs optimized diff (additions `success`, removals `error`); Approve & Publish / Edit / Schedule / Dismiss / Auto‑publish toggle; optimization history + rollback.

### 11.5 Competitors (`/dashboard/competitors`)
Overview stats (tracked, W/L record, most dangerous). Competitor table (logo+name, products,
your win rate, their strongest attr, your strongest attr, updated, actions). **Attribute heatmap**
(rows = attributes, cols = competitors, cells `success`/`warning`/`error`). Alerts feed. Add flow
(auto‑detect / URL / brand search).

### 11.6 Optimize (`/dashboard/optimize`)
Tabs: **Pending** (approval queue + bulk) · **In Progress** (publishing status) · **Published**
(before→after win rates + rollback) · **Dismissed** (Reconsider). Auto‑optimization settings
(Dominate): auto‑publish toggle, approval‑threshold slider, scope, frequency, safety rails. Suggestion
cards per §8.10.

### 11.7 UCP & Data (`/dashboard/ucp`)
Merchant profile: completeness ring, JSON preview, editable fields, Deploy (`/.well-known/ucp`),
live schema validation, regenerate **ghost** button, monogram avatars. Per‑product structured‑data
table (complete/partial/missing, generate, bulk, JSON‑LD preview, install snippet). Attribute
extraction (image → AI → review with confidence). UCP score pill = **amber `warning`**. Playground /
comparison panels use `rounded-lg` cards with mono output insets.

### 11.8 Reports (`/dashboard/reports`)
Report catalog (Win Rate Summary, Product Performance, Competitor Analysis, Optimization Impact,
Category Benchmark, Model Drift, UCP Compliance) → PDF/CSV, tier‑gated. Shareable public results page
with auto OG image; scheduled email delivery.

### 11.9 Settings (`/dashboard/settings`)
Account · Team (Dominate+; roles owner/admin/editor/viewer) · Integrations (stores, API keys,
webhooks) · Notifications (per‑channel toggles, quiet hours, digest) · Simulation Config (models,
frequency, persona/competitor sensitivity). Danger zone per §8.8.

### 11.10 Billing (`/dashboard/settings/billing`)
Plan comparison (current highlighted) · usage card (`47/100`) · payment method · Stripe Checkout
upgrade · downgrade retention offer · invoice history · Customer Portal link.

### 11.11 Onboarding & auth (may be client‑heavy by design)
Auth: sign‑in / sign‑up (email+password + Shopify OAuth preferred). Onboarding wizard with persistent
progress: **Connect Store → Select Products → Add Competitors → Run Scan**, targeting a visible win‑rate
"aha" within ~2 minutes. The first‑scan screen uses the replay terminal aesthetic (§8.7) with a live
typewriter decision log, per‑model progress, and a big win‑rate reveal.

### 11.12 Feature gating
Never hide gated features — show them grayed/blurred with a lock icon + upgrade CTA so users always see
what they're missing.

---

## 12. Page build pattern (PPR + streaming)

Every `page.tsx` is a **server component that exports real HTML** — layout, page title, headings — not a
thin wrapper around a single client component.

- **Static shell** in `page.tsx`: layout, section‑label, title, subtitle, headings (the initial HTML).
- **Data** in **async server components** (same file or `_components/`), each wrapped in
  `<Suspense fallback={<Skeleton/>}>` with a shape‑matched skeleton.
- **Streaming:** shell first, then resolved async regions stream in.
- Client components live in `_components/` next to their page.

```tsx
// server component
import * as Products from "@/server/app/product";            // full namespace (server)
import { unwrapResult } from "@zenncore/utils";
import { Environment } from "@/server/utils/environment";

const ProductsTable = async () => {
  const products = await unwrapResult(Products.skimForCurrentUser(Environment.SERVER));
  return /* … */;
};

export default function Page() {
  return (
    <main className="border-accent-foreground border-x">
      {/* static shell: section-label bar + title + subtitle */}
      <Suspense fallback={<ProductsTableSkeleton />}>
        <ProductsTable />
      </Suspense>
    </main>
  );
}
```

Client components import server modules **type‑only**: `import type * as Products from "@/server/app/product"`.

---

## 13. Language & copy rules

- Always **"AI agents"**, never bare "AI", for the shopping agents.
- No double dashes (`--`/`—`) inside sentences — restructure with commas/periods.
- **"versus"**, not "vs.", in feature descriptions.
- Brand is **écentic** (lowercase, accented *é* where Unicode is available).
- Sentence case for UI labels and tabs (no ALL‑CAPS except section labels and stat labels).

---

## 14. Accessibility (WCAG 2.1 AA)

Keyboard navigable with visible focus rings; ARIA labels on icon buttons and charts; **color is never
the sole state indicator** (pair win‑rate color with a number/label, pair status color with text);
≥4.5:1 text contrast; screen‑reader announcements for live updates (simulation progress); skip‑nav
link; correct heading hierarchy.

---

## 15. Master Do / Don't checklist (final QA)

### Do not change (the bones)
1. The `+` crosshair corner markers.
2. The hatched divider bands (slimmer per §3.4 is fine).
3. Hard 1px grid borders (`border-accent-foreground`).
4. The section‑numbering system.
5. Layout proportions and the sidebar/topbar structure.
6. The white / light‑gray temperature.
7. Data density.
8. Search position + ⌘K affordance.
9. Any data/content — this is design only.
10. The ASCII‑art illustration on Simulations.

### Do not do (implementation)
1. No `className`/`classList` styling on `Table*`/`DataTable` (Rule Zero). Layout classes only.
2. No raw colors (`text-gray-*`, `bg-white`, `#hex`) — semantic tokens only.
3. No `font-medium` on landing section h2s — natural `font-body` weight.
4. No hand‑coded buttons — use `<Button>` with `render={<Link/>}`.
5. No rounded corners or shadows on grid cells/dividers — sharp `gap-px` only.
6. No `text-sm`/`text-lg`/`py-*`/`px-*` on buttons — the component sizes itself.
7. No emoji or mixed icon sets — `@zenncore/icons` monoline, semantic tint.
8. No bouncy/long motion — 150ms ease, functional only.
9. No raw `<input>` — `InferredForm` + `field()`.
10. Don't duplicate spacing logic — use the `h-8` spacer + border‑wrapper pattern.

### Do (the skin)
1. Lead with the refresh hierarchy: bold near‑black titles, clear stat hierarchy, section‑label bars.
2. Monoline icons in 36px chips; muted by default, semantic only for status.
3. Radius/shadow on interactive & elevated elements; grid stays sharp.
4. 150ms transitions, focus rings, shimmer skeletons.
5. One restrained palette: `primary` blue is the only loud color; `success`/`warning`/`error` carry meaning.
6. Reach for a brand motif (box + pearl, human‑vs‑agent, crosshair, hatch) before generic imagery.
7. Server‑component shells + Suspense streaming on every dashboard/app page.
8. Beautiful, calm, dense, engineered. Same bones, new skin.
