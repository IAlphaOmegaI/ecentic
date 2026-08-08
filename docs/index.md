# ecentic Docs Hub

Central navigation for product context, agent rules, and package/component documentation.

## Start Here

### If you need project context first

- [Product + architecture handoff](./context/idea.md)
- [AI agent commerce strategy](./context/strategy.md)
- [Shopify app listing reference](./context/shopify.md)
- [Agent visibility — ingestion paths and measurement](./context/agent-visibility.md) — which surfaces read what, feed/JSON-LD/catalog-rank modules

### If you are working on store integrations or hosted UCP

- [Store integrations progress tracker](./integrations/overview.md)
- [Hosted UCP — woo-ucp conformance](./integrations/woo-ucp-conformance.md) — how the backend UCP surface (`apps/web/src/server/app/ucp/`) maps to the woo-ucp reference, the thin-plugin bridge contract, known divergences, and deployment notes
- [Blog i18n (EN/ES + Azure translate)](./integrations/blog-i18n.md) — next-intl locales, `blog_post` locale columns, BabyLoveGrowth webhook → Azure Spanish translations

### If you are planning billing or Shopify App Store pricing

- [Pricing + Shopify Billing API](./tasks/shopify-billing-pricing.md) — how Partner Dashboard plans, Billing API charges, and ecentic entitlements should align

### If you are working on AI-surface scraping / capture

- [LLM surface scraping plan](./tasks/llm-surface-scraping.md) — ScrapeLLM adapter, capture envelope, `/dev/llm-scraping` sandbox, phased rollout to cycles + sentinel

### If you are implementing or refactoring code

- [Agent checklist](./agents/AGENTS-checklist.md)
- [Code style rules](./agents/AGENTS-style.md)
- [Component patterns](./agents/AGENTS-components.md)
- [Next.js patterns](./agents/AGENTS-nextjs.md)
- [Package usage rules](./agents/AGENTS-packages.md)

### If you are building UI

- [Design system + visual build guide](./context/design.md) — single source of truth for tokens, type, components, motifs, and page recipes
- [Web components index](./web/index.md)
- [Shared packages index](./shared/index.md)

---

## Package Docs

| Package | Description |
|---------|-------------|
| [Web](./web/index.md) | React components for web applications |
| [Shared](./shared/index.md) | Shared utilities and packages |

---

## Common Destinations

### Web Components

- [Button](./web/button.md)
- [Form](./web/form.md)
- [Dialog](./web/dialog.md)
- [Select](./web/select.md)
- [Table](./web/table.md)
- [Tabs](./web/tabs.md)
- [All web components](./web/index.md)

### Shared Packages

- [Utils](./shared/utils/index.md)
- [Icons](./shared/icons/index.md)
- [Data Table](./shared/data-table/index.md)
- [Inferred Form](./shared/inferred-form/index.md)
- [Phone](./shared/phone/index.md)

---

## Install Packages

```bash
bun add @zenncore/web @zenncore/utils @zenncore/icons @zenncore/phone @zenncore/data-table @zenncore/inferred-form
```
