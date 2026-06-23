# design-sync notes — @zenncore/web

Repo-specific gotchas for future syncs. Append as you learn.

## Build setup (how this DS is made converter-consumable)

- **Package shape, Tailwind v4 preset DS.** Components are styled purely with
  Tailwind utility classes; `dist/` ships NO compiled CSS. The host app
  generates it. `cfg.cssEntry` points at `packages/web/dist/ds-tailwind.css`,
  compiled by `.ds-sync/node_modules/.bin/tailwindcss` from
  `.design-sync/tailwind-input.css` (imports the `@zenncore/config` +
  `@zenncore/web` Tailwind presets, scans component sources). Tokens live in
  `@zenncore/config` (`packages/shared/config/src/tailwind/globals.css`,
  `@theme` block).
- **No barrel / no `.` entry.** The package exports per-component
  (`dist/components/<name>/index.{js,d.ts}`) via wildcard `exports`, with no
  `module`/`types`. `.design-sync/gen-entry.mjs` synthesizes `dist/index.js`
  (JS barrel, `export *` everything → all flat exports on `window.ZennWeb`) and
  `dist/index.d.ts` (DTS barrel re-exporting ONLY the 43 family roots so
  discovery yields 43 cards, not ~250 sub-parts), and patches
  `packages/web/package.json` `module`/`types` to point at them.
- **Flat-sibling compound families.** The DS exports `Accordion`,
  `AccordionItem`, … as flat siblings (NOT `Accordion.Item`). One card per
  family root; sub-parts stay importable from `window.ZennWeb` and are composed
  inside the root's authored preview. This is deliberate — do NOT fabricate a
  dotted API (it would misrepresent the real flat import surface).
- **react-dom not a lib dep.** `@zenncore/web` declares `react` (peer) but not
  `react-dom` (the host app's peer). `gen-entry.mjs` symlinks a resolvable
  react-dom (19.2.7, from `apps/web`) into `packages/web/node_modules` so the
  converter's vendorReact + preview runtime can find it.
- **`--node-modules packages/web/node_modules`** — has react, @types/react,
  @base-ui, @zenncore/*, cmdk, input-otp, @tanstack, zod (everything the bundle
  imports). **`--entry ./packages/web/dist/index.js`** (PKG_DIR walks up to
  `packages/web`).

## Preview authoring learnings

- **Tabs requires `TabsIndicator` inside `TabsList`.** The active `Tab`'s text
  is white; the active state's colored background comes from `TabsIndicator`.
  Without it, the active tab label is white-on-white (invisible). Always
  compose `<TabsList><TabsIndicator />…tabs…</TabsList>`. Likely applies to
  other "active/selected indicator" components — check Toggle/ToggleGroup,
  NavigationMenu.
- **Overlays render open via `defaultOpen`** + `cfg.overrides.<Name>.cardMode:
  "single"` + a viewport, so the portalled popup renders inside the card.
  Dialog confirmed working with `{ cardMode: "single", viewport: "560x440" }`.
  Apply the same to AlertDialog, Sheet, Popover, Tooltip, PreviewCard,
  DropdownMenu, ContextMenu, Menu, Command, Select, Combobox, Autocomplete
  (anything with a trigger→popup).
- **Context-bound leaves compose inside their root.** `TextFieldInput` reads
  TextField context; `Tab`/`TabsPanel` read Tabs context; etc. Author the
  preview as the full parent composition (the floor card's solo mount of a
  leaf renders blank — that's why Checkbox/Radio/Slider/TextField/Textarea/
  Progress flagged RENDER_BLANK as floor cards).
- **Layout glue uses inline styles** (not Tailwind classes) so previews are
  self-contained regardless of which utilities the Tailwind compile emitted.
  Brand token colors via `var(--color-foreground)` etc. (defined on `:root` in
  `_ds_bundle.css`).

### Fan-out wave learnings (per-component quirks)

- **Base UI `GroupLabel` must be inside a `Group`.** `DropdownMenuLabel`
  (`MenuPrimitive.GroupLabel`) placed directly in `DropdownMenuContent` THROWS
  and blanks the whole card. Nest it inside `DropdownMenuGroup`.
- **`DropdownMenuContent` uses `bg-popover`/`text-popover-foreground`** — tokens
  this DS does NOT define (no `--color-popover`). Give the content an inline
  surface (`background: var(--color-background-rich)`). The Base UI `Menu`/
  `ContextMenu` popups use defined tokens and render styled without help.
- **`Form`/`Field` need react-hook-form.** `Field` calls `useField()` which
  throws "FieldContext is missing" unless inside a `FieldController` inside a
  `Form` bound to a `useForm()` instance. Preview imports `useForm` from
  `"react-hook-form"` (bundles from node_modules; the bundle's RHF is the same
  version, so the `form` object passed to `<Form form={…}>` is compatible). For
  most forms **InferredForm is the preferred API** (CLAUDE.md) — Form is the
  low-level escape hatch.
- **Radio/Checkbox leaves need their Group + matching value.** A standalone
  `<Radio defaultChecked>` renders UNSELECTED — wrap in `<RadioGroup
  defaultValue="x"><Radio value="x"/>`. The text label is not part of the
  component; wrap control + label in a `<label>`.
- **Overlays open via `defaultOpen`** EXCEPT `NavigationMenu` (use
  `defaultValue="<item>"`) and `Command` (renders inline, no open state).
  Select/Combobox/Autocomplete expose `defaultOpen` (verified in Base UI
  `SelectRoot`/`AriaCombobox`); Positioner wraps Popup (Positioner renders the
  portal). Combobox/Autocomplete take an `items` array + render-prop child of
  the List; Select lists `<SelectItem>` children directly.
- **Meter/Progress `cardMode: single`** — their absolutely-positioned bar
  Indicator "escapes" the product's multi-column grid cells (GRID_OVERFLOW
  escape, not fixable by column). Single mode with a `primaryStory` is the
  remedy; the other value-only variants stay listed in the `.prompt.md`.
- **Most non-overlay composites are `cardMode: column`** (Accordion, Collapsible,
  Fieldset, Form, InferredForm, FileUpload, Textarea, ScrollArea, Separator,
  Pagination, Tabs, Table, DataTable, Toolbar) — they're wider than a grid cell;
  column = one full-width row per story, all variants kept.
- **Separator** needs an explicit size + `bg-*` token to be visible (it's only
  `shrink-0` by default). **ScrollArea** bar is `opacity-0` until hover/scroll.
- **DataTable** root is `DataTableProvider` (rows + columns via
  `createColumnHelper`); the client handler needs no `pageCount`.

### Excluded / floor-carded (deliberate)

- **Carousel** — `packages/web/src/components/carousel.tsx` is an unimplemented
  stub (`return <>TODO Carousel</>`). Excluded via `cfg.componentSrcMap.Carousel
  = null` (a "TODO Carousel" card is worse than honest omission). 42 components
  ship. Re-include + author once the source is implemented.
- **Toast** — floor card. `ToastRoot` requires a live `ToastProvider` + a
  manager-supplied toast object; `ToastViewport` is a fixed portal. Can't render
  meaningfully in a static card. Author later with a provider-wrapped preview if
  needed.
- **`PhoneFieldFlag`** is a `<>TODO PhoneFieldFlag</>` source stub — omit it from
  PhoneField compositions (it prints literal "TODO").

### Component fixes applied this session (DS source — packages/web/src/components)

Visual-polish fixes the user requested after reviewing the synced cards (all
className-only):
- **tabs.tsx**: `TabsList` → `overflow-hidden rounded-md`; `TabsIndicator` →
  full-height (`top-0 h-full`, was centered `h-6`) so the active fill matches the
  tab and clips to the rounded container.
- **menu.tsx / context-menu.tsx**: popup → `overflow-hidden rounded-lg`, padding
  `py-1`→`py-0`; item highlight `before:inset-x-1`→`inset-x-0` (edge-to-edge, so
  first/last clip to the popup's rounded corners).
- **navigation-menu.tsx**: popup → `overflow-hidden rounded-lg`; content padding
  `p-6`→`p-4`.
- **toggle.tsx**: `ToggleGroup` → `overflow-hidden rounded-md`, removed `p-0.5`
  (children flush so first/last clip to the rounded corners).
- Principle: grouped controls round only at the ends via a rounded container +
  `overflow-hidden` (documented in conventions.md "Composition & layout").
- Conventions header gained a **Composition & layout** section (bordered-grid,
  the `Plus` crosshair corner-marker, dividers) — the "design system is more than
  components" feedback. `Plus` lives in `apps/web/src/components/plus.tsx` (app
  level); documented as a pattern. Could be promoted into `@zenncore/web` if it
  should be a first-class export.

### DS-owner flags (surfaced for the team, not blockers)

- `autocomplete.tsx` styles with literal `gray-*` / `[canvas]` colors instead of
  semantic tokens — previews override inline to stay on-brand. Worth migrating.
- `FieldControl` (form.tsx) uses literal `border-gray-200 text-gray-900
  outline-blue-800` rather than semantic tokens.

## Known render warns (triaged — re-syncs check against this list)

- `[TOKENS_MISSING]` for `--toast-index`, `--accordion-panel-height`,
  `--collapsible-panel-height`, `--active-tab-width`, `--active-tab-left`,
  `--toast-swipe-movement-x/y`, `--spread`, … — these are set at RUNTIME by
  Base UI components (inline style / JS), expected absent from the static
  stylesheet. Non-blocking.

## Re-sync risks (what can silently go stale)

- The build mutates **uncommitted** state outside `.design-sync/`:
  `packages/web/dist/` barrels + `ds-tailwind.css` (gitignored), the
  `packages/web/package.json` `module`/`types` patch (NOT committed —
  re-applied idempotently by `gen-entry.mjs`), and the
  `packages/web/node_modules/react-dom` symlink (gitignored — re-created by
  `gen-entry.mjs`). `cfg.buildCmd` reproduces all of this; on a fresh clone
  also re-stage `.ds-sync` and re-install its deps (incl. Playwright + the
  Tailwind CLI).
- Preview content (Écentic-domain copy) is tied to the current product; harmless
  if the product pivots, just less on-theme.
- Brand font **Red Hat Display** is now loaded from **Google Fonts** via an
  `@import url(...)` at the top of `.design-sync/tailwind-input.css`, with
  `--font-redhat-display` / `--font-body` / `--default-font-family` set in a
  `@theme` block so all designs render in it (the app loads the same font via
  next/font at runtime). **Re-sync risk:** this is a runtime network dependency —
  the design renderer fetches the font from `fonts.googleapis.com`. If offline
  rendering or zero network is ever required, self-host instead: download the
  Red Hat Display woff2 and ship via `cfg.extraFonts` + a local `@font-face`.
