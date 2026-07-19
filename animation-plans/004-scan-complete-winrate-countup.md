# 004 — Count up the win rate on the scan-complete screen

- **Status**: DONE (applied 2026-07-19; executor-implemented, reviewed, feel check pending)
- **Commit**: 35012a3
- **Severity**: LOW
- **Category**: Missed opportunities (delight budget, rare first-run moment)
- **Estimated scope**: 1 file (`complete-phase.tsx`), 1 import + 1 element

## Problem

The scan-complete screen is the emotional payoff of onboarding: per-model win-rate bars animate their widths, but the headline number — the win rate itself — renders as static text. The most important number on the screen is the only thing that doesn't move.

```tsx
// apps/web/src/app/(auth)/onboarding/scan/_components/complete-phase.tsx:198-201 — current
                  <p className={cn("font-medium text-2xl", color)}>
                    {winRate}%
                  </p>
```

For contrast, the model bars right above it already animate:

```tsx
// complete-phase.tsx:154-162 — current (leave untouched; shown for timing reference)
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${rate}%` }}
                        transition={{
                          ...Spring.Gentle,
                          delay: 0.35 + index * 0.1,
                        }}
                      />
```

A count-up component already exists and is exactly right for this: `Counter` (`apps/web/src/app/(main)/_components/counter.tsx`) wraps NumberFlow, parses strings like `"64%"`, starts when in view, and animates over `{ duration: 1200, easing: "ease-out" }`. This is a rare, first-run celebration — the 1.2s duration is allowed here.

## Target

```tsx
// import to add
import { Counter } from "@/app/(main)/_components/counter";
```

```tsx
// complete-phase.tsx:198-201 — target
                  <p className={cn("font-medium text-2xl", color)}>
                    <Counter value={`${winRate}%`} delay={0.45} />
                  </p>
```

- `delay={0.45}` starts the count just after the model bars begin filling (they start at 0.35s), so the number lands as the bars settle.
- `Counter` renders a `<span>` inside the existing `<p>`, so the `color` class (success/warning/error tone from the `switch (true)` at :55) still applies.

## Repo conventions to follow

- Exemplar: `apps/web/src/app/(main)/_components/proof.tsx:57-61` uses `<Counter value={stat.value} delay={index * 0.1} className="…" />` the same way.
- Do not re-implement a count-up with `animate`/`useMotionValue` — reuse `Counter`.

## Steps

1. In `apps/web/src/app/(auth)/onboarding/scan/_components/complete-phase.tsx`, add the `Counter` import (the file is already `"use client"`).
2. Replace `{winRate}%` at lines 198-201 with `<Counter value={`${winRate}%`} delay={0.45} />` as shown in Target.

## Boundaries

- Do NOT touch the model bars, the Top Finding block, or the other stat cells (`finalProductCount` etc.) — the win rate is the single celebrated number; animating every stat would dilute it.
- Do NOT move or modify `counter.tsx`.
- Do NOT change the `color` logic.
- Do NOT add new dependencies.
- If a step doesn't match the code you find (drift since 35012a3), STOP and report instead of improvising.

## Verification

- **Mechanical**: `cd apps/web && bun run lint` passes; root `bun run typecheck` error count does not increase (baseline ~74).
- **Feel check**: run onboarding through a scan (or temporarily render `CompletePhase` with fixture props) and watch the completion screen:
  - The win-rate number rolls from 0 to its value over ~1.2s, starting a beat after the model bars begin.
  - The number keeps its tone color (success/warning/error) while counting.
  - The digits use tabular figures (no horizontal jitter while rolling — `Counter` applies `tabular-nums`).
  - Replaying the phase (remount) replays the count — it is keyed to in-view, `once`.
- **Done when**: the headline win rate counts up once, timed with the bars, and every other number on the screen is unchanged.
