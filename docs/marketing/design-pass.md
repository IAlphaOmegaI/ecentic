# Enterprise website design pass

10 November 2026. Part 3 follows the shared Tailwind theme and the user's latest visual direction. The detailed rail measurements are in [shared-design-pass.md](shared-design-pass.md); the token decisions are in [tailwind-migration.md](tailwind-migration.md).

## Before and after

| Area | Before | After |
| --- | --- | --- |
| Major sections | Different local padding and introduction gaps | 96px outer desktop rhythm, 56px on mobile, 24px heading/body gap; connected sections split that rhythm across their introduction and final content |
| Rails | A breakpoint could shift ordinary rails away from gutters and menus | One `min(1186px, 100% - 56px)` width; 16px mobile gutters; one owner per shared seam and cross |
| Navigation | Menu height changes could move the browser's scroll anchor | Progressive blur and in-flow panels preserved; marketing body disables scroll anchoring; keyboard focus does not move the page |
| Supporting services | Additional dark fields competed with the closing band | Procurement uses the shared gray field, film surroundings use the off-white canvas; the original product film remains unchanged |
| Pricing | Plan layout could form an inconsistent final row | Four self-serve plans use the documented 2×2 layout, followed by a full-width Enterprise row |
| Articles | A separate stylesheet and stored inline presentation could override the theme | Shared semantic Tailwind descendants, no article stylesheet, presentation attributes removed at render time; wide tables have keyboard-focusable local scrollers |
| Recovery | Separate rail geometry and no closing band | Shared rails, accessible links, localized buying sign-off and provider-independent closing actions; genuine HTTP 404 retained |
| Existing public tools | Some rails reached the mobile viewport edge; small blue code labels missed contrast | Shared rail gutters and stronger semantic blue text; the comparison tool receives one H1 |
| Public docs and privacy content | Inline code/link contrast and unfocusable code scrollers | Shared foreground/code tokens, persistent link underlines and keyboard-accessible ScrollArea surfaces |
| Blog index | Low-contrast tag chips, light labels on thumbnail-free entries and one missing local thumbnail | Semantic foreground labels for plain fields, opaque inverse labels over a stronger image overlay, and a narrow mapping to the existing e-commerce SEO image; stored posts and remote images stay unchanged |
| EU Presence and policy links | Nested rounded fields and duplicate policy-strip borders/crosses | Flat gray service ledger, one shared policy band and compact text links; prices, benefits and commercial terms remain unchanged |

## Deliberate differences from the catch-up brief

The user explicitly chose the latest visual feedback when asked about conflicting directions. The site therefore retains the shared off-white canvas, gray supporting fields, official provider marks, the progressive blur navbar and the inset rounded blue Journey hero. Shared theme values are not globally reassigned to the brief's slightly different neutral colors.

The blue surface keeps equal 24px top/side margins on desktop and 16px on mobile, with 12px/8px corners and vertical guides only. Primary controls retain 6px corners; secondary controls and form fields retain 2px corners. These are intentional exceptions to the brief's square-only rule. Ordinary section fields remain square and bounded by the rail system.

Major standalone sections use 96px/56px padding. Composite sections use 96px introduction top, 48px internal spacing and 96px final bottom on desktop, with 56px/32px/56px on mobile. Dense tables, form controls, plan cells and the programs strip keep compact spacing. ASCII is actual text and is limited to the hero and closing treatments; monospace remains appropriate for ASCII and code.

Official provider logos are retained at the user's request, with source records in [provider-logo-provenance.md](provider-logo-provenance.md). No customer logo or unverified endorsement was added.

The first complete-site capture exposed legacy tool geometry and pricing seams beyond the initial samples. Those fixes are part of this design pass. Its incomplete first capture is diagnostic evidence; the final versioned review folder is regenerated after the fixes. The screenshot script retains overflow pixels in diagnostic captures and uses the existing decoded product-video poster for stable review images; it does not replace or change the product film.

The public comparison tool now renders its existing localized title/description on the server, exports its own metadata/canonical and includes the shared closing/footer. Its parent authentication layout and comparison behavior are unchanged. ItemCycle uses semantic dark-surface/text tokens and presents a static item for reduced-motion users; its default cycling interval remains unchanged. The timeline client receives only its rendered event copy, so unused review-only notes are absent from normal serialized props.

## Verification

- Production build: all seven tasks pass.
- Tests: 564 pass, zero failures, 1,909 assertions. HTML parser tests cover quoted attributes, angle brackets, embedded styles and preserved content/URLs.
- TypeScript: unchanged baseline of 298 direct web diagnostics and 16 root diagnostics. This is not a clean typecheck gate.
- Initial production sample: ten full-page images covering both localized homepages, Enterprise, Connect and AI channels at 1440px and the unmodified iPhone 14 preset; zero axe violations, horizontal overflow, broken images or unloaded local fonts. Evidence: `output/enterprise-rebuild/part3-normal/`.
- At 1280px on the Spanish homepage, the menu changes header height from 81px to 900px and back. The hero moves from y=105 to y=924 and back. At scrollY=1200, opening, keyboard navigation and Escape retain scrollY=1200; Escape restores the trigger focus.
- Another 16 production views cover English/Spanish pricing, genuine 404s, structured articles and imported HTML articles: zero axe violations, overflow, broken images or font failures. Evidence: `output/enterprise-rebuild/part3-shared-production/`. Form and API interactions also pass the focused checks. All-route axe results and any remaining exceptions belong to the full pack's `UI-NOTES.md` and `axe-summary.json`.
- Follow-up checks cover 16 legacy tool views, 32 documentation/comparison views, four pricing views and four privacy views in English/Spanish at desktop/mobile widths: zero axe violations and overflow after the fixes. Code scrollers respond to arrow keys without moving the page. These development checks supplement the final production capture rather than replacing it.

Existing Chatwoot and YouTube iframes report HTTP-localhost/HTTPS-frame warnings in WebKit; the Chatwoot warning also occurs in the baseline. A Next development-only `instant-shell-url-data` diagnostic on the pre-existing blog route prevented some development captures; production builds and production article checks are used for the final evidence. Neither issue is represented as a clean development runtime.
