# Public design propagation — 10 November 2026

This pass addresses the four browser annotations on v6. All earlier commits and review PDFs remain preserved. Visual inspection stays in subagents.

| Comment | Applied direction |
| --- | --- |
| 1 | Use schematic diagrams throughout the five-stage product journey. Remove its bottom tag/text strips and ASCII artwork. |
| 2 | Replace the segmented selector with a connected roadmap showing all five milestones, their explanations and actions. |
| 3 | Color percentage charts by outcome using semantic success/warning/error tokens. Invert the score for failure/missing-data rates, preserving all labels, values, source disclosures, scale and rounded tracks. |
| 4 | Update the canonical [design guide](../context/design.md), the shared public templates and the dedicated route layouts. WooCommerce and all other public page families inherit the shared design. |

## Shared public system

The public route inventory includes 48 page templates: 24 use `MarketingPage`, 18 use `ContentPageLayout`, three use `EditorialLayout`, two are direct legal pages, and one is the homepage. All now use `MarketingShell`, directly or through their layout. Dynamic integration, platform, channel, solution and article pages inherit their template changes for every slug and locale.

Six legacy routes redirect to current destinations in both locales: features/how-it-works to platform, product listings to platform/fix, enterprise to solutions/enterprise, and the old Shopify/WooCommerce platform URLs to their integration pages. Their rendered destinations use the shared system; retired body components are not revived.

- Product, integration, platform, channel, solution and company pages use the shared inset blue hero with a 100dvh minimum height, equal 12/8px margins, native actions and centered vertical rails.
- Legal, reference and tool entry pages use an explicit compact light hero where direct access to content is more useful.
- Shared headings, muted copy, section spacing, provider marks, grids, FAQs, navigation and footer follow the current landing direction.
- The desktop navbar starts at 1281px to keep Spanish labels on one line. Portalled mobile navigation explicitly respects reduced motion.
- The old page banner becomes an adapter of `MarketingHero`; the dedicated content/editorial layouts no longer maintain separate navigation and footer implementations.
- Dashboard, authentication and onboarding retain their own documented density and behavior. Product facts, prices, translations, publication gates and tool actions are preserved.

The guide's conflicting older light-hero, three-step loop, flat-primary-button, radius, footer and pricing-grid recipes are replaced with the current direction. The original product video and useful character artwork outside the product roadmap remain intact.

## Review scope

Review the homepage roadmap and chart colors, `/integrations/woocommerce`, a platform and AI-channel detail page, pricing, resources, a tool, documentation, blog and legal pages. Check both locales and phone/desktop widths. Runtime coverage and visual samples are recorded separately; the exhaustive sitemap screenshot pack remains deferred.
