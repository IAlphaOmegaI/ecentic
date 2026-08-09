# Blog i18n (English + Spanish)

ecentic serves the UI in **English** (default, no URL prefix) and **Spanish** (`/es/...`) via `next-intl`.

Locale for Server Components is resolved with `next/root-params` in `apps/web/src/i18n/request.ts`. The root layout is `app/[locale]/layout.tsx` (no `app/layout.tsx`). Do not call `setRequestLocale`.

## Locales

| Locale | URL prefix | Content source |
|--------|------------|----------------|
| `en` | none (`/blog/foo`) | `blog_post` `locale=en` only (webhook + `blog:backfill-english`). |
| `es` | `/es` (`/es/blog/foo`) | `blog_post` `locale=es` (same slug). Fall back to EN row until Spanish is written. |

Same slug is shared across locales. Spanish copies are **not** published back into BabyLoveGrowth.

Index, tags, sitemap, `llms.txt`, OG images, and `generateStaticParams` / `Blog.resolve` read **Postgres only** — never live BabyLoveGrowth during prerender (multi-worker SSG would 429 their 2 req/s cap). Pages are statically generated for every slug × locale and ISR'd via `revalidateTag("blog")` when the webhook (or editorial) writes rows.

## Database

`blog_post` columns:

- `locale` — `en` | `es`
- `source` — `local` | `blg`
- `externalId` — BabyLoveGrowth article id when `source=blg`
- `contentHtml` — HTML body for BLG-sourced / translated articles

Unique on `(slug, locale)`.

## Server module

All blog server logic lives in `apps/web/src/server/app/blog.ts`:

- `"use cache"` reads for public list/get via repository `find` (tagged `blog` for ISR)
- plain `resolve` / `listCatalogSlugs` for RSC / `generateStaticParams` (no `withContext` / `headers()`)
- `generateStaticParams` prerenders **every slug × en/es** (Cache Components — do not set `dynamicParams`)
- Public pages use `resolve` only — no Azure on the render path
- `Blog.ingestPublish` (webhook) upserts **EN + ES** and purges the `blog` tag

BabyLoveGrowth CMS client stays in `babylovegrowth.ts` (external API only). All BLG HTTP is serialized (~550ms gap, max 2 req/s). Soft-failure `null` from transport errors is **not** returned for per-slug reads (that used to cache for days and 404 English while Spanish still served from Postgres) — failures rethrow after 429 retries.

### English backfill (one-shot)

Older posts published before the webhook wrote EN rows still leave the catalog empty in Postgres. Run once against production:

```bash
cd apps/web
# point DATABASE_URL at production, then:
bun run blog:backfill-english -- --yes
# optional: --limit=20 --max-rounds=100
```

Needs `DATABASE_URL` + `BABYLOVEGROWTH_BLOG_API_KEY`. No Azure. The script:

1. Upserts **summary/card** rows from BLG `listArticles` (one call) for any missing EN slug
2. Fills full HTML via rate-limited `getArticleBySlug` for thin bodies

Then redeploy (or purge `blog`) so static `/blog/*` pages read Postgres.

### Locale switcher

Navbar language select calls `router.replace(pathname, { locale })` (next-intl). Same path, other locale — `/blog/foo` ↔ `/es/blog/foo`. Cookie `NEXT_LOCALE` then keeps that choice on bare `/blog/...` URLs.

## Auto-translate (Azure)

When BabyLoveGrowth publishes an English article, configure their **Webhook** integration:

1. Settings → Publishing → Webhook → Connect
2. URL: `https://<your-host>/api/webhooks/babylovegrowth`
3. Bearer token: value of `BABYLOVEGROWTH_WEBHOOK_SECRET`
4. Enable automatic publish

The handler acknowledges immediately (200), then `Blog.ingestPublish`:

1. Upserts `blog_post` `locale=en` from the payload (same slug) — **always**, even if step 2 fails
2. Translates title / meta / HTML to Spanish with Azure (`AI.generate`, gpt seat)
3. Upserts `blog_post` `locale=es` when translate succeeds (EN-only is still a success; ES failure is logged)
4. Purges the `blog` cache tag so EN/ES static pages regenerate (ISR)

Local / editorial posts: write both `en` and `es` rows when you publish (same slug).

## Env

```
BABYLOVEGROWTH_BLOG_API_KEY=
BABYLOVEGROWTH_BLOG_API_URL=          # optional
BABYLOVEGROWTH_WEBHOOK_SECRET=
# Azure gpt seat — same as the rest of the app
AZURE_RESOURCE_NAME=
AZURE_API_KEY=
AZURE_DEPLOYMENT_GPT=                 # or legacy AZURE_DEPLOYMENT_GPT4O
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
