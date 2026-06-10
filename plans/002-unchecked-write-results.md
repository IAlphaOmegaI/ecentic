# Plan 002: Check every Result returned by database writes in the intelligence layer and eliminate silent empty catches

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat df39e96..HEAD -- apps/web/src/server/app/intelligence`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (001 touches different lines of the same `background-scan.ts` region — coordinate by executing 001 first if both run)
- **Category**: bug
- **Planned at**: commit `df39e96`, 2026-06-10

## Why this matters

This repo's convention is the `Result` pattern: every fallible call returns `{ success, data | error }` and the caller checks `.success`. Several database writes in the intelligence layer ignore the returned Result entirely. Consequences today: a scan can run all its LLM simulations, fail to persist them (`Simulation.create`), fail to mark itself complete (`Scan.update`), and still report `{ success: true }` to the caller — the user pays for the AI calls and sees nothing. Separately, three `catch {}` blocks in the UCP checker silently swallow JSON parse failures, producing UCP validation verdicts based on uninitialized values.

## Current state

**The Result type every repository write returns** — see `apps/web/src/server/utils/repository.ts:221-263`. `update` returns `{ success: true, data: row }` or `{ success: false, error: DatabaseError }`. `create` is analogous. The convention for checking is visible everywhere, e.g. `apps/web/src/server/app/scan.ts:63-64`:

```ts
  const scan = await get(Environment.SERVER, id);
  if (!scan.success) return scan;
```

**Site A — `apps/web/src/server/app/intelligence/background-scan.ts:179-196`** (inside `runScanForUser`, which returns a Result):

```ts
  await Promise.all(
    results.map((result) =>
      Simulation.create(Environment.SERVER, {
        scanId: scan.data.id,
        ...result,
      }),
    ),
  );

  const wins = results.filter((result) => result.winner === "product").length;
  const losses = results.length - wins;

  await Scan.update(Environment.SERVER, scan.data.id, {
    status: "complete",
    completedSimulations: totalSimulations,
    wins,
    losses,
  });
```

Both the `Promise.all` of creates and the `Scan.update` discard their Results.

**Site B — `apps/web/src/server/app/intelligence/background-scan.ts:255-275`** (inside `runPendingScans`, a `reduce` over pending scans):

```ts
        await Scan.update(Environment.SERVER, scan.id, { status: "running" });
        const result = await runScanForUser(context, { user: scan.userId });

        if (!result.success)
          await Scan.update(Environment.SERVER, scan.id, { status: "failed" });

        return [...previous, { scanId: scan.id, success: result.success }];
```

Both `Scan.update` calls discard their Results.

**Site C — `apps/web/src/server/app/intelligence/simulate.ts:616-622`** (inside the streaming scan flow; the surrounding code emits progress via `update({ kind: "log", ... })`):

```ts
      await Scan.update(Environment.SERVER, scan.data.id, {
        status: "complete",
        completedSimulations: totalSimulations,
        wins,
        losses,
        topFinding: finding,
      });
```

**Site D — `apps/web/src/server/app/intelligence/ucp.ts`**, two spots:
- ~`:186` (inside `generateProductStructuredData`):

```ts
    await Product.update(Environment.SERVER, product.data.id, {
      structuredData: structuredJson,
      updatedAt: new Date(),
    });

    return { success: true as const, data: { json: structuredJson } };
```

- ~`:236-241` (inside `generateAllProductStructuredData`, in a `Promise.all` map per product):

```ts
        await Product.update(Environment.SERVER, product.id, {
          structuredData: json,
          updatedAt: new Date(),
        });

        return { productId: product.id, success: true as const, json };
```

**Site E — `apps/web/src/server/app/intelligence/ucp-advanced-check.ts`**, three `catch {}` blocks at ~`:376-384`, ~`:626-632`, ~`:766-772`. Representative excerpt (~`:376`):

```ts
  if (initTextResult.success && initResponse.ok) {
    try {
      const body = JSON.parse(initTextResult.data) as McpInitBody;
      if (typeof body.result?.protocolVersion === "string") {
        protocolVersion = body.result.protocolVersion;
      }
      const srvName = body.result?.serverInfo?.name;
      if (typeof srvName === "string") serverName = srvName;
    } catch {}
```

The other two are the same shape with `CartBody` (assigning `cartId`) and `CheckoutSessionBody` (assigning `sessionId`).

**Conventions that apply (the user's zenn-style — follow exactly):**

- `resultify` instead of `try/catch` for fallible work. `resultify` is exported from `@zenncore/utils` and handles synchronous callbacks: `const body = resultify(() => JSON.parse(text) as T);` — then `if (body.success)` and read `body.data` inline.
- Never name a binding `[something]Result`; name it by domain concept (`completion`, `persistence`, `body`).
- Never extract `.data` into a second variable; read it inline.
- `const` only; early returns; omit braces for single-statement conditionals.
- Do NOT add explicit return-type annotations to `withContext`/`withAuthentication` callbacks.

## Commands you will need

| Purpose   | Command                              | Expected on success |
|-----------|--------------------------------------|---------------------|
| Install   | `bun install` (repo root)            | exit 0              |
| Typecheck | `cd apps/web && bun run typecheck`   | exit 0, no errors   |
| Lint      | `bun run lint` (repo root)           | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `apps/web/src/server/app/intelligence/background-scan.ts`
- `apps/web/src/server/app/intelligence/simulate.ts`
- `apps/web/src/server/app/intelligence/ucp.ts`
- `apps/web/src/server/app/intelligence/ucp-advanced-check.ts`

**Out of scope** (do NOT touch):
- `apps/web/src/server/utils/repository.ts` — the Result contract is correct; don't change it.
- Any restructuring of the mutable `let` bindings (`protocolVersion`, `cartId`, `sessionId`) in `ucp-advanced-check.ts` beyond the catch replacement — a full const-only refactor of that file is a separate concern.
- The status literal values themselves (plan 001 owns those).

## Git workflow

- Branch: `advisor/002-unchecked-write-results`
- Commit style: `fix: check Result of intelligence-layer database writes`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Site A — persist failures fail the scan (`background-scan.ts:179-196`)

Replace the unchecked block with:

```ts
  const persisted = await Promise.all(
    results.map((result) =>
      Simulation.create(Environment.SERVER, {
        scanId: scan.data.id,
        ...result,
      }),
    ),
  );

  const failure = persisted.find((creation) => !creation.success);

  if (failure && !failure.success) {
    await Scan.update(Environment.SERVER, scan.data.id, { status: "failed" });
    return failure;
  }

  const wins = results.filter((result) => result.winner === "product").length;
  const losses = results.length - wins;

  const completion = await Scan.update(Environment.SERVER, scan.data.id, {
    status: "complete",
    completedSimulations: totalSimulations,
    wins,
    losses,
  });

  if (!completion.success) return completion;
```

(The `failure && !failure.success` double-check is for TypeScript narrowing of the union; keep it.)

**Verify**: `cd apps/web && bun run typecheck` → exit 0.

### Step 2: Site B — reflect update failures in the per-scan outcome (`background-scan.ts:255-275`)

```ts
        const transition = await Scan.update(Environment.SERVER, scan.id, {
          status: "running",
        });

        if (!transition.success)
          return [...previous, { scanId: scan.id, success: false }];

        const result = await runScanForUser(context, { user: scan.userId });

        if (!result.success)
          await Scan.update(Environment.SERVER, scan.id, { status: "failed" });

        return [...previous, { scanId: scan.id, success: result.success }];
```

The `status: "failed"` write stays best-effort (its failure shouldn't mask the scan failure already being reported), so leaving it unchecked there is intentional — add the comment `// best-effort: the scan failure below is already reported` above it.

**Verify**: `cd apps/web && bun run typecheck` → exit 0.

### Step 3: Site C — `simulate.ts:616-622`

Bind and check. Look at the enclosing function: it streams progress through an `update({ kind: ... })` callback and the surrounding code continues after this write. Pattern:

```ts
      const completion = await Scan.update(Environment.SERVER, scan.data.id, {
        status: "complete",
        completedSimulations: totalSimulations,
        wins,
        losses,
        topFinding: finding,
      });

      if (!completion.success)
        update({
          kind: "log",
          model: "System",
          message: "Failed to persist scan results — please re-run the scan.",
        });
```

If the enclosing scope returns a Result and an early `return completion;` type-checks, prefer that over the log-only handling.

**Verify**: `cd apps/web && bun run typecheck` → exit 0.

### Step 4: Site D — `ucp.ts` both spots

First spot (single product):

```ts
    const persistence = await Product.update(Environment.SERVER, product.data.id, {
      structuredData: structuredJson,
      updatedAt: new Date(),
    });

    if (!persistence.success) return persistence;

    return { success: true as const, data: { json: structuredJson } };
```

Second spot (inside the per-product map):

```ts
        const persistence = await Product.update(Environment.SERVER, product.id, {
          structuredData: json,
          updatedAt: new Date(),
        });

        if (!persistence.success)
          return { productId: product.id, success: false as const };

        return { productId: product.id, success: true as const, json };
```

**Verify**: `cd apps/web && bun run typecheck` → exit 0.

### Step 5: Site E — replace the three `catch {}` blocks with `resultify`

Confirm `resultify` is imported in `ucp-advanced-check.ts` (`grep -n "resultify" apps/web/src/server/app/intelligence/ucp-advanced-check.ts`); if absent, add `import { resultify } from "@zenncore/utils";` matching the file's existing import block. Then per site, the shape (shown for the init body; mirror for cart and checkout):

```ts
  if (initTextResult.success && initResponse.ok) {
    const body = resultify(() => JSON.parse(initTextResult.data) as McpInitBody);

    if (body.success) {
      if (typeof body.data.result?.protocolVersion === "string")
        protocolVersion = body.data.result.protocolVersion;

      const srvName = body.data.result?.serverInfo?.name;
      if (typeof srvName === "string") serverName = srvName;
    }
  }
```

Behavior is intentionally identical on parse failure (defaults stand) — the change removes the `try/catch` style violation and makes the failure branch explicit and debuggable.

**Verify**: `grep -c "catch {}" apps/web/src/server/app/intelligence/ucp-advanced-check.ts` → `0`, and `cd apps/web && bun run typecheck` → exit 0.

## Test plan

No test infrastructure exists at planning time (plan 003 establishes it). If plan 003 has landed, add `apps/web/src/server/app/intelligence/background-scan.test.ts` only if `background-scan.ts` imports cleanly under `bun test` (it pulls server-only modules; it likely does not import cleanly — in that case skip tests and rely on typecheck, and note that in your report).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cd apps/web && bun run typecheck` exits 0
- [ ] `bun run lint` exits 0
- [ ] `grep -c "catch {}" apps/web/src/server/app/intelligence/ucp-advanced-check.ts` outputs `0`
- [ ] `grep -n "await Scan.update" apps/web/src/server/app/intelligence/background-scan.ts` shows every call either bound to a checked `const` or carrying the `// best-effort` comment
- [ ] `grep -n "await Product.update" apps/web/src/server/app/intelligence/ucp.ts` shows both calls bound to a checked `const`
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any excerpt in "Current state" doesn't match the live code (drift — especially if plan 001 already changed `background-scan.ts:191`; re-locate by pattern and continue only if the surrounding logic is unchanged).
- In Step 3 the enclosing function's control flow makes both the early-return and the log-only handling impossible to type-check.
- TypeScript narrowing rejects the `failure && !failure.success` pattern in Step 1 after one reasonable adjustment.

## Maintenance notes

- Reviewer should scrutinize: that no happy-path behavior changed — every edit only adds a failure branch.
- Future work this interacts with: if scan writes are ever wrapped in a DB transaction (they should be, eventually — `Simulation.create` × N + `Scan.update` is a multi-write without atomicity), Steps 1 and 3 are where the transaction boundary goes.
- Deferred deliberately: the `let` bindings and overall structure of `ucp-advanced-check.ts` (859+ lines) need a dedicated refactor; this plan only removes the silent catches.
