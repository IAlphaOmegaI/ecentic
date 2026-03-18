# Summary Checklist

Quick reference for all coding conventions. See linked sub-guides for details.

---

## Code Style ([AGENTS-style.md](./AGENTS-style.md))

- [ ] Use `const` only; avoid `let`
- [ ] No abbreviated names (use full words)
- [ ] Prefer single-word variable names where possible
- [ ] Use IIFEs for scoped computations and element rendering
- [ ] Use `switch (true)` for multi-branch conditionals
- [ ] Combine IIFE + `switch` for discriminated element rendering
- [ ] Use `resultify` instead of `try/catch` for async operations
- [ ] Early returns for guard clauses
- [ ] Omit `{}` for single-statement conditionals
- [ ] Don't exhaustively handle every error case
- [ ] Return `null` for "not found" instead of throwing
- [ ] Prefix unused destructured variables with `_`
- [ ] Use `as const` for literal narrowing and static data arrays
- [ ] Document `@ts-expect-error` / `biome-ignore` with rationale
- [ ] Use `void` for fire-and-forget async
- [ ] Default parameters for optional options
- [ ] Object shorthand when names match
- [ ] No `types` folder — declare types in util files
- [ ] Generic filenames — group related hooks/utils in one file

---

## Components ([AGENTS-components.md](./AGENTS-components.md))

- [ ] Namespace + component pattern for all components with types
- [ ] Named exports for all components; anonymous defaults only for Next.js pages/layouts
- [ ] Implicit return (parens) for JSX-only components; block body only when logic precedes return
- [ ] Static data defined outside the component with `as const`
- [ ] Inline unexported sub-components for local discriminated rendering
- [ ] Use `createContext` from `@zenncore/utils/hooks` for all React context
- [ ] Use `useDocument` hook for SSR-safe `document`/`window` access

---

## Next.js ([AGENTS-nextjs.md](./AGENTS-nextjs.md))

- [ ] Use server actions for mutations
- [ ] Every `page.tsx` exports HTML: server component with static shell; no full-page client wrapper
- [ ] PPR + streaming: static shell in `page.tsx`, data in async server components wrapped in `<Suspense fallback={<Skeleton />}>`
- [ ] Colocate page-specific components in `_components` inside the page folder
- [ ] Pages with forms: `page.tsx` is a server component; form extracted to `_components/` using `InferredForm` + `field()`
- [ ] Use repository pattern for all DB operations — never raw `db.insert(...)` etc.
- [ ] Prefer `Object.fromEntries` + `.map()` over imperative accumulation
- [ ] Fully parallelize independent async work with `Promise.all` + `.flatMap()`
- [ ] Derive values instead of mutating counters
- [ ] Use `@zenncore` components — never raw `<input>` / `<textarea>`

---

## @zenncore Packages ([AGENTS-packages.md](./AGENTS-packages.md))

- [ ] Import icons from `@zenncore/icons` — all named `[Name]Icon`; verify exports before using
- [ ] Use `cn(...)` from `@zenncore/utils` for class merging
- [ ] Use `ClassList<K>` for `classList` props on components with sub-elements
- [ ] Use `useAsyncAction` from `@zenncore/utils/hooks` for async actions with loading state
- [ ] Use `InferredForm` + `field()` or `applyFormOptions()` for all forms — never raw react-hook-form
- [ ] Use `DataTableProvider` + `DataTable` for all tables
- [ ] Import all UI from `@zenncore/web/components`, never from `@base-ui/react` directly in app code
- [ ] Use semantic design tokens; avoid raw Tailwind colors
