# Enterprise website rebuild

Delivery record, 10 November 2026. Nine implementation phases on `site/enterprise-rebuild-2026-11`; see the commit map below. Nothing has been pushed or deployed.

The rebuild covers the enterprise homepage, five platform pillars, business and sector solutions, AI channels, integrations, pricing, company/trust pages, resources, demo/enquiry flows, navigation, recovery and discovery metadata in English and Spanish. It follows the supplied `DESIGN.md`, the selected Journey prototype, ecentic's palette, primary buttons with 6 px corners and secondary controls with 2 px corners, new licensed Nucleo icons, and the user's later request for official provider logos. The existing product film is preserved. The page canvas is off-white (#F8F9FA); gray is reserved for supporting services inside the rails. The blue hero spans the available page width with centered content, subtle rounding, equal 24 px side/top margins (16 px on mobile), and only vertical guides. Guides are suppressed over existing structural grids so borders do not stack. Hero and closing artwork use real ASCII characters instead of dotted bitmap backgrounds.

## Decisions applied

| Decision | Applied choice |
| --- | --- |
| D1 · Navigation | Five mega-menus: Platform, Solutions, AI channels, Integrations and Resources; a Pricing link; Log in and Book a demo on the right. Free-check actions remain in the hero and closing band. |
| D2 · Homepage | H1: “Get the sale when AI does the shopping.” Category eyebrow: “The agentic commerce platform”. The AI shopping search phrase remains in title/description metadata. |
| D3 · Roadmap | Coming soon is limited to Microsoft Merchant Center/Copilot feed, Perplexity simulations and merchant feed, Amazon Shop Direct, ChatGPT product feed, Google AI Mode checkout onboarding, Stripe Agentic Commerce Suite, Akeneo, Salsify, and direct connectors for BigCommerce, Adobe Commerce, Shopware and Wix. Existing supported exports remain qualified as Via product feed. Interest buttons open short enquiry dialogs. These are roadmap intentions, not live capabilities or delivery dates. |
| D4 · Naming | Marketing says “agent checkout”. UCP remains in developer references and the existing named validator/playground tools. |
| D5 · Logos | The user's later instruction selects official provider marks instead of the brief's text-first default. Eighteen sourced marks cover branded surfaces; original geometry and colors are retained. WooCommerce stays text. Fil Rouge Capital remains a supplied-logo TODO. Generic feed, CSV, address and gateway entries use category icons/text. A mark does not establish a partnership; see [provenance](provider-logo-provenance.md). |
| D6 · Pilot names | No prospect names or logos are published. Pipeline copy describes enterprise retail, travel and flexible workspace by sector. |
| D7 · Spirits finding | Retained anonymously: 88% of 9,699 products had a data fault; the marketplace was named 0 times in 20 questions about two stocked bottles. No revenue figure or customer identity is added. This is supplied research evidence, not a product guarantee. |
| D8 · Pricing | Existing prices and plan limits remain. No homepage price figure; Enterprise is “Custom pilot” and uses the three-step demo request. Existing billing and EU Presence commercial terms are preserved. |
| D9 · Blog | Published posts remain live. Blog is reached through Resources; homepage/Resources feature only hand-written `source=local` posts. The blog index pins those posts while retaining all entries. The current HTTP audit covers 232 localized article URLs. |
| D10 · Operator | Footer reserves the Polish operating-company name as a literal TODO; it contains no street address or telephone. Company details belong on About/Contact. Exact Polish/Delaware entities, registered addresses and the public +355 number remain unconfirmed. Terms/Privacy operator text is unchanged and separately identified for legal correction. |
| D11 · Founder pages | `/yc` and `/techstars` retain Founder deal wording and are noindex, including localized variants. |
| D12 · Travel | Travel and experiences is included. Pilot copy starts from the public site and a supported feed, without claiming an unbuilt booking-system connector. |
| D13 · ChatGPT app | “Sell inside ChatGPT” is Coming soon because app-directory publication has not been established. MCP availability is not publication evidence. |
| D14 · Languages | English and Spanish are implemented. German is outside this release. The last successful catalog check found 8,920 matching keys per locale. |

## Claims, copy and data handling

The [claim-by-claim evidence table](enterprise-claims-audit.md#evidence-table) is part of this delivery record. It identifies the backing source file/function and limits for each capability, followed by [dropped and roadmap claims](enterprise-claims-audit.md#unsupported--roadmap-claims). The practical corrections are:

- Listing Apply generates/publishes title and description from existing facts. Structured-data publishing and Merchant Center sync are separate actions; no invented attributes, GTINs or competitor facts are promised.
- Store scans use ChatGPT, Claude and Gemini; Perplexity's separate Compare/Discovery use is qualified. Brand Visibility is ChatGPT-only. Results are simulations; estimated lift is not measured incremental sales.
- Rescans are requested manually. Tracking describes detected Shopify browser signals. PAYG may use a store-level referral fallback within the configured window; it is not shopper-level or causal attribution.
- Public REST/MCP/CLI interfaces expose their implemented discovery, plan, connection and onboarding functions; they do not export dashboard results or traffic.
- Feed formats, readiness sampling, checkout controls, gateway handoffs and platform eligibility are bounded explicitly. No certification, residency, universal access or autonomous-publishing promise was invented.

The [content audit](enterprise-content-audit.md) records every new-fragment vocabulary hit and every open value by route. Its snapshot covers 26 new EN/ES fragment files: **22 justified vocabulary-bearing strings, zero strict prohibited-phrase hits, zero unconverted instruction-style brackets, and 146 TODO-bearing strings**. The [catalog-hit CSV](enterprise-catalog-hits.csv) separately records inherited product, legal and editorial wording with reasons for retaining it; this broader catalog is not presented as clean new marketing copy.

Enquiries use the existing Resend infrastructure, with validated input, shared rate limiting, transport idempotency and no account/product mutations. `MARKETING_LEAD_EMAIL` optionally overrides the existing `support@ecentic.ai` destination; existing sender and Redis configuration are required. Interest dialogs collect name, work email, company and catalog size. Demo has three steps, review and a separate existing Cal booking link. Verification used fake senders or an explicitly aborted browser POST: **no real enquiry email was sent during tests**. See [marketing enquiries](../integrations/marketing-leads.md).

## Exact permanent redirects

All twelve new redirects return **301** with the exact destination below. Existing developer aliases remain separate. Shopify/WooCommerce FAQs, checkout-control explanations, enterprise multi-store and DPA content were carried into their replacement pages.

| From | To |
| --- | --- |
| `/features` | `/platform` |
| `/how-it-works` | `/platform` |
| `/features/product-listings` | `/platform/fix` |
| `/enterprise` | `/solutions/enterprise` |
| `/platforms/shopify` | `/integrations/shopify` |
| `/platforms/woocommerce` | `/integrations/woocommerce` |
| `/es/features` | `/es/platform` |
| `/es/how-it-works` | `/es/platform` |
| `/es/features/product-listings` | `/es/platform/fix` |
| `/es/enterprise` | `/es/solutions/enterprise` |
| `/es/platforms/shopify` | `/es/integrations/shopify` |
| `/es/platforms/woocommerce` | `/es/integrations/woocommerce` |

Existing `/ucp-validator`, `/ucp-playground`, `/webmcp-scanner`, `/docs`, `/blog`, `/support` and `/ai-instructions` remain reachable. Sitemap and `llms.txt` use the current uncapped published DB blog list. The research template has no public route, navigation link or sitemap entry. Unknown EN/ES paths return real localized HTTP 404 documents, including machine-readable recovery links.

## Verification

| Check | Recorded result | Evidence |
| --- | --- | --- |
| Production build | **7 successful tasks / 7 total**, 18.815s, including the final surface, ASCII, form and screenshot changes. | [Build log](../../output/enterprise-rebuild/checks/build-final.log) |
| Web tests | **542 passed, 0 failed; 1,843 assertions across 30 files.** | [Test log](../../output/enterprise-rebuild/checks/tests-final.log) |
| Root TypeScript | **16 diagnostics before and after**, the same baseline. This command remains failing and is not described as a clean typecheck. | [Before](../../output/enterprise-rebuild/checks/typecheck-before.log), [after](../../output/enterprise-rebuild/checks/typecheck-final.log) |
| Direct web TypeScript | The final direct-app run reports **298 diagnostics**. A newly introduced blog `toSorted` incompatibility was corrected with a copied-array sort; no new diagnostics remain. The two existing index-signature errors in the inherited client-message test remain. This count is distinct from the root Turbo result. | [Final app check](../../output/enterprise-rebuild/checks/web-typecheck-final.log), [channel/source review](../../output/enterprise-rebuild/screenshots/channels-integrations/runtime-review.md#source-checks) |
| Root lint | Blocked by pre-existing nested root Biome configurations under `.claude/worktrees/`. Those unrelated worktrees were not rewritten. | [Root lint log](../../output/enterprise-rebuild/checks/lint-command-final.log) |
| Scoped lint | **159 files, zero errors**, after formatting. **24 warnings** remain; this is not represented as warning-free. | [Scoped log](../../output/enterprise-rebuild/checks/scoped-lint-final.log) |
| i18n | EN/ES key parity passed: **8,920 keys each** at the recorded run. | [Parity log](../../output/enterprise-rebuild/checks/i18n-check.log) |
| HTTP and metadata | 120/120 non-home marketing routes return 200 after rechecks; 12/12 redirects pass. Of 257 additional public targets, 249 return 200 and eight expected redirects, including 232 localized blog URLs. Emitted social images return 200 PNG. | [Trust audit](enterprise-trust-audit.md#verification-and-known-limits), [route audit](../../output/enterprise-rebuild/checks/route-audit.json), [social images](../../output/enterprise-rebuild/checks/home-final-og-images.json) |
| Raw HTML | Required homepage phrases present; new-page prohibited phrase results empty; no footer telephone/address; FAQ/schema and document metadata checked. | [HTML audit](../../output/enterprise-rebuild/html-audit.json) |
| Keyboard and interactions | All five mega-menus: entry focus, arrows, Home/End and Escape/return focus; the progressive-blur navbar participates in document flow and menus push content down, then restore it on close. Mobile sheet, Journey/Before–After tabs, enquiry dialogs, demo review/back/failure and retained film checked. | [Final flow/navigation record](../../output/enterprise-rebuild/final-design/flow-navigation.json), [visual review](../../output/enterprise-rebuild/visual-review-site-audit.md), runtime reviews below |
| Next runtime | Final inspected sessions reported no compilation, configuration or session errors. | [Platform runtime](../../output/enterprise-rebuild/screenshots/platform-solutions/runtime/), [channel runtime](../../output/enterprise-rebuild/screenshots/channels-integrations/runtime/) |

Final logs are copied under `output/enterprise-rebuild/checks/`; screenshots and review manifests are also local evidence. These generated artifacts remain local and are not included in a deployment. Primary source, documentation, provider marks and product screenshot assets are included in the phase commits.

### Final production Lighthouse

These are mobile laboratory runs against the local production server on port **3001**, not deployed field metrics. The [trust audit](enterprise-trust-audit.md#production-lighthouse-verification) and [JSON/HTML reports](/tmp/ecentic-enterprise-rebuild/lighthouse-production/) retain the actual measurements:

| Route | Performance | Accessibility | Best practices | SEO | LCP | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 98 | 100 | 100 | 92 | 1.66s | 0 |
| `/platform/simulate` | 100 | 100 | 100 | 92 | 1.36s | 0 |
| `/integrations` | 100 | 100 | 100 | 92 | 1.35s | 0 |
| `/security` | 100 | 100 | 100 | 92 | 1.35s | 0 |

The 92 SEO scores reflect the localhost origin differing from the intentional production canonical `https://ecentic.ai`. No automated accessibility failures or Lighthouse runtime errors were reported. The homepage meets the brief's <2.5s laboratory LCP target in the final production run.

The final homepage report is [home-release-final.report.json](../../output/enterprise-rebuild/checks/lighthouse/home-release-final.report.json). Performance improved from 74 / 9.33s LCP to **98 / 1.66s LCP**, with zero CLS; FCP is 1.66s and total blocking time 128.5ms. The original film now loads near the viewport, closed interest forms defer their heavy dependencies, and actual ASCII text replaces the artwork image downloads. No film content was removed. See [artwork provenance](enterprise-artwork.md) and [lazy-form verification](../../output/enterprise-rebuild/lazy-interest-forms/README.md).

## Screenshots and visual evidence

All batches cover English and Spanish at **1440 × 1000** and **375 × 812** CSS pixels. They overlap; their counts must not be summed as unique pages.

| Batch | Coverage | Manifest and review |
| --- | --- | --- |
| [Platform and solutions](../../output/enterprise-rebuild/screenshots/platform-solutions/) | 80 captures: 20 routes, including all five pillars, four business pages and eight sectors. | [Manifest](../../output/enterprise-rebuild/screenshots/platform-solutions/manifest.json), [summary](../../output/enterprise-rebuild/screenshots/platform-solutions/summary.json), [review](../../output/enterprise-rebuild/screenshots/platform-solutions/runtime-review.md) |
| [Channels and integrations](../../output/enterprise-rebuild/screenshots/channels-integrations/) | Final 48 captures: 12 routes after the provider-logo and distinct ChatGPT enquiry-label update. Use this batch for those surfaces. | [Manifest](../../output/enterprise-rebuild/screenshots/channels-integrations/manifest.json), [summary](../../output/enterprise-rebuild/screenshots/channels-integrations/summary.json), [review](../../output/enterprise-rebuild/screenshots/channels-integrations/runtime-review.md) |
| [Company, pricing, resources and homepage](../../output/enterprise-rebuild/screenshots/channels-company/) | 108 captures across 27 routes; includes an earlier overlapping channel/integration batch. Current pricing/API and homepage replacements are included. | [Capture results](../../output/enterprise-rebuild/screenshots/channels-company/capture-results.json), [actual image sizes](../../output/enterprise-rebuild/screenshots/channels-company/image-sizes.json), [issues](../../output/enterprise-rebuild/screenshots/channels-company/capture-issues.json), [review](../../output/enterprise-rebuild/visual-review-site-audit.md) |

All final batch checks recorded correct locale/H1 and no horizontal page overflow, unloaded images or runtime error screens. Contact sheets cover every route; detailed inspection sampled representative lower-page sections. These are desktop Chrome responsive checks, not physical-device certification. A 5px pricing overflow was fixed, and API JSON definitions now expand in shared accordions with a bounded scroll area while preserving endpoint anchors.

The long mobile homepages were stitched from viewport captures through the real footer because Chrome repeated content beyond approximately 16,384px in oversized screenshots. Fixed overlays appear once instead of in every tile. Some development captures show Next's indicator and the existing chat launcher. The final rendered-background hero check passes AA in all four views: **4.950:1** minimum on both desktop locales, **5.141:1** on English mobile and **5.076:1** on Spanish mobile. [Final contrast evidence](../../output/enterprise-rebuild/grid-audit/hero-aa-contrast.json) is a focused hero check, not a full manual accessibility certification. The [grid audit](../../output/enterprise-rebuild/grid-audit/review.md) records zero duplicate structural junction coordinates and zero horizontal overflow in the four homepage views.

The EN/ES overview screenshots show the actual `OverviewCharts` component with explicitly labeled sample data. Eight further screenshots show the current Connect integrations panel, Fix publishing history, Sell validator initial state and Track referral chart. They are served from `apps/web/public/screenshots/enterprise-{connect,fix,sell,track}-sample{,-es}.png` with exact intrinsic dimensions and localized sample/initial-state captions. No customer outcome, completed checkout or measured lift is implied. All eight were visually reviewed; the 16 affected pillar-page views were refreshed with zero overflow, unloaded images, metadata mismatches or runtime errors. Temporary capture routes were archived and removed. See [pillar screenshot provenance](pillar-screenshot-provenance.md) and [artwork provenance](enterprise-artwork.md).

The last visual refinement is recorded under [final-design previews](../../output/enterprise-rebuild/final-design/), covering the inset blue surface, actual ASCII characters, progressive navbar blur and final primary/secondary button radii. The [surface audit](../../output/enterprise-rebuild/surface-audit/review.md) checks off-white core content and rail-confined gray services. Older blog/legal wrappers were updated for the in-flow navbar and off-white canvas without editing their content. Earlier batch images remain useful for page coverage but precede those shared visual refinements.

## Facts still needed before launch

These are missing factual inputs, not a request to stop authorized implementation. The [complete route-by-route TODO inventory](enterprise-content-audit.md#open-values-by-route) remains authoritative; the table below groups the work needed to replace those literal placeholders.

| Area / pages | Facts or material needed |
| --- | --- |
| Operator · footer, About, Contact, Security, legal | Exact Polish and Delaware legal names/registered addresses, public contact number, and the operator corrections in unchanged EN/ES legal fragments at lines 62, 157, 161 and 189. See [legal references](enterprise-trust-audit.md#legal-text-left-unchanged). |
| Security and procurement | Deployed providers/regions, TLS minimum and encryption at rest, production access/MFA, backups/recovery, account-specific AI retention/training terms, approved DPA/request route, full contracted sub-processors/locations, and available questionnaire/security materials. |
| Public contacts and enquiry delivery | Confirm monitored privacy/security/press mailboxes and the production Resend sender/destination and Redis configuration. Real mailbox delivery was intentionally not exercised with test submissions. |
| Enterprise and agency pilots | Confirm bespoke question/model method and proposed run counts, weekly customer time, delivery/report-sharing formats, account setup, NDA policy, commercial terms and compliance roadmap. No unverified staffing, duration or SLA promise is supplied. |
| Partner programme | Approved benefits/terms by track, meeting duration, access/materials/onboarding, joint-selling process and whether joining is free. |
| DUA story | Approved starting position, actual interventions/products/fields/dates, and explanation of the April start before the Shopify app's 20 May launch. The supplied 12% result remains visits, not sales or causality. |
| Marks and people | Official Fil Rouge Capital file, approved founder portraits, and ownership of the selected provider-mark usage. Existing official marks and their checks are documented in [logo provenance](provider-logo-provenance.md) and [source hashes](provider-logo-sources.json). |
| Channel/roadmap status | Confirm D3 build priorities and actual ChatGPT app-directory publication before changing status to Live. Any stronger plugin publication, order-tagging or deployed gateway claim needs the corresponding deployment evidence. |
| Sector and language review | Validate sector-specific required attributes for the intended markets/products against the dated primary sources on the pages; review Spanish editorial wording where a native read is needed. No sector compliance certification is asserted. |
| Research, kept unpublished | Complete products/categories, question selection, allocation/runs, exact model versions, research dates, simulated-purchase definition, supported extra findings, reviewed PDF and publication month. Keep the template off public navigation/sitemap until complete. |
| Retained product film | Supply a verified transcript/caption track. The video binaries are unchanged; captions were not fabricated. |

The unchanged public `/compare` client application still lacks the server-rendered H1/canonical/OG treatment noted in the trust audit. Existing Spanish legal metadata length findings are retained for the separate legal/content pass. Neither is concealed by altering product/auth/legal behavior to make this marketing audit pass.

## Commit map

| Phase | Local commit | Scope |
| --- | --- | --- |
| 1 | `599f3b9c` | Enterprise design foundation |
| 2 | `150a0aac` | Navigation and footer |
| 3 | `053dd379` | Journey homepage, provider logos and shared forms |
| 4 | `117c9304` | Platform overview and five pillars |
| 5 | `6efe43d6` | Enterprise, business and sector solutions |
| 6 | `78ed2d20` | AI channels and integration directory |
| 7 | `17b3fea5` | Pricing, trust, company, resources and demo journeys |
| 8 | `b7f0a690` | Redirects, discovery metadata and social images |
| 9 | Commit containing this delivery record: `feat(marketing): finish enterprise visuals and verification` | Final ASCII/surface/button refinements, performance, genuine product captures and verification |

Final checks: build 7/7, 542 passing tests, 8,920 matching EN/ES keys, 159 scoped lint files with zero errors, unchanged 16-error root TypeScript baseline, and homepage production Lighthouse 98/100/100/92 with 1.66s LCP and zero CLS. The final revision is the commit containing this record; earlier phase hashes are listed above.

No push or deployment is part of this completed local delivery work.
