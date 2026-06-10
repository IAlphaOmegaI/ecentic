# Plan 006: Remove unused dependencies, add a committed `.env.example`, and rotate the weak cron secret

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat df39e96..HEAD -- apps/web/package.json .gitignore`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `df39e96`, 2026-06-10

## Why this matters

Three unrelated hygiene debts, bundled because each is a few minutes of work: (1) `@shopify/cli` (~10MB, a CLI tool) sits in the web app's **runtime** dependencies with zero imports anywhere in the source tree — it inflates installs and is pure attack/audit surface; `three` + `@types/three` are leftovers from an abandoned dataroom feature, also zero imports. (2) The repo requires ~20 env vars but ships no `.env.example`, so onboarding means hunting through CLAUDE.md and `turbo.json` — and `.gitignore`'s `.env*` pattern would silently swallow an example file if someone created one naïvely. (3) The deployed `CRON_SECRET` is a weak human-typed string (observed in the local env during audit — value deliberately not reproduced here); since it's the only thing protecting `/api/cron/scan` from triggering up-to-20-user scan batches (real LLM spend), it should be crypto-random.

## Current state

- `apps/web/package.json` `dependencies` includes `"@shopify/cli": "^4.1.0"` (line ~33); `devDependencies` includes `"three": "^0.184.0"` and `"@types/three": "^0.184.1"` (lines ~67, ~70).
- Verified at planning time: `grep -rn "@shopify/cli\|from \"three\"" apps packages scripts --include="*.ts" --include="*.tsx"` matches nothing outside the `.next/` build artifact. The Shopify integration (`apps/web/src/server/app/integration/shopify.ts`) talks to the Admin API over plain HTTP via `server/utils/http.ts` — it does not use the CLI.
- `.gitignore:8-9` contains `.env*` (and `:54` has `.env*.local`) — an `.env.example` would be ignored without a negation.
- No `.env.example` exists anywhere (`git ls-files | grep -i env` → empty).
- Required env vars, assembled from `CLAUDE.md` ("Environment Variables" section) and `turbo.json`'s build `env` list:
  `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_BASE_URL`, `RESEND_API_KEY`, `FROM_EMAIL`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `UPLOADTHING_TOKEN`, `AZURE_RESOURCE_NAME`, `AZURE_API_KEY`, `AZURE_BASE_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `CRON_SECRET`, `APP_HOST`, `ECENTIC_TRACKER_PUBLIC_ORIGIN`, `ECENTIC_TRACKER_PROBE`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `UPSTASH_REDIS_REST_READ_ONLY_TOKEN` — plus whatever Step 3's grep sweep finds (Stripe keys are likely: `stripe` is a dependency and `api/stripe/webhook` exists).
- The cron consumer — `apps/web/src/app/(provider)/api/cron/scan/route.ts:5-19`:

```ts
export const GET = async (request: Request) => {
  const authorization = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  ...
  if (authorization !== `Bearer ${secret}`)
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
```

The bearer-token pattern itself is fine; only the secret's entropy is the problem.

## Commands you will need

| Purpose   | Command                              | Expected on success |
|-----------|--------------------------------------|---------------------|
| Remove    | `cd apps/web && bun remove @shopify/cli three @types/three` | exit 0, lockfile updated |
| Typecheck | `cd apps/web && bun run typecheck`   | exit 0              |
| Build     | `bun run build:web` (repo root)      | exit 0              |
| Secret    | `openssl rand -base64 32`            | 44-char random string |

## Scope

**In scope** (the only files you should modify/create):
- `apps/web/package.json` + `bun.lock` (via `bun remove`)
- `apps/web/.env.example` (create)
- `.gitignore` (one negation line)

**Out of scope** (do NOT touch):
- Any `.env.local` file — never commit one, never edit the user's local values.
- The cron route's auth logic — the pattern stays; only the secret value rotates (and that happens in deployment config, not in the repo).
- `packages/*` manifests.

## Git workflow

- Branch: `advisor/006-dependency-env-hygiene`
- Commit style: `chore: drop unused deps, add .env.example`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Remove the unused dependencies

`cd apps/web && bun remove @shopify/cli three @types/three`

**Verify**:
- `grep -c "shopify/cli\|\"three\"" apps/web/package.json` → `0`
- `cd apps/web && bun run typecheck` → exit 0
- `bun run build:web` → exit 0 (this is the authoritative proof nothing imported them; the build needs the local env vars — if it fails for an unrelated missing var, record which and rely on typecheck + a `grep -rn "three\b" apps/web/src` sweep instead)

### Step 2: Enumerate the real env surface

Run `grep -rhoE "process\.env\.[A-Z_]+" apps/web/src apps/web/*.ts apps/web/*.config.* 2>/dev/null | sort -u` and union the result with the list in Current state. This catches vars added after this plan was written (Stripe keys, PostHog, etc.).

**Verify**: the grep output is non-empty and every name in it appears in the file you write in Step 3.

### Step 3: Create `apps/web/.env.example`

One line per variable, grouped with comments, placeholder values only — NEVER a real value. Shape:

```bash
# --- Database ---
DATABASE_URL=postgres://user:password@localhost:5432/ecentic

# --- Auth (Better Auth) ---
BETTER_AUTH_SECRET=          # generate: openssl rand -base64 32
BETTER_AUTH_BASE_URL=http://localhost:3000

# --- Email (Resend) ---
RESEND_API_KEY=
FROM_EMAIL=

# --- Shopify integration ---
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=

# --- Storage (UploadThing) ---
UPLOADTHING_TOKEN=

# --- AI (Azure) ---
AZURE_RESOURCE_NAME=
AZURE_API_KEY=
AZURE_BASE_URL=

# --- Monitoring ---
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# --- Cron ---
CRON_SECRET=                 # generate: openssl rand -base64 32

# --- Tracking ---
APP_HOST=
ECENTIC_TRACKER_PUBLIC_ORIGIN=
ECENTIC_TRACKER_PROBE=

# --- Redis (Upstash) ---
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
UPSTASH_REDIS_REST_READ_ONLY_TOKEN=
```

…extended with everything Step 2 found.

**Verify**: `grep -cE "=(.*[A-Za-z0-9]{20,})" apps/web/.env.example` → `0` matches outside the placeholder `DATABASE_URL`/`BETTER_AUTH_BASE_URL` lines (i.e. no real-looking secrets).

### Step 4: Un-ignore the example file

Add to `.gitignore`, directly below the `.env*` line:

```
!.env.example
```

**Verify**: `git check-ignore apps/web/.env.example` → exit 1 (NOT ignored); `git check-ignore apps/web/.env.local` → exit 0 (still ignored).

### Step 5: Rotate `CRON_SECRET` (report-back item)

The executor cannot change deployed secrets. Generate a replacement (`openssl rand -base64 32`), do NOT write it to any file in the repo, and include in your completion report: "CRON_SECRET must be rotated in the deployment environment (Vercel project settings) and in the scheduler that calls `/api/cron/scan`; a generated candidate was NOT persisted — the operator should generate their own with `openssl rand -base64 32`."

**Verify**: `git grep -i "cron_secret" -- ':!plans'` shows only `process.env.CRON_SECRET` references and `.env.example`'s empty placeholder — no value anywhere.

## Test plan

No new tests — Step 1's build is the regression gate. If plan 003 has landed, `cd apps/web && bun test src` must still pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `apps/web/package.json` contains none of `@shopify/cli`, `three`, `@types/three`
- [ ] `cd apps/web && bun run typecheck` exits 0; `bun run build:web` exits 0 (or the env-var caveat is recorded)
- [ ] `apps/web/.env.example` exists, is tracked (`git check-ignore` exit 1), and contains no secret values
- [ ] `.gitignore` contains `!.env.example`
- [ ] Completion report includes the CRON_SECRET rotation instruction
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1's typecheck or build fails with an error that mentions `three` or `@shopify/cli` — something does import them after all (the planning-time grep says otherwise; trust the build).
- `bun remove` rewrites unrelated dependency versions in the lockfile beyond removing the three packages (inspect `git diff bun.lock` stat — large unrelated churn means a Bun resolution quirk; report instead of committing it).

## Maintenance notes

- Keep `.env.example` in sync: any PR that adds a `process.env.X` read should add the placeholder line. (A lint/CI check for this is a possible follow-up.)
- The Shopify CLI, if it's ever wanted for theme/app tooling, belongs in `devDependencies` — or better, invoked via `bunx @shopify/cli`.
- Reviewer should scrutinize: the `.env.example` placeholders leak nothing; the `.gitignore` negation comes AFTER the `.env*` pattern (order matters for gitignore negations).
