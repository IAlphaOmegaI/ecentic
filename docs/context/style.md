# Style Guide

This document defines the visual language of ecentic. Every component, page, and section must follow these rules. Do not override, duplicate, or re-style anything that already comes from `@zenncore/web` packages.

---

## Rule Zero: Never Override Package Styles

Components from `@zenncore/web` (Button, Table, TableHead, TableCell, TableRow, DataTable, Tabs, etc.) ship with their own base styles. These are the source of truth.

- Do NOT pass `className` to override padding, font size, borders, or colors that the component already handles.
- Do NOT use `classList` on DataTable to re-style cells, rows, or headers.
- If a base style is wrong, fix it in `packages/web/src/components/`, not at the usage site.
- The only acceptable `className` additions are layout concerns (`w-full`, `mt-auto`) or intentional one-off overrides the user explicitly requests.

---

## Typography

### Font

- **Family**: LTSuperior via `font-body` (set on `<body>`, inherited everywhere).
- **Root tracking**: `tracking-[-4%]` globally.

### Headings

All landing page section headings use:

```
font-body text-3xl md:text-6xl
```

- No `font-medium` or `font-semibold` on section h2s. The natural weight of `font-body` is the correct style.
- The hero h1 is the exception: `font-semibold text-4xl sm:text-5xl md:text-[76px]`.
- Card/feature titles inside grids: `font-body font-medium text-2xl md:text-4xl`.
- Dashboard page titles: `font-medium text-3xl text-foreground`.

### Body Text

- Descriptions / subtitles: `font-light text-foreground-dimmed text-lg` or `md:text-2xl` for hero-adjacent copy.
- Small captions: `font-light text-foreground-dimmed text-sm`.
- Table cell text: `font-light text-foreground text-sm` (handled by DataTable base).
- Table header text: `font-medium text-left text-foreground text-sm` (handled by TableHead base).

### Weight Rules

| Weight class    | When to use                                      |
| --------------- | ------------------------------------------------ |
| `font-light`    | Descriptions, subtitles, secondary text           |
| (no class)      | Section headings (natural `font-body` weight)     |
| `font-medium`   | Card titles, table headers, button text, prices   |
| `font-semibold` | Hero h1, large emphasis numbers (#1, scores)      |
| `font-bold`     | Score numbers (72/100 in pricing)                 |

---

## Color Tokens

Use semantic Tailwind tokens only. Never use raw colors like `text-gray-500`, `bg-white`, or hex values.

### Backgrounds

| Token                  | Use                                              |
| ---------------------- | ------------------------------------------------ |
| `bg-background`        | Page-level background (body, dashboard main)      |
| `bg-background-dimmed` | Section fills, card backgrounds, grid cells, hover states |
| `bg-background-rich`   | Table headers, elevated surfaces, white cards     |
| `bg-primary`           | Hero section, Dominate pricing card, primary CTA fills |

### Text

| Token                   | Use                                              |
| ----------------------- | ------------------------------------------------ |
| `text-foreground`       | Primary text, headings, body copy                 |
| `text-foreground-dimmed` | Secondary text, descriptions, captions           |
| `text-primary`          | Brand accent text, CTA labels, active states, links |
| `text-white`            | Text on `bg-primary` surfaces                    |
| `text-white/60`         | Muted text on dark/blue backgrounds               |
| `text-white/70`         | Slightly muted on blue (pricing subtitles)        |
| `text-white/80`         | Feature lists on blue backgrounds                 |

### Borders

Every border in the application uses one token:

```
border-accent-foreground
```

No exceptions. No `border-gray-200`, no `border-primary` on containers. The only place `border-primary` appears is on specific Button outlines where the component requires it for CTA emphasis.

---

## Borders & Separators

### The Grid Philosophy

Sections that display a grid of cards use the `gap-px` pattern instead of explicit borders:

```tsx
<div className="grid grid-cols-2 gap-px bg-accent-foreground">
  <div className="bg-background-dimmed p-4">Card 1</div>
  <div className="bg-background-dimmed p-4">Card 2</div>
</div>
```

The 1px gap with `bg-accent-foreground` behind creates seamless cell borders. No rounded corners, no explicit `border` classes between cells.

### Section Borders

- Horizontal dividers between sections: `border-accent-foreground border-b` or `border-t`.
- Vertical column dividers in grids: `border-accent-foreground border-r` (on all but last column) or `divide-x divide-accent-foreground`.
- Full section wraps: `border-accent-foreground border-y` (top + bottom).
- Main container side rails: `border-accent-foreground border-x` on `<main>`.

### Table Borders

Handled entirely by base components in `packages/web/src/components/table.tsx`:

- Cells and headers get `border-x border-accent-foreground`.
- Rows get `border-b border-accent-foreground`.
- First/last cell side borders are hidden via `[&_td:first-child]:border-l-0` etc.
- Last row bottom border removed via `[&_tr:last-child]:border-b-0` on TableBody.

Do not add border classes to Table components at usage sites.

---

## Spacing

### Landing Page

- Section gaps: `gap-8 md:gap-12` (on the main flex container).
- Section internal padding: `p-4 md:p-8` or `p-6 md:p-12`.
- Grid cell padding: `p-4` or `p-6`.

### Dashboard

- Content wrapper: `mx-8` with `border-x` for column rails.
- Section separators: `h-8` spacer div + `border-t border-accent-foreground` wrapper.
- Negative margins for full-bleed borders: `-mx-8 border-accent-foreground border-b`.
- Card padding: `px-6 py-8`.

### Tables

- Cell padding: `px-4 py-3` (base component handles this).
- Do not add custom padding to TableHead or TableCell.

---

## Buttons

Use `<Button>` from `@zenncore/web/components/button`. Never hand-code button styles with `<Link>`, `<a>`, or `<div>`.

### Variant + Color Combinations

| Context                  | Variant     | Color     | Extra classes                          |
| ------------------------ | ----------- | --------- | -------------------------------------- |
| Primary CTA (on white)   | `flat`      | `primary` | `w-full` if full-width                 |
| Primary CTA (on blue)    | `flat`      | `primary` | `bg-white text-primary border border-white/30` |
| Secondary action         | `outline`   | `accent`  | `border-primary text-primary`          |
| Ghost / icon-only        | `ghost`     | `accent`  | `size="icon"`                          |

### Button Rules

- Never add `text-sm` or `text-lg` to buttons. The component handles sizing.
- Never add `py-*` or `px-*` unless explicitly needed for a one-off design (like a large product CTA).
- For link buttons, use the `render` prop: `render={<Link href="/path" />}`.
- All buttons within the same row or section must have identical height/padding. Check consistency.

---

## Layout Patterns

### Full-Bleed Sections (Landing Page)

Sections that extend beyond the `max-w-6xl` container use:

```tsx
<section className="relative -left-[calc(50vw-50%)] w-screen border border-accent-foreground">
  <div className="mx-auto max-w-6xl">
    {/* Contained content */}
  </div>
</section>
```

The hero uses this with `-z-1` to sit behind the main container's `border-x` lines.

### Dashboard Page Structure

```tsx
<div className="flex flex-col">
  <div className="mx-8 border-accent-foreground border-x">
    {/* Stats section */}
  </div>
  <div className="h-8" />
  <div className="-mx-0 border-accent-foreground border-t border-b">
    {/* Next section */}
  </div>
</div>
```

### Enterprise / CTA Row Pattern

A full-width row with text left and button right, used at the bottom of grids:

```tsx
<div className="grid border-accent-foreground border-b bg-background-dimmed md:grid-cols-3">
  <div className="col-span-2 p-4">
    <p className="font-light text-foreground-dimmed text-lg md:text-2xl">
      Descriptive sentence here.
    </p>
  </div>
  <div className="flex items-center p-6">
    <Button variant="outline" color="accent" className="w-full border-primary text-primary"
      render={<Link href="/sign-up" />}>
      CTA Text
    </Button>
  </div>
</div>
```

---

## Language & Copy Rules

- Always say "AI agents" not "AI" when referring to the shopping agents.
- Never use double dashes (`--` or `—`) in sentences. Restructure with commas or periods.
- Use "versus" not "vs." in feature descriptions.
- Brand name is always "ecentic" (with accent: ecentic where Unicode is available).

---

## Things You Must Not Do

1. Do not add `className` to `<Table>`, `<TableHead>`, `<TableCell>`, `<TableRow>`, or `<DataTable>` for styling. Layout classes (`w-full`, `mt-4`) are fine.
2. Do not use `classList` on DataTable to restyle cells or rows.
3. Do not use raw colors (`text-gray-*`, `bg-white`, `#hex`). Use semantic tokens.
4. Do not add `font-medium` to section headings. `font-body` alone is the correct weight.
5. Do not hand-style buttons with Tailwind when `<Button>` exists.
6. Do not add rounded corners to grid cells. The grid philosophy uses sharp edges with gap-px borders.
7. Do not add `text-sm` to buttons or feature list items. Let the component defaults apply.
8. Do not duplicate spacing logic. Use the established `h-8` spacer + border wrapper pattern.
