# Marketing Tailwind migration

Part 0 uses the repository's existing Tailwind CSS 4 setup. `apps/web/package.json` declares Tailwind and its PostCSS plugin at `^4.3.3`. The app imports the shared configuration through `apps/web/src/app/globals.css`; the canonical color theme remains in `packages/shared/config/src/tailwind/globals.css`.

The user's latest instruction to use the existing Tailwind variables resolves the neutral-token conflicts in the catch-up brief. No marketing palette wrapper overrides shared theme values, and the dashboard's theme and font loaders are unchanged.

## Accepted token mappings

| Purpose | Brief / former marketing value | Existing semantic token used | Resolved value |
| --- | --- | --- | --- |
| Off-white canvas | Literal brief `#ffffff`; subsequent design `#f8f9fa` | `background` | `#f5f5f5` |
| Deliberate white surface or inverse text | `#ffffff` | `background-rich` | `#ffffff` |
| Supporting service fields | `#e7e7e7` | `background-dimmed` | `#e8e8e8` |
| Rails, seams, rules | `#dedede` | `accent-foreground` | `oklch(90% 0 0)` |
| Heading text | `#16181d` | `foreground-rich` | `#16181d` |
| Body text | `#404040` | `foreground` | `#404040` |
| Muted text | `#6b6b6b` | `foreground-dimmed` | `#6b6b6b` |
| Brand blue / chart marks | `#1572fa` | `primary` | `#1572fa` |
| Accessible blue text on light surfaces | `#0a5bd3` | `primary-text` | `#0a5bd3` |

The brief's suggested names `foreground-muted` and `primary-strong` are unnecessary: the existing three foreground steps and `primary-text` already provide those meanings. Color values are not reassigned simply to match the brief's suggested token names.

Only four missing semantic colors are added to the app's existing `@theme` block:

| Token | Value | Use |
| --- | --- | --- |
| `cross` | `#7d8590` | Junction marks and de-emphasized chart marks |
| `band-start` | `#111111` | Dark gradient start |
| `band-middle` | `#092645` | Dark gradient middle |
| `band-end` | `#005fd6` | Dark gradient end |

Use semantic utilities such as `text-foreground-rich`, `bg-background-dimmed`, `border-accent-foreground`, and `text-primary-text`. `--rail-color` and `--rail-cross` are inputs to the structural pattern, assigned from the theme tokens or their inverse opacity mixes. They are not independent palette values.

## Local fonts

`apps/web/src/components/marketing/fonts.ts` loads LT Superior and Red Hat Display with `next/font/local`, using the existing WOFF2 derivatives under `public/fonts/LTSuperior/` and `public/fonts/marketing/`. They correspond to DESIGN.md's Regular, Medium, and SemiBold faces. Both loaders include actual 400, 500, and 600 faces and use `display: "swap"`.

The module exports `fonts`, the generated font-variable classes. Apply it on the marketing shell and any standalone marketing portal or recovery shell. The variables retain the existing names `--font-lt-superior` and `--font-redhat-display`, so `font-body`, `font-superior`, and the added `font-heading` alias resolve locally. The root locale layout's existing loaders and its dashboard typography are untouched.

Do not use a weight above 600 for marketing copy. Decorative ASCII remains an explicit monospace exception. TTF originals used by Open Graph rendering remain intact.

## Structural pattern exception

The `marketing-grid-pattern` named utility in the existing app stylesheet owns rail strokes, corner junctions, adjacency rules, breakpoint junction ownership, and the navigation menu's crosses. It is scoped to marketing boundaries. Tailwind utilities in components own ordinary spacing, dimensions, layout, colors, typography, borders, blur and masks.

The navbar retains its sticky progressive blur, in-flow desktop menu, keyboard behavior, mobile sheet, and breakpoints. The footer retains seven desktop columns and mobile accordions. Both use the local font scope and shared theme tokens. `components/marketing/navigation.css` is removed.

Lead select popups receive their local font, white surface, 2px radius, accessible selected/highlight colors, and portal stacking through `field().classList.control` slots. The shared inferred-form adapter now forwards optional `positioner` and `popup` class lists and types its existing `selectItem` slot; defaults remain unchanged. This removes the need for a global `body:has(...)` portal styling rule. See `docs/web/inferred-form.md` for the API.

Biome reports one descending-specificity warning within the migrated structural utility between unrelated integration and FAQ selectors. Their target classes are different, and their original override order is retained.

## Focused runtime verification

The repository's `next-dev-loop` workflow was run against the existing Next.js 16.3.4 Turbopack server on port 3000, with agent-browser 0.42.0. Next.js reported no compilation issues and no configuration or browser-session errors for the checked routes.

- At 1440px, the Platform menu moved the main content from y=81 to y=696.76 and restored y=81 when closed. Its positioner remained in normal flow. The three backdrop blur layers resolved to 3px, 9px, and 18px with their graduated masks.
- ArrowDown now uses Base UI's built-in menu entry behavior, focusing the first link; subsequent ArrowDown moves to the next link, and Escape closes the menu and restores trigger focus. The redundant custom opening handler previously competed with the component's focus timing.
- At 390 × 844, the mobile sheet filled the viewport, its accordion opened, and the footer switched to functional accordions. Both checked widths had zero horizontal overflow.
- The partner select and a catalog-size select inside the Copilot interest dialog used a loaded local body font, `background-rich`, a 2px radius, and a relative portal at z-index 130. The dialog is at z-index 120; hit testing confirmed the dropdown was above it.
- Selected options resolved to `primary-text` (`rgb(10, 91, 211)`); highlighted options used white text on that same blue. No form was submitted.
- After the shared heading defaults moved to zero specificity, a fresh `/partners?tailwind=3` render confirmed all seven desktop footer headings at 14px in the local body font with normal tracking, without important overrides.

The shared web package was rebuilt for the optional inferred-form class-list API. The subsequent app typecheck still reports 298 repository/current-work errors, with none in this subtask's changed implementation files. This is not a claim that the repository-wide typecheck passes. Complete screenshot and release checks are recorded separately by the coordinated Part 0 review.

## Typography and verification

Default heading styles use zero-specificity Tailwind selectors, so the footer, small section labels,
and inverse headings can apply their own styles without fighting the page defaults. Dark hero and
closing headings explicitly use `background-rich` as their inverse foreground.

Migrated declarations that originally set only a font size use the existing Tailwind font-size
variables (for example `text-(length:--text-sm)`). This preserves the original inherited line height;
plain `text-sm` would also introduce its bundled line height and shorten repeated labels.

The original product film and literal ASCII characters are retained. Browser controls use 6 px
primary corners and 2 px secondary/input corners. Shared dashboard theme values remain unchanged.

Validation: 542 tests passed, no failures; root TypeScript remains at 16 existing diagnostics and
web TypeScript at 298, with no diagnostics introduced in changed files. Scoped Biome passes.
The production build completes all seven tasks. Before/after captures and the final structural
comparison are saved under `output/enterprise-rebuild/tailwind-*`.

The pre-existing `blog/blog-content.css` remains for article markup. Open Graph `ImageResponse`
uses inline renderer styles because that image renderer does not run the browser Tailwind cascade;
this is separate from the website styling. No new browser `.css` or `.module.css` file remains.

Final Part 0 capture: `output/enterprise-rebuild/tailwind-after-verified/` contains all five requested
routes at desktop and iPhone 14 sizes (10 screenshots), with zero axe violations, overflow or failed
images. The index resolves all ten images. The fixed dark headings and seven compact footer labels
were verified visually. Page-height differences from the baseline are below 0.6%, from shared-token
and typography normalization; section order, widths, control corners and rail layout are preserved.
The localhost HTTP / external HTTPS Chatwoot frame warning on WebKit also occurs in the baseline.
Owner TODOs remain visible at this stage and are addressed in Part 1.
