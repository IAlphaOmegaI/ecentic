# Enterprise marketing artwork

The new commerce illustration is decorative AI artwork, generated locally through the configured Azure `azure-image` CLI using gpt-image-2.5, 1536 × 1024, high quality. It depicts white ASCII hands supporting an open parcel with catalog objects on a black field. It is not a product screenshot or customer evidence.

The original is `output/enterprise-rebuild/ascii-commerce-source.png`. Black luminance was converted into alpha with Pillow, retaining white glyphs as `apps/web/public/images/marketing/commerce-ascii.webp`. The hero and procurement band use it as an aria-hidden background; reduced-motion users see a static composition.

Existing canonical art is retained in `closing-ascii.webp`, `cover-ascii.webp` and `og-ascii.png`. Official ecentic artwork retains its original paths. Provider marks are documented separately in [provider-logo-provenance.md](provider-logo-provenance.md).

Nine new Nucleo duotone icons were obtained through the installed licensed Nucleo CLI/catalog and transformed through the repository Turbo generator: plug sparkle, chart activity, file pen, shopping basket, globe pointer, file shield, city building, open book, and code. They are exported by `@zenncore/icons` with the `Commerce` prefix. No hand-drawn substitute icons were introduced.

The English and Spanish overview screenshots were captured from the current `OverviewCharts` component with explicitly labeled sample values. The archived fixture source is `output/enterprise-rebuild/screenshot-fixture.tsx.txt`; its temporary route was removed. Screenshots are UI examples, not merchant results.

The existing `/videos/banner.mp4` film and `/videos/banner-loop.mp4` preview are unchanged. The full film is requested only after opening its dialog. Trigger, dialog and close labels are localized. The inherited full film has no verified caption track; the existing caption lint issue is explicitly documented, not filled with an invented transcript.
