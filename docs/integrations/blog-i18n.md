# Blog i18n (English + Spanish)

ecentic serves the UI in **English** (default, no URL prefix) and **Spanish** (`/es/...`) via `next-intl`.

## Locales

| Locale | URL prefix | Content source |
|--------|------------|----------------|
| `en` | none (`/blog/foo`) | BabyLoveGrowth API + local `blog_post` rows with `locale=en` |
| `es` | `/es` (`/es/blog/foo`) | **Same catalog / slugs as English.** Prefer `blog_post` `locale=es`; if missing, translate from the EN source on first request and store the row. Falls back to EN content if translate fails so the route never 404s for a real post. |

Same slug is shared across locales. Spanish copies are **not** published back into BabyLoveGrowth.

## Database

`blog_post` columns:

- `locale` — `en` | `es`
- `source` — `local` | `blg`
- `externalId` — BabyLoveGrowth article id when `source=blg`
- `contentHtml` — HTML body for BLG-sourced / translated articles

Unique on `(slug, locale)`.

## Server module

All blog server logic lives in `apps/web/src/server/app/blog.ts`:

- `"use cache"` Drizzle reads for public list/get
- plain `resolve` / `listCatalogSlugs` for RSC / `generateStaticParams` (no `withContext` — that awaits `headers()` for Sentry and breaks prerender)
- `withContext` / `withCron` for translate, ensureSpanish, ingest, backfill
- cache purges via `after(() => revalidateTag(...))` so Spanish writes never call `revalidateTag` during render

BabyLoveGrowth CMS client stays in `babylovegrowth.ts` (external API only).

## Auto-translate (Azure)

When BabyLoveGrowth publishes an English article, configure their **Webhook** integration:

1. Settings → Publishing → Webhook → Connect
2. URL: `https://<your-host>/api/webhooks/babylovegrowth`
3. Bearer token: value of `BABYLOVEGROWTH_WEBHOOK_SECRET`
4. Enable automatic publish

The handler acknowledges immediately (200), then `Blog.ingestPublish` translates title / meta / HTML to Spanish with Azure (`AI.generate`, gpt seat) and upserts `blog_post` (`locale=es`, same slug). A first `/es/blog/[slug]` hit schedules `Blog.ensureSpanish` in `after()` (EN content is served immediately if the ES row is still missing).

### Backfill

For articles published before the webhook was connected:

```bash
curl -X POST https://<your-host>/api/cron/blog-translate-backfill \
  -H "Authorization: Bearer $CRON_SECRET"
```

Runs `Blog.translateMissingSpanish` (BLG + local EN posts lacking an ES row).

## Env

```
BABYLOVEGROWTH_BLOG_API_KEY=
BABYLOVEGROWTH_BLOG_API_URL=          # optional
BABYLOVEGROWTH_WEBHOOK_SECRET=
# Azure gpt seat — same as the rest of the app
AZURE_RESOURCE_NAME=
AZURE_API_KEY=
AZURE_DEPLOYMENT_GPT=
```

## UI messages

Catalogs live in `apps/web/messages/{en,es}.json`. Public chrome and marketing pages are wired through `next-intl` (`nav`, `footer`, `home`, `pricing`, `resources`, `howItWorks`, `features`, `productListings`, `enterprise`, `shopify`, `woocommerce`, `demo`, `support`, `legal`, `blog`, auth, dashboard shell, cookie consent, plus compare/UCP/partner landing shells). Optional fragment files under `apps/web/messages/fragments/` can be merged with `bun run` of `apps/web/scripts/merge-i18n-fragments.ts` when present.

### TypeScript (next-intl AppConfig)

`apps/web/global.ts` augments `next-intl` `AppConfig` with `Locale` and `Messages` from `messages/en.json`. The plugin’s `experimental.createMessagesDeclaration` regenerates `messages/en.d.json.ts` on `next typegen` / `next dev` (gitignored) so ICU argument literals stay precise.

- String copy: `getTranslations` / `useTranslations` + `translate("key")` (typed keys).
- Structured arrays/objects: `getMessages()` / `useMessages()` and read `messages.<namespace>.…` — **do not use `t.raw()`** for this (it stays `any` in next-intl even with AppConfig).

### Translation key conventions

1. **camelCase + dots** — All key segments are camelCase; hierarchy uses dots (`signIn.fields.email.label`). Top-level namespaces are camelCase (`nav`, `signIn`, `cookieConsent`), not PascalCase.
2. **Namespace per route/feature** — e.g. `signIn`, `forgotPassword`, `home`, `blog`, `dashboard`, `general` (shared chrome only).
3. **Actions are role-based** — Prefer `action.primary` / `action.secondary` / `action.tertiary` / `action.quaternary` over verb keys (`submit`, `cancel`, `installNow`). Use `quaternary` for the fourth / paired slot (e.g. close when primary is open, back when primary is continue) — never `primaryInverse`.
4. **States** — Group under `states` (`states.pending.primary`, `states.success.primary`, `states.empty.primary`). Errors under `{feature}.error.*`.
5. **Fields** — `{feature}.fields.{name}.label` (and related field keys as needed).
6. **Legal / long-form** — When extracted, use `legal.termsAndConditions.sections.{n}.title|content` (numeric section ids) so the UI can loop over sections.

Examples: `nav.action.primary`, `nav.menu.action.quaternary`, `cookieConsent.action.secondary`, `blog.states.empty.primary`, `signIn.fields.email.label`, `dashboard.nav.overview`.
