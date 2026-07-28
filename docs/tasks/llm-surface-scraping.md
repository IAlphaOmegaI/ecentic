# LLM Surface Scraping — Implementation Plan

Working document for the layer that executes prompts against **real consumer AI
surfaces** (ChatGPT, Google AI Mode, …), captures everything the surface returns,
and normalizes it into one envelope. Extraction (brand-mention detection, share of
recommendation) and analytics sit downstream and are only sketched here.

**Status (2026-07-28):** Phase 0 harness shipped — ScrapeLLM adapter, ChatGPT +
Google AI Mode surfaces only, exercised from the `/dev/llm-scraping` sandbox. No
database persistence yet.

> The original draft of this plan was written against a Convex stack. This repo is
> Next.js + Drizzle/Postgres, so the mapping is: Convex validators → the TypeScript
> contract in [llm-scraping.ts](../../apps/web/src/lib/llm-scraping.ts) now and a
> Drizzle table in Phase 1; Convex scheduler/actions → the existing cron + durable
> pattern (`/api/cron/drain`, `server/utils/durable.ts`, the worker pool in
> `background-scan.ts`); Convex file storage → UploadThing.

---

## 1. Decisions

### D1 — Buy surface access, build orchestration

We do **not** build Playwright automation against ChatGPT/Gemini ourselves. That is
an anti-bot arms race (residential proxies, CAPTCHA solving, selectors breaking
weekly) whose cost the provider market amortizes for us. We build everything
*around* the provider — prompt management, scheduling, normalization, storage,
monitoring — and keep the provider a commodity behind an adapter interface we own.
That interface is the swap lever if a provider degrades, raises prices, or gets
blocked.

- **Primary (implemented):** [ScrapeLLM](https://scrapellm.com/api) — structured
  JSON per surface, simple synchronous API, cheap to start. See §3.
- **Designated backup (bake-off candidate):** Bright Data (strongest
  infrastructure, enterprise pricing). Apify actors are the cheapest trial tier.
  Infatica/Decodo stay on the bench.

### D2 — Two channels from day one, one envelope

- **UI channel** — provider → real surface answers. Outcome data. This is what
  this plan implements.
- **API channel** — direct model APIs. Mechanism/diagnostic data. **This repo
  already has it:** every product feature calls providers directly through
  `model()` in [ai.ts](../../apps/web/src/server/utils/ai.ts) (Azure GPT,
  Anthropic, Google, Perplexity).

Both channels serialize to the same `Capture` envelope (`channel: "ui" | "api"`),
so the quarterly UI-vs-API calibration job (§6, Phase 3) is a query, not a
migration.

### D3 — Surfaces in scope now

`chatgpt` and `google_ai_mode` only. Perplexity/Gemini/Copilot/Grok/Amazon Rufus
are one union-member + zero refactors away (the `Surface` id doubles as the
ScrapeLLM path segment), but they wait until the Phase 0 bake-off says the data is
worth the credits.

---

## 2. What ships in this change (Phase 0 harness)

| File | Role |
|---|---|
| [lib/llm-scraping.ts](../../apps/web/src/lib/llm-scraping.ts) | Shared client-safe contract: `Surface`, `CaptureRequest`, the `Capture` envelope, defaults |
| [server/utils/scrapellm.ts](../../apps/web/src/server/utils/scrapellm.ts) | ScrapeLLM adapter — `execute()` (HTTP via `request`/`parse`) + `normalize()` into the envelope + `isRetryable()` error split |
| [api/dev/llm-scraping/route.ts](<../../apps/web/src/app/(provider)/api/dev/llm-scraping/route.ts>) | Dev route — validates, calls the adapter, returns one `Capture` as JSON. Administrator-only in production, open locally |
| [dev/llm-scraping/page.tsx](<../../apps/web/src/app/(main)/dev/llm-scraping/page.tsx>) | Sandbox page — static shell, mirrors `/dev/ai-playground` |
| [\_components/scraper.tsx](<../../apps/web/src/app/(main)/dev/llm-scraping/_components/scraper.tsx>) | Prompt / surfaces / country / repeats / bypass-cache controls; one request per surface×run, all parallel, abortable |
| [\_components/capture-column.tsx](<../../apps/web/src/app/(main)/dev/llm-scraping/_components/capture-column.tsx>) | Per-run column: answer, citations, search results, credits/latency/cached metrics, raw payload |

Setup: put `SCRAPELLM_API_KEY` in `apps/web/.env.local` (key from
[scrapellm.com](https://scrapellm.com)), run `bun run dev:web`, open
`/dev/llm-scraping`. Every capture costs 3 credits — **cached responses still
bill**, and repeats > 1 force `bypass_cache` (a cached repeat would measure the
cache, not the surface's stochasticity).

---

## 3. ScrapeLLM API reference

As documented at [scrapellm.com/api](https://scrapellm.com/api), fetched
2026-07-28. If behavior diverges from this section, re-fetch the docs before
changing the adapter.

- **Shape:** `GET https://api.scrapellm.com/scrapers/{scraper}` — synchronous; the
  connection holds until the surface finishes answering (ChatGPT typically
  5–60s). **No webhooks or async polling** — if that appears later, revisit the
  Phase 2 queue design.
- **Auth:** `X-API-Key` header (preferred) or `?api_key=`.
- **Params:** `prompt` (1–4000 chars, required), `country` (ISO 3166-1 alpha-2,
  default `US`; `JP`/`TW` unsupported for Google AI Mode), `bypass_cache`
  (default false), `timeout` (10–600s, default 300).
- **Cost:** 3 credits per request. The docs claim cached responses bill too,
  but an observed cache hit returned `credits_used: 0` — cache hits appear
  free in practice.
- **Common response fields:** `scraper`, `status`, `job_id`, `prompt`, `country`,
  `result`, `result_markdown`, `url` (share link), `created_at`, `credits_used`,
  `elapsed_ms`, `cached`, `cached_at`.
- **Per-surface extras:**
  - `chatgpt` — `links[]`, `llm_model`, optional `result_markdown_json` token tree.
  - `google_ai_mode` — `citations[]`, `search_results[]` (the web panel), `raw_url`.
  - Available but unwired: `perplexity` (sources + related questions), `gemini`,
    `copilot` (5 modes), `grok` (web + X posts), `amazon_rufus` (products with
    ASINs).
- **Errors:** 401 bad key · 408 timeout · 422 invalid param (check `detail`) ·
  429 credits/rate exhausted · 500/502/503/504 transient (503 = scraper warming).
- **Known gaps vs. our envelope:** no fan-out queries on chatgpt/google_ai_mode.
  The envelope keeps the slot empty rather than dropping it — a provider that
  exposes it (or a downstream extractor parsing `result_markdown`) fills it
  without a schema change.

**Observed on a real `google_ai_mode` capture (2026-07-28)** — facts the docs
page doesn't state; verified against a live payload:

- Citations arrive as `{ title, url, snippet, website_name, thumbnail, favicon }`.
- **AI Mode's product cards ride inside `citations[]`** as
  `google.com/search?prds=…&ibp=oshop` shopping-panel deep links. The links are
  session-bound and open blank afterwards; the durable signal is the ids the
  `prds` param encodes — `productid`/`catalogid` (Google Shopping catalog),
  `gpcid`, and `mid`, the **Merchant Center id**, which joins straight to the
  Google Merchant integration ("whose card won the slot"). The adapter parses
  these into `shoppingCards`; a card slot is real, structured shelf data.
- The full payload carries **both** inline `result_markdown` and a hosted
  `markdown_url` (`scrapellm.com/md/{job_id}.md`) — an earlier truncated
  sample suggested markdown was hosted-only, which was wrong for this surface.
  The adapter prefers inline and falls back to fetching the hosted file.
- **`result_markdown` is the authoritative shopping-card source.** Each card is
  an embedded HTML module (`<div html-index="…">`) carrying what citations
  never do: headline price, primary seller, rating, a base64 product image,
  and a **per-merchant offer grid** (seller + price pairs behind `/goto`
  anchors). Cards can appear here that never surface in `citations[]` —
  observed 3 modules vs. 1 citation card on one answer. The card anchor uses a
  richer prds format (`pvt:a` with `productDocid`/`headlineOfferDocid`), and
  `mid` can be absent (observed on a multi-seller ASICS card). The adapter
  parses these modules and treats citation-derived cards as supplements.
- The markdown also ends with a reference-style link list (`[7]: https://…`)
  where some wrapped citations resolve to direct urls — an alternate recovery
  path if the twin-merge ever proves insufficient.
- Extra fields: `api_version`, `raw_url` (ephemeral Google async URL).
- `search_results[]` can be empty even when citations are rich.
- `elapsed_ms` ≈ 57s on the observed run — timeouts must stay generous.
- **Most citation urls are session-bound `goto` redirect wrappers** — absolute
  on a regional Google host (observed `google.com.hk` on a `country=US`
  request) or bare `/goto` relatives — whose `url=` param is an opaque token:
  the destination is *not recoverable* from the link. `website_name` is the
  only source identity those entries carry (→ `Citation.source`), and the
  adapter renders/treats them as unlinkable (`isRedirectWrapped`).
- **Partial recovery exists:** the payload interleaves an *untitled* record
  holding the real destination url (with favicon) directly before its titled
  `/goto` twin from the same publisher. The adapter merges those adjacent
  pairs, recovering the destination while keeping title/snippet. Unpaired
  wrapped entries stay wrapped.
- The same article can appear more than once (e.g. inline citation + link
  panel). Duplicates are kept at capture time — dedup belongs to extraction.
- Geo fidelity needs explicit bake-off scoring: a €100 prompt on `country=US`
  answered with $-denominated sources, and the session routed via a regional
  Google host.

**Observed on a real `chatgpt` capture (2026-07-28, same prompt):**

- `links[]` entries are `{ text, url }` — text is the article/page title.
- **Every cited url is stamped with `utm_source=chatgpt.com`** (plus whatever
  partner utm params the page already carried). The adapter strips `utm_*` and
  Google's `srsltid` from normalized citations so they join cleanly against
  merchant domains; verbatim urls stay in `raw`. The stamp itself matters
  elsewhere: it is exactly what the agent-visit tracking layer sees when a buyer
  clicks through from ChatGPT.
- Markdown is hosted at `markdown_url` here too — no inline `result_markdown`
  (the docs claim inline; `result_markdown_json` came back null).
- `llm_model` is populated (`gpt-5-5`); `url` is just `https://chatgpt.com`,
  not a conversation share link.
- Citations are sparse vs. AI Mode — 3 links vs. 17 citations on the same
  prompt — and there are no product entities / shopping cards.
- `elapsed_ms` ≈ 29s.

---

## 4. The envelope

The contract that makes providers swappable. Lives in
[llm-scraping.ts](../../apps/web/src/lib/llm-scraping.ts): `Capture` with
`surface`, `channel`, `provider`, `runIndex`, `geo`, `status`, `answerText`,
`answerMarkdown`, `answerContent` (the readable answer — markdown stripped of
embedded card HTML, citation markers, and the reference-link list; what brand-
mention extraction reads), `citations[]`, `searchResults[]`,
`shoppingCards[]`, `fanOutQueries[]`, `shareUrl`, `cached`, `costCredits`,
`latencyMs`, `capturedAt`, `raw`.

Two rules baked in:

1. **Raw payloads are immutable and kept verbatim.** Extraction logic will
   improve; old raws get re-parsed. In the sandbox `raw` rides inline on the
   response; in Phase 1 it moves to UploadThing and the row stores the file key —
   provider payloads with embedded HTML get large, and rows must stay small.
2. **Every repeat is its own capture.** Never average at capture time —
   stochasticity is data; frequency math happens at query time.

Phase 1 Drizzle sketch (columns mirror the TS contract; `citations` etc. as
`jsonb`):

```
capture: id, promptId → scrapePrompt, cycleId → scrapeCycle, surface, channel,
provider, runIndex, geo, status, answerText, answerMarkdown, citations jsonb,
searchResults jsonb, shoppingCards jsonb, fanOutQueries jsonb, rawStorageKey,
costCredits, latencyMs, capturedAt
+ unique index (promptId, cycleId, surface, channel, runIndex)  ← idempotency
```

> Migration note: this repo's Drizzle snapshot chain is stale and `db:generate`
> emits polluted diffs — hand-author the migration like the existing ones.

---

## 5. Provider abstraction

One adapter per provider, all speaking the envelope:

```ts
type Adapter = {
  name: string;
  surfaces: Surface[];
  execute: (request: CaptureRequest) => Promise<Result<Capture, Error>>;
  isRetryable: (error: Error) => boolean;
};
```

[scrapellm.ts](../../apps/web/src/server/utils/scrapellm.ts) is the first
implementation. The scheduler (Phase 2) only ever talks to `Adapter` — adding
Bright Data next to ScrapeLLM is a new file, not a refactor. Citation extraction
is deliberately defensive (accepts strings or objects, several url/title key
spellings) because provider payload shapes drift; anything unrecognized stays
available in `raw`.

---

## 6. Phases

### Phase 0 — provider bake-off *(harness shipped; evaluation pending)*

Run ~20 real prompts from one pilot store (mix of category, comparison, branded)
through the sandbox on ChatGPT + Google AI Mode. Score ScrapeLLM — and, if it
disappoints, Bright Data / Apify through the same envelope — on:

- citation completeness (full URLs, not just domains)
- answer fidelity (does `result_markdown` match what the real surface shows?)
- geo fidelity (EU country codes → right currency/retailers in answers)
- shopping-card / product-mention structure (or lack of it)
- failure rate, latency, effective cost per capture

Check specifically against what the audit-report template needs before committing.
Pick a primary and a designated backup.

### Phase 1 — vertical slice (week 1)

One real audit produced end to end; ugly internals allowed.

- `scrapePrompt` + `scrapeCycle` + `capture` tables (hand-authored migration).
- Seed script for a pilot store's prompt battery (text, intent type, specificity,
  category, surfaces, repeats).
- One server action executing a cycle through the adapter, writing captures + raw
  files to UploadThing.
- Minimal extraction: brand-mention detection against a store/competitor alias
  list over `answerText` — enough for the first report; LLM extraction waits.
- Ship that audit. Everything later is justified by what broke here.

### Phase 2 — production semantics (weeks 2–3)

- **Idempotency:** the unique index above; retries and crashed runs never
  double-write or double-spend.
- **Queue + retries:** reuse the `enqueue → /api/cron/drain` pattern and
  `durable.ts` the scan engine already uses; exponential backoff on
  `isRetryable` errors only — never re-send a 422 (burns credits on a prompt the
  platform already rejected).
- **Repeats:** N per prompt tier (default 5; bump to 10 where Phase 1 shows
  40–60% answer variance).
- **Cost governor:** hard per-cycle credit budget per store; halt and alert at
  the cap. Providers bill per execution — a runaway retry loop is the most likely
  first incident.
- **Run manifest:** one row per cycle — prompts attempted/completed/failed, total
  credits. Ops view + the client-facing "audit executed on X, N runs" line.
- ScrapeLLM is sync-only, so the queue stays a polling drain; if a provider with
  webhooks lands, captures become two-step (dispatch → callback).

### Phase 3 — trust layer (week 4+)

- **Sentinel cron:** 15–20 fixed prompts per surface daily via `/api/cron/*`
  (CRON_SECRET-gated like scan/billing); alert on answer-distribution shifts —
  the platform-change detector, amortized across all clients (~fixed cost).
- **Calibration:** quarterly, same ~30 prompts through both channels (`ui` via
  adapter, `api` via `server/utils/ai.ts`); store brand-overlap per category.
- **Failover:** provider health metrics; automatic switch to the backup adapter
  after sustained failure.

---

## 7. Cost model

3 credits per capture. At Phase-2 shape — 5 categories × 40 prompts × 2 surfaces
× 5 repeats — ~2,000 UI captures (6,000 credits) per store per monthly cycle,
plus a few hundred API-channel calls (cents). The sentinel adds a fixed daily
~30–40 captures total regardless of client count. Scraping spend is not the
margin problem; shipping the Phase 1 audit fast is.

---

## 8. Analytics note

Postgres is already the operational store, so the "export to a warehouse" caveat
from the original plan softens: aggregation (share-of-recommendation, win-rate
by category) starts as SQL over `capture` with the right indexes, then
materialized views. Revisit ClickHouse only if row counts pass ~1M and query
latency actually hurts. The immutable raws + envelope already guarantee the data
can move.

---

## 9. Deferred deliberately

- Own browser automation (only if the provider market fails us).
- Perplexity / Gemini / Copilot / Grok / Amazon Rufus surfaces.
- Multi-geo per store; real-time anything.
- LLM-based extraction and the report pipeline (downstream of this layer).
- Webhook/async capture flow (ScrapeLLM doesn't offer one).
