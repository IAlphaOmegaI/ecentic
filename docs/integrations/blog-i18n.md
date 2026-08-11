# Blog i18n (English + Spanish)

ecentic serves the UI in **English** (default, no URL prefix) and **Spanish** (`/es/...`) via `next-intl`.

Locale for Server Components is resolved with `next/root-params` in `apps/web/src/i18n/request.ts`. The root layout is `app/[locale]/layout.tsx` (no `app/layout.tsx`). Do not call `setRequestLocale`.

Because root params reach any depth of the tree, pages and components **do not take `locale`**:

- Read it with `getLocale()` (from `next-intl/server`) only where a value is actually needed — `localizePath`, JSON-LD, `Intl.*` formatting.
- Use the namespace form `getTranslations("pricing")`. The `getTranslations({ locale, namespace })` override exists for **Server Actions and Route Handlers only**, where `next/root-params` throws.
- Do not re-validate the segment per page. `request.ts` calls `notFound()` on an unknown locale, so a page-level `hasLocale` guard is dead code.
- `params` stays only for a page's *own* dynamic segments (`blog/[slug]` destructures `slug`, not `locale`).

Metadata route files (`opengraph-image.tsx`) compile to Route Handlers, so they still read `locale` from `params`.

## Locales

| Locale | URL prefix | Content source |
|--------|------------|----------------|
| `en` | none (`/blog/foo`) | `blog_post` `locale=en` (BabyLoveGrowth webhook or editorial). |
| `es` | `/es` (`/es/blog/foo`) | `blog_post` `locale=es` (same slug). Fall back to EN row until Spanish is written. |

Same slug is shared across locales. Spanish copies are **not** published back into BabyLoveGrowth.

Index, tags, sitemap, `llms.txt`, OG images, and `generateStaticParams` / `Blog.resolve` read **Postgres only** — never live BabyLoveGrowth during prerender (multi-worker SSG would 429 their 2 req/s cap). Pages are fully static for every slug × locale; the webhook (or editorial write) purges `revalidateTag("blog")` so ISR regenerates from stored rows.

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

BabyLoveGrowth CMS client stays in `babylovegrowth.ts` for optional admin/CMS reads. Public blog routes do not call it — catalog and bodies come from Postgres after the webhook writes.

### Locale switcher

Navbar language select calls `router.replace(pathname, { locale })` (next-intl). Same path, other locale — `/blog/foo` ↔ `/es/blog/foo`. Cookie `NEXT_LOCALE` then keeps that choice on bare `/blog/...` URLs.

## Auto-translate (Azure)

When BabyLoveGrowth publishes an English article, configure their **Webhook** integration:

1. Settings → Publishing → Webhook → Connect
2. URL: `https://<your-host>/api/webhooks/babylovegrowth` — **apex host, no `www`**.
   `www.ecentic.ai` answers `POST` with a `307` to the apex; a sender that does
   not follow redirects on `POST` drops the delivery silently and the post never
   reaches Postgres. (Same failure the deals-redemption webhook hit.)
3. Bearer token: value of `BABYLOVEGROWTH_WEBHOOK_SECRET`
4. Enable automatic publish

The payload is BabyLoveGrowth's published-article shape, which is **snake_case**
for `meta_description`, `hero_image_url` and `created_at` (camelCase for
`seedKeyword` / `keywords` / `languageCode`). `publishPayloadSchema` accepts both
spellings and normalizes them; reading only camelCase still parsed — those fields
are optional — and silently stored an empty description, no hero image, and
today's date as `publishedAt`.

The handler acknowledges immediately (200), then `Blog.ingestPublish`:

1. Upserts `blog_post` `locale=en` from the payload (same slug) — **always**, even if step 2 fails
2. Translates meta in one Azure call, then HTML in chunks (script/style blocks preserved; Markdown forbidden) so long posts are not truncated
3. Upserts `blog_post` `locale=es` when translate succeeds (EN-only is still a success; ES failure is logged)
4. Purges the `blog` cache tag so EN/ES static pages regenerate (ISR)

Local / editorial posts: write both `en` and `es` rows when you publish (same slug). Editorial Spanish should use translated `sections` (same shape as EN); BLG Spanish uses `contentHtml`.

### Reconcile cron (webhook backstop)

The webhook is the only write path for BLG posts, so one dropped delivery leaves
a post permanently absent from Postgres — a 404 with nothing to notice it.
`/api/cron/blog` (every 15 min, `Cron.reconcileBlogCatalog` → `Blog.reconcileCatalog`)
diffs BLG's published catalog against stored rows and ingests whatever is missing
either locale, through the same `ingestPublishCore` the webhook uses.

- Reads BLG through `listArticlesFresh` / `getArticleFresh` — uncached, because
  the `"use cache"` readers hold for days and would hide the very publish this
  job exists to catch.
- `limit: 1` per tick: one ingest Azure-translates a whole article. Posts with no
  rows at all sort ahead of posts missing only ES, so a failing translation
  cannot starve a brand-new post out of the site.
- Handoff via `after()`, like `/api/cron/drain`, so the tick returns inside the
  scheduler's window while the ingest runs under `maxDuration`.

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
