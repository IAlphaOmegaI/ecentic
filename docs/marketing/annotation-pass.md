# Annotated design pass - 10 November 2026

All 65 comments from the original eight-page `review.pdf` have been reviewed and addressed. Four subagents inspected only their own original screenshots (1-16, 17-33, 34-50, 51-65); the main thread received text reports. The original annotated PDF and previous commits are preserved.

Source annotations: `/Users/xhurianshaba/Documents/Claude/Projects/écentic/Codex review annotations 2026-11-10/annotations.md`.

The fresh compact review covers homepage, pricing and Enterprise at desktop/mobile widths, plus desktop Platform navigation and the mobile navigation sheet. The exhaustive sitemap capture remains deferred.

## Design decisions applied

- The shared Tailwind palette remains the source of colors: off-white canvas, dimmed gray support surfaces, ecentic blue and semantic icon colors.
- Native `@zenncore/web` gradient buttons replace local flat overrides. Square full-width actions remain where the comment asks for them.
- Blue hero and closing surfaces use equal side/top insets: 12px desktop and 8px mobile. Hero minimum height is 100dvh; longer mobile copy expands it naturally.
- Major horizontal seams use one border owner plus gutter-only extensions: `max(0px, calc((100dvw - 100%) / 2))`. Internal card/table rules remain local. Rail/grid intersections keep crosses without double-painted seams.
- Character-based ASCII artwork moves through approved `Motion.Item` components. Shared decorative loops stop outside the viewport and under reduced motion.
- Product facts, measured evidence values, source links, publication gates, prices and original product video are preserved.

## Comment ledger

| Comment | Applied change |
| --- | --- |
| 1 | Reduced hero inset to 12px desktop / 8px mobile. |
| 2 | Six masked progressive blur layers; removed navbar bottom rule. |
| 3 | Blue hero continues behind the closed navbar. Open menus push content down and reset the hero overlap so every menu row remains on the light surface. |
| 4 | Hero minimum height 100dvh, with content-safe mobile expansion. |
| 5 | Navbar install action uses the native primary gradient button. |
| 6 | Login uses a proper shared outline button. |
| 7 | Locale control clearly shows language code, flag and chevron. |
| 8 | Reduced navigation chevron size relative to its label. |
| 9 | Journey major horizontal boundary extends to viewport edges. |
| 10 | Added consistent lower rule to the Journey tab strip. |
| 11 | Active Journey tab uses a distinct light surface. |
| 12 | Journey step/index treatment is larger and clearer. |
| 13 | Journey uses the shared dimmed gray surface. |
| 14 | Removed the redundant Journey footer sentence. |
| 15 | Removed the Fil Rouge Capital pending logo tile from Programs. |
| 16 | Centered commerce hub; replaced the blunt blue block with a symmetric fade. |
| 17 | Rounded provider-logo treatment in the commerce layer. |
| 18 | Same rounded treatment for lower provider entries. |
| 19 | Shared headings use foreground-dimmed for secondary copy. |
| 20 | Actual Shopify, WooCommerce and Google marks; generic feed/PIM use category icons. |
| 21 | Removed the redundant layer legend. |
| 22 | Layer action uses the native primary gradient button. |
| 23 | Layer guides fade above the following section. |
| 24 | Layer/timeline major horizontal seams extend through page gutters. |
| 25 | Timeline introduction uses shared title/subtitle spacing. |
| 26 | Timeline includes six distinct character-based ASCII scenes in a responsive grid. |
| 27 | Hero ASCII is more visible and animated; reduced motion remains static. |
| 28 | Removed the timeline takeaway, table toggle and pending-note block. Source/date tooltips remain. |
| 29 | Standardized business-section title and supporting-copy structure. |
| 30 | Provider marks use rounded containers and clearer sizing. |
| 31 | Business-section major seam reaches viewport edges. |
| 32 | Business card titles share a subgrid row baseline. |
| 33 | Business descriptions, pain rows and actions align across cards. |
| 34 | Each business card has a distinct translated action label. |
| 35 | Removed the redundant dashboard image section; retained the original product film. |
| 36 | Full-width major separators around the film section. |
| 37 | Framed the original film with rail lines and crosses. |
| 38 | Business cards use the shared dimmed gray surface. |
| 39 | Business actions use native gradient primary buttons. |
| 40 | Compact See all action sits left with the channels introduction; removed detached footer action/copy. |
| 41 | Channel major grid boundaries extend through page gutters. |
| 42 | Notification actions use proper shared gradient buttons. |
| 43 | Added Nucleo commerce-category icon. |
| 44 | Added the official unmodified WooCommerce color wordmark. |
| 45 | Added a Nucleo feed/data category icon; no invented logo for a generic concept. |
| 46 | Standardized all notification buttons with short localized labels. |
| 47 | Integration category boundaries use full-width major seams. |
| 48 | Internal integration card dividers remain confined to their cards. |
| 49 | Integration footer has less space and left-aligned primary/neutral gradient actions. |
| 50 | Capability icons use semantic colors; actions are proper left-aligned primary buttons. |
| 51 | Replaced evidence table-toggle presentation with integrated character artwork and clear data. |
| 52 | Applied the same evidence treatment to the preceding evidence surface. |
| 53 | Applied the same evidence treatment to the following evidence surface. |
| 54 | Procurement uses a 2x2 grid of gray cards on the off-white canvas, with native primary action. |
| 55 | Pricing paths use relevant provider-logo clusters instead of decorative numbers. |
| 56 | Pricing-path action is left aligned and primary. |
| 57 | Editorial cards have full-width square actions and ASCII treatment. |
| 58 | Editorial titles and supporting copy use the common compact hierarchy. |
| 59 | FAQ now uses the shared Accordion with consistent answer formatting. |
| 60 | Closing blue surface extends beyond content rails with matching rounded insets. |
| 61 | Closing actions use native blue/neutral gradient buttons; ASCII animates. |
| 62 | Footer links span multiple rows; hover treatment clarifies interactive links. |
| 63 | Reorganized legal/footer bottom content into a readable responsive layout. |
| 64 | Mobile closing/footer follows the inset blue/off-white system and lighter accordion treatment. |
| 65 | Pricing inherits the shared headings, buttons, lines and muted copy; plan grid stays 2x2 with clearer comparison and partnership cards. |

## Verification and remaining review notes

- 564 tests passed, 0 failed. TypeScript remains at the existing 298 diagnostics; no new diagnostics in changed marketing files.
- English and Spanish catalogs have 9,081 matching keys. Next type generation and scoped Biome checks passed.
- EN/ES desktop and mobile checks found no document horizontal overflow. Diagram centers, business rows, Journey active state, menu layout and push-down behavior were checked in the running app.
- Character animation was checked in normal, reduced-motion and offscreen states, preserving caller opacity. Mobile channel comparison uses the shared ScrollArea and supports keyboard scrolling without moving the page.
- Original film preview and full 70-second video load and play without media errors; Escape closes playback and restores trigger focus. Video and poster assets are unchanged.
- Production review build passed. Final PDF build identity and capture results are recorded in the generated review pack's verification files.
- The requested native primary gradient has inherited white-text contrast of approximately 2.72:1 to 4.36:1 across its stops. Automated gradient contrast checks are inconclusive. This pass preserves the requested shared component; review its text legibility before a separate shared-theme change.
- Mobile hero uses a 100dvh minimum, expanding to fit translated text (821px EN / 847px ES in the 390x664 development checks). Review the mobile opening's density and length.
- Remaining source-artwork detail: the mobile navbar logo is visibly soft because its existing SVG embeds bitmap content.
- On mobile, the floating Chatwoot circle can overlap the right edge of Cookie settings at the bottom; the control center remains clickable.
- The open desktop menu has a verified 12px gap before the hero in EN/ES; closing restores the hero to y12 behind the header. Notification dialogs open/close in both locales and restore trigger focus without form submission.
- A pre-existing locale-change script warning in `app/[locale]/layout.tsx` remains outside this visual pass.

Please re-review the homepage first, especially the hero/nav blur, line/cross system, evidence artwork and lower-page density. Then review page2's mobile closing/footer and page3's pricing cards, comparison and EU partnership section. The Enterprise page is included to assess the same shared direction on a representative solution page.
