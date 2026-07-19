# 006 — Transition between UCP validator runs instead of hard-swapping results

- **Status**: DONE (applied 2026-07-19; executor-implemented in a pre-plan-003 worktree, merged into the main tree by manual edits to preserve plan 003's reveal import; feel check pending)
- **Commit**: 35012a3
- **Severity**: MEDIUM
- **Category**: Missed opportunities (state indication) + latent bug in the first-run entrance
- **Estimated scope**: 1 file (`ucp-validator-form.tsx`), 3 edits

## Problem

Running a second validation hard-swaps the old results block for the new one in a single frame — with no exit and no re-entrance, it's easy to miss that the results changed at all.

```tsx
// apps/web/src/app/(main)/ucp-validator/_components/ucp-validator-form.tsx:1237 — current
      {result && <Results result={result} />}
```

```tsx
// ucp-validator-form.tsx:1110-1126 — current (state + handler)
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<UcpCheck.UcpCheckResult | null>(null);

  const [handleCheck, isChecking] = useAsyncAction(async () => {
    const response = await UcpCheck.checkUCP(domain);
    ...
    setResult(response.data);
  });
```

There is also a latent bug in the *first* entrance. `Results` wraps itself in `Motion.Up`:

```tsx
// ucp-validator-form.tsx:870 — current
    <Motion.Up className="border-accent-foreground border-t">
```

`Motion.Up` (`apps/web/src/components/motion.tsx:30-32`) is `motion.div variants={Fade.Up}` with **no `initial`/`animate` props** — variants only fire when a parent sets them, and `Results` has no variant parent here. The intended fade-up almost certainly never plays. The fix below makes the entrance explicit and deterministic either way.

## Target

Old results fade out (150ms), new results fade up (`Fade.Up` = `opacity 0→1, y 12→0` on `{ type: "spring", stiffness: 320, damping: 28 }`, `apps/web/src/lib/animations.ts:10-17`), keyed per run.

```tsx
// imports: replace the Motion import (line 17) — Motion.Up at :870 is this file's only use
import { AnimatePresence, motion } from "motion/react";
import { Fade } from "@/lib/animations";
```

```tsx
// state: add a run counter next to result (:1111)
  const [run, setRun] = useState(0);

// handler: bump it on every successful check (after setResult(response.data);)
    setResult(response.data);
    setRun((previous) => previous + 1);
```

```tsx
// Results wrapper (:870) — target
    <motion.div
      variants={Fade.Up}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="border-accent-foreground border-t"
    >
```

```tsx
// render site (:1237) — target
      <AnimatePresence mode="wait" initial={false}>
        {result && <Results key={run} result={result} />}
      </AnimatePresence>
```

- `mode="wait"`: the old block finishes its 150ms fade before the new one enters — no double-exposure crossfade.
- `key={run}` (not the domain): re-running the *same* domain must still re-animate, since the data may differ.
- `initial={false}` is safe: `result` is null on mount, so the first appearance is an *entering* child and still plays `Fade.Up`.

## Repo conventions to follow

- Variants from `@/lib/animations`; `AnimatePresence mode="wait"` phase-swap exemplar: `apps/web/src/app/(main)/dashboard/_components/simulation-modal.tsx`.
- zenn-style: `const` only; the counter is named `run`, updater uses `previous`, not `prev`.

## Steps

1. In `ucp-validator-form.tsx`, replace `import { Motion } from "@/components/motion";` (line 17) with the two imports shown in Target (first confirm `Motion` has no other uses in the file; at 35012a3 its only uses are the `Motion.Up` pair at :870/:1102).
2. Add `const [run, setRun] = useState(0);` after the `result` state (line 1111).
3. Add `setRun((previous) => previous + 1);` immediately after `setResult(response.data);` (line 1125).
4. Replace the `<Motion.Up className="border-accent-foreground border-t">` / `</Motion.Up>` pair (lines 870/1102) with the explicit `motion.div` shown in Target.
5. Wrap the render site (line 1237) in `<AnimatePresence mode="wait" initial={false}>` and add `key={run}` to `<Results />`.

## Boundaries

- Do NOT touch the `Results` internals (score rows, robots table, capabilities) or the form/`DomainCheckPreview`.
- Do NOT animate on `isChecking` (no loading skeleton work here) — only the swap.
- Do NOT use the domain string as the key.
- Do NOT add new dependencies.
- If a step doesn't match the code you find (drift since 35012a3), STOP and report instead of improvising.

## Verification

- **Mechanical**: `cd apps/web && bun run lint` passes; root `bun run typecheck` error count does not increase (baseline ~74).
- **Feel check**: `bun run dev:web`, open `/ucp-validator`:
  - First check: results fade up ~12px (this now demonstrably plays — compare against production if unsure whether it did before).
  - Second check on a *different* domain: old block fades out, new block fades up — two distinct beats, no overlap.
  - Second check on the *same* domain: same two beats (the `run` key at work).
  - The page doesn't scroll-jump during the swap; `mode="wait"` briefly collapses the block — confirm the collapse reads as part of the transition at 10% speed, not as a flash of missing content. If it jars, note it in the review; do not improvise a fix.
- **Done when**: consecutive validator runs are visually distinguishable as a result change, and the first run's entrance is deterministic.
