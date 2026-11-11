# Individual public-page design pass

This pass follows the v7 propagation pass and the subsequent browser annotations. The canonical
direction is recorded in [the design guide](../context/design.md). Earlier review PDFs and commits
remain intact. Work is in progress; the working coverage register is `output/browser-pass-v8/status.md`.

## Scope and ownership

Each secondary public page has its own agent and composition pass. Dynamic integration, channel,
platform, business and sector routes select a dedicated body module for each slug. Blog article
and tag pages each receive a template pass covering their content-driven URLs. The six legacy
aliases continue to redirect to their current destinations. Authentication, onboarding and
dashboard interfaces keep their separate documented flows. The public `/compare` tool is included
even though its source currently lives in the auth route group.

The page-specific bodies receive the existing localized sections and capability/evidence children.
This keeps shared hero, FAQ, source and structured-data behavior while allowing each page to
explain its particular workflow. New supporting labels live in paired locale fragments; existing
product claims, status, pricing and evidence gates remain the source of truth.

## Reviewed direction

- Homepage journey rows share full-width separators, a center spine and intersection crosses.
  ASCII milestone numerals sit beside the stage titles; the spine remains uninterrupted. Copy and schematic diagrams are cells within the
  row, without separate floating copy-card borders. Mobile uses a left spine.
- The channel comparison follows document scrolling. Its desktop table fits the rail; phone
  layouts show complete labeled records rather than an internally scrolling table.
- Channel and integration heroes show large unframed provider marks above their titles, with
  status and verification metadata subordinate. Transparent existing Amazon and Perplexity
  artwork replaces boxed favicons. Product screenshots appear in neutral evidence bands outside
  blue heroes. The Shopify hero omits its redundant Live badge; the integration directory retains
  its availability information.
- Body sections use connected neutral or gray cells. Native tabs and accordions expose useful
  distinctions and setup steps; dense character silhouettes and ordinary diagrams explain
  processes. Avoid inset blue copy banners wrapped in white padding and hand-drawn ASCII boxes.
  Shopify's workflow artwork fills its background, and its setup tabs change between dense
  silhouettes with proportions that keep the figures recognizable.
- Source links occupy the full rail width, with complete row hit targets, clear keyboard focus,
  hover feedback and edge-to-edge separators. Provider marks have no added background plates.
- All new UI labels are available in English and Spanish. Native controls, semantic Tailwind
  tokens and the established typography, seams, crosses and motion behavior remain shared.
  Document-level anchor scrolling respects reduced-motion settings. Developer code examples
  share a localized native Copy action, with visible confirmation and failure feedback; exact
  snippet contents remain server-rendered and selectable.

## Explicit content removals

The Merchant Center workflow approval note and setup testing tip were removed from the rendered
page at the user's request. Their original catalog values remain preserved. Product permissions,
eligibility, limitations and verification sources remain available. The developer overview also
removes its obsolete suggestion to subscribe through an MCP session: the current handler and
MCP guide explicitly use stateless POST responses with no subscription stream.

## Verification and review

Each page agent privately inspects English desktop and Spanish phone layouts and checks its
changed interaction with keyboard and reduced motion. Reports and screenshots live under
`output/browser-pass-v8/pages/`; screenshots stay out of the main conversation. Root performs
integration checks across the public routes. Runtime smoke results, typecheck deltas and final
build status will be recorded after the full queue is complete.

The original homepage product video remains unchanged. No exhaustive sitemap screenshot pack
or replacement PDF is part of this pass.
