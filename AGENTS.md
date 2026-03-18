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

## Learned User Preferences

- Use @zenncore/web components (Button, DataTable, TextField, etc.) for interactive UI; avoid raw HTML buttons, tables, and form inputs.
