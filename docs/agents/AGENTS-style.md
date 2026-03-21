# Code Style

Core coding conventions for this codebase.

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

// ✅ Acceptable (multi-word when needed)
const searchParams = useGlobalSearchParams();
const isCapturing = ...;
const timeoutId = ...;
```

---

## 4. Use IIFE for Scoped Logic

Use IIFEs `(() => { ... })()` when you need to compute a value with intermediate steps or branching without polluting the outer scope.

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

Wrap async operations in `resultify` from `@zenncore/utils` instead of `try/catch`. Handle failures by checking `result.success` and returning early.

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

When a conditional has a single statement, omit the braces.

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

You do **not** need to handle every possible error case. Return or propagate errors when appropriate.

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
}
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

## 13. `as const` for Literal Narrowing only when needed

Use `as const` when returning object literals that need to narrow a union type, or for static data arrays defined outside components. Not for server actions wrapped {with*}, this has type satisfaction build in. Only when needed.

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

Never create a folder called `types`. Declare types alongside their related logic in util files.

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
