---
name: zenn-style
description: The zenn design-system layer on top of /zenn-code — which @zenncore/web component to use and how, how to build a custom component (Base UI + useRender + cva + classList + namespace), the Tailwind token spec (seven colour foundations, radii, spacing grid, typography, motion), icons, forms, tables, and the Turborepo/Bun monorepo spec (workspaces, catalogs, tsdown builds, generators). Use whenever building or reviewing UI, adding a component to packages/web, touching Tailwind tokens, or adding a package. Always apply /zenn-code first.
---

# zenn-style — components, tokens and the monorepo

Prerequisite: **`/zenn-code`** — every rule there applies here. This skill adds
which building blocks to use and how to make new ones.

Sources of truth (read when the detail matters; they win on conflict):
`docs/agents/AGENTS-packages.md`, `docs/web/*.md` (one page per component),
`docs/shared/*`, `docs/context/design.md` (visual canon),
`packages/shared/config/src/tailwind/globals.css` (tokens).

---

## 1. The reach order

Before writing any UI, go down this list and stop at the first hit:

1. **`@zenncore/web/components/<name>`** — the component already exists
   (`docs/web/index.md` lists them).
2. **An app-shared component** — `apps/web/src/components/` (`motion.tsx`,
   `marketing/primitives.tsx`, `plus.tsx`, `feedback-state.tsx`) or
   `dashboard/_components/grid.tsx` (`SectionGutter`, `Crosshair`, `Slot`).
3. **Compose** existing pieces in a page-local `_components/` file.
4. **Build a new component** (§4) — in `packages/web` if any other screen
   could use it, otherwise in `_components/`.

Never import `@base-ui/react` in app code, never hand-roll a control, never add
an external UI library when a zenncore piece covers it.

---

## 2. Using `@zenncore/web` components

### 2a. Imports

One subpath per component — matches the package `exports`
(`./components/*` → `dist/components/*/index.js`):

```ts
import { Button } from "@zenncore/web/components/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionPanel } from "@zenncore/web/components/accordion";
import { InferredForm, field } from "@zenncore/web/components/inferred-form";
import { DataTable, DataTableProvider, type ColumnDef } from "@zenncore/web/components/data-table";
```

### 2b. Which component for which job

| Need | Use | Never |
|---|---|---|
| Any action / CTA / nav button | `Button` (variants) + `render={<Link />}` for navigation | `<button>`, styled `<a>` |
| Expand/collapse | `Accordion`, `Collapsible` | `<details>/<summary>` |
| Switch views | `Tabs`, `TabsList`, `Tab`, `TabsIndicator`, `TabsPanel` | custom segmented control |
| Menus, store switcher, column menus | `Menu` / `DropdownMenu` (compact, separator before destructive) | one-off popover |
| Floating info | `Popover`, `Tooltip`, `PreviewCard` | absolute-positioned div |
| Modal | `Dialog`, `AlertDialog` (decisions), `Sheet` (side panel / mobile nav) | portal by hand |
| Forms | `InferredForm` + `field()` / `applyFormOptions()` | raw `<input>`, raw react-hook-form |
| Single inputs outside a form | `TextField`, `NumberField`, `Select`, `Combobox`, `Autocomplete`, `Checkbox`, `Radio`, `Switch`, `Slider`, `PhoneField`, `FileUpload`, `InputOTP`, `Textarea` | native elements |
| Data lists | `DataTableProvider` + `DataTable` + `DataTablePagination`; static grids `Table` | raw `<table>` |
| Search / command palette | `Command` | hand-made list filtering |
| Notifications | `Toast` | custom banners |
| Gauges | `Meter`, `Progress` | width-percent divs |
| Users / logos | `Avatar` | `<img>` circles |
| Scrolling regions | `ScrollArea` (use `viewportProps` for keyboard focus) | `overflow-auto` with no a11y |
| Dividers | `Separator` | `<hr>` / border hacks |

### 2c. Styling a component

1. **Variants first.** `Button` takes `variant` (`default`, `soft`, `outline`,
   `ghost`, `flat`), `color` (`primary`, `secondary`, `accent`, `emphasis`,
   `neutral`, `error`, `success`, `warning`, `info`), `tone` (`inverse` on
   dark/blue fields) and `size="icon"`. **No `className` on `Button`** and no
   classes on its children.
2. **`classList` for sub-parts.** Components with internal elements expose a
   typed `classList`; target the part instead of wrapping or overriding:
   ```tsx
   <AccordionTrigger classList={{ trigger: { icon: "size-4 shrink-0" } }} />
   <DataTable classList={{ "body-row": "hover:bg-primary/5", "body-cell": "py-2" }} />
   ```
3. **`className` for layout only** (width, grid placement, margin) on
   components that are not `Button`. It can be a function of state:
   `className={(state) => cn("…", state.disabled && "opacity-50")}`.
4. **State through data attributes**, never JS-toggled classes:
   `data-selected:`, `data-panel-open:`, `group-data-panel-open:rotate-90`,
   `data-starting-style:h-0`, `data-ending-style:h-0`.

### 2d. Forms

```tsx
"use client";
const config = {
  email: field({ shape: "text", validator: z.email(), label: t("fields.email.label") }),
  plan: field({ shape: "select", validator: z.enum(["compete", "scale"]), label: t("fields.plan.label") }),
};

export const SignupForm = () => {
  const [submit, isPending] = useAsyncAction(async (data: FormEntries<typeof config>) => {
    const creation = await Accounts.create(data);
    if (!creation.success) return;
    router.push(`/dashboard/${creation.data.id}`);
  });
  return (
    <InferredForm config={config} onSubmit={submit}>
      <Button type="submit" disabled={isPending}>{t("action.primary")}</Button>
    </InferredForm>
  );
};
```

Shapes: `text`, `number`, `select`, `phone`, `checkbox`, `file`, `custom`.
Style fields with `field({ classList: { field, label, error, description, control } })`.
The page stays a server component; the form lives in `_components/`.

### 2e. Tables

`DataTableProvider rows={rows} columns={columns}` (each row has `_id`),
`DataTable` with `DataTableEmpty` **inside** it, `DataTablePagination` beside.
Pagination is 1-based; server pagination passes `handler="server"` plus
`rowCount`/`pageCount`. Import `ColumnDef` from the zenncore subpath, not
TanStack. No `onRowClick` — put a `Link`/`Button` in a cell. Title column is the
flexible one; thumbnails are rounded squares.

### 2f. Icons

- `import { CheckIcon } from "@zenncore/icons"` — every export is `[Name]Icon`.
  Check the export exists (`packages/shared/icons/src/index.ts`) before using.
- Public UI uses Nucleo **outline-duo** subject/action icons; plain strokes are
  fine for chevrons, crosses, arrows, status marks. Brand marks keep their art.
- Size: `size-4` default; `size-8`, `size-16` for larger. Never `size-3`/`size-5`
  in app code. Colour via `text-*` (icons render `currentColor`).
- Missing icon → fetch from Nucleo, then generate — never hand-write an SVG:
  ```bash
  bunx turbo gen icon -a "cart-shopping" '<svg ...>...</svg>'
  ```
  Spot-check the diff afterwards; avoid colored/glass styles.

### 2g. Motion

Only `Motion.Stagger`, `Motion.Item`, `Motion.Up`, `Motion.Row` from
`@/components/motion`. No raw `motion.div`, no ad-hoc keyframes. Respect
`prefers-reduced-motion` (`motion-reduce:transition-none` on CSS transitions).

---

## 3. The Tailwind spec

Tokens live in `packages/shared/config/src/tailwind/globals.css`
(`@zenncore/config/tailwind`), component sources are registered by
`@zenncore/web/config/tailwind` (`@source "../../components"`), and the app
imports both at the top of `apps/web/src/app/globals.css`, adding only app
fonts and a few app-wide tokens.

### 3a. Colour — seven foundations, everything else is a semantic mix

| Foundation | Token | Base |
|---|---|---|
| Canvas | `background` | `#f5f5f5` |
| Paper / inverse text | `background-rich` | `#ffffff` |
| Ink | `foreground-rich` | `#16181d` |
| Brand blue | `primary` | `#1572fa` |
| Success / Warning / Error | `success`, `warning`, `error` | `#059669`, `#d97706`, `#e11d48` |

Derived (use these by role):

- Text: `text-foreground` (body), `text-foreground-dimmed` (secondary),
  `text-foreground-rich` (strongest), `text-primary-text` (small blue text on
  light), `text-background-rich` (on dark/blue).
- Surfaces: `bg-background`, `bg-background-rich`, `bg-background-dimmed`.
- Lines: `border-accent-foreground` (standard hairline), `border-accent-dimmed`.
- Families with `-dimmed`, `-rich`, `-foreground`: `primary`, `emphasis`,
  `accent`, `neutral`, `error`, `success`, `warning`. `secondary` and `info`
  resolve to the primary family.
- Opacity modifiers (`bg-primary/10`) are fine; they are not new colours.

Never: raw palette classes (`text-gray-500`, `bg-white`, `bg-blue-600`), hex,
`rgb()`, arbitrary `[#…]`, or a local custom property that smuggles one in.
`bun run design:theme` inventories deviations. Status always pairs colour with
a word or icon.

### 3b. Radius — four treatments

`rounded-none` (structural bands), `rounded-sm`, `rounded-lg` (inputs,
controls, thumbnails), `rounded-full`. Every other size name resolves to sm/lg.
Overlays may use the app's `rounded-overlay`. No arbitrary radii.

### 3c. Spacing and sizing

Multiples of 2 on the Tailwind scale: `gap-2/4/8`, `p-4/8`, `px-4`, `py-2`.
No `gap-3`, `p-5`, `py-1.5` in app code. Prefer named utilities over
arbitrary values; arbitrary values are for computed geometry only
(`w-(--active-tab-width)`).

### 3d. Typography

- `font-heading` (LT Superior) for public headings, `font-body` (Red Hat
  Display) for body and controls. No page-local fonts.
- Weights: regular → medium (titles) → semibold (local emphasis).
- `font-mono` only for code-like strings (URLs, keys, paths, HTTP, ids, logs).
- Sentence case. No tracked uppercase eyebrows on dashboard; public pages may
  use `SectionKicker`.
- `tabular-nums` for aligned numbers.

### 3e. Layout

- Dashboard scroll chains: `min-h-0 flex-1 overflow-hidden` on every `flex-1`
  ancestor.
- Section separators on marketing: `SectionGutter`. Avoid double borders —
  `last:border-b-0` where the shell already draws the line.
- No padded card-inside-card surfaces (design.md §6).
- Inline `style` only for runtime geometry.

### 3f. Adding a token

Only when the design canon calls for it, in an `@theme` block — shared config
for system-wide, `apps/web/src/app/globals.css` for app-wide. Name it per
`/zenn-code` §3e and derive it with `color-mix` from an existing foundation.

---

## 4. Building a custom component

Follow the shape every file in `packages/web/src/components/` uses.

### 4a. Wrapping a Base UI primitive (compound component)

```tsx
import { Collapsible as DisclosurePrimitive } from "@base-ui/react/collapsible";
import { ChevronDownIcon } from "@zenncore/icons";
import { type ClassList, cn } from "@zenncore/utils";
import type { ComponentProps, JSX } from "react";
import { createClassName } from "../utils/helpers/class-name";

export const Disclosure = ({ className, ...props }: Disclosure.Props): JSX.Element => (
  <DisclosurePrimitive.Root
    className={createClassName("flex flex-col gap-2", className)}
    {...props}
  />
);
export namespace Disclosure {
  export type Props = ComponentProps<typeof DisclosurePrimitive.Root>;
  export type State = DisclosurePrimitive.Root.State;
}

export const DisclosureTrigger = ({ className, classList, children, ...props }: DisclosureTrigger.Props): JSX.Element => (
  <DisclosurePrimitive.Trigger
    className={createClassName("group flex items-center justify-between gap-4 font-medium text-foreground", className, classList?.root)}
    {...props}
  >
    {children}
    <ChevronDownIcon className={cn("size-4 transition-transform group-data-panel-open:rotate-180", classList?.icon)} />
  </DisclosurePrimitive.Trigger>
);
export namespace DisclosureTrigger {
  export type ClassListKey = "root" | "icon";
  export type Props = { classList?: ClassList<ClassListKey> } & ComponentProps<typeof DisclosurePrimitive.Trigger>;
}
```

Rules:

- One file per component family, named for it (`disclosure.tsx`); parts are
  `Name`, `NameTrigger`, `NamePanel`, … — flat named exports, each with its own
  namespace carrying `Props` / `State` / `ClassListKey`, re-exporting the
  primitive's event types where useful.
- Base classes go first in `createClassName(base, className, classList?.part)`
  so consumers win.
- `classList` keys are nested by structure: `"root" | { trigger: "root" | "icon" }`.
- Explicit `: JSX.Element` return on package components (library surface);
  app components rely on inference.
- Tokens only, data-attribute state, `size-4` icons inside the package unless the
  primitive dictates otherwise.

### 4b. A polymorphic, variant-driven component

Use `useRender` + `mergeProps` + `cva` like `button.tsx`:

```tsx
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn, cva, type VariantProps } from "@zenncore/utils";
import type { RenderComponentProps } from "../utils/types/render-component-props";

export const badgeVariants = cva("inline-flex items-center gap-2 rounded-sm px-2 py-0.5 font-medium text-sm", {
  variants: {
    color: { neutral: "bg-neutral/10 text-foreground", success: "bg-success/10 text-success-dimmed" },
  },
  defaultVariants: { color: "neutral" },
});

export const Badge = ({ render, color, className, ...props }: Badge.Props): JSX.Element =>
  useRender({
    render: render ?? <span />,
    props: mergeProps<"span">(props, { className: cn(badgeVariants({ color }), className) }),
  });
export namespace Badge {
  export type Props = RenderComponentProps<"span"> & VariantProps<typeof badgeVariants>;
}
```

- Variants are a closed set of semantic names; colours map to token families.
- `compoundVariants` for variant × colour combinations, as in `Button`.
- Expose `render` so callers can swap the element (`render={<Link />}`).

### 4c. App-level component

- Page-only → `_components/<generic-name>.tsx` next to the route; skeletons in
  `_components/skeletons.tsx`.
- Shared across the app → `apps/web/src/components/`, grouped by family
  (`marketing/`, `hairline/`), a namespace object when it has parts (as in `motion.tsx`):
  ```tsx
  export const Feature = { Root, Title, Body };
  ```
- Client only where interaction needs it; keep the boundary small and pass
  domain objects in from a server parent.
- Copy through next-intl; never English literals.

### 4d. After adding to `packages/web`

1. Document it: add `docs/web/<name>.md` and link it from `docs/web/index.md`.
2. `bun run build` (tsdown emits `dist/components/<name>/index.js` from the
   `components/*/index` entry — no manual export edit needed).
3. Import it in the app as `@zenncore/web/components/<name>`.

---

## 5. The Turborepo spec

### 5a. Layout

```
apps/web            Next.js 16 app (React 19, React Compiler, Tailwind 4)
apps/cli            @ecentic/cli
packages/web        @zenncore/web — components + tailwind source config
packages/shared/*   @zenncore/utils, icons, data-table, inferred-form, phone, config
packages/mobile     placeholder
turbo/generators    turbo gen generators (icon)
```

Workspaces are declared in the root `package.json` (`apps/*`, `packages/*`,
`packages/shared/*`). Bun is the only package manager.

### 5b. Package rules

- Name internal packages `@zenncore/<single-word>`; depend on siblings with
  `"workspace:*"`.
- Shared third-party versions come from the root **catalog**: write
  `"react": "catalog:"`, never a version, for anything the catalog lists. Add
  to the catalog when two packages need the same dependency.
- Each package has `build` (`tsdown`), `dev` (`tsdown --watch`),
  `typecheck` (`tsc --noEmit`), `clean`, and optionally `lint`.
- Builds use `createTsdownConfig([...])` from `@zenncore/config/tsdown`; extend
  the shared TS config via `@zenncore/config/typescript` (or `/typescript/lib`).
- `exports` map subpaths to `dist/*` with `types` + `import`; config files
  (CSS, tsconfig) are exported from `src` directly.
- `"type": "module"`, `"private": true`, `"sideEffects": false` for libraries.
- Prefer a zenncore package over a new dependency; propose a new package only
  for code used by more than one app.

### 5c. Tasks

`turbo.json`: `build` depends on `^build` and declares every env var it reads
in `env` (add new env vars there or the cache goes stale); `typecheck` depends
on `^typecheck`; `dev`/`start` are persistent and uncached; `test` depends on
`^build`.

```bash
bun run dev:web
bun run build
bun run typecheck
bun run lint
cd apps/web && bun test src
```

`typecheck` is not a clean gate here — compare the error count before and after.

### 5d. Generators

Add a generator under `turbo/generators/<name>/` and register it in
`turbo/generators/config.ts` with `plop.setGenerator(...)` when a file shape is
produced repeatedly (icons are the model). Never hand-write what a generator
produces.

---

## 6. Checklist

- [ ] Reached for an existing zenncore/app component before building one
- [ ] Imported from `@zenncore/web/components/<name>`, never `@base-ui/react` in the app
- [ ] `Button` styled by variant/colour/tone only; navigation via `render={<Link />}`
- [ ] Sub-parts styled through `classList`; state through `data-*` variants
- [ ] Forms are `InferredForm` + `field()`; tables are `DataTable`
- [ ] Icons from `@zenncore/icons`, outline-duo, `size-4`; new ones via `turbo gen icon`
- [ ] Only the four `Motion.*` primitives
- [ ] Seven-foundation tokens, four radii, 2-step spacing, no raw colours
- [ ] New package component: namespace types, `createClassName`, `classList`, docs page
- [ ] New package/dependency: `workspace:*` / `catalog:`, tsdown, env vars in `turbo.json`
