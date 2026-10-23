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
| `en` | none (`/blog/foo`) | `blog_post` `locale=en` (BabyLoveGrowth webhook, a `content/blog` file, or editorial). |
| `es` | `/es` (`/es/blog/foo`) | `blog_post` `locale=es` (same slug). Fall back to EN row until Spanish is written. |

Same slug is shared across locales. Spanish copies are **not** published back into BabyLoveGrowth.

Index, tags, sitemap, `llms.txt`, OG images, and `generateStaticParams` / `Blog.resolve` read **Postgres only** — never live BabyLoveGrowth during prerender (multi-worker SSG would 429 their 2 req/s cap). Pages are fully static for every slug × locale; the webhook (or editorial write) purges `revalidateTag("blog")` so ISR regenerates from stored rows.

## Search indexing

Only the English article is offered to search. The rules live in the route metadata, not in the rows:

| Surface | Robots | Why |
|---------|--------|-----|
| `/blog/<slug>` | `index, follow` | The original article. Self-canonical, no hreflang pair. |
| `/es/blog/<slug>` | `noindex, follow` | An unreviewed machine translation (or the EN row, on fallback). Readable and linked for Spanish visitors, left out of the index and the sitemap. |
| `/blog/tag/<slug>` (both locales) | `noindex, follow` | A tag archive is usually a one-post list; its links still reach the articles. |

Three more things keep a CMS article from reading as generated to a crawler:

- **Tags are capped** — `leadingTags` (`lib/blog-html.ts`) keeps the first three. A BabyLoveGrowth post arrives with a dozen near-identical search phrases; printed in full as chips, `keywords` meta and JSON-LD they are a keyword list. Use the helper anywhere tags reach the page.
- **Outbound links are qualified** — `splitBlogHtmlByH2` rewrites every external `<a>` in a CMS body to `rel="nofollow noopener noreferrer"`. BabyLoveGrowth leaves its own partner placements followed; links to `ecentic.ai` and relative links keep their `rel`, and only change when they name a retired post (below).
- **The sitemap lists English articles only**, since it should name what search is meant to index.

If a Spanish article is ever reviewed by a person and meant to rank, that is a per-post decision: it needs its own `index` rule, a sitemap entry, and the hreflang pair restored on both locales together.

### Retired posts

When several posts split one search intent, the weaker ones fold into the post Google already ranks for it. `RETIRED_BLOG_POSTS` (`lib/blog-redirects.ts`) maps each retired slug to its replacement and is the only place to record one:

- `next.config.ts` turns every entry into permanent (308) redirects for `/blog/<slug>` and `/es/blog/<slug>`.
- `Blog.listPublished` and `Blog.listCatalogSlugs` drop retired rows, so the post leaves the sitemap, `llms.txt`, RSS, the index and tag pages, and static params.
- `splitBlogHtmlByH2` rewrites CMS links that still name a retired post to point at its replacement, so readers and crawlers skip the redirect hop.

The row stays `published` in Postgres: BabyLoveGrowth may send it again, and the redirect still wins. A replacement must be a live post — never another retired slug (`spec/blog-html.test.ts` checks it). To set the posts that stay in the same topic apart, give them narrower title tags in `BLOG_TITLE_TAGS` (`blog/[slug]/page.tsx`).

## Database

`blog_post` columns:

- `locale` — `en` | `es`
- `source` — `local` | `blg` | `repo` (plain text: a new origin needs no migration)
- `externalId` — BabyLoveGrowth article id when `source=blg`; `content/blog/<slug>.md#<sha256>` when `source=repo`
- `contentHtml` — HTML body for BLG-sourced / translated articles
- `faqs` — `{ question, answer }[]` in the row's own locale

Unique on `(slug, locale)`.

## FAQs

Every post carries Q&A pairs in `blog_post.faqs`, in the row's own language.
They are always emitted as `FAQPage` JSON-LD (`createFaqSchema`, which strips the
`**bold**` / `[label](href)` markup the editorial renderer accepts). Answers may
use that markup; structured data gets the prose alone. Inline JSON-LD goes
through `serializeJsonLd` (`components/json-ld.tsx`), which escapes `<` so an
answer that quotes `</script>` cannot close the tag.

Where they come from:

- **BabyLoveGrowth** ships `faqJsonLd` on its newer articles and writes the same
  block into `content_html`. `publishPayloadSchema` normalizes it; an absent
  block parses to `undefined`, and `upsertLocaleRow` treats `undefined` as *keep
  what is stored* (`[]` clears). Without that, the 15-minute reconcile would wipe
  the hand-written pairs on the older BLG posts every time it re-ingested one.
- **Editorial posts** own theirs in `scripts/seed.ts`, next to `takeaways`.
- **Repo posts** (`content/blog/*.md`) take them from the `## FAQ` section:
  each `###` is a question and the blocks under it its answer, as plain text.
  The block stays in `contentHtml` as well, so `hasFaqSection` hides the
  duplicate. A repo post always writes its pairs explicitly, `[]` included.
- **Spanish** is translated with the rest of the metadata in `translateMetaCore`,
  count- and order-aligned to English like `tags` and `takeaways`.

The page renders a visible FAQ block only when the body has none of its own —
`hasFaqSection` (in `lib/blog-html.ts`) checks the split section titles per
locale, anchored so an ordinary heading that merely mentions FAQs is not mistaken
for the block. A heading it misses costs a duplicated block on screen, never
missing structured data.

Editorial posts always render the block, and their own `sections` are filtered
through `isFaqSectionTitle` first: FAQ prose used to live there, and rows written
before the column existed still carry it. That filter is what makes a `faqs`
write safe to land ahead of the code that reads it — both versions of the page
show exactly one FAQ.

`scripts/backfill-blog-faqs.ts` filled the column for rows written before it
existed; it is re-runnable and standalone (importing `server/app/blog` from a Bun
script pulls `server/utils/ai`, whose `@ai-sdk/rsc` and Sentry imports only
resolve inside Next).

## Server module

All blog server logic lives in `apps/web/src/server/app/blog.ts`:

- `"use cache"` reads for public list/get via repository `find` (tagged `blog` for ISR)
- plain `resolve` / `listCatalogSlugs` for RSC / `generateStaticParams` (no `withContext` / `headers()`)
- `generateStaticParams` prerenders **every slug × en/es** (Cache Components — do not set `dynamicParams`)
- Public pages use `resolve` only — no Azure on the render path
- `Blog.ingestPublish` (webhook) upserts **EN + ES** and purges the `blog` tag
- `ingestArticleCore` is the one ingest path (EN upsert, Azure ES, ES upsert, purge) behind the webhook, the BLG reconcile and repo posts
- `Blog.reconcileRepoPosts` publishes `content/blog/*.md`; the pure half (frontmatter, rendering, FAQ extraction, voice check, planning) is `server/utils/blog-content.ts`, which the `blog:check` script and specs load without Next

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

## Posts from the repo (`content/blog`)

The second automatic write path. A post is a markdown file,
`apps/web/content/blog/<slug>.md`, with its hero image in
`apps/web/public/blog/`; the format is in `apps/web/content/blog/README.md` and
the voice in `docs/context/seo/blog-voice.md`. Okara opens pull requests here.

- **Reviewed before it ships.** `bun run blog:check` (CI job `blog-content`, on
  PRs and pushes to `main` that touch `content/blog`, `public/blog`, the
  checker, `lib/blog-html.ts`, `lib/blog-redirects.ts` or dependencies)
  validates the frontmatter, the slug (file name, uniqueness, not a retired
  slug, no private store name), the markdown structure (no raw HTML, no
  footnotes, no stray `#`), the house voice, and that every image the post names
  is in `public/`.
- **Rendering.** remark-parse + remark-gfm + remark-rehype + rehype-sanitize
  (GitHub's schema) + hast-util-to-html, in `server/utils/blog-content.ts`.
  Raw HTML is dropped by the pipeline and reported as an error by the check, so
  nothing vanishes silently; external links get `target="_blank" rel="noopener"`
  (and `splitBlogHtmlByH2` still adds `nofollow` at render). The output is the
  same plain `h2`/`h3`/`p`/`ul`/`table` shape BabyLoveGrowth stores. The
  Spanish body Azure writes from it goes through the same allowlist
  (`BlogContent.sanitize`) before it is stored, since it is model output that
  the page injects as it is.
- **Published from the deployed files.** `/api/cron/blog` reads
  `content/blog/*.md` from its own function bundle (`outputFileTracingIncludes`
  in `next.config.ts`), so a post and its hero image always go live in the same
  deploy. A missing folder is a loud error, not an empty catalog.
- **Same checks before publishing.** The cron runs the same validation as
  `blog:check` (all but the image lookup, since `public/` is not in a function
  bundle). A file that fails is listed under `invalid` and never published; a
  post merged past a red check stays off the site. `draft: true` is skipped, and
  does not take down a post that is already live.
- **Change detection.** `externalId` is `<path>#<sha256>` of the file plus a
  `RENDER_VERSION`. A post needs work when its EN or ES row is missing, belongs
  to another source, or carries a different hash; bump `RENDER_VERSION` to
  re-ingest every repo post after a rendering change. EN is written first, so
  an ES translation failure leaves the ES row on the old hash and the next tick
  retries.
- **Pacing.** One post per tick. Posts with no rows (404s) go first; every other
  post rotates, least recently attempted first (an attempt rewrites the EN row,
  so its `updatedAt` is the attempt time). A post whose translation keeps
  failing moves to the back each tick instead of holding the queue.
- **Deleted files.** Their rows stay published and are listed as `orphaned` in
  the cron log; removing them is a manual decision.

### Slug clash: the repo wins

A file whose slug BabyLoveGrowth already wrote (Okara refreshes several old BLG
posts) takes it over: both locale rows are rewritten from the file and
`source` becomes `repo`, FAQs and tags included. From then on the slug is
repo-owned: `ingestPublishCore` skips it (Sentry `info`, "BLG publish skipped:
slug is published from the repo"), checking again before its Spanish write in
case the repo claimed the slug while it translated, and `reconcileCatalog`
leaves it out of its missing list, so neither the webhook nor the backstop
writes the BLG article back.

### One tick, two sources

`Cron.reconcileBlogCatalog` runs both rails inside the same `after()`. A tick
spends itself on one ingest at most, since one translation can take most of the
300s `maxDuration`. Whichever source wrote a row most recently (`Blog.lastWriter`)
goes second, and the second runs only when the first had nothing to translate
(an ingest that failed counts as one that translated).
The one that just ingested yields the next tick, so neither starves the other.
The tick logs `[cron/blog]` with both results and sends Sentry a warning when a
repo post is invalid, failed, or saved EN only.

From merge to live: the deploy, then the next tick (at most 15 minutes) writes
EN at once and ES after the translation (a few minutes). If BabyLoveGrowth used
that tick, add one more: about 30 minutes in the worst case for a single post,
plus 15 minutes for each repo post queued ahead of it.

### Without BabyLoveGrowth

Nothing here depends on it. With the BabyLoveGrowth env vars removed,
`listArticlesFresh` returns no articles, so the BLG rail is a no-op and the repo
rail gets every tick; the webhook answers 500 (no secret) and writes nothing;
the public blog keeps serving every stored row, BLG ones included, because it
reads Postgres only.

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
