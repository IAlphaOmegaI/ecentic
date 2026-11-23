---
name: zenn-code
description: The zenn coding style for TypeScript, React, HTML and Tailwind in this monorepo — const-only, arrow functions, namespaces, single-word full names, destructuring, IIFE + switch(true), resultify, early returns, CSS variable naming, semantic HTML and Tailwind-first styling. Use whenever writing, editing, refactoring or reviewing any code here, or when asked "is this zenn style?". Component usage and design-system rules live on top of this in /zenn-style.
---

# zenn-code — how code is written here

This is the base layer: **how to write code**, independent of which component
you reach for. `/zenn-style` sits on top and covers components, tokens and the
monorepo. The source of truth behind these rules is
`docs/agents/AGENTS-style.md`, `docs/agents/AGENTS-components.md` and
`docs/agents/AGENTS-checklist.md`; if this skill and those docs ever disagree,
the docs win.

Write code that reads like prose: short full-word names, immutable bindings,
flat control flow, one way to do each thing.

---

## 1. Bindings — `const` only

- Every binding is `const`. Never `let`, never `var`.
- Need a value that "changes"? Derive it: `map`, `filter`, `reduce`,
  `Object.fromEntries`, an IIFE, or an extracted function.
- Never mutate a counter or accumulator in a loop. No `forEach` (Biome
  `noForEach` is an error) — use `map`/`flatMap`/`for…of` over derived data.
- Never reassign a parameter (`noParameterAssign`).

```ts
// ✅
const total = items.reduce((sum, item) => sum + item.price, 0);
const byId = Object.fromEntries(products.map((product) => [product.id, product]));

// ❌
let total = 0;
items.forEach((item) => { total += item.price; });
```

The only escape hatch is a genuinely algorithmic loop; then leave a comment
saying why.

---

## 2. Functions — arrow functions only

- Every function is an arrow function bound to a `const`. No `function`
  keyword — not for components, helpers, hooks or handlers.
- Expression body when the function only returns; block body only when logic
  precedes the return.
- Optional options objects take default parameters, defaulted to `{}`.
- No explicit return types on functions wrapped by `withAuthentication`,
  `withContext`, `withSubscription`, etc. — let inference carry them.

```ts
// ✅
export const format = (value: number) => `$${value.toFixed(2)}`;

export const request = async (
  url: string,
  options: RequestInit,
  { timeout = 60000 }: { timeout?: number } = {},
) => { ... };

// ❌
export function format(value: number) { return `$${value.toFixed(2)}`; }
```

Fire-and-forget async is explicit: `void (async () => { ... })();`.

---

## 3. Naming

### 3a. Full words, never abbreviations

`context` not `ctx`, `request`/`response` not `req`/`res`, `error` not `err`,
`message` not `msg`, `callback` not `cb`, `index` not `i`/`idx`, `value` not
`val`, `element` not `el`, `event` not `e`, `accumulator` not `acc`,
`parameters` not `params` when you name it yourself.

### 3b. One word whenever one word is enough

Prefer a single lowercase word. Reach for camelCase only when the concept
genuinely needs two words.

```ts
// ✅ single word
const store = await Store.get(Environment.SERVER, id);
const creation = await Content.create(data);
const controller = new AbortController();
const label = (() => { ... })();

// ✅ two words because the concept is two words
const searchParams = useSearchParams();
const isPending = ...;

// ❌ needless compounds
const storeData = ...;
const fetchedProducts = ...;
const currentUserObject = ...;
```

Same rule for files, functions and exports: `format.ts` not
`format-helpers.ts`; `Store.list` not `Store.listAllStores`; the namespace
carries the noun, so the member is the verb.

### 3c. Name after the domain, not the primitive

- Arguments use the domain name: `{ store }`, not `{ storeId }`. Rename on
  conflict via destructuring: `{ store: id }`. With several ids:
  `{ store: storeId, product: productId }`.
- `Result` bindings are named after the thing: `const user = await User.get(id)`
  then read `user.data` inline. Never `userResult`, never a second
  `const data = user.data`.
- Pass domain objects across boundaries (`products={products}`), not derived
  primitives (`productCount={products.length}`).

### 3d. Casing

| Thing | Casing | Example |
|---|---|---|
| Variables, functions, hooks | camelCase | `store`, `useAsyncAction` |
| Components, namespaces, types | PascalCase | `Pricing`, `Button.Props` |
| Module-level enum-like constants | SCREAMING_SNAKE only for true constants/env | `ENTRY_COOKIE`, `UCP_VERSION` |
| Files and folders | kebab-case, generic | `format.ts`, `_components/skeletons.tsx` |
| Unused bindings | `_` prefix | `const { user: _user, ...rest } = profile` |
| Translation keys | camelCase + dots | `signIn.fields.email.label` |

### 3e. CSS variables

- kebab-case, prefixed by role, mirroring Tailwind's theme namespaces:
  `--color-*`, `--radius-*`, `--font-*`, `--spacing`, `--animate-*`.
- Semantic, never literal: `--color-primary-text`, not `--color-blue-700`.
- Shade suffixes come from the shared vocabulary only:
  `-dimmed`, `-rich`, `-foreground`, `-text`.
- Component-runtime variables describe the geometry they hold:
  `--active-tab-width`, `--accordion-panel-height`, `--floating-controls-bottom`.
- Read them through Tailwind, not inline styles:
  `w-(--active-tab-width)`, `h-[var(--accordion-panel-height)]`.
- Declare theme tokens in `@theme` (shared config or app `globals.css`), never
  in a new page-local stylesheet.

---

## 4. Destructuring

- Destructure props in the parameter list, with defaults there:
  `({ variant = "default", className, ...props }: Button.Props) => …`.
- Rest-spread the remainder (`...props`) and forward it; do not re-list props.
- Rename on destructure instead of creating a second binding:
  `{ store: id }`, `{ data: products }` only when it truly reads better.
- Prefix discarded fields with `_`: `const { masked: _masked, ...rest } = props`.
- Tuple-return hooks destructure positionally:
  `const [submit, isPending] = useAsyncAction(...)`.
- Object shorthand whenever names match: `{ id, store }`, never `{ id: id }`.

```ts
// ✅ derive + destructure in one place via IIFE
const { type = "text", ...elementProps } = (() => {
  if (props.type !== "password") return props;
  const { masked: _masked, defaultMasked: _defaultMasked, ...rest } = props;
  return rest;
})();
```

---

## 5. Control flow

### 5a. Early returns, flat code

Guard and leave. Never nest success inside `if`.

```ts
if (!store.success) return store;
if (!store.data) return null;
return render(store.data);
```

### 5b. Braces only when the body needs them

Single-statement `if` drops the braces. Multi-line bodies, JSX and object
literals keep them. No `else` after a `return` (`noUselessElse`).

### 5c. `switch (true)` over `if / else if` chains

```ts
const kind = (() => {
  switch (true) {
    case link.includes("instagram.com"): return "instagram";
    case z.email().safeParse(link).success: return "email";
    default: return "website";
  }
})();
```

Use a plain `switch (value)` for discriminated unions; the compiler checks
exhaustiveness.

### 5d. IIFE for scoped derivation

Any value that needs intermediate steps or branching is an IIFE — the outer
scope only ever sees the result. Combine IIFE + `switch` for discriminated
JSX.

```tsx
const element = (() => {
  switch (props.shape) {
    case "text": return <TextField {...props} />;
    case "select": return <Select {...props} />;
  }
})();
```

---

## 6. Errors — `Result`, not `throw`

- Expected failures return `Result<T, E>` — `{ success: true, data } | { success: false, error }`.
- Wrap anything that can fail in `resultify(() => …)` from `@zenncore/utils`.
  No `try/catch` for expected paths.
- Raw read-only `db.select` thunks use `resultifyRead`; writes keep `resultify`.
- Propagate, don't classify: `if (!result.success) return result;`. Do not
  branch on every error subtype.
- Error classes from `server/utils/error.ts` are compared by `error.name`
  against `errorName`, never `instanceof` (see `docs/agents/review-focus.md` #1).
- "Not found" is `null`, not an exception.
- Server components inside `<Suspense>` use `unwrapResult(...)` instead of
  manual checks.

---

## 7. Types

- Colocate a component's or module's types in a **namespace with the same
  name**: `Button.Props`, `Button.State`, `SidebarNav.Props`.
- Types live next to their logic. Never create a `types/` folder in app code.
- `type` aliases, not `interface`.
- `as const` only where narrowing is needed (static data, literal returns) —
  not on wrapped server actions.
- `import type` / `import type * as Module` when only types are used.
- Every `@ts-expect-error` / `biome-ignore` carries a reason after the colon.
- Avoid `any`; when unavoidable, `biome-ignore` with a reason.
- No non-null `!` assertions; narrow with a guard.

---

## 8. Modules and files

- Server modules are imported as namespaces: `import * as Products from "@/server/app/product"`.
  Never destructure named imports from a server module.
- Generic filenames, grouped exports: all format helpers in `format.ts`, all
  auth hooks in `hooks/auth.ts`. Not one file per function.
- Named exports everywhere. Anonymous default export only for Next.js
  route files (`page.tsx`, `layout.tsx`): `export default () => (...)`.
- Static data and config live at module scope, outside the component.
- Do not hoist repeated Tailwind class strings into constants — inline them,
  or make an inline unexported sub-component.

---

## 9. React

- Components are arrow functions with implicit return when JSX-only.
- Namespace + component: `export const X = (...: X.Props) => …; export namespace X { export type Props = … }`.
- Small, file-local, unexported sub-components for discriminated rendering.
- Context through `createContext` from `@zenncore/utils/hooks`, which returns
  `[Context, useHook]`.
- No `document`/`window` in render bodies; use `useDocument`.
- The React Compiler is on — do not hand-write `useMemo`/`useCallback` for
  ordinary derived values.
- Keys are stable ids, never the index for reorderable lists.

```tsx
export const Plan = ({ plan, highlighted = false }: Plan.Props) => (
  <article className="flex flex-col gap-4 p-8">
    <h3 className="font-medium text-foreground text-xl">{plan.name}</h3>
    <Price value={plan.price} />
  </article>
);
export namespace Plan {
  export type Props = { plan: Plans.Type; highlighted?: boolean };
}

const Price = ({ value }: { value: number | "free" }) => {
  switch (value) {
    case "free": return <span className="text-success">Free</span>;
    default: return <span className="tabular-nums">${value}</span>;
  }
};
```

---

## 10. HTML

- Semantic elements first: `main`, `header`, `nav`, `section`, `article`,
  `aside`, `footer`, `h1`–`h4` in order, `ul/ol/li` for lists, `dl/dt/dd` for
  label–value pairs, `time` for dates, `figure/figcaption` for media.
- One `h1` per page, rendered in the server `page.tsx` shell.
- Never build an interactive control from raw HTML (`<button>`, `<input>`,
  `<select>`, `<details>`, `<table>`) — use the `@zenncore/web` component
  (see `/zenn-style`).
- Links that navigate are links (`Link` or `Button render={<Link />}`), not
  `onClick` + `router.push`.
- Self-close empty elements (`<Icon />`, `useSelfClosingElements`).
- Decorative SVG gets `aria-hidden`; meaningful images get real `alt`.
- No inline `style={{}}` for static appearance — only for computed geometry or
  runtime values.
- All user-visible copy goes through next-intl; no string literals in JSX
  except code-like identifiers.

---

## 11. Tailwind first

- Style with Tailwind utilities on the element. No new `.css` / `.module.css`
  files; structural rules that utilities cannot express go in the existing
  global stylesheet.
- Merge conditional classes with `cn(...)` from `@zenncore/utils`; variant sets
  with `cva(...)`.
- Semantic tokens only — `text-foreground`, `bg-background-rich`,
  `border-accent-foreground`, `text-primary-text`. Never `text-gray-500`,
  `bg-white`, hex or arbitrary colors.
- Spacing on the 2-step grid (`gap-2`, `p-4`, `px-8`); no odd steps.
- Prefer a named utility over an arbitrary value (`size-4` over `w-[16px] h-[16px]`).
- State styling through data attributes Base UI exposes:
  `data-selected:`, `data-panel-open:`, `group-data-panel-open:`,
  `data-starting-style:`, `data-disabled:`.
- Let Biome sort classes (`useSortedClasses` covers `className`, `classList`,
  `cn`, `cva`). Run `bun run lint`.

---

## 12. Checklist before you hand back code

- [ ] No `let`, no `function`, no `forEach`, no `try/catch` for expected paths
- [ ] Every name is a full word, single word where possible, named for the domain
- [ ] No `…Result` suffix; `.data` read inline
- [ ] Props destructured in the signature with defaults; rest forwarded
- [ ] Guards return early; braces dropped on one-liners; `switch (true)` for chains
- [ ] Types in a same-name namespace; no `types/` folder; suppressions justified
- [ ] Server modules imported as namespaces
- [ ] Semantic HTML, no raw controls, copy through next-intl
- [ ] Tailwind semantic tokens, 2-step spacing, `cn`/`cva` for composition
- [ ] `bun run lint` clean on touched files; typecheck error count not increased
