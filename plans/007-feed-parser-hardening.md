# Plan 007: Harden the product-feed XML parser against entity expansion and oversized inputs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat df39e96..HEAD -- apps/web/src/server/app/integration/feed.ts apps/web/src/server/app/integration/feed-parsing.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. Note: plan 003 moves the parser
> from `feed.ts` into `feed-parsing.ts` — a diff there from plan 003 alone
> is expected, not drift.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/003-verification-baseline.md (the extraction + test file this plan builds on)
- **Category**: security
- **Planned at**: commit `df39e96`, 2026-06-10

## Why this matters

The feed integration parses XML fetched from user-supplied URLs (merchants paste their product-feed URL during onboarding). The `XMLParser` is instantiated with default entity processing and no input size limit. fast-xml-parser does not fetch external entities (no classic XXE file read), but DOCTYPE-declared entity expansion ("billion laughs"-style payloads) and multi-hundred-MB feed bodies are both accepted today — each a denial-of-service vector on the server that parses them. This is an investigate-then-harden plan: first characterize what v5 actually does with a malicious payload, then apply the config and size cap, preserving correct decoding of normal feeds.

## Current state

After plan 003 lands, the parser lives in `apps/web/src/server/app/integration/feed-parsing.ts` (pure module, no `"use server"`), with tests in `feed-parsing.test.ts`. If plan 003 has NOT landed, STOP — this plan's test-first approach needs that infrastructure.

The parser as written (originally `feed.ts:52-103`):

```ts
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        removeNSPrefix: true,
      });

      const parsed = parser.parse(text);
```

The fetch site remains in `feed.ts` (it downloads the feed body as text and hands it to the parser). `fast-xml-parser` is pinned `^5.8.0` in `apps/web/package.json`.

**Relevant fast-xml-parser options (v5):**
- `processEntities` (default `true`) — when true, DOCTYPE-declared entities AND predefined entities (`&amp;` etc.) are expanded.
- With `processEntities: false`, NO entities are decoded — including `&amp;` → titles like `"Beauty &amp; Care"` would surface raw. The plan compensates by decoding only the five predefined XML entities manually after parsing (a bounded, non-recursive substitution — safe by construction).

**Conventions that apply (the user's zenn-style):** `const` only; no abbreviated names; `resultify` for fallible work; helpers grouped in the same `feed-parsing.ts` module (no new one-function file).

## Commands you will need

| Purpose   | Command                              | Expected on success |
|-----------|--------------------------------------|---------------------|
| Tests     | `cd apps/web && bun test src`        | all pass            |
| Typecheck | `cd apps/web && bun run typecheck`   | exit 0              |
| Lint      | `bun run lint` (repo root)           | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `apps/web/src/server/app/integration/feed-parsing.ts`
- `apps/web/src/server/app/integration/feed-parsing.test.ts`
- `apps/web/src/server/app/integration/feed.ts` (the fetch site — size cap only)

**Out of scope** (do NOT touch):
- The JSON branch of the parser (already wrapped in `resultify`; JSON.parse has no entity expansion).
- `server/utils/http.ts` — the generic request helper serves other callers; the size cap belongs at the feed call site.
- Any other XML usage in the repo (search first; if other `XMLParser` instantiations exist, list them in your report — do not change them here).

## Git workflow

- Branch: `advisor/007-feed-parser-hardening`
- Commit style: `fix: cap feed size and disable XML entity expansion`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Characterize current behavior with a hostile payload (test-first)

Add to `feed-parsing.test.ts` a test using a classic expansion payload:

```ts
const bomb = `<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
  <!ENTITY lol4 "&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;">
]>
<rss><channel><item><title>&lol4;</title><price>1</price></item></channel></rss>`;
```

Assert, with the CURRENT parser config, what happens (wrap in `resultify` if it throws). Record the observed behavior (expanded length of the title, time taken) in the test name or a comment. This is the before-picture; run it BEFORE changing the config.

**Verify**: `cd apps/web && bun test src` → the new test passes (it asserts current behavior, whatever that is) and completes in under ~2s. If the test HANGS or the process OOMs, that confirms the vulnerability at maximum severity — kill it, note it, and proceed to Step 2 (leaving the test asserting the post-fix behavior instead).

### Step 2: Disable entity processing, restore predefined entities manually

In `feed-parsing.ts`:

1. Add `processEntities: false` to the `XMLParser` options.
2. Add a bounded decoder for the five predefined entities and apply it to every string field in the returned item mapping (title, description, url, image, sku, id — the `String(...)` call sites):

```ts
const ENTITIES = [
  ["&lt;", "<"],
  ["&gt;", ">"],
  ["&quot;", '"'],
  ["&apos;", "'"],
  ["&amp;", "&"], // last — so "&amp;lt;" does not double-decode into "<"
] as const;

const decode = (value: string) =>
  ENTITIES.reduce(
    (decoded, [entity, character]) => decoded.replaceAll(entity, character),
    value,
  );
```

3. Update Step 1's bomb test: the parsed title must now contain the LITERAL string `&lol4;` (un-expanded) and parse in well under a second.
4. Add a normal-entity test: a feed item with `<title>Beauty &amp; Care &lt;Premium&gt;</title>` parses to title `Beauty & Care <Premium>`.

**Verify**: `cd apps/web && bun test src` → all pass, including the updated bomb test and the predefined-entity test.

### Step 3: Cap the feed body size at the fetch site

In `feed.ts`, locate where the fetched response body becomes the text handed to the parser. Before parsing, guard:

```ts
const FEED_BYTE_LIMIT = 10 * 1024 * 1024; // 10MB — generous for product feeds

if (text.length > FEED_BYTE_LIMIT)
  return { success: false, error: new Error("feed-too-large") };
```

Match the surrounding function's error convention (it returns Results — follow the adjacent failure branches in the same function for the exact error shape; if it uses an error class from `server/utils/error.ts` such as `ParseError` or `RequestError`, use that instead of a bare `Error`).

**Verify**: `cd apps/web && bun run typecheck` → exit 0.

## Test plan

- Bomb payload: parses without expansion in < 1s (Step 2.3).
- Predefined entities decode correctly (Step 2.4).
- All pre-existing characterization tests from plan 003 still pass UNCHANGED except any that asserted entity-expanded output — if one did, update it and call that out in your report (it documents the intentional behavior change).
- Verification: `cd apps/web && bun test src` → all pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "processEntities: false" apps/web/src/server/app/integration/feed-parsing.ts` → 1 match
- [ ] `grep -n "FEED_BYTE_LIMIT" apps/web/src/server/app/integration/feed.ts` → ≥ 1 match
- [ ] `cd apps/web && bun test src` exits 0, including the bomb test and predefined-entity test
- [ ] `cd apps/web && bun run typecheck` exits 0; `bun run lint` exits 0
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 003 has not landed (no `feed-parsing.ts` / no test infra).
- `processEntities: false` is rejected by the installed fast-xml-parser version (option renamed/removed in v5) — report the version's actual option surface (`node_modules/fast-xml-parser/src/` or its README) rather than guessing a substitute.
- Disabling entity processing breaks more than one pre-existing characterization test — the real-world feed corpus may rely on entity decoding more than expected; report which tests and reassess the decode-helper coverage.

## Maintenance notes

- If feeds later stream (instead of buffering to text), move the size cap to the stream reader (`Content-Length` check first, then a byte counter — `Content-Length` alone is spoofable).
- The manual decoder intentionally handles ONLY the five predefined entities; numeric character references (`&#39;`) are not decoded. If merchant feeds surface them, extend `decode` with a bounded `/&#x?[0-9a-fA-F]+;/` substitution — never re-enable `processEntities`.
- Reviewer should scrutinize: `&amp;` is decoded LAST in the helper; the size limit returns a Result, not a throw.
