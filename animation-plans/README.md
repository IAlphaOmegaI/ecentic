# Animation Plans

Implementation plans produced by `improve-animations` from the `find-animation-opportunities` sweep (2026-07-17, commit `35012a3`). Each plan is self-contained: an executor needs no other context. Root `plans/` was already in use for non-animation work, hence this directory.

Shared vocabulary all plans draw from: `apps/web/src/lib/animations.ts` (springs + variants), `apps/web/src/components/motion.tsx` (`Motion.*` wrappers), `apps/web/src/app/(main)/resources/_components/reveal.tsx` (scroll reveal — moved to `src/components/` by plan 003).

| # | Plan | Severity | Status |
| --- | --- | --- | --- |
| 001 | [Optimize queue card exit](001-optimize-queue-card-exit.md) | MEDIUM | DONE (feel check pending) |
| 002 | [Competitor row exit + append](002-competitor-row-exit-and-append.md) | MEDIUM | DONE (feel check pending) |
| 003 | [Landing scroll reveal](003-landing-scroll-reveal.md) | LOW | DONE (feel check pending) |
| 004 | [Scan-complete win-rate count-up](004-scan-complete-winrate-countup.md) | LOW | DONE (feel check pending) |
| 005 | [Verify-success badge pop](005-verify-success-badge-pop.md) | LOW | DONE (feel check pending) |
| 006 | [UCP validator rerun transition](006-ucp-validator-rerun-transition.md) | MEDIUM | DONE (feel check pending) |
| 007 | [Shopify sub-form expand](007-shopify-subform-expand.md) | MEDIUM | DONE (feel check pending) |
| 008 | [Global reduced-motion config](008-global-reduced-motion-config.md) | MEDIUM | DONE (feel check pending) |

## Recommended execution order

1. **008 first** — the `MotionConfig` provider makes every other plan (and all existing motion) honor `prefers-reduced-motion`, so later feel checks can verify accessibility as they go.
2. **001, 006, 007** — the MEDIUM teleport fixes, highest leverage (001 is the product's core action).
3. **002** — same fix class as 001, lower-traffic surface.
4. **003** — the largest diff (file move + 11 files touched); doing it after the others keeps early reviews small.
5. **004, 005** — delight polish, independent of everything else.

## Dependencies

- All plans are independent of each other; only the ordering above is recommended, not required.
- 003 moves `reveal.tsx` to `src/components/reveal.tsx` and updates six existing import sites — if any other work lands touching those files, re-check its Step 2 list first.
- Verification baseline (all plans): `bun run typecheck` has ~74 pre-existing errors at `35012a3` — the gate is "error count does not increase", not zero.

## Deliberately not planned

Rejected during the opportunity sweep, recorded so they aren't re-proposed: sliding sidebar-nav indicator (core daily navigation), dashboard `TabsPanel` fades (frequent reading action; indicator already slides), staggered entrances on daily dashboard stat grids (functional data), row-toggle press feedback in selection tables (burst-frequency), recharts area animation (correctly disabled).

Non-animation defect found during the sweep, tracked separately from these plans: `settings/_components/settings/account-section.tsx:250` fires Delete Account with no confirmation dialog — should gate behind the shared `AlertDialog` (exemplar: `product-detail.tsx:284`).
