# Social previews and generic banner artwork

The 13 November 2026 refresh covers social/link previews and generic banners. It does not replace
product photos, article illustrations, brand marks or contextual Hairline figures.

## Assets and consumers

- Source: `apps/web/public/images/marketing/source/catalog-commerce.png`.
- Browser mask: `apps/web/public/images/ascii/tonal/catalog-commerce.svg`.
- Social raster: `apps/web/public/images/marketing/og-commerce.png`.
- Generic banner: `PageBanner`, through `EvolvingAscii`'s `catalogCommerce` binding.
- Social composition: the shared `createOgImage` renderer, with the enterprise wrapper delegating
  to it. Locale text remains live Satori typography; it is not baked into the artwork.

The clean source is an open blue shipping box with three paper product catalog cards. The cards
carry illustrative headphones, a sneaker and a cosmetic bottle, without labels or product facts.
The complete silhouette fits within its own plane; neither the card tops nor box flaps are cropped.

## Reproduce the selected treatment

The source was generated using the configured `azure-image` CLI on the `gpt-image-2.5-sunburst`
deployment, at 1536 × 1024, high quality. The prompt specified a seamless white studio background,
a slightly elevated three-quarter view, matte cobalt-blue cardboard and ivory catalog cards,
soft upper-left light, recognizable product silhouettes, and no typography, fake logos, arrows
or dashboard decoration. It was inspected before integration.

Regenerate the derived SVG and transparent PNG with Python and Pillow:

```sh
python3 apps/web/scripts/tonal-ascii.py
```

Sampling uses 240 columns, the original 3:2 aspect ratio, exposure `1.0` and background feather
`0.055`. Variable-radius circles carry luminance. The PNG rasterizes the same mask in pale
blue-white at 2× resolution before reduction to 1400 pixels wide. The shared provenance JSON
records source and SVG hashes. Do not resample a previous dot raster as a new source image.

## Review

Check the full title and supporting copy in English, German, Japanese and Simplified Chinese,
including a long blog title. Verify actual image output at 1200 × 630 and thumbnail size. For
banners, check 390px, the tablet stacking breakpoint and desktop, with complete static artwork
available before motion and under reduced motion. Keep screenshots inside the assigned review
subagent when working in the user's main chat.
