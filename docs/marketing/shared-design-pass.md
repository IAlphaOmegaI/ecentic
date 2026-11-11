# Shared marketing design pass

Implemented 10 November 2026 after Part 2 commit `6d3e70c2`.

This pass changes only shared marketing layout and the `marketing-grid-pattern` utility. It preserves the current off-white Tailwind canvas, rail-confined supporting-service gray, provider logos, the inset rounded blue homepage hero, and progressive in-flow navigation. Product behavior, translated copy, form logic, and channel claims are unchanged.

## Rail geometry

Ordinary `MarketingBand` rails and direct `SectionGutter` children of `main` now share one formula:

- Desktop/tablet: `min(1186px, 100% - 56px)`, centered.
- Mobile below 640px: `100% - 32px`, centered.

The full-width rail naturally reaches 1186px at a 1242px viewport. There is no narrow interval where a rail drops below its intended 28px outside margin. This replaces the old 1191px margin threshold, which put the ordinary rail at x=7 on a 1200px viewport.

The homepage `.enterprise-journey` hero keeps its existing inset-container rail sizing and mobile inset as an explicit exception. This shared pass does not alter the hero's approved composition, outer margins or rounded corners. Ordinary rails elsewhere are not affected by that exception.

CSS ranges for grid/cross ownership now match the Tailwind layout boundaries exactly: below 640, 640–<801, >=801, and the corresponding 1001 split for homepage custom grids. This avoids gaps at fractional CSS viewport widths under zoom.

## Section rhythm

Shared heroes and the closing band use 96px vertical padding on desktop and 56px on mobile. Shared skeleton padding matches them. Major title-to-lead spacing is 24px.

`MarketingSection` assigns the outer rhythm once per logical section:

- A section with prose only has 96/56px top and bottom padding.
- A section with a connected grid, rows, child content or final action uses 96/56px above its introduction and 48/32px below the introduction.
- The final content/continuation ends with 96/56px bottom padding. A note/action continuation has 48/32px of space above it. Its first action does not add an accidental second top gap.
- Compact connected grid rows and facts retain their existing cell dimensions. The 96px rule is not applied to every row.

The FAQ follows the same outer rhythm: on desktop, the heading and first answer begin 96px below the top seam, and the final answer ends 96px above the bottom seam. Mobile stacks the heading with 56px above it, uses 32px between the heading section and the first answer content, and ends with 56px. Individual answers remain compact.

The generic skeleton uses the same shell padding and 24px/32px content gaps; it no longer adds an unrelated 48px internal top spacer.

## Seam and cross ownership

- The in-flow navbar owns the seam immediately above the first ordinary hero. That hero no longer draws a second adjacent top border. Its rail corner markers remain.
- A preceding marketing band continues to own a shared section boundary; the next band suppresses its top border and duplicate corner markers.
- When one connected grid is followed immediately by another grid or a row ledger, the following block owns the seam. The preceding grid drops its bottom border and bottom cross flags. This supports the pricing 2×2 grid followed by the Enterprise row without local pseudo-element overrides.
- Existing row/grid/FAQ/footer edge logic remains. This was a cleanup, not a new grid implementation.

Removed 23 dead rule blocks plus dead entries in shared selector lists for `.enterprise-proof-grid`, `.enterprise-finding` and `.marketing-lead-columns`, which have no current TSX consumers. Removed inert `--rail-top-cross` media resets and the duplicate `isolation` declaration; the rail element still has Tailwind `isolate`.

## Verification

Used the existing Next.js 16.3.4 Turbopack dev server at localhost:3000 and an isolated `next-dev-loop-shared-grid-88b01de51f4b` agent-browser session. No server restart was performed.

Measured results:

| Viewport | Ordinary rail/gutter left | Right | Width |
|---|---:|---:|---:|
|1200px|28px|1172px|1144px|
|1280px|47px|1233px|1186px|
|1440px|127px|1313px|1186px|
|390px|16px|374px|358px|

Checked home at 1200/1280/390, Connect at 1440/390, Enterprise at 1280, and pricing adjacent-grid seam ownership at 1280. Every checked view had one H1 and no horizontal document overflow. Connect's computed hero padding was 96/96px at 1440 and 56/56px at 390; its lead gap was 24px. Mobile FAQ computed 56px outer top, 32px internal introduction gap and 56px outer bottom. Loaded font checks for the actual `heading` and `body` font families passed.

Pricing's standard grid bottom border computed 0px, its bottom cross flags were transparent, and the following Enterprise grid owned the 1px top seam. Navbar bottom and first hero top were both at y=81; the navbar had the single 1px border and the hero computed 0px.

Next.js reported no compilation issues and no configuration/browser-session errors. React introspection confirmed the normal App Router tree. Scoped Biome checks passed with one existing descending-specificity warning between unrelated integration and FAQ selectors; no formatting or TypeScript-source lint errors remained.

Viewport screenshots and DOM measurements are under `output/enterprise-rebuild/design-pass/shared/`. The broader all-route visual/accessibility review and review-pack captures are separate work. These viewport images do not claim to be a full-page audit of every route.
