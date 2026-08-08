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

All blog server logic lives in `apps/web/src/server/app/blog.ts` (`withContext` / `withCron` for mutations; `"use cache"` Drizzle reads for public list/get — `headers()` from `withContext` is not allowed inside cache scopes).

BabyLoveGrowth CMS client stays in `babylovegrowth.ts` (external API only).

## Auto-translate (Azure)

When BabyLoveGrowth publishes an English article, configure their **Webhook** integration:

1. Settings → Publishing → Webhook → Connect
2. URL: `https://<your-host>/api/webhooks/babylovegrowth`
3. Bearer token: value of `BABYLOVEGROWTH_WEBHOOK_SECRET`
4. Enable automatic publish

The handler acknowledges immediately (200), then `Blog.ingestPublish` translates title / meta / HTML to Spanish with Azure (`AI.generate`, gpt seat) and upserts `blog_post` (`locale=es`, same slug). First `/es/blog/[slug]` hit also calls `Blog.ensureSpanish` if the row is still missing.

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

Catalogs live in `apps/web/messages/{en,es}.json`. Shared chrome (nav, footer, auth, dashboard shell, blog labels) is wired through `next-intl`. Expand namespaces as remaining page copy is extracted.
