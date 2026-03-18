# Code Style Guide for AI Agents

This document captures the coding conventions used in this codebase. Follow all sub-guides below.

---

## Sub-Guides

| File | Contents |
|------|----------|
| [AGENTS-style.md](./AGENTS-style.md) | Core code style: `const`, naming, IIFE, switch, resultify, early returns |
| [AGENTS-components.md](./AGENTS-components.md) | React component patterns: namespace, JSX style, sub-components |
| [AGENTS-nextjs.md](./AGENTS-nextjs.md) | Next.js: server actions, PPR, streaming, Suspense, forms |
| [AGENTS-packages.md](./AGENTS-packages.md) | `@zenncore` package usage: icons, utils, hooks, InferredForm, DataTable, design tokens |
| [AGENTS-convex.md](./AGENTS-convex.md) | Convex backend conventions (C1–C15) |
| [AGENTS-checklist.md](./AGENTS-checklist.md) | Summary checklist for all rules |

---

## Workspace Facts

- When Postgres errors with "relation \"...\" does not exist", apply migrations from apps/web: `bun run db:migrate`.

## Learned Workspace Facts

- AI streaming server actions use `AI.stream<EventType>()` in `server/utils/ai.ts` returning `{ output }`, consumed client-side via `readStreamableValue(output)` with a `switch (event.kind)` block — see `competitor.ts` `detectCompetitors` and `simulate.ts` `runScan` as canonical examples.
- Avoid `z.default()` in Zod schemas passed to `generate()`; Azure requires every property listed in `"properties"` to also appear in `"required"`, and `.default()` fields trigger validation failures. Use `.optional()` instead for truly optional fields.
- Dashboard and non-onboarding pages must follow PPR/streaming: `page.tsx` renders a real HTML static shell (title, description, headings); data is fetched in async server components in the same file, each wrapped in `<Suspense fallback={<Skeleton />}>`. Onboarding/auth screens are exempt from this rule.

## Learned User Preferences

- Use `@zenncore/web` components for all interactive UI — `Button`, `DataTable`/`DataTableProvider`/`DataTableEmpty`, `TextField`, `Tab`/`Tabs`/`TabsIndicator`/`TabsList`/`TabsPanel` — never raw HTML buttons, tables, inputs, or custom tab implementations.
- Only `Motion.Row`, `Motion.Up`, `Motion.Item`, and `Motion.Stagger` are permitted for animations. Do not add custom `motion/react` or `AnimatePresence` outside these wrappers; group related elements in the same `Motion.*` wrapper instead of animating each one separately.
