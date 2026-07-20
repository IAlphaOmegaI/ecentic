# Agentic Structured Data — Theme App Extension

Renders the `ucp.*` metafields Ecentic writes into real storefront HTML as
`<script type="application/ld+json">` tags — the step that makes structured
data visible to crawling AI agents (OAI-SearchBot, PerplexityBot, Googlebot).
When the `ucp.structured_data` metafield is missing, the block falls back to
deterministic JSON-LD built from live product data, so markup can never
disagree with the page (Google deprioritizes feed/markup mismatches).

## Deploying

The app is already CLI-linked via `apps/web/shopify.app.toml`, so from
`apps/web/`:

```bash
shopify app deploy
```

Each merchant then enables the **Agentic structured data** app embed once, in
**Online Store → Themes → Customize → App embeds** — surface this in
onboarding.

## Duplicate-markup caution

Many themes already emit schema.org `Product` JSON-LD. The block's settings
expose Product and Organization markup as independent toggles — merchants
whose theme already outputs Product markup should keep that toggle off.
