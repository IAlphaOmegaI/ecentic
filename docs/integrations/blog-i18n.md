# Website locales and blog translation

The website supports English (`en`, no prefix), Spanish (`es`), French (`fr`), German (`de`), Italian (`it`), Japanese (`ja`) and Simplified Chinese (`zh-CN`). `apps/web/src/i18n/locales.ts` is the shared locale contract; `routing.ts` wraps it for next-intl. French/German/Italian use their standard European locale, Japanese uses Japan, and Chinese uses mainland `zh-CN` conventions after the owner selected Simplified Chinese.

Use `next/root-params` through `i18n/request.ts` for RSC locale resolution. Do not add `setRequestLocale`. Server Actions and Route Handlers pass an explicit locale to next-intl APIs. Static UI uses the catalogs and fragments under `apps/web/messages`; database article bodies are a separate content rail.

## Authoritative source and quality policy

Published English `blog_post` rows are the source for translation, including launch corrections already applied to those rows. Do not backfill by fetching old CMS text over a corrected English row. Existing reviewed Spanish rows are preserved unless an explicit correction workflow replaces them.

The translation policy lives under `src/i18n/translation/`. It implements the supplied translating-web, translating-core, reviewing-translations and locale skill guidance: idiomatic authored-language copy, consistent merchant terminology, unchanged facts and qualifications, protected brand/product names, numbers, URLs, syntax and code. Every batch gets a separate six-pass review; a failed unit receives at most one correction/recheck. Remaining editorial findings receive one fresh evidence-only adjudication request: it quotes the exact source and target and classifies each finding as material, not material or uncertain. It never rewrites copy. Deterministic checks, invalid evidence, material defects and uncertainty remain blocking; normal inflection and findings attached to the wrong unit can be dismissed with recorded evidence. The adjudication version is recorded separately from the translation policy. A machine review does not claim a native or human review, and language review does not imply browser verification.

The policy version participates in each source hash. Changes to source or policy invalidate old checkpoints. Review records retain target/source pairs and separate human/runtime review provenance.

## Read rail: database only

Public blog pages, index, topics, Open Graph images and sitemap read published Postgres rows. Rendering never calls BabyLoveGrowth or a translation model.

- `Blog.getPublishedBySlug` and `Blog.resolve` return the requested locale only. Missing translations are not published as English under a localized URL.
- `generateStaticParams` uses real published locale/slug pairs. New completed rows become available through ISR.
- Canonical URLs, article language and reciprocal alternate links refer to actual published locale rows. Sitemap contains only real localized articles.
- The localized blog index and topic pages show that locale's published rows; they do not hide English bodies behind translated navigation.
- Slugs remain shared for each article. Topic labels translate, and `blogTopicSlug` supports non-Latin topic URLs.
- Stored article HTML keeps its source URLs. At render time, recognized unprefixed local navigation links use the reader’s locale; cross-article links do so only when the target slug is published in that locale. Explicit language choices, fragments, query-only links, external URLs, machine endpoints, assets and code examples stay unchanged. Link availability uses a small cached slug projection tagged `blog`, so publication invalidates it with the article/index caches.
- `blogDate` uses the configured locale. Reading time uses `Intl.Segmenter`, so Japanese/Chinese are not counted as a single word.
- `blog-html.ts` recognizes FAQ, takeaway and navigation headings in every supported language. FAQ pairs produce target-language JSON-LD; a body that already contains the FAQ does not receive a duplicate visible block.
- OG rendering receives locale for the correct Japanese/Simplified Chinese font.

`BLOG_CACHE_TAG` is `blog`. Published writes purge that tag, including the sitemap's own tagged cache entry. CLI publishing happens outside a Next request; purge `blog` or deploy after the backfill so cached indexes and sitemap refresh.

## Write rail: durable translation jobs

`blog_post.locale` is a text column with unique `(slug, locale)`. Source values include `blg`, editorial `local`, and corrected repository content `repo`. No locale enum migration is needed.

The dedicated `blog_translation` table stores one job per `(slug, locale)`:

- source hash and policy version;
- reviewed completed units;
- rejected units with target text and findings;
- total unit count, state, retry availability and attempt count;
- lease token/expiry and timestamps.

Migration: `apps/web/drizzle/20261112180000_blog_translation/migration.sql`. Apply the migration before deploying code that enqueues or drains jobs.

`src/server/utils/blog-translation.ts` is the standalone shared write rail for cron and CLI. It uses explicit transactions because claiming and publishing span atomic database operations that ordinary CRUD delegates cannot provide. It has no Next request, RSC or Sentry dependency.

Claims use `FOR UPDATE SKIP LOCKED` and a ten-minute lease, renewed with a token-guarded update after each reviewed stage. Checkpoints and publication require the current lease token. Final publication locks both the job and English source, checks the hash again, and upserts the target article in the same transaction as completing the job. An old worker cannot publish a stale source version.

A cron batch contains up to 48 text units / approximately 4,500 source characters; CLI backfill defaults to 96 units / 10,000 characters. Contiguous inline slots from the same paragraph and editorial question/answer pairs stay together, and every request receives the headline, description, section outline, selected paragraph context and up to three intact neighboring paragraphs. The complete source remains available in the guarded job and review export; it is not redundantly sent in every model request. A single longer source paragraph remains intact rather than being truncated. Enqueue reads locale coverage in two queries and upserts job groups of 100, avoiding per-locale network roundtrips. Completed reviewed batches persist immediately. Failed semantic units stay in `blockedUnits`; independent units continue without retrying those failed units. A whole target article becomes published only after every required unit passes. Transient generation failures back off and stop after three attempts. Azure capacity/rate limits instead defer work for two minutes without consuming that failure budget; the CLI stops claiming new work after a rate limit so it does not compete with other translation runs. Resume after capacity is available.

## HTML and editorial content preservation

`src/lib/blog-translation-content.ts` extracts visible text and meaningful `alt`, `title`, `aria-label` and `placeholder` values using parse5 source locations. Returned text is escaped and inserted into its original source positions. It never asks the model to regenerate HTML.

Tags, attribute syntax, URLs, IDs, classes, `data-*`, comments, image/link counts, heading order and code remain intact. Script/style/pre/code/SVG/Math/template regions and `translate="no"` regions are protected. Decorative empty alt text stays empty. CMS scripts are preserved in storage and removed by the article presentation renderer, while article/FAQ structured data is rebuilt from localized fields.

Metadata, category/tags, introductions, takeaways, FAQ pairs, and editorial section headings/bodies are explicit units. Editorial Markdown syntax and destinations are protected. Missing output throws; no English fallback repairs incomplete arrays or FAQs. Section numbers, dates, thumbnails and source identity remain unchanged.

## Webhook and schedules

`POST /api/webhooks/babylovegrowth` authenticates Bearer credentials, accepts the documented camelCase/snake_case payload aliases, acknowledges quickly, and persists English plus durable target-locale jobs in `after()`. The webhook does not run six whole-article translations inside one request. A new source publication regenerates legacy target rows too; only reconciliation and bulk backfill preserve untracked reviewed translations. An absent CMS FAQ field preserves existing authored English pairs.

Two authenticated product crons have separate responsibilities:

- `/api/cron/blog`, every 15 minutes: fetch missing English CMS posts and enqueue missing/stale locale coverage from stored English rows. It does not overwrite corrected existing English just to fill a missing translation.
- `/api/cron/blog-translations`, every minute: drain two independent reviewed batches. The route has a 300-second budget; model requests have a 50-second limit and one transport retry. At most five bounded model requests per batch include final evidence adjudication, keeping each worker within the route budget. Review failures are counted without logging article bodies or credentials.

Both use the existing `CRON_SECRET` authorization wrapper. The write rail uses the configured Azure deployment through `src/i18n/translation/azure.ts`; no new provider keys are required.

## Backfill and targeted review

Run from `apps/web`:

```sh
# Read-only inventory, default behavior even without --dry-run.
bun --env-file=.env.local scripts/backfill-blog-translations.ts --dry-run --locales fr,de,it,ja,zh-CN

# First article sample. Explicit --write is necessary for any database mutation.
bun --env-file=.env.local scripts/backfill-blog-translations.ts --write --limit 1 --locales fr --max-batches 30 --concurrency 1

# Resume the requested catalog; reviewed checkpoints survive interrupted runs.
bun --env-file=.env.local scripts/backfill-blog-translations.ts --write --locales fr,de,it,ja,zh-CN --max-batches 1000 --concurrency 2

# Export unresolved units without database writes; choose a fresh output path.
bun --env-file=.env.local scripts/backfill-blog-translations.ts --dry-run --export-blocked /tmp/blog-blocked-review.json

# Apply a reviewed targeted correction; this does not retranslate unaffected units.
bun --env-file=.env.local scripts/backfill-blog-translations.ts --write --apply-review /tmp/blog-reviewed-patch.json
```

Options include `--batch-chars` (default 10000, up to 24000), `--batch-units` (default 96, up to 300), `--slug`, `--limit` (English article count), `--locales`, `--concurrency` (CLI maximum eight; cron remains two), `--max-batches`, and `--report-dir`. The larger CLI limits let typical articles remain intact in one request; the cron keeps its smaller request budget. All workers share one generator's token reservation limit (`--tokens-per-minute`, default 180000); account for any concurrent catalog process before increasing it. `--request-timeout-ms` defaults to 180000 and includes local capacity waits; cron requests remain limited to 50 seconds. Send `SIGUSR1` to finish current claims and stop before safely changing worker or batch settings. Review files use unique names and are not overwritten. Inspect the reported `blocked` and `completed` counts; a successful process exit is not proof the whole catalog is finished when a batch limit was supplied.

Output limits depend on the phase and requested units: drafts reserve translated text, while review and adjudication reserve compact findings. Reservations remain in the rolling minute window even when a response uses fewer tokens, because Azure throttling includes the requested output allowance. A confirmed output-length truncation retries once with a doubled allowance, capped at 24,000 tokens; partial output is never accepted. Other errors retain their existing transport or backoff handling.

Response transport rejects actual NUL characters and unpaired UTF-16 surrogates before targets, findings or rejected drafts reach JSONB storage. These are bounded transport failures, never text to sanitize into a published translation. Valid CJK, emoji, line breaks and literal escaped code remain intact.

Numeric checks recognize explicit English `US dollar(s)` names and hyphenated cardinal quantities such as `twenty-five` without changing currency or splitting one count into two. One reviewed, exact pricing paragraph in the repository-owned `vizby-alternatives` article carries a trusted USD context from its documented plan prices. That annotation is limited by source owner, slug and full source text; arbitrary unqualified or foreign dollar references remain unannotated. It does not alter the stored English source or relax code, amount or currency checks.

`--review-blocked` alternates ordinary translation batches with a focused fresh review of stored rejected targets, using the same generator and quota. Review claims prioritize articles with the least untranslated work remaining, then use the existing availability order; normal translation order is unchanged. Cached text supplies the draft; the six-pass review, any correction and recheck, and evidence adjudication still run afresh. Approved sibling targets are supplied as immutable inline context. Remaining real failures receive a review-version marker and are not repeatedly sent through the same review; they stay blocked for a targeted correction. Source hashes, leases and final publication gates are unchanged. Malformed response envelopes receive bounded transport retries rather than being recorded as rejected article copy.

For Japanese and Simplified Chinese, an ordinary HTML text node containing only `a`, `an` or `the` can be empty only when the extractor verifies a meaningful following node in the same inline group. Link labels, accessible attributes, code and isolated nodes remain required. Review sees the complete connected source and target group; manual omission patches must include that exact group in their review evidence. The HTML renderer preserves all surrounding tags, link destinations and sibling slots.

Blocked exports include the full source article, completed neighboring translations and a `sourceStillCurrent` check. Review each failed span alongside its paragraph and repeated FAQ/term group; do not rerun the same failed drafting prompt. A stale export must be refreshed before correction.

A targeted review patch has `{slug, locale, sourceHash, policyVersion, units:[{id,text}], review}`. `review` must cover the exact source/target pairs with the current policy, all six passes, and no unresolved findings. The writer verifies those fields, checks protected syntax/facts with the shared deterministic validator, confirms the source hash still matches, and only changes listed blocked units. A subsequent drain publishes only when the full article is complete. Review must be genuine; do not manufacture a clean review record to bypass a finding.

## Verification

Focused tests: `src/lib/spec/blog-translation-content.test.ts`, `src/lib/spec/blog-html.test.ts`, and translation-engine specs. They cover protected HTML/code/URL/accessibility bytes, incomplete output, policy/source invalidation, CJK topics and reading time, localized FAQ detection, and continuing independent units after a rejection.

Before release, check representative articles in every language, then inspect live locale counts, blocked jobs, canonical/hreflang, sitemap, OG glyphs and mobile text overflow. Translation QA and runtime UI review are separate gates.

## Repository article publication

Main also supports reviewed Markdown under `apps/web/content/blog/*.md`, validated through `server/utils/blog-content.ts` and `bun run blog:check`. The cron reads deployed files (traced by Next), validates frontmatter, Markdown, house voice and retired/private slugs, and renders through the sanitizer. Draft/invalid files are never published. Deleted files remain listed as orphaned for an explicit editorial decision.

A repo file owns its slug: BabyLoveGrowth webhook and reconcile skip any slug already owned by `source=repo`. The file path/content hash in `externalId` detects English source changes. Missing or incomplete translations are handled by the durable queue, rather than rewriting the English source on every tick. Both ingestion sources use the same English-first queue rail and preserve explicit FAQ ownership. Repo HTML is sanitized before extraction; translations escape text into those exact source positions, preserving the sanitized structure.

The freshness cron alternates source priority using `lastWriter` and keeps the existing bounded per-tick ingestion budget. The separate minute translation cron performs language work. Retired slugs remain redirect targets but are excluded from public blog listings and sitemap pairs; outbound article links are qualified and image optimization remains active.
