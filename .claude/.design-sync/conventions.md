# ecentic design system (@zenncore/web) — how to build with it

A React + Tailwind CSS v4 component library. Components ship **pre-styled** — you
compose them and add layout; you do **not** restyle their internals.

## Import & runtime

- **In app code**, import each component (and its sub-parts) from its module:
  `import { Button } from "@zenncore/web/components/button"`,
  `import { Dialog, DialogTrigger, DialogPopup, DialogTitle } from "@zenncore/web/components/dialog"`.
- **In this design runtime**, every export is on `window.ZennWeb.*`
  (e.g. `window.ZennWeb.Button`). Sub-parts are flat siblings — see below.
- **No global theme provider.** Theming is CSS custom properties on `:root`
  (Tailwind `@theme`); just render components. A few features need a provider:
  wrap toasts in `ToastProvider`, grouped tooltips in `TooltipProvider`.
- **Brand font.** Text renders in **Red Hat Display** by default (loaded from
  Google Fonts; the `--font-body` / `--font-redhat-display` tokens). Don't set a
  different font family — inherit the default.

## Compound components are FLAT siblings (not dotted)

Families export each part as a top-level name — use `<AccordionItem>`, NOT
`<Accordion.Item>`:

```tsx
<Accordion>
  <AccordionItem value="a">
    <AccordionTrigger>How do AI agents compare my products?</AccordionTrigger>
    <AccordionPanel>We simulate ChatGPT, Claude, Gemini and Perplexity…</AccordionPanel>
  </AccordionItem>
</Accordion>
```
Same shape for Dialog/AlertDialog/Sheet/Popover/Tooltip/PreviewCard (Trigger +
Positioner/Popup), Select/Combobox (Trigger + Positioner + Popup + Item),
Menu/DropdownMenu/ContextMenu (Trigger + content + Item; a `*Label` must sit
inside a `*Group`), Tabs (`TabsList` + `TabsIndicator` + `Tab` + `TabsPanel`),
Table, Form (`FieldController` → `Field` → `FieldLabel`/`FieldControl`).

## Styling idiom: semantic Tailwind tokens only

Style your **layout and custom surfaces** with the DS's semantic utility
classes — never raw colors (`bg-white`, `text-gray-500`) and never restyle a
component's internals. Color families, each with `-dimmed` / `-rich` and (where
noted) `-foreground` modifiers:

| Family | Use | Example classes |
|---|---|---|
| `background` | app/page/card surfaces | `bg-background` `bg-background-rich` `bg-background-dimmed` |
| `foreground` | text | `text-foreground` `text-foreground-dimmed` `text-foreground-rich` |
| `primary` `secondary` | brand / actions | `bg-primary` `bg-primary-rich` `text-primary` |
| `accent` (+`-foreground`) | borders, subtle fills | `border-accent-foreground` `bg-accent` |
| `emphasis` (+`-foreground`) | high-contrast surfaces | `bg-emphasis` `text-emphasis-foreground` |
| `neutral` `error` `success` `warning` `info` (each +`-foreground`) | status | `bg-success` `text-error-foreground` `bg-warning-rich` |

**Interactive components take semantic props, not color classes.** `Button` (and
buttons composed via the `render` prop) accept `color`
(`primary`/`secondary`/`accent`/`emphasis`/`neutral`/`error`/`success`/`warning`/`info`)
and `variant` (`default`/`soft`/`outline`/`ghost`/`flat`). Compose an element as
another via the `render` prop: `<DialogTrigger render={<Button color="primary">Open</Button>} />`.

## Composition & layout — the ecentic bordered-grid look

The design system is more than the components: the signature look is a **bordered
grid**. Build layouts as sections delimited by hairline borders, not floating
cards with drop shadows.

- **Hairline borders + dividers**: delimit sections and rows with
  `border-accent-foreground` (the standard 1px line). Inside a section, separate
  content with the `Separator` component or `border-t border-accent-foreground`
  rows. Surfaces are `bg-background` / `bg-background-rich`; avoid heavy shadows.
- **Plus crosshair corner-markers**: the recurring motif is a small `+` placed at
  the corners/intersections of bordered blocks (drawn as two `bg-foreground-dimmed`
  hairlines). Put a relative wrapper on the bordered block and place the markers at
  its corners:

```tsx
const Plus = ({ className }: { className?: string }) => (
  <span aria-hidden className={`pointer-events-none absolute z-10 size-3 ${className ?? ""}`}>
    <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-foreground-dimmed" />
    <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-foreground-dimmed" />
  </span>
);

<section className="relative border border-accent-foreground bg-background-rich p-6">
  <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
  <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
  <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
  <Plus className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
  {/* section content */}
</section>
```

- **Grouped controls round only at the ends**: in a bordered group (tabs, toggle
  group, menu list), only the first item rounds on its leading edge and the last on
  its trailing edge — achieved by rounding the container + `overflow-hidden`. The
  library components already do this; match it in custom groupings.

## Where the truth lives

- Tokens + compiled styles: `styles.css` → `@import "./_ds_bundle.css"` (all
  `--color-*` tokens on `:root`).
- Per component: `<Name>.prompt.md` (real usage examples) and `<Name>.d.ts`
  (props). Read these before composing a component you haven't used.
- Forms: prefer **`InferredForm`** (Zod schema + `field()` descriptors) over
  hand-wiring `Form`/`FieldController`.

## Idiomatic snippet

```tsx
import { Button } from "@zenncore/web/components/button";

<div className="flex flex-col gap-4 rounded-md bg-background-rich p-6 text-foreground">
  <h2 className="font-medium text-lg text-foreground-rich">Run a simulation</h2>
  <p className="text-foreground-dimmed text-sm">
    Compare this product against 8 competitors across ChatGPT, Claude, Gemini and Perplexity.
  </p>
  <div className="flex gap-2">
    <Button variant="ghost" color="neutral">Cancel</Button>
    <Button color="primary">Run simulation</Button>
  </div>
</div>
```
