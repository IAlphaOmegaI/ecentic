# 008 — Honor prefers-reduced-motion across all Motion-driven animation

- **Status**: DONE (applied 2026-07-19; executor-implemented, reviewed, feel check pending)
- **Commit**: 35012a3
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 new file (`src/context/motion.tsx`), 1 edit (`src/app/layout.tsx`)

## Problem

The app animates extensively through the Motion library (onboarding staggers, scan phases, simulation modal, landing reveals — and everything plans 001–007 add), but nothing anywhere honors `prefers-reduced-motion`. A grep for `useReducedMotion`/`prefers-reduced-motion` across `apps/web/src` at 35012a3 returns nothing. Users who ask the OS for reduced motion get the full choreography.

```tsx
// apps/web/src/app/layout.tsx:142-151 — current
        <Suspense>
          <PostHogProvider>
            <ThemeProvider>
              <ToastProvider>
                <div className="isolate">{children}</div>
                <ToastList types={["error", "success", "info"]} />
              </ToastProvider>
            </ThemeProvider>
          </PostHogProvider>
        </Suspense>
```

## Target

One provider fixes every Motion animation at once. `MotionConfig reducedMotion="user"` makes Motion respect the OS setting: **transform and layout animations are disabled, opacity and color animations still play** — exactly the "gentler, not zero" standard (movement dropped, feedback kept).

New file:

```tsx
// apps/web/src/context/motion.tsx — target (whole file)
"use client";

import { MotionConfig } from "motion/react";
import type { PropsWithChildren } from "react";

export const MotionProvider = ({ children }: PropsWithChildren) => (
  <MotionConfig reducedMotion="user">{children}</MotionConfig>
);
```

Layout edit:

```tsx
// apps/web/src/app/layout.tsx — target (imports + tree)
import { MotionProvider } from "@/context/motion";
...
        <Suspense>
          <PostHogProvider>
            <ThemeProvider>
              <MotionProvider>
                <ToastProvider>
                  <div className="isolate">{children}</div>
                  <ToastList types={["error", "success", "info"]} />
                </ToastProvider>
              </MotionProvider>
            </ThemeProvider>
          </PostHogProvider>
        </Suspense>
```

## Repo conventions to follow

- Client context providers live in `apps/web/src/context/` (see `theme.tsx` there; `PostHogProvider` follows the same shape).
- Named export with arrow function, `PropsWithChildren`, no explicit return type (zenn-style).

## Steps

1. Create `apps/web/src/context/motion.tsx` with the exact content shown in Target.
2. In `apps/web/src/app/layout.tsx`, add the import and wrap `ToastProvider` with `MotionProvider` as shown (inside `ThemeProvider`, outside `ToastProvider`).

## Boundaries

- Do NOT touch any component's animation code — this plan is the provider only.
- Do NOT attempt to gate the CSS-driven animations in `packages/web` (Base UI `data-starting-style` transitions, `active:scale-99`, toast swipes) — those are a separate, larger effort; note it and move on.
- Do NOT use `reducedMotion="always"`.
- Do NOT add new dependencies (`MotionConfig` ships with the existing `motion` package).
- If a step doesn't match the code you find (drift since 35012a3), STOP and report instead of improvising.

## Verification

- **Mechanical**: `cd apps/web && bun run lint` passes; root `bun run typecheck` error count does not increase (baseline ~74).
- **Feel check**: `bun run dev:web`, then in DevTools → Rendering panel set "Emulate CSS media feature prefers-reduced-motion" to `reduce`:
  - Reload `/sign-in`: the form items fade in with **no vertical movement** (the `y: 10` translation is dropped, opacity remains).
  - Landing/resources reveals: cards fade, no slide.
  - Turn emulation off and reload: full motion returns.
  - Sanity-check one flow end-to-end (onboarding connect step) under reduced motion — nothing becomes invisible or stuck at `opacity: 0`.
- **Done when**: with reduced motion on, no Motion-driven element translates or scales, but every element still fades in and all content is reachable.
