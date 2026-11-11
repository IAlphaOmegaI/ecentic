# Second annotated design pass — 10 November 2026

This pass applies the 27 annotations on `design-review-2026-11-10-v3/review.pdf`, plus the subsequent navbar grid and scroll clarification. The earlier 65-comment record, annotated PDFs and commits are preserved. The work was split across ASCII/roadmap, middle-page/navigation and lower-page subagents; their screenshot review stayed outside the main chat.

## Comment ledger

| Comment | Applied change |
| --- | --- |
| 1 | Navbar login uses the shared soft emphasis button. |
| 2 | Hero cycles dense, literal character silhouettes, including the original cart/bag art. |
| 3 | Homepage and shared content-page hero actions use blue primary / neutral secondary gradients, including Enterprise. |
| 4 | Journey's exterior gutters return to the normal off-white canvas. |
| 5 | Journey's active panel and selected tab share the same light background. |
| 6 | Commerce diagram uses equal columns, centered content and connectors measured from actual node positions. |
| 7 | Six dated milestones follow a connected winding character roadmap; mobile uses a vertical route. |
| 8 | Vertical guides fade before the channel comparison. |
| 9 | Guides remain hidden through the comparison and its source/footer area. |
| 10 | Audience cards become native, slightly rounded tabs with one clear content panel. |
| 11 | Audience panels combine dense evolving ASCII with restrained semantic gradients. |
| 12 | Original product film receives a distinct gray section surface; video/media remain unchanged. |
| 13 | Removed live/feed/coming-soon integration totals. |
| 14 | Enlarged integration category headings and icons. |
| 15 | All 26 provider tiles are outlined squares at one, two and four column breakpoints. |
| 16 | Audience tabs use distinct semantic accent colors. |
| 17 | Removed the box-drawing illustration above simulation evidence. |
| 18 | Replaced the verbose catalog-evidence footer with a compact Source disclosure. Required facts and publication gates remain intact. |
| 19 | DUA uses the original logo and split result treatment, preserving the verified +12% result. |
| 20 | Removed the pending market-context section from the homepage. |
| 21 | Procurement icons use varied semantic colors. |
| 22 | Pricing-path cards gain gradients behind their provider-logo clusters. |
| 23 | Removed the decorative ASCII from editorial cards. |
| 24 | Full-width article actions now have off-white side padding. |
| 25 | Closing banner returns to the dark emphasis surface with matching rounded insets. |
| 26 | Cookie settings matches neighboring footer links in type, color and alignment; mobile keeps it in the Legal accordion. |
| 27 | Added a large, legible character-based ecentic footer wordmark. |

## Navbar clarification

- Six masked blur layers form a progressive fade without a bottom border.
- Destination links occupy individual, bounded grid cells with shared row tracks. Labels and supporting text turn blue on hover/focus.
- Repetitive generic icons are removed. The AI channels group keeps actual provider logos consistently across its six options.
- Login remains soft; primary action retains the shared blue gradient. Mobile actions occupy separate full-width cells on phones. The chat launcher is hidden while navigation is open so it cannot cover these actions.
- Menus remain in document flow. Pointer opening, switching and closing must preserve `window.scrollY`; keyboard focus uses `preventScroll` and scrolls only the menu's own content region.

## Verification

- 564 tests passed, zero failed; English and Spanish retain 9,081 matching catalog keys.
- App TypeScript comparison returns the existing 298 diagnostics, with none introduced in the changed marketing files. The root monorepo command still stops on pre-existing shared-package errors.
- English/Spanish desktop and mobile checks covered Journey state, audience keyboard selection, diagram centering, square provider tiles, article actions, the dark closing, footer and Cookie settings. No document horizontal overflow was found at the checked 390, 900 and 1440 px widths.
- Animation checks covered evolving characters, offscreen/hidden-tab pause and reduced-motion still states. The original product video and measured-result values remain unchanged.
- Final production build identity, navigation checks and eight screenshot captures are recorded in the v4 review pack's verification files. Navigation views stitch the actual scrollable menu content so bottom actions are fully reviewable at the unchanged device viewport.

## Remaining visual review notes

- The requested shared primary gradient inherits white-text contrast of about 2.72:1–4.36:1 across its stops; automatic gradient contrast checks are inconclusive. Review legibility before a separate shared-theme change.
- The existing navbar SVG embeds bitmap content and can look soft at mobile scale.
- The review build may show pending evidence that the normal publication gates omit. Pending market-context cards are removed from the homepage in both modes.
- Static PDF pages cannot demonstrate changing ASCII or hover/focus behavior; use the live preview for those details.
- Exhaustive sitemap capture and unrelated polish remain deferred.

Re-review the homepage first: navigation, evolving hero, winding roadmap, audience tabs, square provider tiles and lower-page density. Then check the mobile homepage/closing/footer and the shared direction on Pricing and Enterprise. The compact PDF includes all six page/viewport combinations plus desktop and mobile navigation.
