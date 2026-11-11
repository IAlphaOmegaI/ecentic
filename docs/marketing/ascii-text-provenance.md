# Real ASCII artwork provenance

The user's final direction on 10 November 2026 was to use actual ASCII characters rather than a raster image that resembles dots. The final commerce and closing layers now render real text inside decorative `<pre>` elements. Their shape is formed by spaces and `/`, `\`, `-`, `=`, `+`, `x`, `%`, `#`, and `@` characters. No raster image or background URL is used by these components.

## Sources and transformation

- Commerce: `output/enterprise-rebuild/ascii-commerce-source.png`, the previously approved generated hands, parcel, and catalog-object composition.
- Closing: `apps/web/public/images/marketing/closing-ascii.webp`, the existing parcel-and-hands composition. Alpha was composited against black before sampling; transparent RGB noise was excluded.

A deterministic Pillow script reduces each image to a 120-column × 48-row luminance grid. A character-density ramp maps luminance to literal ASCII. Whitespace preserves the composition and the left-side negative space. Trailing row spaces are removed. The final strings contain 8,143 characters combined before TypeScript escaping, around 8KB of text. No API, generation service, customer data, or runtime image conversion is involved.

The source art is decorative and carries no product-performance or customer claims. Both existing raster source assets remain for provenance and other uses; root removed the hero/procurement raster URLs and preloads from the final homepage.

## Delivery

- `apps/web/src/content/ascii-artwork.ts`: static `commerceAscii` and `closingAscii` strings.
- `apps/web/src/components/marketing/ascii-artwork.tsx`: `AsciiCommerceArtwork` and `AsciiClosingArtwork`, each accepting optional `className`.
- `apps/web/src/components/marketing/ascii-artwork.css`: transparent, currentColor text; local system monospace; ligatures off; line-height 1; fluid font size constrained by both container width and height. `--ascii-font-size` permits an explicit placement override.

The artwork is rendered into the initial HTML and passed as children through the small motion wrapper. It does not depend on a canvas, image download, or runtime conversion. Decorative containers are `aria-hidden`; artwork is not selectable or interactive. Parent layers supply white or blue through `currentColor`.

## Verification and reproduction

- Generator archive: `output/enterprise-rebuild/ascii-text/generate.py.txt`.
- Plain text: `output/enterprise-rebuild/ascii-text/{commerce,closing}.txt`.
- Raster visual checks: `output/enterprise-rebuild/ascii-text/{commerce,closing}-preview.png`.
- Browser preview: `output/enterprise-rebuild/ascii-text/preview.html` with `browser-desktop.png` at 1440px and `browser-mobile.png` at 375px.

Both compositions were inspected in the browser at desktop and mobile widths. Literal characters are visible at desktop scale; fluid scaling makes the same grid finer on mobile. The hands, parcel, and open-box silhouettes remain recognizable. The component creates no image or font network requests. Scoped Biome checks passed.

| Source | SHA-256 |
| --- | --- |
| `output/enterprise-rebuild/ascii-commerce-source.png` | `6b6eb215f41e881e8cab641446f6110631a5827b812d64c3aa85cfbb8c8309fd` |
| `apps/web/public/images/marketing/closing-ascii.webp` | `83de743f83f436d8e8a42dca062169b0bb43eed048f5dc7a648422dda8e25533` |


## Second annotation pass · v4 review

The original `apps/web/public/images/ascii/{cart,bag,console}.png` silhouettes now provide additional
literal character grids in `apps/web/src/content/original-ascii.ts`. Alpha is box-downsampled to
120 columns × 56 rows, normalized at its 99.5th percentile and mapped to ` -=+xX%#@`. The source
images remain unchanged. Existing commerce/closing grids are centered in the same 120 × 56 field.

`EvolvingAscii` in `components/marketing/evolving-ascii.tsx` renders these strings as text in an
approved `Motion.Item`. A 160 ms character update adds a narrow density shimmer, with a 6.4-second
silhouette cycle when multiple artworks are supplied. Work pauses outside the viewport, when the
document is hidden and under reduced motion. No runtime image conversion or generation API runs.
The hero cycles the original cart, commerce composition and bag; audience/closing surfaces reuse
the same component. These are decorative forms, not charts or product claims.

`components/marketing/ascii-road.tsx` samples a continuous curved path into a 192 × 72 desktop field
and a narrow 12 × 144 mobile field. A brighter character wave follows the path. Chronology dates,
source links and labels remain semantic HTML alongside it in `channel-timeline.tsx`.

`components/marketing/ascii-wordmark.tsx` assembles the footer's ecentic name from fixed character
glyphs. It has a readable text alternative and does not depend on a raster logo. The rejected
box-drawing scenes were removed from the homepage evidence and editorial cards.
