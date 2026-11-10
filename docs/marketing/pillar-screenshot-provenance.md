# Pillar screenshot provenance

Captured 10 November 2026 from the running Next.js app at localhost:3000. These are browser renders of the existing product components, with explicit sample labels. They are not merchant screenshots or customer results. The underlying product components were not modified.

## Components

| Pillar | Component | SHA-256 at capture |
| --- | --- | --- |
| Connect | `apps/web/src/app/[locale]/(main)/dashboard/settings/_components/settings/integrations-section.tsx` | `6bb704c570f9c98c907b6175abce70adfa2d211797d3b18d8bf9ae30c4bf13a6` |
| Fix | `apps/web/src/app/[locale]/(main)/dashboard/[store]/optimize/_components/optimize-client.tsx` | `fa00f60954de9ed8852e9e9d7cc9c26911b7c35ab6d049d2b67f86e6c1e1ed29` |
| Sell | `apps/web/src/app/[locale]/(main)/dashboard/[store]/ucp/_components/ucp-advanced-validator.tsx` | `072b6ab22207aaded60f5f7b4eedc39179601717b144ffb0013c6080c68a1e1f` |
| Track | `apps/web/src/app/[locale]/(main)/dashboard/_components/agent-visits-chart.tsx` | `0be4172f9571d84904a35b7a6cfcc9af378f78f4cc56fbdbe4741597b1c95a18` |

## Sample inputs and limits

- **Connect:** `IntegrationsSection` renders three in-memory store records with reserved `.example` domains: Shopify, WooCommerce, and a catalog feed. No account was connected, sync requested, or Google Merchant action run. Shopify's Merchant Center row is disconnected; unsupported platform rows retain the component's Coming soon treatment.
- **Fix:** `OptimizeClient` renders its existing Published tab with two sample listing-history records, `Sample wireless headphones` and `Sample desk lamp` (localized in Spanish). Win-rate-before, win-rate-after, and estimated-lift fields are null. The screenshot contains the publishing queue and an explicit sample label. It excludes the unrelated optimization forecast panel. No approve, publish, dismiss, or product link was activated. The only UI action was selecting the Published tab.
- **Sell:** `UcpAdvancedValidator` renders its initial empty state. No domain check, authenticated request, checkout, payment, or platform approval occurred. The caption states this limit. This is a validation interface screenshot, not evidence of a successful external transaction.
- **Track:** `AgentVisitsChart` receives seven illustrative daily samples for the three data series supported by its props. Values intentionally fluctuate; they represent no merchant, measured lift, or customer outcome. The original component's four-label legend is unchanged.

The full product detail optimization tab was not used because its mount effect invokes authenticated `Audit.auditProduct`. Its state cannot be truthfully demonstrated through a passive unauthenticated fixture. Published history is a genuine component view that can be captured without those calls.

The public validator was not used because its existing Reveal checklist did not settle reliably in the isolated fixture. The dashboard advanced validator renders a passive initial form without this dependency. The fixture does not change existing product behavior or copy.

## Method and assets

Temporary `marketing-capture/{connect,fix,sell,track}` routes imported the components and supplied only in-memory props. A client hydration marker ensured the page had settled. Fixture framing kept the sample label visible; the Fix view was scrolled to publishing history. The HTML and controls inside the product components were left intact. Browser captures were cropped to the fixture bounds; pixels inside the product UI were not edited.

Archived fixture and capture evidence:

- `output/enterprise-rebuild/pillar-screenshot-fixture.tsx.txt`
- `output/enterprise-rebuild/pillar-screenshot-ready.tsx.txt`
- `output/enterprise-rebuild/pillar-screenshot-route.tsx.txt`
- `output/enterprise-rebuild/pillar-fixtures/` (raw and cropped captures, command results, runtime checks)

The temporary routes were removed after capture. Production pages load only the PNG assets. English and Spanish captions and alt text are in `apps/web/messages/fragments/enterprisePlatform.{en,es}.json` under `enterprisePlatform.screenshots`.

## Final assets

| Locale | Pillar | Asset | Pixels |
| --- | --- | --- | --- |
| en | connect | `apps/web/public/screenshots/enterprise-connect-sample.png` | 1280 × 673 |
| en | fix | `apps/web/public/screenshots/enterprise-fix-sample.png` | 1280 × 513 |
| en | sell | `apps/web/public/screenshots/enterprise-sell-sample.png` | 1280 × 371 |
| en | track | `apps/web/public/screenshots/enterprise-track-sample.png` | 1280 × 559 |
| es | connect | `apps/web/public/screenshots/enterprise-connect-sample-es.png` | 1280 × 673 |
| es | fix | `apps/web/public/screenshots/enterprise-fix-sample-es.png` | 1280 × 513 |
| es | sell | `apps/web/public/screenshots/enterprise-sell-sample-es.png` | 1280 × 376 |
| es | track | `apps/web/public/screenshots/enterprise-track-sample-es.png` | 1280 × 559 |

All eight cropped images were visually reviewed. Each retains the sample/initial-state label. The Fix screenshot contains only publishing-history UI and no forecast, lift, or customer-performance figure. Asset hashes are recorded in `output/enterprise-rebuild/pillar-fixtures/assets.json`.


## Runtime result

All 16 affected public-page views (four pillars × English/Spanish × desktop/mobile) passed the scoped DOM checks after wiring: expected H1 and locale, matching metadata, no horizontal overflow, loaded screenshot assets, and no browser errors. The platform/solutions manifest remains 80 valid views. Next compilation reported no issues. A missing CSS chunk briefly surfaced during concurrent HMR in stale sessions, including one Track capture. Fresh navigation in an isolated browser resolved it; the final capture manifest has no runtime errors. The transient log is archived as `output/enterprise-rebuild/pillar-fixtures/track-hmr-transient.json`.
