# Plan 003: Establish a verification baseline — Bun test runner, first characterization tests, and a CI workflow

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat df39e96..HEAD -- apps/web/src/server/app/integration/feed.ts apps/web/package.json package.json .github`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. 

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `df39e96`, 2026-06-10

## Why this matters

The repo has zero automated tests and no CI. The only verification is `tsc --noEmit`, Biome, and `next build` — which catch type and syntax errors but no logic errors. Every risky change (the proxy auth fix in plan 004, the XML hardening in plan 007, any refactor of the simulation engine) currently ships on hope. This plan establishes the smallest honest baseline: Bun's built-in test runner (already the repo's toolchain — no new dependency), characterization tests for the highest-value *pure* logic, and a CI workflow so the suite gates every push. It deliberately does NOT attempt to test server actions that import Next.js runtime modules — that requires heavier scaffolding and is out of scope.

## Current state

- **No test files exist**: `find apps/web/src packages -name "*.test.ts" -not -path "*/node_modules/*"` returns nothing.
- **No CI**: there is no `.github/` directory.
- **Toolchain**: Bun 1.3 (`packageManager: bun@1.3.14` in root `package.json`), Turborepo. Bun ships a built-in Jest-compatible test runner: `bun test` discovers `*.test.ts` recursively from cwd. No new devDependency is needed.
- **Why server actions can't be tested directly**: files under `apps/web/src/server/app/` start with `"use server"` and import `next/headers`, Better Auth, and Sentry through `server/utils/context.ts` — none of which load outside the Next.js runtime. Pure logic must be extracted to test it.
- **The extraction target**: `apps/web/src/server/app/integration/feed.ts` (starts with a biome-ignore comment then `"use server"`). It contains module-local pure parsing logic this plan extracts:
  - `parsePrice` (~lines 20-50) — parses `"USD 29.99"` / symbol-prefixed price strings into `{ price, currency }`.
  - `const Utils = { Parser: { xml: ..., json: ... } }` (~lines 52-120) — `Utils.Parser.xml` builds an `XMLParser` (fast-xml-parser) and maps RSS/Atom/Google-Shopping entries to product objects:

```ts
const Utils = {
  Parser: {
    xml: (text: string): Type[] => {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        removeNSPrefix: true,
      });

      const parsed = parser.parse(text);
      const channel = parsed?.rss?.channel ?? parsed?.feed ?? parsed;
      ...
```

  - `Type` is the feed-item type declared in the same file.
- **`@zenncore/utils`** (`packages/shared/utils`) exports `resultify` and the `Result` type — pure, importable, ideal for the smoke test.
- **Existing scripts**: root `package.json` has `typecheck`, `lint`; `apps/web/package.json` has `typecheck` (`tsc --noEmit`) and `lint`. Neither has `test`.

**Conventions that apply (the user's zenn-style — follow exactly):**

- `const` only; no abbreviated names; single-word variable names where possible (`payload`, `parsed`, `items`).
- Generic filenames grouping related exports — one test file per module under test, named `<module>.test.ts` next to the module.
- No types folder; no explicit return-type annotations on wrapper callbacks.
- Namespace imports for module bundles: `import * as Feed from "./feed-parsing";` style where it reads naturally.

## Commands you will need

| Purpose   | Command                              | Expected on success        |
|-----------|--------------------------------------|----------------------------|
| Install   | `bun install` (repo root)            | exit 0                     |
| Typecheck | `cd apps/web && bun run typecheck`   | exit 0, no errors          |
| Lint      | `bun run lint` (repo root)           | exit 0                     |
| Tests     | `cd apps/web && bun test src`        | all pass (after this plan) |

## Scope

**In scope** (the only files you should modify/create):
- `apps/web/src/server/app/integration/feed-parsing.ts` (create — extracted pure logic)
- `apps/web/src/server/app/integration/feed-parsing.test.ts` (create)
- `apps/web/src/server/app/integration/feed.ts` (imports updated to use the extraction; behavior unchanged)
- `apps/web/src/server/utils/result.test.ts` (create — smoke test for `resultify` via `@zenncore/utils`)
- `apps/web/package.json` (add `"test": "bun test src"` script)
- `package.json` (root — add `"test": "turbo run test"` only if you also add a turbo task; simpler: `"test": "cd apps/web && bun test src"`)
- `.github/workflows/ci.yml` (create)

**Out of scope** (do NOT touch):
- Any server action logic — extraction must be move-only, zero behavior change.
- `turbo.json` — wiring `test` into turbo's task graph is optional follow-up, not required here.
- `next build` in CI — it needs production env vars (DATABASE_URL etc.) that CI doesn't have; do not add it.
- Hardening the XML parser options — plan 007 owns that; here you only move the code.

## Git workflow

- Branch: `advisor/003-verification-baseline`
- Commit style: `feat: add bun test baseline and CI workflow`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Smoke test for `resultify`

Create `apps/web/src/server/utils/result.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { resultify } from "@zenncore/utils";

describe("resultify", () => {
  test("wraps a successful sync callback", () => {
    const parsed = resultify(() => JSON.parse('{"value":1}') as { value: number });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.value).toBe(1);
  });

  test("captures a thrown error", () => {
    const parsed = resultify(() => JSON.parse("not json"));
    expect(parsed.success).toBe(false);
  });

  test("wraps a successful async callback", async () => {
    const value = await resultify(async () => 42);
    expect(value.success).toBe(true);
    if (value.success) expect(value.data).toBe(42);
  });
});
```

If `resultify`'s actual sync/async signature differs (check `packages/shared/utils/src/`), adapt the assertions to the real contract — the test characterizes what IS.

**Verify**: `cd apps/web && bun test src` → 3 pass, 0 fail.

### Step 2: Extract pure feed parsing into `feed-parsing.ts`

Create `apps/web/src/server/app/integration/feed-parsing.ts` with NO `"use server"` directive. Move — verbatim, zero edits beyond `export` keywords — from `feed.ts`:

- the `Type` declaration for a parsed feed item (export it as `export type Item = ...` if `Type` would collide with feed.ts's re-export; otherwise keep the name and have `feed.ts` re-export it),
- `parsePrice` (export it),
- the `Utils` object (export it as `export const Parser = Utils.Parser;` or export `Utils` directly — pick whichever keeps `feed.ts`'s call sites smallest),
- the `XMLParser` import from `fast-xml-parser` and the `resultify` import if the moved code uses it.

Then in `feed.ts`: delete the moved code and import the moved symbols. Keep the biome-ignore header comment in whichever file still needs literal-key access (the parser code — move the comment with it).

**Verify**:
- `cd apps/web && bun run typecheck` → exit 0
- `grep -n "use server" apps/web/src/server/app/integration/feed-parsing.ts` → no matches

### Step 3: Characterization tests for feed parsing

Create `apps/web/src/server/app/integration/feed-parsing.test.ts` covering, at minimum:

1. **Google Shopping RSS**: an XML string with `<rss><channel><item><g:title>`, `g:price` (`"USD 29.99"`), `g:link`, `g:id` → parses to one item with `title`, `price: "29.99"`, `currency: "USD"`, `sku`/`id` populated.
2. **Single item not wrapped in an array** (the `channel?.item` non-array branch) → still returns a one-element array.
3. **Atom `<feed><entry>`** shape → items parsed via the `entry` branch.
4. **Empty/garbage XML** → returns `[]` (or characterize the actual behavior — if it throws, wrap in the test and record that as the current contract).
5. **`parsePrice` cases**: `"USD 29.99"` → `{ price: "29.99", currency: "USD" }`; `"$19.99"` → numeric part with `currency: null`; empty string → characterize.
6. **JSON parser**: a `{"products": [...]}` payload → items returned; invalid JSON → characterize (it uses `resultify`, so likely `[]` or an error result).

These are characterization tests: assert what the code DOES today, not what it should do. If a behavior looks wrong, note it in your report — do not fix it here.

**Verify**: `cd apps/web && bun test src` → all pass (≥ 9 tests total).

### Step 4: Wire up scripts

- `apps/web/package.json`: add `"test": "bun test src"` to `scripts`.
- Root `package.json`: add `"test": "cd apps/web && bun test src"` to `scripts`.

**Verify**: `bun run test` from the repo root → all pass.

### Step 5: CI workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.14
      - run: bun install --frozen-lockfile
      - run: cd apps/web && bun run typecheck
      - run: bunx biome ci .
      - run: cd apps/web && bun test src
```

Note `biome ci` (check-only) — NOT `bun run lint`, which is `biome check --write` and would mutate files in CI. If `bunx biome ci .` fails locally on pre-existing issues outside this plan's files, scope it to `bunx biome ci apps/web/src` and record that in your report.

**Verify**: each of the three commands in the workflow, run locally from a clean checkout state, exits 0.

## Test plan

This plan IS the test plan. Inventory on completion: 1 smoke file (resultify), 1 characterization file (feed parsing) with ≥ 6 cases, runnable via `bun test src` locally and in CI.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cd apps/web && bun test src` exits 0 with ≥ 9 passing tests
- [ ] `cd apps/web && bun run typecheck` exits 0
- [ ] `bunx biome ci apps/web/src` exits 0 (or the scoping caveat is recorded in the report)
- [ ] `.github/workflows/ci.yml` exists and its steps each exit 0 when run locally
- [ ] `git diff df39e96..HEAD -- apps/web/src/server/app/integration/feed.ts` shows only deletions of moved code and added imports (no logic edits)
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `bun test` cannot import `@zenncore/utils` (workspace resolution failure) after one attempt at fixing via `bun install`.
- The moved parser code transitively imports anything that fails outside Next.js (e.g. `server/utils/http.ts` pulling Sentry). The extraction must stay pure — report which import blocks it instead of stubbing/mocking around it.
- `feed.ts`'s `"use server"` constraint rejects re-exporting a type or const you moved (Next only allows async function exports from `"use server"` files) — adjust by NOT re-exporting from `feed.ts` and updating external importers only if there are ≤ 2 of them; otherwise stop and report the importer list.

## Maintenance notes

- This baseline covers pure logic only. The natural next layers, in order of value: (1) repository CRUD against a disposable Postgres (e.g. `DATABASE_URL` pointed at a local test DB), (2) route handlers (`api/tracking/agent-visit`, `api/cron/scan`) via direct `GET/POST` function invocation with mocked store actions. Both need the context wrapper to be import-safe outside Next — a refactor worth its own plan.
- Plans 004 and 007 depend on this infra: 004 adds tests for cookie signing helpers, 007 adds entity-expansion tests to `feed-parsing.test.ts`.
- Reviewer should scrutinize: the feed.ts diff is move-only; CI uses check-mode biome, not write-mode. 
