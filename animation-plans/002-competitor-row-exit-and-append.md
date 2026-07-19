# 002 — Bridge competitor row removal and incremental appends in onboarding

- **Status**: DONE (applied 2026-07-19 with one amendment; feel check pending)
- **Commit**: 35012a3

> **Amendment during review**: the plan's `<AnimatePresence initial={false}>` in `competitor-list.tsx` was applied WITHOUT `initial={false}` — that prop disables initial animations on children present at first mount, which would have suppressed the existing `Stagger.Item` mount stagger this plan promises to preserve. `competitor-results.tsx` keeps `initial={false}` as planned (its first batch is covered by the tab's block crossfade).
- **Severity**: MEDIUM
- **Category**: Missed opportunities (list changes without enter/exit)
- **Estimated scope**: 2 files (`competitor-list.tsx`, `competitor-results.tsx`), small edits

## Problem

Two seams in the competitor onboarding flow:

**A. Removal teleports.** Rows already stagger in on mount via `motion.tr`, but there is no `AnimatePresence`, so clicking the X makes the row vanish in one frame and the rows below jump up.

```tsx
// apps/web/src/app/(auth)/onboarding/competitors/_components/competitor-list.tsx:51-63 — current
          <TableBody
            render={
              <motion.tbody
                variants={Stagger.Container(0.04)}
                initial="hidden"
                animate="visible"
              />
            }
          >
            {competitors.map((record) => (
              <TableRow
                key={record.id}
                render={<motion.tr variants={Stagger.Item} />}
```

The removal handler filters state instantly:

```tsx
// apps/web/src/app/(auth)/onboarding/competitors/review/_components/competitor-review.tsx:39-42 — current
  const handleRemove = async (id: string) => {
    setCompetitors((previous) => previous.filter((record) => record.id !== id));
    void Competitor.removeForUser({ id });
  };
```

**B. Appended rows pop in.** `UrlTab`/`SearchTab` append scraped results incrementally (`setCompetitors(previous => [...previous, ...new])`); each new row in the shared results list appears with no entrance, and "Clear" wipes all rows in one frame.

```tsx
// apps/web/src/app/(auth)/onboarding/competitors/_components/competitor-results.tsx:35-40 — current
    <ScrollArea className="min-h-0 flex-1 bg-background-rich">
      {competitors.map((competitor) => (
        <div
          key={competitor.id}
          className="flex items-start gap-3 border-accent-foreground border-b p-3 transition-colors last:border-b-0 hover:bg-background-dimmed/40"
        >
```

## Target

**A — `competitor-list.tsx`:** removed rows fade out (150ms), then the list closes up. (A deliberate simplification: animating `<tr>` height or using `mode="popLayout"` inside a `<tbody>` breaks table layout — the fade explains the vanish, which is the important part.)

```tsx
// imports: extend the existing motion import
import { AnimatePresence, motion } from "motion/react";
```

```tsx
          <TableBody
            render={
              <motion.tbody
                variants={Stagger.Container(0.04)}
                initial="hidden"
                animate="visible"
              />
            }
          >
            <AnimatePresence initial={false}>
              {competitors.map((record) => (
                <TableRow
                  key={record.id}
                  render={
                    <motion.tr
                      variants={Stagger.Item}
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    />
                  }
```

**B — `competitor-results.tsx`:** each row becomes a `motion.div` that fades up as it is appended, and fades out on Clear.

```tsx
// imports to add
import { AnimatePresence, motion } from "motion/react";
import { Spring } from "@/lib/animations";
```

```tsx
    <ScrollArea className="min-h-0 flex-1 bg-background-rich">
      <AnimatePresence initial={false}>
        {competitors.map((competitor) => (
          <motion.div
            key={competitor.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={Spring.Snappy}
            className="flex items-start gap-3 border-accent-foreground border-b p-3 transition-colors last:border-b-0 hover:bg-background-dimmed/40"
          >
```

`Spring.Snappy` = `{ type: "spring", stiffness: 320, damping: 28 }` from `apps/web/src/lib/animations.ts:4`.

## Repo conventions to follow

- Variants come from `apps/web/src/lib/animations.ts` (`Stagger.Item` is already used on these rows — keep it).
- Exemplar for `render={<motion.tr …/>}` on the shared Table: this same file, line 63.
- zenn-style: `const` only, no abbreviated names.

## Steps

1. In `competitor-list.tsx`, change the motion import (line 18, `import { motion } from "motion/react";`) to also import `AnimatePresence`.
2. Wrap the `{competitors.map(...)}` block (line 60) in `<AnimatePresence initial={false}>…</AnimatePresence>`, directly inside `TableBody`.
3. Add the `exit` prop to the `motion.tr` in the `render` prop (line 63), as shown in Target.
4. In `competitor-results.tsx`, add the two imports (the file currently imports no motion code).
5. Convert the row `<div key={competitor.id} …>` (line 37) to the `motion.div` shown in Target — same key, same className, closing tag becomes `</motion.div>` — and wrap the map in `<AnimatePresence initial={false}>`.

## Boundaries

- Do NOT touch `competitor-review.tsx`, `url-tab.tsx`, `search-tab.tsx`, or `auto-detect-tab.tsx` — their handlers and crossfades stay as they are.
- Do NOT add `layout` props or `mode="popLayout"` to table rows.
- Do NOT change the toggle/selection behavior or checkbox transitions in `competitor-list.tsx`.
- Do NOT add new dependencies.
- If a step doesn't match the code you find (drift since 35012a3), STOP and report instead of improvising.

## Verification

- **Mechanical**: `cd apps/web && bun run lint` passes; root `bun run typecheck` error count does not increase (baseline is ~74 pre-existing errors).
- **Feel check**: `bun run dev:web`, go through onboarding → competitors (and the review step):
  - Remove a competitor via the X: the row fades over ~150ms before the list closes up — no single-frame vanish.
  - Rapidly remove several rows: each fade completes independently; nothing gets stuck (CSS-free spring/transition retargeting).
  - In the URL/search tabs, paste a URL or run a search: each result row fades up ~8px as it lands; rows added in later batches animate too.
  - Click Clear: rows fade out together instead of blinking away.
  - Mount stagger on the review table still plays exactly as before.
- **Done when**: no competitor row appears or disappears in a single frame anywhere in onboarding.
