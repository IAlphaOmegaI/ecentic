# 001 — Animate suggestion cards leaving the optimize queue

- **Status**: DONE (applied 2026-07-19; executor-implemented, reviewed, feel check pending)
- **Commit**: 35012a3
- **Severity**: MEDIUM
- **Category**: Missed opportunities (teleporting state)
- **Estimated scope**: 1 file (`optimize-client.tsx`), ~6 small edits

## Problem

Approving or dismissing a suggestion is the primary action of the Optimize page. Both handlers call `router.refresh()`, which re-renders the server data — the card simply vanishes from the list in a single frame and the queue below teleports up. The most satisfying moment of the workflow is its most jarring frame.

```tsx
// apps/web/src/app/(main)/dashboard/[store]/optimize/_components/optimize-client.tsx:393 — current (approveOne, same shape in dismissOne :412 and reconsiderOne :431)
      router.refresh();
```

```tsx
// optimize-client.tsx:654-667 — current (pending list; dismissed list is the same shape at :702-715)
                <div className="space-y-px bg-accent-foreground">
                  {pending.map((item) => (
                    <PendingCard
                      key={item.product.id}
                      ...
                    />
                  ))}
                </div>
```

```tsx
// optimize-client.tsx:54 — current
const SUGGESTION_CARD_CLASSES = "bg-background-rich p-5";

// optimize-client.tsx:186 — current (PendingCard root)
  <div className={SUGGESTION_CARD_CLASSES}>

// optimize-client.tsx (DismissedCard root, definition starts :281) — current
  <div className={`${SUGGESTION_CARD_CLASSES} opacity-80`}>
```

Key fact: `OptimizeClient` is a client component receiving `data` as a prop. After `router.refresh()` completes, the same component instance re-renders with the item gone from `pending` (destructured at :495). That means `AnimatePresence` can detect the removal and play an exit — **no optimistic local state is needed**.

## Target

Cards fade + collapse out (~300ms spring); the rows below flow up naturally as the height collapses.

```tsx
// imports to add
import { AnimatePresence, motion } from "motion/react";
import { Spring } from "@/lib/animations";
```

```tsx
// PendingCard root (was <div className={SUGGESTION_CARD_CLASSES}>)
  <motion.div
    exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
    transition={Spring.Snappy}
    style={{ overflow: "hidden" }}
    className={SUGGESTION_CARD_CLASSES}
  >
```

Same change on the DismissedCard root, keeping its `opacity-80` class:

```tsx
  <motion.div
    exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
    transition={Spring.Snappy}
    style={{ overflow: "hidden" }}
    className={`${SUGGESTION_CARD_CLASSES} opacity-80`}
  >
```

```tsx
// pending list (same wrap for the dismissed list at :702)
                <div className="space-y-px bg-accent-foreground">
                  <AnimatePresence initial={false}>
                    {pending.map((item) => (
                      <PendingCard key={item.product.id} ... />
                    ))}
                  </AnimatePresence>
                </div>
```

- `Spring.Snappy` is `{ type: "spring", stiffness: 320, damping: 28 }` from `apps/web/src/lib/animations.ts:4` — do not inline new values, import it.
- `initial={false}` so cards do NOT animate in on mount or tab switches — only exits animate. Entrances stay instant, which is correct for a functional queue.
- Default `AnimatePresence` mode (sync), NOT `mode="popLayout"` — popLayout requires direct motion-component children and would position the exiting card absolutely; the height collapse makes siblings follow naturally without `layout` props.
- Height/padding are layout properties — normally avoided, but this is an occasional-frequency exit on a single card; the collapse is what lets the list close up smoothly.

## Repo conventions to follow

- Springs come from `apps/web/src/lib/animations.ts` (`Spring.Snappy/Gentle/Bounce`) — never hand-typed configs.
- Exemplar for `AnimatePresence` + exit in this repo: `apps/web/src/app/(main)/dashboard/_components/simulation-modal.tsx` (phase swaps).
- Keep zenn-style: `const` only, no abbreviated names, no explicit return-type annotations.

## Steps

1. In `apps/web/src/app/(main)/dashboard/[store]/optimize/_components/optimize-client.tsx`, add the two imports shown above (the file currently has no motion imports).
2. Change the `PendingCard` root `<div className={SUGGESTION_CARD_CLASSES}>` (line 186) to the `motion.div` shown in Target. Closing tag becomes `</motion.div>`.
3. Change the `DismissedCard` root `<div className={\`${SUGGESTION_CARD_CLASSES} opacity-80\`}>` to its `motion.div` variant. Closing tag becomes `</motion.div>`.
4. Wrap the `{pending.map(...)}` block (line 655) in `<AnimatePresence initial={false}>…</AnimatePresence>`, inside the existing `space-y-px` div.
5. Wrap the `{dismissed.map(...)}` block (line 703) the same way.

## Boundaries

- Do NOT touch `PublishedCard` — published entries never leave their list interactively.
- Do NOT add optimistic state, `layout` props, or `mode="popLayout"`.
- Do NOT change the handlers (`approveOne`/`dismissOne`/`reconsiderOne`) or any markup other than the two card roots and the two map wrappers.
- Do NOT add new dependencies.
- If a step doesn't match the code you find (drift since 35012a3), STOP and report instead of improvising.

## Verification

- **Mechanical**: `cd apps/web && bun run lint` (biome, should pass). `bun run typecheck` from the repo root has ~74 pre-existing errors — confirm the error count does not increase, not that it is zero.
- **Feel check**: `bun run dev:web`, open `/dashboard/<store>/optimize` with pending suggestions:
  - Dismiss a suggestion: the card fades and collapses (~300ms) and the card below slides up into place — no single-frame jump.
  - Approve a suggestion: same exit; the success toast still fires.
  - Switch between Pending/Published/Dismissed tabs: cards appear instantly, no entrance animation (that's `initial={false}` working).
  - Restore a dismissed suggestion: its card exits the Dismissed list the same way.
  - In DevTools → Animations panel at 10% speed, confirm the exiting card clips its content (no text overflow spill) while collapsing.
- **Done when**: no list item in the optimize queue ever disappears in a single frame, and tab switches remain animation-free.
