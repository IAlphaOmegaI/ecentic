# écentic Dashboard — UI/UX Design Refresh Prompt for Claude Code

> **CONTEXT FOR CLAUDE CODE**: You are refreshing the visual design of the écentic dashboard — an AI shopping agent optimization SaaS. The existing design uses a **brutalist grid system** (visible `+` crosshair corners, hatched divider bands, hard section borders) that MUST be preserved as the structural DNA of the UI. The problem is that everything SURROUNDING that grid — typography, color, spacing, component polish, iconography, motion — feels dated, flat, and visually incoherent. Your job is to modernize the aesthetics without touching the grid architecture. Think: same bones, completely new skin.

NOTE (project decision log):
- Implemented 2026-06-10 mapped onto the existing semantic token system (`@zenncore` tokens) instead of raw hex values.
- Icon family stays `@zenncore/icons` (already monoline SVG) — sized/colored per §1 (20px, muted, 36px chip).
- Per user instruction: the ASCII-art illustration on the Simulations page is KEPT (§16 dot-grid replacement skipped).

---

## 🎯 DESIGN MANDATE

**Keep (non-negotiable):**
- Brutalist grid system: `+` corner markers, hatched section dividers, hard 1px cell borders
- White/very-light-gray (#F5F5F5) content background
- Left sidebar navigation structure
- Top search bar + header bar layout
- Blue primary action color (approximately #2563EB — keep hue, refine saturation/weight)
- Data-dense table layouts
- Section numbering convention ("01 — PERFORMANCE", "02 — CATALOG" etc.)

**Fix everything else.**

---

## 🔴 CRITICAL ISSUES (Fix These First)

### 1. Emoji/Cartoon Icons in Stat Cards — REPLACE ENTIRELY
Replace ALL emoji icons in stat cards with clean monoline SVG icons from a single icon family. Icons should be:
- 20×20px, stroke-weight 1.5px
- Color: muted gray — do NOT color them green/gold/red unless they're a status indicator
- Contained in a 36×36px rounded square container with light gray chip background
- NO emoji, NO colorful cartoon graphics

### 2. Page Header Inconsistency — STANDARDIZE
- Page title: 28px, weight 700, near-black, letter-spacing -0.02em
- Page subtitle: 14px, secondary gray, weight 400
- Status pill: proper pill (tinted bg, semantic text, 11px semibold, tracking 0.05em, padding 2px 8px, fully rounded)
- Section label: replace ■ square with a 3px×14px blue rectangle bar (radius 2px). Keep ALL-CAPS, 11px, letter-spacing 0.1em, muted color.

### 3. Stat Card Inner Typography — BROKEN HIERARCHY
```
[LABEL]        — 10px, muted, weight 500, tracking 0.08em, ALL-CAPS
[VALUE]        — 36px, near-black, weight 700, tracking -0.02em
[VALUE SUFFIX] — 20px, weight 500 (the "%" or "/100")
[DELTA/SUB]    — 12px, semantic color
[ICON]         — top-right corner, 36×36 chip (see §1)
```

### 4. Hatched Section Dividers — MAKE INTENTIONAL
- Keep pattern; height 16px (down from ~40px); opacity 0.6; `+` markers lighter.

### 5. Navigation Sidebar
- Active: left 3px blue border + tinted bg + semibold; inactive muted; hover subtle; 150ms transitions
- Badge counts: tinted blue pill, fully rounded, 11px semibold
- UCP score: amber pill
- Icons 16px, currentColor
- User avatar: blue→purple gradient, rounded, white bold initial

### 6. Top Header Bar
- Search: light bg, 1px border, radius 8px, h-36px; focus ring
- ⌘K chip: white bg, 1px border, radius 4px, 10px text
- Plan ("Dominate") as outlined-blue badge/button, radius 6px, semibold
- Avatar: blue→purple gradient circle 32px

## 🟡 MODERATE (§7–16) — tables (row 52px, 4px rounded progress bars, ghost row arrows, 11px semibold headers), product tabs (segmented control: container tinted+radius, active white+shadow, no ALL-CAPS), replay terminal polish (mono font, dark slate, header bar), settings forms (focus rings, danger zone wrapper), tag/badge containers (type/priority/win-rate), optimize suggestion cards (radius 8 + hover ring, model dots, button trio), competitors donut palette, UCP page (status pills, regenerate ghost button, monogram avatars), UCP playground/comparison panels (radius 8 cards, mono output insets), simulations (KEEP ASCII art).

## 🟢 POLISH (§17–23) — type scale, color tokens, radius/shadow scale (sm 4 / md 6 / lg 8 / xl 12 / full), global 150ms transitions on interactive elements, unified 4px rounded progress bars, shimmer loading, floating sim controls pill.

## 🚫 DO NOT CHANGE
1. `+` crosshair corner markers
2. Hatched divider bands (slimmer per §4 is OK)
3. Hard 1px grid borders
4. Section numbering system
5. Layout proportions
6. White/light-gray temperature
7. Data density
8. Search position + ⌘K affordance
9. Any data/content — design only
10. ASCII-art illustrations (user request)
