# Blog i18n (English + Spanish)

ecentic serves the UI in **English** (default, no URL prefix) and **Spanish** (`/es/...`) via `next-intl`.

Locale for Server Components is resolved with `next/root-params` in `apps/web/src/i18n/request.ts`. The root layout is `app/[locale]/layout.tsx` (no `app/layout.tsx`). Do not call `setRequestLocale`.

## Locales

| Locale | URL prefix | Content source |
|--------|------------|----------------|
| `en` | none (`/blog/foo`) | BabyLoveGrowth API + local `blog_post` rows with `locale=en` |
| `es` | `/es` (`/es/blog/foo`) | **Same catalog / slugs as English.** Prefer `blog_post` `locale=es`. Pages are statically generated for every slug (and ISR'd via `revalidateTag("blog")` when webhook/backfill writes). Missing ES rows fall back to EN until translation exists, then regenerate. |

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

- `"use cache"` reads for public list/get via repository `find` (tagged `blog` for ISR) — safe because repository uses `withInstrumentation` (no `headers()`)
- plain `resolve` / `listCatalogSlugs` for RSC / `generateStaticParams` (also repository / `withInstrumentation`)
- `generateStaticParams` prerenders **every slug × en/es**; new posts after build still generate on first request (Cache Components — do not set `dynamicParams`)
- Local CLI backfill (`bun run blog:backfill-spanish`) imports `Blog.translateMissingSpanishCore` under Bun — keep `@ai-sdk/rsc` / `createStreamableValue` out of `server/utils/ai.ts` (RSC-only helper lives in `ai-streamable.ts`) so Bun does not resolve the client RSC entry
- Public pages use `resolve({ translate: false })` — no Azure during static generation
- `withContext` / `withCron` for translate, ensureSpanish, ingest, backfill
- cache purges via `after(() => revalidateTag("blog"))` so Spanish writes regenerate static pages (ISR)

BabyLoveGrowth CMS client stays in `babylovegrowth.ts` (external API only).

### Locale switcher

Navbar language select calls `router.replace(pathname, { locale })` (next-intl). Same path, other locale — `/blog/foo` ↔ `/es/blog/foo`. Cookie `NEXT_LOCALE` then keeps that choice on bare `/blog/...` URLs.

## Auto-translate (Azure)

When BabyLoveGrowth publishes an English article, configure their **Webhook** integration:

1. Settings → Publishing → Webhook → Connect
2. URL: `https://<your-host>/api/webhooks/babylovegrowth`
3. Bearer token: value of `BABYLOVEGROWTH_WEBHOOK_SECRET`
4. Enable automatic publish

The handler acknowledges immediately (200), then `Blog.ingestPublish` translates title / meta / HTML to Spanish with Azure (`AI.generate`, gpt seat), upserts `blog_post` (`locale=es`, same slug), and purges the `blog` cache tag so EN/ES static pages regenerate (ISR). Existing posts without an ES row are filled by the backfill script/cron, which purges the same tag.

### Backfill

For articles published before the webhook was connected (BLG catalog + local EN `blog_post` rows), run the local script against the **production** database (no cron HTTP):

```bash
cd apps/web
# Point DATABASE_URL at production Postgres for this shell only, then:
DATABASE_URL='postgresql://…prod…' bun run blog:backfill-spanish -- --yes
# optional: --limit=5
```

Requires `BABYLOVEGROWTH_BLOG_API_KEY` + Azure gpt seat env in `.env.local`. Writes `locale=es` rows in-process via Azure. After it finishes, **redeploy** (or purge the blog cache) so static `/es/blog/*` pages regenerate.

There is also `POST /api/cron/blog-translate-backfill` for scheduled runs; prefer the local script for one-shot prod fills.

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
