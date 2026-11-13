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
- [WebMCP store scans](./integrations/webmcp.md) — free public and dashboard source scans, detection evidence, current browser APIs, and runtime verification limits
- [Google UCP — agentic checkout guide](./integrations/google-ucp.md) — merchant checklist for checkout on Google AI surfaces + which steps ecentic automates
- [Hosted UCP — woo-ucp conformance](./integrations/woo-ucp-conformance.md) — how the backend UCP surface (`apps/web/src/server/app/ucp/`) maps to the woo-ucp reference, the thin-plugin bridge contract, known divergences, and deployment notes
- [Google OAuth verification — submission pack](./integrations/google-oauth-verification.md) — scope justification, console config, reviewer access + test credentials, demo-video shot list, and the privacy-policy row mapping for the `content` scope review
- [Website and blog localization](./integrations/blog-i18n.md) — seven locales, reviewed translation jobs, publication and backfill
- [Translation workflow and quality](./integrations/translation-quality.md) — locale register, protected content, catalog generation and targeted review

### If you are writing or publishing a blog post

- [Blog post format](../apps/web/content/blog/README.md) — one markdown file per post in `apps/web/content/blog`, frontmatter, body rules, `bun run blog:check`
- [Blog voice](./context/seo/blog-voice.md) — how posts are written; the same text as Okara's article settings

### If you are planning billing or Shopify App Store pricing

- [Pricing + Shopify Billing API](./tasks/shopify-billing-pricing.md) — how Partner Dashboard plans, Billing API charges, and ecentic entitlements should align

### If you are working on social link previews

- [Social preview images](./tasks/social-preview-images.md) — image routing, metadata defaults, and crawler checks

### If you are working on AI-surface scraping / capture

- [LLM surface scraping plan](./tasks/llm-surface-scraping.md) — ScrapeLLM adapter, capture envelope, `/dev/llm-scraping` sandbox, phased rollout to cycles + sentinel

### If you are implementing or refactoring code

- [Agent checklist](./agents/AGENTS-checklist.md)
- [Code style rules](./agents/AGENTS-style.md)
- [Component patterns](./agents/AGENTS-components.md)
- [Next.js patterns](./agents/AGENTS-nextjs.md)
- [Package usage rules](./agents/AGENTS-packages.md)

### If you are building UI

- [DESIGN.md — complete design system](./context/design.md) — canonical guide, also available at the repository root; shared tokens, composition, interactions and verification contracts
- [ecentic-art skill](../.agents/skills/ecentic-art/SKILL.md) — complete tonal ASCII and custom Hairline guidance, subject mappings and engine contract
- [ecentic-public-pages skill](../.agents/skills/ecentic-public-pages/SKILL.md) — complete public route-family recipes and factual scope limits
- [Design checks C1–C6](./marketing/design-checks.md) — source/runtime checks, visual review states, exclusions and reporting limits
- [Design review history](./marketing/design-review-history.md) — complete source ledger and decisions that supersede earlier experiments
- [Enterprise website rebuild delivery](./marketing/enterprise-rebuild.md) — decisions, claim/TODO audits, redirects, verification, screenshots and remaining launch facts
- [Marketing review follow-ups](./marketing/review-followups.md) — content awaiting the user's final input, including the illustrative Enterprise pilot brief
- [Launch information questionnaire](./marketing/launch-questionnaire.md) — 15 grouped owner inputs, with known facts prefilled and optional omissions identified
- [Launch content audit](./marketing/launch-content-audit.md) — current pending-copy inventory, public claim defects, engineering work and release acceptance checks
- [Launch decisions](./marketing/launch-decisions-2026-11-12.md) — accepted questionnaire answers and subsequent company details; supersedes blank historical fields
- [Launch release](./marketing/launch-release-2026-11-12.md) — completed work, verification and production deployment prerequisites
- [Credential encryption and account lifecycle](./integrations/credential-encryption.md) — key provisioning, backfill, rotation, rollback and deletion boundaries
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
