# 005 — Give the email-verified badge a celebratory spring pop

- **Status**: DONE (applied 2026-07-20; executor-implemented, reviewed, feel check pending)
- **Commit**: 35012a3
- **Severity**: LOW
- **Category**: Missed opportunities (delight budget, once-per-signup moment)
- **Estimated scope**: 1 file (`verify/success/page.tsx`), 1 import change + 1 wrapper

## Problem

The email-verification success page is seen exactly once per user — the frequency tier where the delight budget lives. Today the big success badge enters as just another item in the generic page stagger; the one true celebration moment reads flat.

```tsx
// apps/web/src/app/(auth)/verify/success/page.tsx:65-79 — current
          <Motion.Item className="w-full flex-1 border-accent-foreground border-b px-8">
            <div className="flex h-full flex-col items-center justify-center gap-6 border-accent-foreground border-x p-6">
              <CheckBadgeIcon className="size-24 text-success" />
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="font-medium text-2xl text-success">
                  Successfully verified
                </p>
```

The file is already a client component with motion imported:

```tsx
// verify/success/page.tsx (imports) — current
import * as motion from "motion/react-client";
...
import { Fade } from "@/lib/animations";
```

## Target

The badge scales in with a visible bounce, slightly after the page stagger settles. `Spring.Bounce` = `{ type: "spring", stiffness: 400, damping: 20 }` from `apps/web/src/lib/animations.ts:6` — the repo's designated bounce for playful moments. Entrance starts at `scale: 0.5`, never `scale: 0` (nothing appears from nothing).

```tsx
// import change
import { Fade, Spring } from "@/lib/animations";
```

```tsx
// target
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...Spring.Bounce, delay: 0.35 }}
              >
                <CheckBadgeIcon className="size-24 text-success" />
              </motion.div>
```

The wrapper sets explicit `initial`/`animate` (not variants), so it animates independently of the surrounding `Motion.Item` stagger context.

## Repo conventions to follow

- Springs come from `@/lib/animations` (`Spring.Bounce` for celebratory moments) — never inline configs.
- Exemplar for an explicit-props motion element nested inside stagger variants: the width-fill bars in `apps/web/src/app/(auth)/onboarding/scan/_components/complete-phase.tsx:154-162`.

## Steps

1. In `apps/web/src/app/(auth)/verify/success/page.tsx`, change `import { Fade } from "@/lib/animations";` to `import { Fade, Spring } from "@/lib/animations";`.
2. Wrap the `<CheckBadgeIcon className="size-24 text-success" />` at line 67 in the `motion.div` shown in Target.

## Boundaries

- Do NOT touch the headline, the copy, the footer button, the `Onboarding` aside, or the page's existing `Motion.Stagger`/`Fade.Right` structure.
- Do NOT animate the `BellIcon` on `verify/page.tsx` — out of scope for this plan.
- Do NOT exceed the values given (no rotation, no confetti, no repeated pulses — one pop).
- Do NOT add new dependencies.
- If a step doesn't match the code you find (drift since 35012a3), STOP and report instead of improvising.

## Verification

- **Mechanical**: `cd apps/web && bun run lint` passes; root `bun run typecheck` error count does not increase (baseline ~74).
- **Feel check**: `bun run dev:web`, open `/verify/success` directly:
  - The page staggers in as before; ~0.35s in, the badge pops from half-size with a single visible overshoot and settles.
  - The pop reads as one gesture — if it looks like two competing entrances (stagger fade + pop), the delay is doing its job when the pop clearly starts after the item fade; verify at 10% speed in DevTools → Animations.
  - Text below the badge does not shift when the badge scales (scale is transform-only, no layout change).
- **Done when**: the badge visibly celebrates once, and nothing else on the page changed.
