# Audit & Optimization Engine — Current-State Map and Rewrite Notes

Working document. Captures how the audit/optimization engine works **today** (verified
against the tree on `feature/google-merchant`, 2026-07), the defects and drift found
while tracing it, and the structural questions a rewrite has to answer.

Everything below is read from code, not from `docs/context/`. Where code and documented
intent diverge, that is called out as a finding rather than silently reconciled.

---

## 1. The loop in one picture

```
 SYNC            MEASURE                  DIAGNOSE              GENERATE           PUBLISH
┌──────┐   ┌──────────────────┐   ┌──────────────────┐   ┌───────────────┐   ┌──────────┐
│Shopify│   │ background-scan  │   │ optimization.ts  │   │generateImproved│   │ Shopify  │
│ Woo   │──▶│ 3-model panel    │──▶│ winRate < 55%    │──▶│Listing         │──▶│ Woo      │
│ Feed  │   │ position-swap A/B│   │ + rule insights  │   │ (title + HTML) │   │ (update) │
└──────┘   └──────────────────┘   └──────────────────┘   └───────────────┘   └──────────┘
                    │                       ▲
                    │                       │  NOT WIRED ────────┐
                    ▼                       │                    │
             simulation rows          audit-compute.ts      catalog-rank.ts
             (winner, scores,         (per-field scores     (Shopify Global
              reasoning, keyFactors)   + suggestions)        Catalog MCP rank)
                                        │                        │
                                   product detail UI       visibility page
```

The critical structural fact: **only the simulated win rate drives optimization.** The
per-field audit, the store readiness audit, and the real catalog-rank measurement all
terminate in UI. Nothing feeds back into what gets rewritten or how.

---

## 2. File map

| File | Role | Status |
|---|---|---|
| [background-scan.ts](../../apps/web/src/server/app/intelligence/background-scan.ts) | **Live scan engine.** Durable, resumable, worker-pooled | Active |
| [judge.ts](../../apps/web/src/server/app/intelligence/judge.ts) | Rubric + prompts (`RUBRIC_CORE`, `JUDGE_SYSTEM_AB`) | Active |
| [formating.ts](../../apps/web/src/server/app/intelligence/formating.ts) | Serializes listings for the judge; `computeUcpScore` | Active |
| [simulate.ts](../../apps/web/src/server/app/intelligence/simulate.ts) | `enqueueScan` (active) + `runScan` streaming path | **`runScan` is dead** |
| [optimization.ts](../../apps/web/src/server/app/optimization.ts) | Thresholds, dashboard, approve/dismiss, publish orchestration | Active |
| [audit-compute.ts](../../apps/web/src/server/app/intelligence/audit-compute.ts) | Cached per-field content audit + positioning | Active, **unwired from optimization** |
| [agent-readiness.ts](../../apps/web/src/server/app/intelligence/agent-readiness.ts) | Store-level deterministic audit (robots/JSON-LD/GTIN/feed) | Active, UI-only |
| [catalog-rank.ts](../../apps/web/src/server/app/intelligence/catalog-rank.ts) | Real agent-shelf rank via Shopify Global Catalog MCP | Active, env-gated, UI-only |
| [feed-export.ts](../../apps/web/src/server/app/feed-export.ts) | Deterministic Google Shopping feed | Active |
| [ucp/profile.ts](../../apps/web/src/server/app/intelligence/ucp/profile.ts) | JSON-LD + merchant profile generation & publishing | Active |
| [utils/ai.ts](../../apps/web/src/server/utils/ai.ts) | `generate` wrapper — `generateObject`, repair, routing, telemetry | Active |
| [simulation.ts](../../apps/web/src/server/app/simulation.ts) | Simulation repository + read actions | Active, **see §6.1** |

---

## 3. Measurement layer (how win rate is produced)

**Engine:** `runScanForUser` in `background-scan.ts`. Entered two ways —
`enqueueScan` → `/api/cron/drain` → `runPendingScans` (user-initiated), or
`/api/cron/scan` → `runScanDaily` (scheduled, per user per store).

**Panel:** 3 models, one shared rubric — ChatGPT (Azure), Claude Sonnet 4, Gemini 2.5 Flash
(`background-scan.ts:22-30`). Task count = `products × selected competitors × 3`.

**Position-swap debiasing.** Every pair is judged **twice** — merchant listing as
`LISTING A`, then as `LISTING B` — and the two scores averaged (`background-scan.ts:194-265`).
Labels are positional only; the judge never learns which side is the merchant's. This is
the strongest piece of the current design and should survive the rewrite intact.

**Rubric** (`RUBRIC_CORE`, `judge.ts:11-23`), a forced 4-step:

1. Infer category → name the 4–7 attributes that decide a purchase *in that category*
2. Write evidence into `reasoning` **before** scoring; marketing adjectives count as absent
3. Score 0–100 against fixed anchors (31–55 = "most real listings"; 70+ explicitly rare)
4. `winner` = higher score; emit 3–6 `keyFactors` naming specific present/absent attributes

**Judge input surface** (`formating.ts`): title, description (800 char cap), price,
compare-at, image **count**, SKU, URL, JSON-LD (600 char cap) — with explicit `MISSING`
markers. Plus `computeUcpScore` (JSON-LD parses = 60 pts; description/price/SKU/images = 10 each),
framed in the prompt as a *capped penalty floor, never a bonus*, with an explicit
no-double-counting instruction.

**Reliability machinery** (worth preserving): per-simulation persistence enables resume
after a killed invocation; sliding worker pool at `SCAN_CONCURRENCY`; counter writes every
5 completions; stale-`running` scans requeue to `pending` (not `failed`) so progress is kept;
`MAX_ROW_FAILURES = 5` bails out on sustained DB failure rather than burning model spend.

---

## 4. Diagnosis layer

**Trigger** (`optimization.ts:213-260`) — a product is `pending` when *all* hold:
win rate < `WIN_RATE_THRESHOLD` (55) · store is Shopify/WooCommerce · not dismissed ·
not published within `PUBLISH_COOLDOWN_MS` (14 days).

**Rule-based insights** (`optimization.ts:262-322`) — deterministic, no AI: missing
`structuredData` (high) · description < 140 chars or title < 25 chars (content) ·
empty `images` (seo) · non-publishable platform. Capped at 24.

**Per-field AI audit** (`audit-compute.ts`) — scores `title`, `description`, `price`, `sku`,
`structuredData`, `images` on *content quality, not presence*, each with a verdict and a
product-specific suggestion, plus a positioning assessment (audience, market position).
Cached with `"use cache"` keyed on listing content + `updatedAt`, so it runs once per
listing revision. **This is the highest-quality diagnosis in the system and the
optimization path never reads it.**

**Store-level readiness** (`agent-readiness.ts`) — checks real surfaces rather than DB rows:
robots.txt for 10 named crawlers · Product JSON-LD in *rendered* HTML on 3 sampled pages ·
GTIN coverage (agents cluster offers by GTIN) · feed readiness · content depth. Scores
pass=1/warn=0.5/fail=0, and reports unverifiable items as `manual` instead of skipping them.

---

## 5. Generation layer

All AI generation routes through `AI.generate` → **`generateObject` with a Zod schema**
(`ai.ts:272-332`). No free-text parsing anywhere. Adds `experimental_repairText` (strips
code fences, extracts outermost `{...}`), prefix-based provider routing (direct-to-provider,
never the Vercel gateway), and per-call Sentry `gen_ai.*` telemetry with inputs/outputs off.

**Four generators:**

1. **Listing rewrite** (`optimization.ts:113-142`) — `{title, description_html}`. Single
   call. Instructions carry the constraints (spec-rich title, HTML body, *do not invent
   specs that contradict the original*, title < 120 chars). Prompt receives **only**
   title, description, and `winRateBefore`.

2. **Product JSON-LD, path A** (`optimization.ts:516-528`) — schema `{ json_ld: z.string() }`.
   Model returns JSON as a *string inside a string field*; never parsed before persist.

3. **Product JSON-LD, path B** (`ucp/profile.ts:158-183`) — **the schema is the JSON-LD
   shape** (`@context`, `@type: "Product"`, `offers{price, priceCurrency, availability}`,
   `brand`, `url`), then `JSON.stringify`. The model structurally cannot emit malformed
   JSON-LD. This is the correct pattern.

4. **UCP merchant profile** (`ucp/profile.ts:87-127`) — schema-shaped `Merchant` object
   from saved profile fields + top-20 product titles.

**Non-AI generator:** `buildGoogleFeed` (`feed-export.ts:183+`) is a pure deterministic
transform — GTIN regex-validated, sale-price logic per Google spec, HTML stripped, XML
escaped, items missing link/image/price **skipped rather than emitted invalid**. The only
generator that cannot hallucinate; a good reference for how much can be moved off AI.

---

## 6. Findings

### 6.1 Correctness — fix regardless of rewrite scope

**A. `optimizeStoreForAgents` publishes across every store the user owns.**
`optimization.ts:738` calls `approveAllPending()`, which queries products by `userId` only
with no store filter (`optimization.ts:619-629`). Invoking "Optimize for Agents" on store A
rewrites and publishes listings in stores B and C. `listDashboard` has a comment
acknowledging exactly this user-wide/store-scoped mismatch for `published`/`dismissed`
records (`optimization.ts:324-327`) — the same issue in the write path was missed.

**B. Simulation read actions have no ownership check.** `simulation.ts` is `"use server"`,
so `getForProducts`, `getForScan`, and `getForCompetitors` are client-callable endpoints.
Each is wrapped in `withAuthentication` (any logged-in user passes) but the query filters
only on the id list supplied by the caller — no `userId` predicate. Callers inside the
server pass user-scoped ids, so the internal usage is fine; the endpoints are not.

**C. Win rate is a lifetime average, not a current reading.** `getForProducts` fetches
every simulation row for a product across all scans ever (`simulation.ts:36-46`), and
`computeWinRate` averages the lot (`optimization.ts:41-51`). A rewritten listing that wins
every comparison in the next scan is still dragged down by its entire loss history —
combined with the 14-day cooldown, a genuinely fixed product can stay stuck below 55%.
Optimization is therefore chasing a metric that structurally resists improvement.

**D. Failed judge calls are recorded as real losses.** When both orderings error, the
result persists as `winner: "competitor", productScore: 0, competitorScore: 50`
(`background-scan.ts:246-256`). Provider outages become permanent negative signal in a
lifetime average. Should be a distinct non-scoring state.

**E. Two JSON-LD generators write the same column at different rigor.** Path A (§5.2)
persists an unvalidated string; `computeUcpScore` awards **60 of 100 points** purely for
`JSON.parse` succeeding (`formating.ts:50-56`). A malformed value silently scores zero on
the exact dimension it was generated to fix. Path B should be the only path.

**F. `generateAllProductStructuredData` uses a reduced schema** — no `brand`, no `url`
(`ucp/profile.ts:221-233`). Bulk generation produces strictly weaker markup than
single-product generation.

**G. Title length cap is prompt-only.** Schema is `z.string().min(1)` with no max
(`optimization.ts:132`); the 120-char limit lives in the instructions and is not enforced.

**H. Model-authored HTML is published unsanitized.** `description_html` goes straight into
`body_html` on the live storefront with no validation between generation and publish.

### 6.2 Design gaps

**I. The rewriter is blind to the diagnosis.** It receives title, description, and
`winRateBefore` — never `reasoning`, `keyFactors`, the scan's `topFinding`, or the
`audit-compute` field scores and suggestions. The system computes precisely why a listing
lost and does not tell the thing fixing it.

**J. The rewrite can only move 2 of ~7 scored dimensions.** Images, SKU, price, and
structured data all carry explicit judge penalties but are not writable by this path. A
product losing on image count cannot be fixed here — and nothing routes it elsewhere.

**K. Lift is asserted, never measured.** `estimatedLift = clamp(55 − winRate, 5, 40)` and
`winRateAfter = winRate + lift`, written at publish time (`optimization.ts:38-39`, `:432`).
Given (C), the eventual re-measure is also distorted.

**L. Generation is single-shot.** Generate → publish. No critique pass, no re-judging of
the candidate against the rubric that flagged it, no accept/reject gate. The judge panel
exists and could score a draft before it ships; it isn't used that way.

**M. Three measurement systems, no shared spine.** Simulated win rate (proxy, drives
everything), deterministic readiness audit (real, UI-only), catalog rank (ground truth,
env-gated, UI-only). `catalog-rank.ts`'s own header notes it is "a direct, deterministic
measurement of agent-shelf position, unlike the LLM role-play scans" — and it has no path
into the optimization decision.

### 6.3 Dead code and drift

**N. `simulate.ts` `runScan` is unreachable.** Nothing imports it; the dashboard imports
only the `Simulate.TopFinding` type. That leaves ~400 dead lines including three elaborate
per-model scoring methodologies and the `STRICT_SCORING_RULES` block (`simulate.ts:19-165`)
— a **second, competing rubric** with different weights and penalty tables from the live
`RUBRIC_CORE`. `judge.ts`'s `JUDGE_SYSTEM` and `buildJudgePrompt` exist only to serve it.
Anyone reading the tree to understand scoring will likely find the dead rubric first.

**O. Model count drift.** `CLAUDE.md` and product copy claim four models
(ChatGPT, Claude, Gemini, Perplexity); the live panel is three. Perplexity (`sonar`/`sonar-pro`)
appears in `compare.ts` and `discovery.ts`, never in the scan.

**P. Version drift.** Dead path pins `gemini-2.0-flash`, live path `gemini-2.5-flash`.

---

## 7. Questions the rewrite has to answer

1. **What is the optimization target?** Simulated win rate is a proxy the system controls
   both sides of. Catalog rank is ground truth but Shopify-only and credential-gated. Pick
   one as primary, or define explicitly how they compose.

2. **Windowing.** Should win rate be last-scan, last-N-scans, or lifetime? (C) is only a
   bug relative to an intended answer — decide the answer first.

3. **Does diagnosis feed generation?** The cheapest large win available: pass `keyFactors`,
   `reasoning`, and the `audit-compute` per-field suggestions into the rewrite prompt.

4. **Is there a verification gate?** Re-judging a draft against the same panel before
   publish converts an open loop into a closed one, at roughly one extra comparison of cost.

5. **What handles non-copy defects?** Missing images, GTINs, and prices are scored but
   unfixable by rewriting. They need either their own remediation paths or an explicit
   "merchant action required" queue, distinct from the auto-publish queue.

6. **Store vs. account scoping.** Products, scans, and the dashboard are store-scoped;
   `listingOptimization` records and `approveAllPending` are account-scoped. Unify.

7. **One JSON-LD path.** Adopt the schema-as-shape pattern (§5.3) everywhere and delete
   the string-passthrough path.

8. **Delete or revive `runScan`?** If the streaming UX is wanted, rebuild it on
   `JUDGE_SYSTEM_AB` + the live rubric. Otherwise remove it and its rubric together.

---

## 8. Worth keeping

Not everything needs replacing. These are load-bearing and well-built:

- **Position-swap A/B averaging** — real, correctly-motivated debiasing
- **Evidence-before-score + category inference + anchored bands** in `RUBRIC_CORE`
- **UCP score as capped penalty floor** with explicit no-double-counting
- **Scan durability** — per-simulation persistence, resume, stale requeue, failure ceiling
- **`generateObject` + Zod everywhere** — no free-text parsing anywhere in the system
- **`feed-export.ts`** — deterministic, spec-correct, skips rather than emits invalid
- **`agent-readiness.ts`** — audits real surfaces and reports unverifiable checks as
  `manual` rather than silently passing them
