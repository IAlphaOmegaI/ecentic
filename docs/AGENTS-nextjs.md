# Next.js Conventions

Next.js-specific patterns for this codebase.

---

## 21a. Use Server Actions Always

Prefer server actions over API routes for mutations and form submissions. Use `"use server"` at the top of the file.

```ts
// ✅ Good — actions.ts
"use server";

export const createItem = async (data: FormData) => {
  // ...
};
```

```ts
// ❌ Bad — API route for mutations that could be a server action
// app/api/items/route.ts
export async function POST(request: Request) { ... }
```

---

## 21b. Every Page Exports HTML — PPR and Streaming

Every `page.tsx` must be a **server component** that exports real HTML. Do not render a single client component that wraps the entire page. The shell should be server-rendered so the initial response contains static HTML (titles, layout, headings, descriptions). Data-dependent UI should stream in via `<Suspense>`.

- **Static shell** — Render as much as possible in the server `page.tsx`: page title, description, layout, section headings.
- **Dynamic content** — Move data fetching into **separate server components** (can live in the same file or in `_components/`). Each async server component that fetches data must be wrapped in `<Suspense>` with a **skeleton fallback** that matches the content shape.
- **Streaming** — The server sends the static shell immediately, then streams the resolved async components when their data is ready.

**Exception:** Onboarding and auth flows (sign-in, sign-up, onboarding steps) may be designed as client-heavy by design; the rest of the app (dashboard, settings, list/detail pages) must follow the PPR pattern.

```tsx
// ✅ Good — page.tsx (server): static shell + Suspense with skeleton
export default () => (
  <div className="p-6">
    <header className="mb-6">
      <h1 className="font-medium text-foreground text-xl">Page Title</h1>
      <p className="font-light text-foreground-dimmed text-sm">Static description.</p>
    </header>
    <Suspense fallback={<PageContentSkeleton />}>
      <AsyncPageContent />
    </Suspense>
  </div>
);

// Async server component (same file or _components/) — fetches data, no "use client"
async function AsyncPageContent() {
  const data = await fetchData();
  return <ClientPanel data={data} />;
}
```

```tsx
// ❌ Bad — page is a thin wrapper around one client component; no HTML shell
export default async () => {
  const [a, b] = await Promise.all([getA(), getB()]);
  return <FullPageClient a={a} b={b} />;
};
```

Use semantic skeleton fallbacks (e.g. `PageContentSkeleton`, `TableSkeleton`) so layout shift is minimal when content streams in.

---

## 21c. Colocate Page-Specific Components

If a component is only used on one page, put it in a `_components` folder inside that page's directory. The underscore prevents it from becoming a route.

```ts
// ✅ Good — component lives with its page
// app/dashboard/page.tsx
// app/dashboard/_components/dashboard-stats.tsx
// app/dashboard/_components/chart.tsx
```

```ts
// ❌ Bad — page-specific component in global components folder
// components/dashboard/dashboard-stats.tsx  (only used on /dashboard)
```

---

## 21d. Pages with Forms — Server Component + Co-located Form

Any page that contains a form **must**:

1. Be a **server component** — no `"use client"` on the `page.tsx` file.
2. Extract the form (and any other interactive elements) into a `_components/` folder co-located with the page.
3. Use `InferredForm` + `field()` from `@zenncore/web/components/inferred-form` for all form fields — never raw inputs or `react-hook-form` directly.

```ts
// ✅ Good — page is a server component, form lives in _components/
// app/(auth)/sign-in/page.tsx          ← server component, no "use client"
// app/(auth)/sign-in/_components/sign-in-form.tsx  ← "use client", InferredForm
```

**page.tsx** — server component, imports the form:

```tsx
// app/(auth)/sign-in/page.tsx
import { SignInForm } from "./_components/sign-in-form";

export default () => (
  <div>
    {/* static shell */}
    <SignInForm />
  </div>
);
```

**_components/sign-in-form.tsx** — client component with InferredForm:

```tsx
"use client";

import { InferredForm, field } from "@zenncore/web/components/inferred-form";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { z } from "zod";

const config = {
  email: field({ shape: "text", validator: z.string().email(), label: "Email" }),
  password: field({ shape: "text", type: "password", validator: z.string().min(8), label: "Password" }),
};

export const SignInForm = () => {
  const [handleSubmit, isPending] = useAsyncAction(async (data) => {
    // submit logic
  });

  return (
    <InferredForm config={config} onSubmit={handleSubmit}>
      {/* submit button, extra links, etc. */}
    </InferredForm>
  );
};
```

---

## 23a. Always Use the Repository Pattern for DB Operations

Never use raw `db.insert(...)`, `db.select(...)`, etc. directly in application code. Every table must have a repository file in `server/app/` using the `repository()` helper.

```ts
// ✅ Good — repository pattern
await Promise.all(
  results.map((record) =>
    Simulation.create(Environment.SERVER, { scanId, ...record }),
  ),
);

// ❌ Bad — raw db import and inline insert
const { db } = await import("../../database");
await db.insert(schema.simulation).values(results);
```

---

## 23b. Prefer `Object.fromEntries` + `.map()` Over Imperative Accumulation

When building a record/map from an array, use `Object.fromEntries` with `.map()` instead of declaring an empty object and mutating it in a `for` loop.

```ts
// ✅ Good — declarative
const rates = Object.fromEntries(
  models.map((model) => {
    const wins = results.filter((r) => r.model === model.id && r.winner === "product").length;
    const total = results.filter((r) => r.model === model.id).length;
    return [model.id, { wins, total, rate: total > 0 ? Math.round((wins / total) * 100) : 0 }];
  }),
);

// ❌ Bad — imperative mutation
const rates: Record<string, ...> = {};
for (const model of models) {
  rates[model.id] = { ... };
}
```

---

## 23c. Fully Parallelize Independent Async Work

When async operations are independent (no data dependency between iterations), flatten them into a single `Promise.all` with `.flatMap()` instead of sequential loops with nested `Promise.all`.

```ts
// ✅ Good — all calls fire at once
const results = await Promise.all(
  products.flatMap((product) =>
    competitors.flatMap((competitor) =>
      models.map((model) => runSimulation(product, competitor, model)),
    ),
  ),
);

// ❌ Bad — sequential outer loop, parallel only within each pair
for (const pair of pairs) {
  const results = await Promise.all(
    models.map((model) => runSimulation(pair.product, pair.competitor, model)),
  );
}
```

---

## 23d. Derive Instead of Mutate

Prefer deriving values from data (`.filter().length`, `.reduce()`, `Object.fromEntries`) over mutable counters.

```ts
// ✅ Good — derived
const wins = results.filter((r) => r.winner === "product").length;
const losses = results.length - wins;

// ❌ Bad — mutable counters
let wins = 0;
let losses = 0;
for (const r of results) {
  if (r.winner === "product") wins += 1;
  else losses += 1;
}
```

---

## 23e. Verify Icon Exports Before Using

Always check that an icon exists in `@zenncore/icons` before importing it. The codebase uses `[Name]Icon` naming (e.g. `XIcon`, `CheckIcon`). Do not assume icons from other libraries exist here (e.g. `XMarkIcon` does not exist — use `XIcon`).

---

## 23f. PPR and Streaming — Static Shell + Suspense + Skeleton

Besides onboarding/auth screens (which may be client-heavy by design), every dashboard and app screen must follow **PPR and streaming**:

1. **`page.tsx`** — Server component only. Renders the **static shell** (layout, page title, description, section structure). No `await` at the top level that blocks the entire page.
2. **Data fetching** — Done in **separate async server components** wrapped in `<Suspense fallback={…}>` with a **skeleton fallback**.
3. **Client components** — Used only for interactivity. Receive data as props from the async server component inside Suspense. Keep client boundaries as low as possible.

Motion animations work in server components via the `Motion` component from `@/components/motion` (which imports from `motion/react-client`). Use `Motion.Stagger`, `Motion.Up`, etc. for all server-side animations. Only use `motion` from `"motion/react"` directly inside client components.

---

## 23g. Use `@zenncore` Components — Never Raw HTML Inputs

Never use raw `<input>`, `<textarea>`, or unstyled form elements. Always use `@zenncore/web` components.

**`TextField`** is a compound component — `TextField` is the root container (a styled `<div>`), and `TextFieldInput` is the actual `<input>` element inside it. Pass `value`/`onValueChange` to the root, and `placeholder`/`onKeyDown`/etc. to the input.

**`Textarea`** follows the same compound pattern — `Textarea` is the root, `TextareaInput` is the actual `<textarea>`.

```tsx
// ✅ Good — compound component pattern
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { Textarea, TextareaInput } from "@zenncore/web/components/textarea";

<TextField value={query} onValueChange={setQuery}>
  <TextFieldInput placeholder="Search..." onKeyDown={handler} />
</TextField>

<Textarea value={text} onValueChange={setText}>
  <TextareaInput rows={6} placeholder="Enter text..." />
</Textarea>

// ❌ Bad — raw HTML elements
<input value={query} onChange={e => setQuery(e.target.value)} />
<textarea rows={6} value={text} onChange={e => setText(e.target.value)} />

// ❌ Bad — passing input props to root
<TextField placeholder="Search..." onKeyDown={handler} />
```
