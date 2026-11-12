# Website release — 12 November 2026

This release applies the [answered launch questionnaire](./launch-decisions-2026-11-12.md), the responsive review and the remaining confirmed design audit findings. The comprehensive design system lives in [DESIGN.md](../context/design.md). The original [audit](./launch-content-audit.md) and [questionnaire](./launch-questionnaire.md) are historical records, not unanswered requests.

## Delivery boundary

Release branch: `codex/illuminated-surfaces`. A Git push is not a production deployment or completion of the credential migration. Production prerequisites below must be completed before this code replaces the current live application.

The only production data change in this work was the approved editorial correction: 44 exact text replacements across ten published English/Spanish blog rows. Database identity was confirmed against the linked Vercel production configuration. The guarded transaction checked every original value, and a second dry run reported zero remaining changes. The public blog cache was revalidated and all ten article URLs returned the corrected copy. No production account deletion, disconnect, billing change, credential backfill or outbound enquiry was performed.

## Content and behavior delivered

- Applied the enterprise durations, scoped engagement terms, partner arrangements, English-only service language, approved contacts and qualified DUA story in both locales.
- Added the confirmed operator, ecentic Inc., with Legalinc explicitly identified as its registered agent. Drafted Terms and Privacy from the supplied decisions and actual implementation. The registered-agent address is not represented as a staffed office; no unverified Polish entity is presented as the default operator.
- Kept the unpublished simulation research and Alvi's security-flow review out of normal publication. Removed a stray study comparison from the Simulate page. Published the approved 45/45 product-page finding and 6/6 country checkout finding with their actual denominators; kept the unapproved workspace finding omitted.
- Aligned API and MCP plan descriptions, including Scale, with the existing product. Corrected nonexistent REST-results guidance, wine-sector Apply behavior, DUA typo destinations and promoted blog claims. Prices, billing caps and attribution rules did not change.
- Defaulted marketing enquiries to `enterprise@ecentic.ai` when no explicit recipient environment variable is set. Calendar navigation and contact copy do not imply a sent enquiry or booked meeting.
- Added authenticated store disconnect and constrained account deletion, with fresh-session checks, ownership validation and financial/provider blockers. Accounts requiring retained records use the assisted privacy process.
- Added authenticated encryption for ten provider credential columns, removed WooCommerce's secret-bearing HTTPS query fallback, made the credential repository server-internal, enforced its store ownership check and reduced Sentry personal-data collection.
- Prevented Google Analytics and PostHog initialization until analytics consent. Support chat loads on the visitor's explicit launcher action. Consent withdrawal disables Google measurement and removes its first-party cookies; already-sent data and activated support conversations are separate.

## Design and accessibility delivered

- Centered fade/blur navigation transitions, complete mobile gradients, shared vertical connectors, taller brand examples and unclipped Shopify artwork.
- Full-width documentation source panels and common section-edge crosses, with no extra padded surface around the code. Shared provider journeys now keep their content visible.
- One Nucleo outline-duotone family across the reviewed icon library; third-party brand assets and functional loaders remain intentional exceptions.
- Removed confirmed wheel-scroll traps and narrow Spanish CTA clipping. Reused connected journeys on Fix, Track and Travel instead of requiring text-only section selectors.
- Added static, server-rendered rest artwork for all 15 stock Hairline subjects. No-JavaScript, reduced-motion and chunk-failure states retain an illustration. Live enhancement stays inside the same frame.
- Replaced the generic Partners hub with two merchant catalog folios, removed standalone logo tile chrome in the reviewed provider arcs, and restored shared primary CTA variants and source-link hierarchy.
- Restored the newer deployed October product film, its preview and posters. Added localized sample labeling and a timed visual transcript. That transcript describes the verified pictures; it is not represented as verified spoken captions. No accurate supplied speech script or caption track was available.

## Production prerequisites

1. **Credential encryption deployment:** provision the independent key and temporary legacy-read setting, deploy all writers, backfill and verify zero pending rows, then remove legacy mode. Follow [the complete runbook](../integrations/credential-encryption.md), including rotation and rollback restrictions. Production did not have these new settings during this audit. Deploying without them will reject credential reads/writes.
2. **Contact delivery:** verify `privacy@ecentic.ai` reaches Xhurian, `support@ecentic.ai` is monitored and `enterprise@ecentic.ai` receives enquiries. A Resend secret exists in Vercel as a sensitive value; the environment export does not reveal it. Redis, sender and calendar configuration were inspected, but no live message was sent, so end-to-end delivery remains unverified.
3. **Operational policy execution:** implement the accepted privacy request and lead-retention process, confirm applicable record-retention periods and maintain any required processing/transfer arrangements. Policy text is a draft based on supplied facts, not lawyer approval. Any Polish contracting entity must be identified in its signed agreement.
4. **Provider settings:** the production database connection was confirmed as Neon in AWS `us-east-1`, with required TLS and channel binding. Confirm actual history/snapshot retention, recovery procedure, account MFA and Gateway privacy settings before making stronger claims. No universal residency, seven-day backup purge, certification or no-training guarantee is published.

These items are intentionally retained in this internal release record. The public site does not display unresolved TODO labels or pretend the operational checks have been completed.

## Verification record

- `NEXT_PUBLIC_REVIEW=0` production build passed all 641 generated pages. A build exposed the old Privacy icon map's section limit; all 14 current sections now have icons and future sections have a safe fallback. Shared rich-text links also preserve the active locale.
- All 61 registered public routes in both languages returned 200 with titles, descriptions, canonical URLs and Open Graph image URLs: **122 responses, zero census failures**. Complete responses contained no raw pending/TODO copy or empty links; the unapproved study was absent from normal pages.
- Eight representative Open Graph endpoints returned PNG images. Sitemap, robots, plans, OpenAPI, UCP discovery and `llms.txt` returned successfully. Research, prototypes and nonexistent routes returned 404; the English/Spanish recovery pages use the correct language and noindex. Review routes are absent from the sitemap.
- **177 focused tests passed, zero failed**, covering design check infrastructure, source diffs, evidence gates, internationalization, API/discovery facts, stock artwork, encryption and lifecycle behavior. Destructive-action tests used isolated fixtures; no customer account was modified.
- Eight consent browser checks passed with provider responses stubbed: no optional SDK requests before a decision or after decline, one GA load on grant, withdrawal disables capture and expires first-party GA identifiers, and explicit support opening loads/reuses the chat SDK. No support messages were sent.
- EN/ES catalogs have matching **11,025 keys**. TypeScript reports **297 existing diagnostics versus the 298 baseline**, with no new diagnostic signatures; this repository's existing type debt is not presented as a clean typecheck.
- Scoped Biome and the design source checker passed. The source checker parsed 965 files with no errors, warnings or advisory findings. `git diff --check` passed.
- Private browser review covered Partners, the Travel roadmap and Brands at 1456px/390px in both languages, and Terms/Privacy at desktop/mobile widths. No horizontal overflow was found. All 14 Privacy navigation items work, including mobile focus/scroll to the last section. The film dialog scrolls and closes with Escape in EN/ES; stock art also survives disabled JavaScript, reduced motion and a forced chunk failure.
- The published editorial patch was verified as idempotently complete, the production blog cache was revalidated, and all ten affected live article URLs returned updated content.

Local evidence is retained under `output/launch-release-2026-11-12/` and the agent-owned `output/launch-ready-2026-11-12/` folders. Screenshots remain there and are not committed. Passing local production-mode checks does not establish inbox delivery, provider configuration or completion of the production migration described above.
