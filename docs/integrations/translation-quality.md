# Translation workflow and quality

ecentic has one English source catalog and six translation targets: Spanish, French, German, Italian, Japanese and Simplified Chinese. The current release exposes English, Spanish, French and German; Italian, Japanese and Simplified Chinese stay unpublished until their complete catalogs pass review. `publishedLocales` controls routing, the selector, authentication and search indexing independently of the translation target registry. Translation covers public pages, metadata, accessibility labels, authentication, onboarding, dashboard controls and transactional authentication email. Merchant-supplied product content, external provider responses, protocol examples, brands and code retain their own language and identity.

## Language and voice

The locale contract is `apps/web/src/i18n/locales.ts`. The language brief is `.translation/locales.yaml`; the executable terminology and style instructions are in `apps/web/src/i18n/translation/policy.ts`.

| Locale | Conventions | Address and prose |
| --- | --- | --- |
| `es` | Spanish, Spain | Established professional **tú** usage |
| `fr` | French, France | **vous** where needed; concise action labels |
| `de` | German, Germany | **Sie** where needed; clear verbs and readable compounds |
| `it` | Italian, Italy | Direct professional **tu**; conventional short labels |
| `ja` | Japanese, Japan | Compact labels; consistent **です・ます** prose |
| `zh-CN` | Simplified Chinese, mainland China | Concise business language; natural classifiers and punctuation |

Write as the target language is normally written. An English cart-winning metaphor describes products being selected for purchase; do not mechanically translate it into winning a physical shopping cart. Preserve quantifiers, qualifications, uncertainty and the actual action a button triggers. Product listings are product information/pages, not automatically a list of products. An AI shopping agent is software choosing or buying products, not a human sales representative.

Translating the interface does not change supported markets, support languages, incorporation, currencies, plan limits or legal obligations. Calls and support remain in the language stated in the approved source. Keep plan names, company names, APIs, identifiers, model names, code, URLs and route slugs intact. Translate labels around them. Do not convert USD pricing into another currency.

## Skills and runtime

The user invoked `translating-web`. Its core, software, marketing, language and review dependencies are pinned under `.agents/skills/`; upstream commit and MIT license are recorded in `translation-skills.SOURCE.md` and `translation-skills.LICENSE`. Italian uses the core skill with the project locale brief.

Production jobs use a versioned adaptation of those instructions, not a file in a developer's home directory. The shared runner:

1. Receives contextual prose units with stable IDs, executable format and protected terms.
2. Drafts the entire group through the configured Azure deployment.
3. Checks identifiers, ICU syntax and branch scopes, HTML/Markdown, code, links, numerical facts and currency mechanically.
4. Makes a separate request for semantic, terminology, linguistic, locale, structural and surface review. Its compact response records the six ordered passes once, every reviewed unit ID, and per-unit issues; missing/duplicate IDs or unknown issue IDs fail validation. Saved review reports retain the full normalized source/target pairs.
5. Corrects affected units once and reviews those units again through all six passes. Unchanged neighboring targets are supplied as context; their first completed review is reused, not repeated. The merged final report records fresh/reused IDs and retains complete source/target coverage. Changed targets cannot reuse an old review, and deterministic checks rerun across the entire batch.
6. Makes one fresh evidence-only request for remaining editorial findings, with exact source/target excerpts. It may dismiss a normal grammatical variation or a finding attached to the wrong text; it never rewrites the target. Material defects, uncertainty, invalid excerpts and deterministic failures remain blocked. Original findings and every decision are retained under a separate adjudication version. Unaffected reviewed units can be checkpointed.

A machine review is not a human or native-speaker approval. Linguistic review is also separate from runtime layout testing. Source ambiguity must be resolved from approved product context; it cannot be repaired by inventing a promise or fact.

## Catalog workflow

Run from `apps/web`, after merging current English and Spanish source fragments:

```sh
bun scripts/translate-catalogs.ts --dry-run
bun --env-file=.env.local scripts/translate-catalogs.ts --locales=fr,de,it,ja,zh-CN --concurrency=6
bunx next typegen
bun run i18n:check
```

The generator records source hashes and policy versions, checkpoints complete units and writes a target catalog only after every current source entry is covered. It also projects the final values into per-feature fragments so merging remains repeatable. It never fills a missing target entry with English prose. Source-language brand names, code and stable data are explicitly classified as invariants.

Review records and resumable checkpoints default to `output/translations-2026-11-12/catalogs/`. Targeted manual/adjudicated patches must be checked against the current source and deterministic validator before entering a checkpoint. A new source hash invalidates the old target. Do not blindly retry an identical unresolved linguistic finding.

Saved final review targets can be adjudicated once without redrafting. Stop catalog workers before writing checkpoints:

```sh
bun --env-file=.env.local scripts/adjudicate-translation-reports.ts --directory=../../output/translations-2026-11-12/catalogs --concurrency=4 --write-checkpoints
```

The command verifies current English source text, retains deterministic findings and preserves any already reviewed checkpoint correction. An adjudication is cached against the exact input report digest; rerunning applies the same decision rather than soliciting repeated favorable verdicts. This cannot clear a real unresolved translation defect. Correct those units through a reviewed targeted patch.

`i18n:check` requires all published catalogs and exact key parity; pass `--all` to audit every translation target, including unfinished catalogs. New locales also receive executable/protected-content validation. Existing Spanish retains its historical key-parity gate; new automatic Spanish blog translations use the shared full review workflow.

## Blog workflow

See [Website and blog localization](blog-i18n.md) for the queue schema, webhook, minute cron, source-version guards, migration, backfill and targeted review patch format. Public reads remain Postgres-only. No render path calls Azure. Slugs stay shared, and sitemap/hreflang advertise completed translations only.

HTML is translated through text and accessibility-attribute slots. Scripts, code, attributes, links, images and document structure remain intact. Japanese and Chinese completeness is checked by unit coverage and semantic review rather than an English character-length ratio.

Numeric validation permits exact locale representations while retaining value, sign and currency identity. CJK prose may use equivalent magnitudes (`$67 billion` → `670亿美元`, `126 million` → `1億2600万`), normalized with BigInt decimal arithmetic. Explicit dated month names may become numeric CJK months; ordinals and singular durations may use digits. These exceptions do not alter code, numeric identifiers, unknown currency identity, or the requirement to preserve dates and amounts.

## Runtime verification

Check every configured locale at desktop and mobile widths. Exercise long German/French controls, Japanese/Chinese headings, forms, locale switching with query/hash state, recovery pages, metadata, blog tags and OG images. CJK OG rendering uses licensed server-side Noto fonts; browser text uses intentional system CJK fallbacks. Product screenshots and the existing film keep their original language with a localized explanation/transcript where applicable.
