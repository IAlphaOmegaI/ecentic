# 003 — Apply the existing Reveal primitive to the flat landing-page grids

- **Status**: DONE (applied 2026-07-19; executor-implemented, reviewed, feel check pending)
- **Commit**: 35012a3
- **Severity**: LOW
- **Category**: Cohesion (group entrances) / Missed opportunities
- **Estimated scope**: 1 file moved + 6 imports updated + 5 landing components edited

## Problem

The resources and UCP-validator pages reveal their grids on scroll via a shared `Reveal`/`RevealItem` primitive, but the landing page — the highest-traffic marketing surface — renders every section completely flat. The product's own marketing pages disagree with each other about motion.

The primitive already exists and is RSC-compatible (it imports `motion/react-client`, so server components can use it):

```tsx
// apps/web/src/app/(main)/resources/_components/reveal.tsx — current (whole file)
import type { HTMLMotionProps } from "motion/react";
import * as motion from "motion/react-client";
import { Stagger } from "@/lib/animations";

const viewport = { once: true, margin: "-80px" } as const;

export const Reveal = ({ stagger = 0.08, ...props }: Reveal.Props) => (
  <motion.div
    variants={Stagger.Container(stagger)}
    initial="hidden"
    whileInView="visible"
    viewport={viewport}
    {...props}
  />
);

export const RevealItem = (props: HTMLMotionProps<"div">) => (
  <motion.div variants={Stagger.Item} {...props} />
);
```

`Stagger.Item` = `opacity 0→1, y 10→0` on `{ type: "spring", stiffness: 320, damping: 28 }` (`apps/web/src/lib/animations.ts:41-48`). Reveals fire once, `-80px` viewport margin.

The five flat surfaces (all in `apps/web/src/app/(main)/_components/`):

```tsx
// proof.tsx:40-46 — current (stats grid; only the Counter numbers animate)
      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
        ...
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="relative flex flex-col justify-end gap-2 bg-background-dimmed p-6 md:h-64 md:p-8"
          >
```

```tsx
// features.tsx:55-61 — current (feature grid, same shape)
      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
        ...
        {features.map((feature, index) => (
          <div
            key={feature.title}
            className="relative flex flex-col justify-end gap-2 bg-background-dimmed p-4 md:h-82"
          >
```

```tsx
// testimonials.tsx:92-98 — current (cards are <article>, not <div>)
      <div className="relative mx-auto grid max-w-6xl gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-3">
        ...
        {testimonials.map((testimonial, index) => (
          <article
            key={testimonial.name}
            className="relative flex flex-col gap-4 bg-background p-6 md:p-8"
          >
```

```tsx
// steps.tsx:18-20 — current (grid with three content cards at lines 20, 32, 42 and spacer divs between)
        <div className="mt-8 grid w-full grid-cols-1 text-white md:mt-24 md:h-[1100px] md:grid-cols-2 md:grid-rows-3">
          <div className="relative col-start-1 row-start-1 flex flex-col items-start justify-end gap-y-2 overflow-hidden border-white border-b p-6 md:items-end md:border-r md:border-b-0 md:pr-8 md:pl-24">
```

```tsx
// case-study.tsx:43-47 — current (metrics column)
        <div className="grid divide-y divide-accent-foreground border-accent-foreground border-t md:grid-rows-2 md:border-t-0 md:border-l">
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className="relative flex flex-col justify-center gap-1 bg-background-dimmed p-6 md:p-12"
            >
```

## Target

Each grid container becomes `<Reveal className="…same classes…">`; each card becomes `<RevealItem key={…} className="…same classes…">` (or `motion.article` for testimonials). No new values — the primitive's defaults (0.08 stagger, once, `-80px`) are the target. The `<Plus>` decorations and spacer divs stay plain and render immediately.

Because a third page area now consumes the primitive, it moves to the shared components directory first.

## Repo conventions to follow

- Exemplar usage to imitate exactly: `apps/web/src/app/(main)/resources/_components/tools.tsx` (Reveal around a grid, RevealItem per card).
- Shared client primitives live in `apps/web/src/components/` (see `motion.tsx`, `plus.tsx` there).
- Variants come from `@/lib/animations` — do not define new ones.

## Steps

1. Move `apps/web/src/app/(main)/resources/_components/reveal.tsx` to `apps/web/src/components/reveal.tsx` (content unchanged).
2. Update the import path to `@/components/reveal` in all six existing consumers:
   - `src/app/(main)/resources/_components/developer.tsx`
   - `src/app/(main)/resources/_components/guides.tsx`
   - `src/app/(main)/resources/_components/tools.tsx`
   - `src/app/(main)/ucp-validator/_components/checks.tsx`
   - `src/app/(main)/ucp-validator/_components/ucp-validator-form.tsx`
   - `src/app/(main)/ucp-validator/_components/validator-section.tsx`
3. `proof.tsx`: import `{ Reveal, RevealItem }` from `@/components/reveal`; change the grid `<div>` (line 40) to `<Reveal>` with the identical className; change each stat card `<div key={stat.label}>` to `<RevealItem key={stat.label}>` with its identical className. Closing tags follow. Leave `Counter` and its `delay={index * 0.1}` untouched.
4. `features.tsx`: same transformation on the grid (line 55) and feature cards (line 59).
5. `testimonials.tsx`: import `* as motion from "motion/react-client"`, `{ Stagger } from "@/lib/animations"`, and `{ Reveal } from "@/components/reveal"`. Grid `<div>` (line 92) → `<Reveal>`; each `<article>` (line 96) → `<motion.article variants={Stagger.Item}>` keeping key and className (articles keep their semantics — `RevealItem` renders a div, so it is not used here).
6. `steps.tsx`: import `{ Reveal, RevealItem }`; grid `<div>` (line 18) → `<Reveal>`; the three content cards (lines 20, 32, 42 — the ones with radial-glow children, NOT the empty spacer divs) → `<RevealItem>` with identical classNames.
7. `case-study.tsx`: import `{ Reveal, RevealItem }`; metrics grid `<div>` (line 43) → `<Reveal>`; each metric cell → `<RevealItem key={metric.label}>`. Leave the `Counter` delays untouched.

## Boundaries

- Do NOT touch `hero.tsx`, `partners-strip.tsx`, `booking.tsx`, `why-now.tsx`, or any other landing component — only the five files named above.
- Do NOT change any className, key, or content — this is a wrapper-element swap only.
- Do NOT change `reveal.tsx` itself beyond its location.
- Do NOT add new dependencies.
- If a step doesn't match the code you find (drift since 35012a3), STOP and report instead of improvising.

## Verification

- **Mechanical**: `cd apps/web && bun run lint` passes; root `bun run typecheck` error count does not increase (baseline ~74). `rg "resources/_components/reveal"` in `apps/web/src` returns nothing.
- **Feel check**: `bun run dev:web`, open `/` and scroll:
  - Each of the five sections' cards fades up with a visible left-to-right/top-down stagger as the section enters the viewport, exactly like the grids on `/resources`.
  - Scrolling back up and down again does NOT replay the animation (`once: true`).
  - The stat Counters still count up on their own timing, layered on top of the card reveal.
  - Nothing blocks interaction — links/buttons inside cards are clickable mid-reveal.
  - The `/resources` and `/ucp-validator` pages still reveal exactly as before (import move regression check).
- **Done when**: the landing page reveals like the resources page, and no consumer of the old import path remains.
