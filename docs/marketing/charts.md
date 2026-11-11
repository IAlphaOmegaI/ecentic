# Charts and findings

10 November 2026. Implemented after the copy pass on `site/enterprise-rebuild-2026-11`. Evidence is stored in `src/content/marketing-evidence.ts`; display copy is translated in `enterpriseEvidence` fragments. See [source verification](evidence-sources.md).

| Component | Normal site | Review build |
| --- | --- | --- |
| C1 assistant comparison | Omitted until exact rates, denominators and method are ready | ChatGPT 51.6% is the only mark; Claude/Gemini and counts remain explicitly unknown |
| C2 catalog findings | Two approved anonymous findings: rounded88% of9,699;20of20 answers | All five supplied rows, with three publication-approval labels |
| C3 timeline | Six primary-verified events, chronological and linked | Same six events plus a note about two unverified dates |
| C4 channel comparison | Six rows, statuses and sources derived from the channel registry | Same verified comparison |
| C5 DUA | Approved+12% aggregate for AI-assistant **or direct** visits, April–July2026 | Same aggregate and method limitations |
| C6 optional market context | Omitted; primary figures are not verified | Pending states only; no invented numbers or curves |

C1/C2 use inline SVG marks. C3 uses an inline SVG rail and keyboard-focusable event links, with a vertical mobile layout. C4 is the compact shared Table explicitly requested in sectionE. C5 remains a stat tile because no weekly series was supplied. Evidence controls use `@zenncore/web` Button, Tooltip and Table, shared semantic Tailwind colors and local fonts. There is no animation before values appear.

Table toggles use the same selected data as the visual. Source URLs remain clickable in the timeline table. Full-row focus targets expose exact values, sample context and sources; tooltip IDs are explicitly associated with their triggers. Method and rounding notes remain visible when switching views. No exact faulty-product count is inferred from rounded88%.

Server wrappers filter publication approval before constructing client props. `NEXT_PUBLIC_REVIEW=1` is set for both the review build and server process. Owner questions remain in source/reporting data; raw TODO/NOTE text never enters HTML or serialized client props. The research route remains a genuine404, absent from the sitemap and source links.

## Verification

- Normal production build:7/7 tasks passed. Separate review production build passed.
- Direct web TypeScript:298 pre-existing errors, unchanged; no new evidence errors.
- Locale catalogs: key parity and route type generation passed.
- Publication and copy tests:17passed,45assertions.
- Production raw-response audits:14normal +14review responses, no issues. Research stays404 in both locales; normal C2 has2rows, review C2 has5; unknown C1 values never become zero bars.
- Browser captures:16normal +10review views at1440px and the actual iPhone14 preset. Zero axe violations, document overflow, failed images or local-font failures.
- Manual EN/ES keyboard checks at390px: row order, tooltip association, table toggles, unknown values and linked timeline sources passed.
- Existing WebKit localhost-to-HTTPS Chatwoot frame warnings remain visible in capture logs; they are separate from application rendering.

Evidence packs: `output/enterprise-rebuild/part2-normal/` and `output/enterprise-rebuild/part2-review/`.
