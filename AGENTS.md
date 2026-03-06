# Code Style Guide for AI Agents

This document captures the coding conventions used in this codebase. When contributing code, follow these patterns to maintain consistency.

---

## 1. Use `const` Only — Never `let`

Always declare variables with `const`. Avoid `let` entirely. If a value needs to change, restructure the logic (e.g., use `reduce`, `map`, callbacks, or extract a function) so the binding stays immutable.

```ts
// ✅ Good
const result = await resultify(() => fetch(url));
const items = data.map((item) => transform(item));

// ❌ Bad
let accumulated = 0;
for (const x of items) accumulated += x;
```

**Exception:** In rare cases where a loop truly requires reassignment (e.g., algorithmic constraints), prefer refactoring to avoid it. If unavoidable, document why.

---

## 2. Never Abbreviate Names

Use full, descriptive names. No abbreviations like `ctx`, `req`, `res`, `msg`, `err`, `fn`, `cb`, `val`, `ref`, `idx`, `num`, `str`, `obj`, `arr`, etc.

```ts
// ✅ Good
const context = await getContext();
const request = await fetch(url);
const response = await request.json();
const message = error.message;
const callback = () => {};

// ❌ Bad
const ctx = ...
const req = ...
const res = ...
const msg = ...
const err = ...
const cb = ...
```

**Exception:** Framework conventions that are universally understood (e.g., `ctx` in Convex handlers) may be acceptable when the codebase already uses them. Prefer full names when introducing new variables.

---

## 3. Prefer Single-Word Variable Names

When possible, name variables with a single word to keep things concise and avoid camelCase. Use camelCase only when the concept genuinely needs multiple words.

```ts
// ✅ Good (single word)
const result = await resultify(() => fetch(url));
const profile = await Profile.get(context, { id });
const invitation = await Invitation.get(context, { id });
const controller = new AbortController();
const timeoutId = setTimeout(...);

// ✅ Acceptable (multi-word when needed)
const searchParams = useGlobalSearchParams();
const isCapturing = ...;
const timeoutId = ...;
```

---

## 4. Use IIFE for Scoped Logic

Use IIFEs `(() => { ... })()` when you need to compute a value with intermediate steps or branching without polluting the outer scope. This is used extensively — for element rendering, value derivation, type narrowing, and conditional logic.

```ts
// ✅ Good — element rendering via IIFE + switch
const element = (() => {
  switch (props.shape) {
    case "text":
      return <TextField {...field} {...props} />;
    case "select":
      return <Select {...field} {...props} />;
    default:
      return null;
  }
})();

// ✅ Good — value derivation
const label = (() => {
  if (businesses.length === 0) return "No businesses found";
  if (businesses.length === 1) return "1 business";
  if (businesses.length < 10) return `${businesses.length} businesses`;
  return `Over ${businesses.length} businesses`;
})();

// ✅ Good — destructuring with transformation
const { type = "text", ...elementProps } = (() => {
  if (props.type !== "password") return props;
  const { masked, defaultMasked, onMaskChange, ...rest } = props;
  return { ...rest };
})();
```

---

## 5. Use `switch (true)` for Conditional Chains

When you have multiple independent conditions that map to different outcomes, use `switch (true)` with `case` clauses instead of long `if / else if` chains.

```ts
// ✅ Good
const inferNameFromLink = (link: string) => {
  switch (true) {
    case link.includes("facebook.com"):
      return "facebook";
    case link.includes("instagram.com"):
      return "instagram";
    case z.url().safeParse(link).success:
      return "website";
    case z.email().safeParse(link).success:
      return "email";
    default:
      return "contact link";
  }
};
```

When rendering different JSX elements based on a discriminated value, combine IIFE + `switch`:

```tsx
// ✅ Good — from InferredFormField
const element = (() => {
  switch (props.shape) {
    case "text": {
      return (
        <TextField {...field} {...props}>
          <TextFieldInput />
          {props.type === "password" && <TextFieldMaskToggle />}
        </TextField>
      );
    }
    case "checkbox":
      return <Checkbox {...field} {...props} />;
    case "select":
      return <Select {...field} {...props} />;
  }
})();
```

---

## 6. Use `resultify` for Async Error Handling

Wrap async operations in `resultify` from `@zenncore/utils` instead of `try/catch`. Handle failures by checking `result.success` and returning early. Do **not** handle every possible error case — propagate or return when appropriate.

```ts
// ✅ Good
const result = await resultify(() =>
  fetch(url, { ...options, signal: controller.signal }),
);

if (!result.success) {
  if (result.error?.name === "AbortError")
    return { success: false, error: new TimeoutError("Request timeout") };
  return { success: false, error: result.error };
}

return { success: true, data: result.data };
```

```ts
// ❌ Bad — avoid try/catch for expected failure paths
try {
  const data = await fetch(url);
  return data;
} catch (error) {
  // exhaustive handling of every case
}
```

**Key points:**
- Use `resultify` for operations that can fail
- Check `result.success` and return early on failure
- Don't exhaustively handle every error subtype unless necessary
- Prefer returning/propagating over complex error classification

---

## 7. Early Returns

Prefer early returns over nested conditionals. Exit as soon as a guard condition is met.

```ts
// ✅ Good
if (!profile) return null;
if (!user) return null;
if (active.isPending || user.isPending) return null;
if (!active.data || !user.data) return <Redirect href="/sign-in" />;
```

```ts
// ❌ Bad — deep nesting
if (profile) {
  if (user) {
    if (!active.isPending && !user.isPending) {
      // ...
    }
  }
}
```

---

## 8. Omit Braces Where Possible

When a conditional has a single statement, omit the braces. This applies to `if`, `else`, `for`, `while`, etc.

```ts
// ✅ Good
if (!signature)
  return new Response("Missing stripe-signature header", { status: 400 });
if (!result.success)
  return new Response("Webhook processing failed", { status: 400 });
if (result.error?.name === "AbortError")
  return { success: false, error: new TimeoutError("Request timeout") };
if (!result.success)
  return { success: false, error: result.error };
```

```ts
// ❌ Bad — unnecessary braces for single statements
if (!signature) {
  return new Response("Missing stripe-signature header", { status: 400 });
}
```

**Exception:** Use braces when the body spans multiple lines or when it improves readability (e.g., multi-line JSX or object literals).

---

## 9. Error Handling — No Exhaustive Case Handling

You do **not** need to handle every possible error case. Return or propagate errors when appropriate. Focus on the success path and essential failure handling.

```ts
// ✅ Good — simple propagation
if (!result.success)
  return { success: false, error: result.error };
```

```ts
// ❌ Bad — over-handling
if (!result.success) {
  if (result.error instanceof NetworkError) { ... }
  else if (result.error instanceof ParseError) { ... }
  else if (result.error instanceof TimeoutError) { ... }
  // exhaustive switch over every error type
}
```

---

## 10. Namespace + Component Pattern

When building React components with associated types, use a namespace to colocate `Props`, `State`, and other types with the component. This is the standard pattern for all components in `@zenncore/web`.

```ts
// ✅ Good — from Button.tsx
export const Button = ({
  variant = "default",
  color = "primary",
  className,
  ...props
}: Button.Props): JSX.Element => {
  // ...
};
export namespace Button {
  export type Props = RenderComponentProps<...> & VariantProps<typeof buttonVariants>;
  export type State = ButtonPrimitive.State;
}

// ✅ Good — from InferredForm
export const InferredForm = <Form extends GenericForm>({
  children,
  config,
  onSubmit,
}: InferredForm.Props<Form>): ReactNode => { ... };
export namespace InferredForm {
  export type Props<Form extends GenericForm> = UseInferredFormParams<Form> & {
    children?: ReactNode;
    onSubmit?: (data: FormEntries<Form>) => void;
  };
}

// ✅ Good — from AuthManager pattern
export namespace AuthManager {
  export type Context = { profile: Profile; user: User };
  export type Props = PropsWithChildren;
}
export const AuthManager = ({ children }: AuthManager.Props) => { ... };
```

---

## 11. Return `null` for "Not Found"

Prefer returning `null` over throwing when something is not found. Let the caller decide how to handle the absence.

```ts
// ✅ Good
if (!profile) return null;
if (!booking) return null;
return { ...profile, user };
```

---

## 12. Underscore Prefix for Unused Variables

When destructuring, prefix unused variables with `_` to signal they are intentionally ignored.

```ts
// ✅ Good
const { user: _user, ...rest } = profile;
return { ...rest, affiliations };

// ✅ Good — unused index in map
{features.map((feature, _index) => (
  <div key={feature.title}>...</div>
))}
```

---

## 13. `as const` for Literal Narrowing

Use `as const` when returning object literals that need to narrow a union type, or for static data arrays defined outside components.

```ts
// ✅ Good — static data with as const
const tiers = [
  { name: "Scan", price: "Free", highlighted: false },
  { name: "Compete", price: 149, highlighted: false },
  { name: "Dominate", price: 449, highlighted: true },
] as const;

// ✅ Good — literal narrowing
return { type: "client" as const, profile: active };
return { type: "artist" as const, profile: active, affiliation };
```

---

## 14. Document Suppressions with Rationale

When using `@ts-expect-error` or `biome-ignore`, add a short comment explaining why.

```ts
// ✅ Good
// @ts-expect-error - void is not a valid type for Omit
// biome-ignore lint/suspicious/noExplicitAny: any is used to handle type errors when working with empty Results
// biome-ignore lint/suspicious/noExplicitAny: no better way to describe it
```

---

## 15. `void` for Fire-and-Forget Async

When invoking async code without awaiting, wrap in `void` to make the intent explicit.

```ts
// ✅ Good
void (async () => {
  const result = await resultify(() => action(client));
  if (!result.success) {
    setError(result.error);
    return;
  }
  setData(result.data);
})();
```

---

## 16. Default Parameters for Options

Use default parameters for optional options objects.

```ts
// ✅ Good
export const request = async (
  url: string,
  options: RequestInit,
  { timeout = 60000 }: { timeout?: number } = {},
) => { ... };
```

---

## 17. Object Shorthand

Use shorthand when property and variable names match.

```ts
// ✅ Good
{ id }
{ profile, user }

// ❌ Redundant
{ id: id }
{ profile: profile, user: user }
```

---

## 18. No `types` Folder — Declare Types as Utils

Never create a folder called `types`. Declare types alongside their related logic in util files. Types belong where they are used.

```ts
// ✅ Good — types in utils/result.ts, utils/validator.ts, etc.
// utils/result.ts
export type Result<T, E = Error> = ...

// utils/auth.ts
export type AuthState = ...
```

```ts
// ❌ Bad — dedicated types folder
// types/result.ts
// types/auth.ts
```

---

## 19. Generic Filenames — Group Related Items

Use generic filenames and put multiple related exports in one file. Do not create one file per hook or util.

```ts
// ✅ Good — all auth hooks in one file
// hooks/auth.ts
export const useAuth = () => { ... };
export const useIsAuthenticated = () => { ... };
export const useLogout = () => { ... };

// utils/format.ts
export const formatDate = (...) => { ... };
export const formatCurrency = (...) => { ... };
```

```ts
// ❌ Bad — one file per hook/util
// hooks/use-auth.ts
// hooks/use-is-authenticated.ts
// hooks/use-logout.ts
// utils/format-date.ts
// utils/format-currency.ts
```

---

## 20. Component Export and JSX Style

### 20a. Named Exports for All App Components

Always use named exports for components. Arrow function style, no `function` keyword.

```tsx
// ✅ Good
export const Pricing = () => (
  <section>...</section>
);

export const Features = () => (
  <section>...</section>
);
```

### 20b. Anonymous Default Exports for Next.js Pages and Layouts Only

Next.js `page.tsx` and `layout.tsx` files use anonymous default exports.

```tsx
// ✅ Good — page.tsx
export default () => (
  <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12">
    <Navbar />
    <Hero />
    <Footer />
  </main>
);

// ✅ Good — layout.tsx
export default ({ children }: PropsWithChildren) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
};
```

### 20c. Implicit Returns for JSX-Only Components

If the component body is only a return statement, use implicit return with parens. Use a block body only when there is logic before the return.

```tsx
// ✅ Good — implicit return, JSX-only
export const Navbar = () => (
  <nav>...</nav>
);

// ✅ Good — block body only when there's logic
export const Hero = () => {
  const data = computeSomething();
  return <div>{data}</div>;
};
```

### 20d. Static Data Outside Components

Define static arrays and config objects outside the component with `as const`.

```tsx
// ✅ Good
const tiers = [
  { name: "Scan", price: "Free", highlighted: false },
  { name: "Dominate", price: 449, highlighted: true },
] as const;

export const Pricing = () => (
  <section>
    {tiers.map((tier, index) => (
      <div key={index}>{tier.name}</div>
    ))}
  </section>
);
```

### 20e. Inline Sub-Components for Discriminated Rendering

Define small presentational sub-components inline in the same file (not exported) when they are only used locally.

```tsx
// ✅ Good — StatusCell lives in comparison.tsx, not exported
const StatusCell = ({ status }: { status: Status }) => {
  switch (status) {
    case "yes":
      return <span className="text-blue-600">✓</span>;
    case "partial":
      return <span className="text-sm text-zinc-400">Partial</span>;
    case "no":
      return <span className="text-zinc-300">—</span>;
  }
};
```

---

## 21. Next.js Specific

### 21a. Use Server Actions Always

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

### 21b. Use Partial Prerendering

Enable partial prerendering (PPR) to combine static shells with dynamic content. Set `experimental.ppr: true` in `next.config.js` and use `<Suspense>` boundaries for dynamic parts.

### 21c. Colocate Page-Specific Components

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

## 22. `@zenncore` Package Usage

This codebase uses the `@zenncore` internal package system. Always reach for these before installing external packages.

### 22a. Icons — `@zenncore/icons`

All icons are named `[Name]Icon` and imported from `@zenncore/icons`. Used as standard JSX elements with Tailwind sizing.

```tsx
import { CheckIcon, CheckBadgeIcon, CursorGrowIcon } from "@zenncore/icons";

// Usage
<CheckIcon className="size-4 text-primary" />
<CheckBadgeIcon className={cn(feature.color, "size-16")} />
```

### 22b. Utilities — `@zenncore/utils`

```ts
import { cn, cva, type VariantProps, type ClassList } from "@zenncore/utils";
import { resultify, type Result } from "@zenncore/utils";
import type { Nullable, Prettify, DistributiveOmit } from "@zenncore/utils/types";
```

- `cn(...)` — Tailwind class merging (clsx + tailwind-merge)
- `cva(...)` — class variance authority for variant-based components
- `ClassList<K>` — type for `classList` prop (targeted sub-element styling)
- `resultify(fn)` — wraps sync/async function in `Result<T, E>`
- `type Result<T, E>` — `{ success: true; data: T } | { success: false; error: E }`

### 22c. Hooks — `@zenncore/utils/hooks`

```ts
import { createContext } from "@zenncore/utils/hooks";
import { useAsyncAction } from "@zenncore/utils/hooks";
```

**`createContext`** — wraps React's `createContext` with auto-error-on-undefined. Returns `[Context, useContextHook]`.

```ts
const [ThemeContext, useTheme] = createContext<ThemeContext>({
  name: "Theme",
  // or provide a custom error message:
  error: "useTheme must be used within a ThemeProvider",
});
```

**`useAsyncAction`** — wraps an async action with `isPending` state tracking. Returns `[handledAction, isPending]`.

```ts
const [submit, isPending] = useAsyncAction(async (data: FormData) => {
  const result = await resultify(() => createItem(data));
  if (!result.success) return;
  router.push("/dashboard");
});
```

### 22d. InferredForm — `@zenncore/web/components`

Use `InferredForm` for all forms. Never build raw `react-hook-form` forms from scratch.

**API:**

```tsx
import {
  InferredForm,
  field,
  applyFormOptions,
} from "@zenncore/web/components";
import { z } from "zod";

// Option A: field() helper — direct config
const config = {
  email: field({
    shape: "text",
    validator: z.string().email(),
    label: "Email",
    placeholder: "you@example.com",
  }),
  role: field({
    shape: "select",
    validator: z.enum(["admin", "user"]),
    label: "Role",
  }),
  agreed: field({
    shape: "checkbox",
    validator: z.boolean(),
    label: "I agree to the terms",
  }),
};

<InferredForm
  config={config}
  onSubmit={(data) => console.log(data)}
  onChange={(data, form) => { ... }}
/>

// Option B: applyFormOptions() — schema-driven (preferred when schema is shared)
const schema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "user"]),
});

const config = applyFormOptions(schema, {
  email: { shape: "text", label: "Email" },
  role: { shape: "select", label: "Role" },
});

<InferredForm config={config} onSubmit={(data) => { ... }} />
```

**Field shapes:**
- `"text"` — `z.ZodString`, renders `TextField`
- `"number"` — `z.ZodNumber`, renders `NumberField`
- `"select"` — `z.ZodEnum` / `z.ZodLiteral` / arrays of those, renders `Select`
- `"phone"` — `z.ZodString`, renders `PhoneField` with country combobox
- `"checkbox"` — `z.ZodBoolean`, renders `Checkbox`
- `"file"` — `z.ZodFile` / `z.ZodArray<z.ZodFile>`, renders `FileUpload`
- `"custom"` — any, renders a `Component` prop you provide

**ClassList for InferredForm fields:**

```ts
field({
  shape: "text",
  validator: z.string(),
  label: "Name",
  classList: {
    field: "col-span-2",
    label: "text-primary",
    error: "text-red-600",
    description: "text-xs",
    control: { /* TextField.Props['classList'] */ },
  },
})
```

### 22e. DataTable — `@zenncore/web/components`

Use `DataTableProvider` + `DataTable` + `DataTablePagination` for all tables.

```tsx
import {
  DataTable,
  DataTableEmpty,
  DataTableFooter,
  DataTableHeader,
  DataTablePagination,
  DataTableProvider,
} from "@zenncore/web/components";
import { type ColumnDef } from "@tanstack/react-table";

type Row = { _id: string; name: string; status: string };

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "status", header: "Status" },
];

export const UsersTable = ({ data }: { data: Row[] }) => (
  <DataTableProvider data={data} columns={columns}>
    <DataTable>
      <DataTableEmpty>No users found.</DataTableEmpty>
    </DataTable>
    <DataTablePagination />
  </DataTableProvider>
);
```

- `DataTableProvider` — wraps data + columns, exposes `useDataTable()` context
- `DataTable` — renders `<Table>` with headers/rows. Accepts `className` and `classList` for `"header-cell"`, `"body-row"`, `"body-cell"`
- `DataTableHeader` / `DataTableFooter` / `DataTableEmpty` — slot components for customization
- `DataTablePagination` — renders pagination controls using `useDataTable()` context

### 22f. UI Primitives — `@zenncore/web/components`

All headless UI is from `@base-ui/react` wrapped and re-exported from `@zenncore/web/components`. Always import from `@zenncore/web/components`, never directly from `@base-ui/react` in app code.

```tsx
import {
  TextField, TextFieldInput, TextFieldMaskToggle,
  Select, SelectTrigger, SelectValue, SelectPositioner, SelectPopup, SelectItem,
  Checkbox,
  PhoneField, PhoneFieldCountryCombobox, PhoneFieldInput,
  NumberField,
  FileUpload, FileUploadInput, FileUploadPreview,
  Button,
  Dialog, DialogTrigger, DialogPopup, DialogTitle, DialogDescription, DialogClose,
  Form, Field, FieldController, FieldLabel, FieldError, FieldDescription,
} from "@zenncore/web/components";
```

### 22g. `ClassList` Pattern for Components

Components in `@zenncore/web` expose a `classList` prop for targeted styling of sub-elements instead of wrapping/overriding.

```tsx
<SelectTrigger
  classList={{
    trigger: "border-2 border-primary",
    icon: { root: "opacity-50", icon: "stroke-primary" },
  }}
/>

<DataTable
  classList={{
    "header-cell": "text-primary font-bold",
    "body-row": "hover:bg-primary/5",
    "body-cell": "py-3",
  }}
/>
```

---

## 23. Context Pattern

Use `createContext` from `@zenncore/utils/hooks` for all React context creation. It auto-throws a descriptive error when the context is consumed outside its provider.

```ts
import { createContext } from "@zenncore/utils/hooks";

type ThemeContext = [theme: Theme, setTheme: SetTheme, env: { isPending: boolean }];

const [ThemeContext, useTheme] = createContext<ThemeContext>({
  name: "Theme",
  // or provide a custom error message:
  error: "useTheme must be used within a ThemeProvider",
});

// Provider
export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const context = useMemo(() => [theme, handleThemeChange, environment] as ThemeContext, [...]);
  return <ThemeContext value={context}>{children}</ThemeContext>;
};

// Consumer
export { useTheme };
```

---

## 24. SSR-Safe DOM Access

Never access `document` or `window` directly in component bodies. Use the `useDocument` hook for safe access.

```ts
// ✅ Good
import { useDocument } from "@/hooks/use-document";

const { document, window } = useDocument();

useEffect(() => {
  if (!window) return;
  // safe to use window here
}, [window]);

// ❌ Bad — crashes on server
const media = window.matchMedia("(prefers-color-scheme: dark)");
```

---

## 25. Design Tokens (Tailwind)

Use the semantic design tokens defined in the Tailwind config. Do not use raw color values unless building a one-off UI genuinely outside the design system.

```
text-primary           — primary brand color
text-primary-dimmed    — dimmed variant of primary
text-foreground        — main text
text-foreground-dimmed — secondary/muted text
bg-background          — page background
bg-background-dimmed   — subtle background (cards, sections)
border-accent-foreground — standard border color
text-error             — error state
bg-primary             — primary background (CTAs, highlights)
```

```tsx
// ✅ Good
<p className="font-light text-foreground-dimmed text-lg">{caption}</p>
<div className="border border-accent-foreground">{content}</div>
<button className="bg-primary text-white">Submit</button>

// ❌ Bad — raw colors bypass the design system
<p className="text-gray-400">{caption}</p>
```

---

## Summary Checklist

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
- [ ] Namespace + component pattern for all components with types
- [ ] Return `null` for "not found" instead of throwing
- [ ] Prefix unused destructured variables with `_`
- [ ] Use `as const` for literal narrowing and static data arrays
- [ ] Document `@ts-expect-error` / `biome-ignore` with rationale
- [ ] Use `void` for fire-and-forget async
- [ ] Default parameters for optional options
- [ ] Object shorthand when names match
- [ ] No `types` folder — declare types in util files
- [ ] Generic filenames — group related hooks/utils in one file
- [ ] Named exports for all components; anonymous defaults only for Next.js pages/layouts
- [ ] Implicit return (parens) for JSX-only components; block body only when logic precedes return
- [ ] Static data defined outside the component with `as const`
- [ ] Inline unexported sub-components for local discriminated rendering
- [ ] Import icons from `@zenncore/icons` — all named `[Name]Icon`
- [ ] Use `cn(...)` from `@zenncore/utils` for class merging
- [ ] Use `ClassList<K>` for `classList` props on components with sub-elements
- [ ] Use `InferredForm` + `field()` or `applyFormOptions()` for all forms — never raw react-hook-form
- [ ] Use `DataTableProvider` + `DataTable` for all tables
- [ ] Import all UI from `@zenncore/web/components`, never from `@base-ui/react` directly in app code
- [ ] Use `createContext` from `@zenncore/utils/hooks` for all React context
- [ ] Use `useAsyncAction` from `@zenncore/utils/hooks` for async actions with loading state
- [ ] Use `useDocument` hook for SSR-safe `document`/`window` access
- [ ] Use semantic design tokens; avoid raw Tailwind colors
- [ ] **(Next.js)** Use server actions for mutations
- [ ] **(Next.js)** Use partial prerendering (PPR)
- [ ] **(Next.js)** Colocate page-specific components in `_components` inside the page folder
