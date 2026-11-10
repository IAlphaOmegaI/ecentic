# Enterprise rebuild: trust, legal and release limitations

Prepared 10 November 2026. This report covers the company/trust routes, pricing, recovery, and phase 8 discovery work. It does not authorize deployment or replace the unchanged Terms and Privacy policy.

## Claim decisions

| Topic | Implemented wording / limitation | Evidence |
|---|---|---|
| Passwords | scrypt through Better Auth defaults. The old policy’s bcrypt/argon2 wording was not copied to the new Security page. | `apps/web/src/lib/auth.ts`; installed Better Auth default crypto implementation, detailed in `/tmp/ecentic-enterprise-trust-audit.md` |
| Checkout controls | Signatures, allow-lists and rate limits are configurable. No assertion that every request is signed or universally blocked. | `apps/web/src/server/app/ucp/router.ts`, `store-info.ts`, and limiter configuration |
| AI tracking | Classified browser visits and destinations. The Shopify script does not observe every crawler or establish a shopper-to-order link. | `apps/web/public/tracker.js`; `agentVisit` schema |
| PAYG attribution | Explicit order attribution signal OR a store-level AI-referral visit in the previous 7 days; standard 3%, capped at $500 per calendar month. | `apps/web/src/server/app/billing/attribution.ts`; existing pricing source |
| Listing updates | On-demand simulations and merchant-approved Apply. Removed unsupported schedule/model-drift/profile-generation promises from marketing pricing, without changing billing or dashboard plan data. | Existing simulation/optimization code; source audit |
| Pricing and bundle | Existing plan prices and product limits retained. EU Presence price math, commercial terms and links retained, with safe optional description/final-product copy overrides. | Existing `pricing` messages, PricingCTA and PartnershipBundle |
| ChatGPT app | Public directory listing remains unconfirmed, so marketing says Coming soon. MCP availability is not treated as proof of app publication. | Source audit; no verified listing supplied |
| ACP | Coming soon in current marketing and agent guidance. Existing discovery documents remain available without promising a production channel. | Brief decision and capability audit |
| Security operations | Locations, encryption operations, backups, access process and operational contacts remain explicit TODOs where not verified. No pack download, status page or certification was invented. | Repository implementation cannot establish the missing operational values |
| DUA Flavours | 12% more visits from AI assistants or direct traffic, April–July 2026. Visits are not sales; no causal or revenue claim. Written permission date 3 September 2026. | User-provided brief; intervention/start details remain TODO |
| Research | Complete EN/ES draft template only. No public page, navigation link or sitemap entry. | `research/_components/draft.tsx`; discovery catalog excludes research |
| Team and operator | Three founders, preserved existing biography bodies, no invented portraits. Unconfirmed legal entity names omitted from Organization JSON-LD and marked visibly in company copy. No parentOrganization. | User baseline About fragments, supplied brief, new About route |
| Resource selection | Only hand-written `source=local` posts featured. Published DB blog routes remain live; sitemap and llms use uncapped current DB reads. | Resources editorial component; `Blog.listPublished`; sitemap and llms |

## Legal text left unchanged

The lawyer-facing references are identical in `apps/web/messages/fragments/legal.en.json` and `legal.es.json`:

- Line 62: Privacy contact states zennit and says ecentic is a product of zennit.
- Line 157: Terms governing-law/contact block identifies zennit and its Tirana address.
- Line 161: Terms say the Service is operated by zennit.
- Line 189: Limitation of liability names ecentic and zennit.

Generated `messages/en.json` and `es.json` line numbers move after merging. Neither legal fragment was edited. The current policy’s retention/deletion section was summarized faithfully in pricing: account-active retention; immediate token deletion on disconnect; product history retained unless deletion requested; account data permanently deleted on account deletion; Shopify shop/redact removes shop records; legally required billing references/amounts may remain without shopper details. No unsupported deletion SLA or backup-purge period was added.

## Open values by page

The following are the remaining visible English TODO strings. Spanish mirrors them. These values require source facts; they were not guessed. The research group below is private draft content, not a public launch surface.

### security

- `sections.2.rows.0.value`: Vercel. {{TODO: confirm deployed services and hosting regions}}
- `sections.2.rows.1.value`: PostgreSQL. {{TODO: confirm production provider and region}}
- `sections.2.rows.2.value`: {{TODO: confirm the deployed TLS minimum and encryption at rest}}
- `sections.2.rows.5.value`: {{TODO: confirm who has production access and whether MFA is enforced}}
- `sections.2.rows.6.value`: {{TODO: confirm documented backup and recovery targets}}
- `sections.3.paragraphs.3`: {{TODO: confirm account-specific provider retention and model-training terms before publishing a no-training promise}}
- `sections.4.rows.0.value`: {{TODO: exact legal name of the Polish operating company}}
- `sections.4.rows.2.value`: {{TODO: confirm privacy@ecentic.ai receives data requests before activating the contact link}}
- `sections.5.note`: {{TODO: supply the approved DPA template and confirmed request contact}}
- `sections.6.note`: {{TODO: confirm the full contracted sub-processor list and processing locations before launch}}
- `sections.7.paragraphs.1`: {{TODO: confirm the security questionnaire process and available review materials}}
- `sections.8.description`: {{TODO: confirm security@ecentic.ai is monitored before publishing the vulnerability contact}}
- `subprocessors.rows.0.location`: {{TODO: confirm Azure region}}
- `subprocessors.rows.1.location`: {{TODO: confirm processing location}}
- `subprocessors.rows.2.location`: {{TODO: confirm processing location}}
- `subprocessors.rows.3.location`: {{TODO: confirm processing location}}
- `subprocessors.rows.4.location`: {{TODO: confirm hosting and gateway locations}}
- `subprocessors.rows.5.location`: {{TODO: confirm provider and database region}}
- `subprocessors.rows.6.location`: {{TODO: confirm Redis region}}
- `subprocessors.rows.7.location`: {{TODO: confirm processing location}}
- `subprocessors.rows.8.location`: {{TODO: confirm processing location}}
- `subprocessors.rows.9.location`: {{TODO: confirm processing location}}
- `subprocessors.rows.10.location`: {{TODO: confirm processing location}}
- `subprocessors.rows.11.location`: {{TODO: confirm storage region}}
- `subprocessors.rows.12.location`: {{TODO: confirm processing location}}

### about

- `sections.2.note`: {{TODO: supply approved founder portraits}}
- `sections.6.rows.0.value`: {{TODO: exact legal name and registered address of the Polish operating company}}
- `sections.6.rows.1.value`: {{TODO: exact legal name and registered address of the Delaware company}}
- `sections.6.rows.3.value`: {{TODO: confirm the public +355 contact number}}
- `programs.4.description`: Accelerator. {{TODO: supply the official Fil Rouge Capital logo}}

### partners

- `sections.0.items.0.body`: You run Shopify, WooCommerce or marketplace stores for clients. Run ecentic on them, ship the fixes and keep the client relationship. {{TODO: approved agency and reseller benefits and terms}}
- `sections.0.items.1.body`: You sell something different to the same stores: product information, payments, checkout or data. Build on the REST API and MCP server, and sell together. {{TODO: approved technology partner benefits and terms}}
- `sections.0.items.2.body`: You teach people to sell online. Share ecentic with them. {{TODO: approved creator and affiliate benefits and terms}}
- `sections.1.items.1.body`: {{TODO: confirm the proposed 20-minute partner conversation}}
- `sections.1.items.2.body`: {{TODO: confirm partner access, materials and onboarding}}
- `sections.1.items.3.body`: {{TODO: confirm the joint selling process}}
- `faqs.2.answer`: {{TODO: confirm whether joining the partner programme is free}}

### duaFlavours

- `sections.0.rows.3.value`: {{TODO: describe what ecentic changed for DUA Flavours}}
- `sections.1.paragraphs.0`: {{TODO: DUA Flavours’ starting position, supplied and approved by Xhurian}}
- `sections.2.paragraphs.0`: {{TODO: name the products and fields changed, and when the work happened}}
- `sections.4.paragraphs.1`: {{TODO: explain the April start and what ecentic did before the Shopify app launched on 20 May 2026}}

### contact

- `sections.0.items.3.body`: {{TODO: confirm press@ecentic.ai is active before publishing the press contact}}
- `sections.0.items.4.body`: Report a vulnerability. {{TODO: confirm security@ecentic.ai is monitored before activating the contact link}}
- `sections.0.items.5.body`: Data requests and DPA questions. {{TODO: confirm privacy@ecentic.ai is active before activating the contact link}}
- `sections.1.rows.0.value`: {{TODO: exact legal name and registered address of the Polish operating company}}
- `sections.1.rows.1.value`: {{TODO: exact legal name and registered address of the Delaware company}}

### researchDraft

- `sections.0.paragraphs.1`: {{TODO: confirm whether all products in the research were real products}}
- `sections.2.rows.0.value`: {{TODO: number of products}}
- `sections.2.rows.1.value`: {{TODO: categories represented}}
- `sections.2.rows.2.value`: {{TODO: question set and selection method}}
- `sections.2.rows.3.value`: {{TODO: runs per question and total allocation}}
- `sections.2.rows.4.value`: {{TODO: models and exact versions}}
- `sections.2.rows.5.value`: {{TODO: research dates}}
- `sections.2.rows.6.value`: {{TODO: definition of a simulated purchase}}
- `sections.3.paragraphs.1`: {{TODO: add only further findings supported by the research data}}
- `sections.6.description`: {{TODO: supply the final, reviewed PDF before enabling its download}}
- `sections.7.description`: ecentic, “36,797 simulated AI purchases”, {{TODO: publication month}} 2026.

## Verification and known limits

- Existing discovery/schema suite: 27 passing tests and 390 assertions. Final root typecheck/build and interaction validation remain owned by the integrating agent.
- HTTP audit: 120/120 non-home marketing routes return 200 after targeted rechecks; 12/12 exact 301 moves pass; 257 additional public targets were checked (249 return 200, eight expected redirects), including 232 EN/ES blog article URLs. No duplicate document titles after excluding SVG accessibility title elements.
- EN and ES unknown routes return real 404 status with the requested localized heading and machine-readable recovery content.
- Four representative leaf social-image URLs were fetched from emitted HTML and returned 200 image/png. Next’s route-group image suffix is derived using its shared hash helper; no cache query was invented.
- Top-level OG artwork reuses the official lockup and existing ASCII. Final preview: `/tmp/ecentic-enterprise-og-check.png`.
- Lighthouse accessibility after the root’s contrast fix: 100 on `/platform/simulate`, `/integrations`, and `/security`. Initial full Lighthouse best-practices scores were 100. Initial development performance scores are not production benchmarks.
- Existing public `/compare` remains a client application without a server-rendered H1/canonical/OG metadata; no auth/app code was changed. Existing Spanish legal metadata length findings are recorded without changing the legal routes.
- Shorter legacy UCP metadata is now in each owning UCP fragment to avoid alphabetical fragment overrides. Catalog merge is owned by root.

## Artifacts

- `/tmp/ecentic-enterprise-trust-audit.md`: original code/legal/changelog evidence.
- `/tmp/ecentic-enterprise-company-delivery.md`: implementation inventory and caveats.
- `/tmp/ecentic-enterprise-phase7-8-files.txt`: exact file list for integration/staging; no commit or catalog merge was made by this agent.
- `/tmp/ecentic-enterprise-rebuild/route-audit.json`: machine-readable HTTP audit, with initial observations and targeted rechecks.
- `/tmp/ecentic-enterprise-rebuild/og-image-rechecks.json`: four fetched image responses.
- `/tmp/ecentic-enterprise-rebuild/lighthouse/`: original full reports and final accessibility-only reports.
- `/tmp/ecentic-enterprise-rebuild/next-mcp-audit.json`: empty compilation/config/session error snapshot.

## Final content and editorial follow-up

- `docs/marketing/enterprise-content-audit.md` exhaustively lists new-fragment word hits and every TODO. Current snapshot: 26 new fragment files, 22 vocabulary-bearing strings with justification, zero strict prohibited-phrase hits, and 146 TODO-bearing strings across EN/ES. The old enterprise.en/es.json pair is excluded because it predates the rebuild and its route redirects.
- The two literal phrase violations were removed in both locales: pricing now explains on-demand simulations and approved publishing without naming omitted features; Merchant Center copy distinguishes access approval from endorsement.
- The `/blog` index now pins hand-written `source=local` entries first in EN and ES, preserves publication-date order within both groups, retains every entry, and keeps the updated-date line tied to the latest publication.
- The homepage initial accessibility-only score was 97 due to small white text on brand blue. Root fixed that background contrast; the final full production run confirms accessibility 100, with performance findings recorded below.

## Global 404 production rendering correction

The first production build rejected request headers outside Suspense in `global-not-found.tsx`. Its locale determines the document-level `html lang`, and this standalone convention bypasses the locale root layout. A trial locale catch-all through the existing root Suspense returned HTTP 200 before `notFound()` resolved and did not provide the localized H1 in raw HTML; that trial was removed.

The final change explicitly sets `instant = false` only on the standalone global 404. This allows the short locale-header read to finish before the 404 document is sent. It preserves normal pages’ instant/PPR behavior and avoids client-side language patches. The shared recovery component and metadata helper keep the same machine-readable links and Markdown body; `metadataBase` uses the canonical `seo.host`. A canonical URL is not fabricated for unknown paths.

Live checks of `/enterprise-recovery-check-missing` and `/es/enterprise-recovery-check-missing` now return HTTP 404, the correct EN/ES `html lang`, the localized H1/title, and `/404.md`. The dedicated evidence is `/tmp/ecentic-enterprise-rebuild/not-found-ppr-check.json`. The integrating agent’s subsequent production build passed with this global-only boundary. The final production build also includes the corrected root social-image URL, and the final production response checks pass. Files: `apps/web/src/app/global-not-found.tsx` and `apps/web/src/app/_components/not-found-content.tsx`.

## Final social-image correction

The EN homepage’s locale-prefixed route-group image normalized to a root URL that the proxy intentionally excludes from localization. `createMetadata` now selects the existing `/opengraph-image` route for EN pages using the root artwork; ES keeps its localized hashed route. Both image URLs, read from emitted homepage HTML, returned 200 `image/png` (346,239 and 349,570 bytes respectively). Evidence: `/tmp/ecentic-enterprise-rebuild/home-final-og-images.json`. Section image mappings remain as verified in the four representative leaf checks. Production checks on port 3001 also confirmed both image responses and the EN/ES 404 status, language, headings and Markdown recovery; see `/tmp/ecentic-enterprise-rebuild/production-404-og-check.json`.

## Production Lighthouse verification

A full Lighthouse mobile run against the local production build on port 3001 completed on all four requested routes. The homepage row is the final targeted run after the off-white canvas, inset blue hero, guide/ASCII contrast, structural junction and progressive-blur navigation refinements, retaining the deferred video and interest-form loading changes; the other three rows are their preceding production runs and were not unnecessarily repeated. These are simulated mobile laboratory measurements, not deployed field metrics. Full JSON/HTML reports and the accessibility item details are in `/tmp/ecentic-enterprise-rebuild/lighthouse-production/`; `summary.json` records all scores, metrics, command outcomes and remaining accessibility findings.

| Route | Performance | Accessibility | Best practices | SEO | LCP | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 98 | 100 | 100 | 92 | 1.66s | 0 |
| `/platform/simulate` | 100 | 100 | 100 | 92 | 1.36s | 0 |
| `/integrations` | 100 | 100 | 100 | 92 | 1.35s | 0 |
| `/security` | 100 | 100 | 100 | 92 | 1.35s | 0 |

There are no failed automated accessibility checks or Lighthouse runtime errors. The sole SEO score deduction on all four pages is the local test origin differing from the intentional production canonical `https://ecentic.ai`; canonical links are present and route-specific. Lighthouse considers robots.txt valid in this production run.

The final homepage run after the last design refinements scores 98 performance, 100 accessibility, 100 best practices and 92 SEO. Simulated LCP and FCP are both 1.66s, CLS is 0, TBT is 128.5ms, and Speed Index is 2.23s; observed unthrottled LCP is 324ms. The network trace contains no ASCII bitmap or preview-video requests during initial load. This final unmodified production run meets the requested homepage performance target. Its JSON/HTML reports are `home-release-final.report.json` and `home-release-final.report.html`; `home-release-final-summary.json` contains the metrics and empty accessibility-findings list. The preceding 96-score run is preserved as `home-final.report.json` for comparison. The three content routes remain performance 100 with LCP approximately 1.35s and TBT 30–40ms.

### Earlier homepage request-chain diagnosis (superseded measurements)

Before the final ASCII text treatment, the responsive-image build scored 71 with simulated LCP 9.58s. The historical full report is `home-optimized.report.json` and its details are in `home-optimized-summary.json`. That run observed an eager `banner-loop.mp4` range response transferring 3,146,084 bytes before the first content paint. Both banner video files are 9,046,291 bytes on disk; the prior source comment’s 357 KB size is stale. The procurement and footer artwork also load below the fold. Total measured transfer was approximately 6 MB, including 1.39 MB of scripts and 211 KB of fonts.

A diagnostic-only run blocked the preview video without changing site files. Its simulated LCP improved to 6.86s; this is an isolation experiment, not a passing site score. The saved trace was fed back through Lighthouse’s Lantern computation to identify remaining critical nodes. The final nodes include the initial InferredForm/Zod (79 KB), PostHog (96 KB), Motion (48 KB), and additional Zod (39 KB) chunks. Lighthouse’s image-LCP simulation includes initial network/script work; the observed sub-second image paint therefore differs from the estimate under mobile bandwidth/CPU limits. It is not evidence that the browser waited nine seconds to discover the preloaded image.

The final implementation defers the preview video until it is near the viewport, loads the interest form body on first open, and uses real ASCII text in a `<pre>` instead of hero/closing bitmaps or image preloads. The final unmodified production run above verifies the improved result. Historical diagnostic evidence remains available in `home-diagnostic-video-blocked.report.json`, its trace/devtools log, and `home-diagnostic-lantern-graph.json` under the production Lighthouse directory; these isolation results are not used as release scores.

### Final production recovery and social-image checks

The final port-3001 build returns real HTTP 404 for unknown EN and ES paths with the correct server-rendered `html lang`, localized H1/title and `/404.md` recovery link. `/opengraph-image` and `/es/opengraph-image-1syllj` both return 200 `image/png` with valid PNG signatures. These targeted checks are recorded in `/tmp/ecentic-enterprise-rebuild/production-final-404-og-check.json`. No source code was changed during this final audit.
