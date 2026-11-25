---
name: zenn-code
description: The zenn coding style for TypeScript, React, HTML and Tailwind in this monorepo — const-only, arrow functions, namespaces, single-word full names, destructuring, IIFE + switch(true), Result/resultify and custom errors, the with* context wrappers and instrumentation, repositories, shared @zenncore/utils helpers, Zod validation, next-intl translations, Bun tests, early returns, CSS variable naming, semantic HTML and Tailwind-first styling. Use whenever writing, editing, refactoring or reviewing any code here, or when asked "is this zenn style?". Component usage and design-system rules live on top of this in /zenn-style.
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

Failures are values. A function that can fail returns a `Result`; callers check
it, then return early or pass it on. `throw` is only for real defects and for
the one place that turns a `Result` back into an exception (`unwrapResult`).

### 6a. The `Result` type

```ts
import { type Result, resultify, unwrapResult } from "@zenncore/utils";

type Result<T = void, E = Error> =
  | { success: true; data: T }      // `data` is optional only when T is void
  | { success: false; error: E };
```

- Return the literal shapes yourself: `return { success: true, data: store };`
  and `return { success: false, error: new NotFoundError("Store not found") };`.
- A `Result<void>` success is just `{ success: true }`.
- Pass a failed result on unchanged: `if (!store.success) return store;`.
  Do not rebuild it as `{ success: false, error: store.error }` unless the
  success type differs and TypeScript needs the narrower shape.

### 6b. `resultify` — the only `try/catch`

`resultify(fn)` runs `fn`, catches whatever it throws or rejects with, and
returns a `Result`. It works with sync functions, promises and other thenables
(Drizzle query builders are awaited rather than returned as `data`).

```ts
// ✅ wrap the call that can throw, check, return early
const response = await resultify(() => fetch(url, { signal: controller.signal }));
if (!response.success) return response;

const payload = resultify(() => JSON.parse(text));          // sync works too
if (!payload.success) return { success: false, error: new ParseError("Invalid JSON", { cause: payload.error }) };
```

- Always pass a **thunk** (`() => fetch(url)`), not an already-running promise.
  The thunk is what lets a synchronous throw be caught.
- One `resultify` per operation that can fail. Do not wrap a whole function
  body in one big `resultify`.
- Never write `try/catch` for an expected failure. The exceptions are a real
  finally/cleanup need or library glue that must rethrow; leave a comment
  saying why.
- **Database:** use repository methods (they retry already). A raw read-only
  `db.select(...)` thunk uses `resultifyRead` from `@/server/utils/repository`,
  which retries once if the pooled connection died. Writes keep plain
  `resultify`, because replaying a write that may have landed can duplicate it.
- **HTTP:** use `HTTP.request(url, init, { timeout })`, which already returns
  `Result<Response>` (pass `{ guard: true }` for any user-supplied URL), then
  `HTTP.parse<T>(response)`, which returns `Result<T, RequestError | ParseError>`.
  Never use a bare `fetch` in server code.

### 6c. Custom errors — `error()` and the shared classes

Error types are declared once, in `apps/web/src/server/utils/error.ts`, with
the `error()` factory:

```ts
export class NotFoundError extends error("not-found-error", DatabaseError) {}
export class ConflictError extends error("conflict-error", RequestError, { expected: true }) {}
```

- `error(name, parent?, { expected? })`. `name` is the kebab-case wire name
  ending in `-error` (`"timeout-error"`). `parent` places the class in the
  hierarchy, and `expected: true` marks a business rule rather than a bug.
- Reuse what exists before adding a class:

  | Family | Classes |
  |---|---|
  | `DatabaseError` | `UniqueConstraintError`, `NotFoundError` |
  | `RequestError` | `ValidationError`*, `ConflictError`*, `SubscriptionRequiredError`*, `TimeoutError`, `ParseError`, `ResponseTooLargeError`, `IntegrationAuthError` |
  | `AuthenticationError` | `UnauthenticatedError`, `UnauthorizedError`, `InvalidCredentialsError`, `InvalidSignatureError`*, `UntrustedRequestError`* |

  `*` = expected. Expected errors still reach the user as failed results, but
  `withContext` does not report them to Sentry.
- Add a new class only when a caller will **branch on it**. If nothing
  branches, use the closest existing class with a clear message.
- Construct with a message the user can read and a `cause` when wrapping:
  `new TimeoutError("Request timed out", { cause: error })`. An HTTP status can
  ride along as `{ statusCode: 404 }`.
- Give each new class a doc comment saying when it is raised and why it is or
  is not expected, like the existing ones.
- Never create ad-hoc `class XError extends Error` in feature code, and never
  return a bare string as an error.

### 6d. Telling errors apart — by `name`, never `instanceof`

`error()` re-points each instance at its parent's prototype, so
`instanceof NotFoundError` is **always false**. The name is also the only field
that survives serialization to the client.

```ts
// ✅
if (store.error.name === NotFoundError.errorName) notFound();
if (checkout.error.name === "unauthenticated-error") router.push("/sign-in");
if (isExpected(result.error)) ...;             // helpers keyed by name
if (isIntegrationAuthError(result.error)) break;

// ❌ always false
if (store.error instanceof NotFoundError) ...
// ❌ static `name` is the JS class name "NotFoundError", not the wire name
if (store.error.name === NotFoundError.name) ...
```

When a check is needed in more than one place, add a small `isX(error)` helper
next to the class, as `isIntegrationAuthError` does.

### 6e. Handle, don't classify

- Most call sites only propagate: `if (!result.success) return result;`.
- Branch on an error only when the outcome differs (redirect to sign-in,
  `notFound()`, stop a loop, show a paywall). Use `switch (true)` when there
  are several.
- Never write an exhaustive `if/else` ladder over every subtype "just in case".
- "Not found" on reads is `null` data, not a failure. Use `NotFoundError` only
  when the caller asked for something that must exist.

### 6f. Where each layer handles it

| Layer | Pattern |
|---|---|
| Model / util (`server/app/*`, `server/utils/*`) | `resultify` / repository / `HTTP.request`; return `Result` |
| Exported server action | Wrapped in `withAuthentication` / `withContext` / `withSubscription`, which report unexpected errors to Sentry, serialize the error for the client and return a `Result`. No return type annotation |
| Server component in `<Suspense>` | `await unwrapResult(Module.action(Environment.SERVER, …))`, which throws so the boundary handles it. Gated dashboard reads use `unwrapEntitled` |
| Route handler | Check the `Result` and map it to a `Response` with a status; never let it throw |
| Client component | `useAsyncAction` → call the action → `if (!result.success)` show a `toast.add({ type: "error", title: translate("toast.error"), description: result.error.message })` or branch on `error.name`, then `return` |

```tsx
const [submit, isPending] = useAsyncAction(async (data: FormEntries<typeof config>) => {
  const update = await User.updateProfile(data);
  if (!update.success) {
    toast.add({ title: translate("toast.error"), description: update.error.message, type: "error" });
    return;
  }
  toast.add({ title: translate("toast.saved"), type: "success" });
});
```

---
## 7. Server modules — context wrappers (`with*`)

Every server function that does real work is a **contexted action**: a
function `(context, ...args) => Promise<Result>` wrapped by a `with*` builder.
The wrapper builds the context, opens a Sentry span named after the action,
reports unexpected failures, serializes errors for the client, and gives the
caller a function without the `context` argument.

### 7a. The ladder

Each rung adds to the context of the one before. Pick the **lowest** rung that
gives you what you need.

| Wrapper | From | Adds to `context` | Use for |
|---|---|---|---|
| `withInstrumentation` | `utils/context` | `environment`, `span` | Repositories, internal helpers, `"use cache"`, `generateStaticParams`, crons' inner work. No request APIs, so it never calls `headers()` |
| `withContext` | `utils/context` | + `auth` (Better Auth API) and request instrumentation | Public request-scoped actions that don't need a user |
| `withAuthentication` | `utils/authentication` | + `session` (user is signed in, else `UnauthenticatedError`) | Anything per account, including the free onboarding scan |
| `withSubscription` | `utils/entitlement` | + `subscription` (else `SubscriptionRequiredError`) | Dashboard-only, paid features |
| `withAuthorization([UserRole.STAFF], fn, name)` | `utils/authorization` | role check (else `UnauthorizedError`) | Internal `/dev/*` actions. Never gate on merchant `owner`/`administrator` |
| `withCron` | `utils/cron` | Bearer `CRON_SECRET` check | `/api/cron/*` work |
| `.append(withDurable)` | `utils/context` | + `durable: { redis, db }` | Only the actions that need Redis (rate limits, locks) |

```ts
export const list = withAuthentication(
  async (context, { store }: { store: string }) =>
    find(Environment.SERVER, { where: scope(context.session.user.id, store) }),
  "Competitor.list",
);

const isRateLimited = withContext.append(withDurable)(
  async (context, { key }: { key: string }) => { ... context.durable.redis ... },
  "Tracking.isRateLimited",
);
```

Rules:

- Always give the second argument, the span name, as `"Module.function"`.
- The action body returns a `Result`. Never throw out of it.
- No return-type annotations on wrapped actions; the builder infers the
  success type and the combined error union.
- Name the context parameter `context`. If it's unused, use `_`:
  `async (_, { store }: { store: string }) => …`.
- Arguments after `context` are one destructured options object named for the
  domain (`{ store }`, `{ store: id }`), with defaults (`= {}`) when everything
  is optional.
- Need a new capability? Write an `Enhancer<In, Out, E>`
  (`(context) => Promise<Result<Out, E>>`) and `.append(...)` it onto the
  closest builder, as `withAuthentication = withContext.append(authenticate)`
  does. Don't add fields to every context, and don't reach for globals inside
  an action.

### 7b. Calling an action — `Environment`

A wrapped action takes an optional first argument from
`@/server/utils/environment`:

- **Server to server** (server components, other actions, routes, crons): pass
  `Environment.SERVER`. Errors stay real `Error`s, so `error.name` checks work.
- **Client** (a `"use client"` file calling a server action): pass nothing. It
  defaults to `Environment.CLIENT`, and errors arrive serialized (`name`,
  `message`) through `ErrorProtocol`.

```ts
// server component
const products = await unwrapResult(Products.list(Environment.SERVER, { store }));
// client component
const update = await Products.update({ product: id, title });
```

### 7c. Using the context

- `context.session.user` holds the signed-in user (from `withAuthentication`
  and up). Scope every query by `context.session.user.id`.
- `context.span.setAttribute("store.id", id)` and
  `context.span.addBreadcrumb({ category, message, data })` add observability.
  Never put secrets in either; action arguments that look like secrets are
  already redacted.
- `context.auth` is the Better Auth server API (`withContext` and up).
- `context.subscription` holds the active plan (`withSubscription`).

### 7d. Model files and repositories

Every table has exactly one model file in `server/app/<model>.ts`. Only that
file touches the table; everything else imports its namespace.

```ts
// server/app/competitor.ts — internal model, never a public action module
import "server-only";

export const { get, find, paginate, create, update, destroy, exists, count } =
  repository(schema.competitor);

export type Type = Document<typeof schema.competitor>;
```

Raw delegates provide no authentication or ownership boundary. Browser calls
belong in a separate `<model>.actions.ts` module with `"use server"`, using
explicit async arrows to forward only to authenticated, owner-scoped model
operations. Import `ClientParameters` from `utils/environment` to infer the
arguments without the internal Environment overload. Never export the raw
CRUD delegates or internal billing/cron helpers from that facade. Runtime
re-exports are rejected by this repository's Next compiler; type-only exports
are safe. Server code continues importing the internal model directly.

- Delegates take an `Environment` first and return `Result`s:
  `get(Environment.SERVER, id)`, `find(Environment.SERVER, { where, limit })`.
  `get`/`find` return `null` data when nothing matches.
- Prefer a delegate over `db`. Raw `db.select` only for aggregates the
  repository can't express, wrapped in `resultifyRead`.
- `Type` is the row type every other file uses as `Module.Type`.
  `Insertable<T>` is the create shape, and `$OmitSystemFields` (from
  `utils/validation`) strips system columns from Zod schemas.
- Lists use `paginate(...)`, return `Paginated<T>` (`{ items, pagination }`),
  and read the page from the URL with `extractPaginationParams(searchParams)`.
- Wrap an action that many components on one page call with the same
  arguments in `dedupe(...)`. It memoizes by argument value for one request.
  React's `cache` compares by identity and misses whenever an options object
  is built at the call site.
- No file-level `"use server"` on a module that also exports plain helpers or
  cache tags. Split them out instead.

### 7e. Reading results in render code

| Need | Use |
|---|---|
| Server component, failure should throw to the boundary | `await unwrapResult(action(Environment.SERVER, …))` |
| Gated dashboard read that renders under the paywall | `unwrapEntitled(await action(Environment.SERVER, …))`, which gives `null` on a missing plan |
| Gated read whose data can itself be `null` | Check `isSubscriptionRequired(result.error)` |
| Run independent reads together | `Promise.all([...])`. Never `await` one after another when they don't depend on each other |

### 7f. Route handlers and public APIs

- Route handlers call actions with `Environment.SERVER` and map the `Result`
  to a `Response`.
- Public JSON APIs answer errors with `problem(code, detail, { status })` from
  `utils/problem` (RFC 9457 `application/problem+json`). `problemCodeFor(error)`
  maps an error to its code.
- Throttle with `consume(identify(request), policy)` from `utils/rate-limit`
  using a named `Policy` (`PUBLIC_API_POLICY` is the default, `ENTRY_POLICY`…)
  and send `rateLimitHeaders(...)`.
- Any URL a user supplied goes through `HTTP.request(url, init, { guard: true })`,
  with `HTTP.read` / `HTTP.page` for size-capped bodies.

---

## 8. Shared utilities — use these, don't rewrite them

Before you write a helper, check `@zenncore/utils`. If it exists, import it.
If it's missing and more than one place needs it, add it there, not in a local
`utils.ts`.

### 8a. `@zenncore/utils` helpers

| Import | What |
|---|---|
| `resultify`, `unwrapResult`, `type Result`, `type UnwrapResult`, `type InferredError` | §6 |
| `cn`, `cva`, `type VariantProps`, `type ClassList`, `type ClassValue` | Class merging, variants, sub-part classes |
| `unique`, `head`, `tail` | Array basics (`unique` dedupes with a `Set`) |
| `clamp`, `isEqual` | Re-exported from es-toolkit |
| `merge`, `access`, `removeUndefinedEntries`, `isPlainObject` | Deep merge, typed path access, strip `undefined` keys |
| `parseSearchParam(value, "single" \| "multiple", fallback)` | Normalizes Next `searchParams` values |
| `mergeRefs`, `assignRef` | Ref plumbing |
| `getErrorMessage` | react-hook-form field error to string |
| `pipe` | Function composition |

### 8b. `@zenncore/utils/hooks`

| Hook | Use |
|---|---|
| `createContext({ name })` | Returns `[Context, useHook]` and throws outside the provider |
| `useAsyncAction(fn)` | Returns `[run, isPending]`. Use for every client call to a server action |
| `useDebounceCallback`, `useThrottleCallback` | Input-driven work |
| `useStableCallback`, `useControlled`, `useMergedRefs`, `useIsoLayoutEffect` | From Base UI: stable handlers, controlled/uncontrolled props, refs, SSR-safe layout effects |
| `useSlot` | Slot rendering |

App-level: `useDocument` (`@/hooks/use-document`) for SSR-safe
`document`/`window`.

### 8c. `@zenncore/utils/types`

`Nullable<T>` (`T | null | undefined`), `Prettify<T>`, `DistributiveOmit`,
`Override` / `DistributiveOverride`, `EmptyObject`, `Branded<Brand, T>`,
`UnionToIntersection`, `DeepPartial`, `IsEqual`, `UniqueIdentifier`, `Tuple` /
`FixedTuple`. Reach for these before writing a mapped type
yourself.

### 8d. App utilities worth knowing

`apps/web/src/lib/` holds client-safe helpers grouped by subject (`currency.ts`,
`date.ts`, `csv.ts`, `redirect.ts`, `dashboard-destinations.ts`, …), and
`server/utils/` holds server-only ones (`http.ts`, `ssrf.ts`, `stripe.ts`,
`csv.ts`, …). Search both before you add a formatter, parser or client wrapper.
Product integrations such as AI calls are covered in `/zenn-style`.

---
## 9. Validation — Zod at every boundary

Anything that enters from outside is parsed with Zod before it is used: form
data, action arguments from the client, URL params, webhook and API bodies,
JSON from third parties, and model output.

- Use `safeParse`, never `parse`, and turn a failure into a `Result`:
  ```ts
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return { success: false, error: new ValidationError(parsed.error.message) };
  const { store, queries } = parsed.data;
  ```
- A rule the user broke (empty selection, bad domain) returns `ValidationError`.
  It is expected, so the user sees it and Sentry doesn't. Write its message for
  the user ("Enter a target store domain."), not as a stack trace.
- Name schemas `<thing>Schema` (`faqSchema`, `businessProfileSchema`) at module
  scope, next to the code that uses them. Derive the type with
  `z.infer<typeof faqSchema>`; don't write the type twice.
- Database row schemas come from `server/database/validators.ts`. Strip system
  columns with `$OmitSystemFields(schema)` and don't redeclare row shapes.
- Enum-like values are `as const` arrays plus a derived type and a value map,
  as `USER_ROLES` / `UserRole` do. Validate against the array with `z.enum`.
- Use the Zod 4 top-level formats: `z.email()`, `z.url()`, `z.uuid()`.
- A field that may be empty is `.nullable()`. Apply the fallback in code
  (`currency ?? "USD"`), not with `.default()`, so one schema works for parsing,
  forms and model output alike.
- Forms reuse the schema through `field({ validator })` or
  `applyFormOptions(schema, …)`. The client check is for UX; the server
  re-validates.
- Read URL params with `parseSearchParam` and then validate or clamp them, as
  `extractPaginationParams` does. A hostile value must never reach a query.

---

## 10. Translations — next-intl, no literals

Every string a user can see comes from a message catalog. Nothing in JSX is
English text.

- The translator is always named **`translate`**:
  ```ts
  const translate = useTranslations("agentReadiness");             // client
  const translate = await getTranslations("enterprise");            // server component
  const translate = await getTranslations({ locale, namespace: "blog.tag" }); // action, route, metadata, OG image
  ```
- Server actions, route handlers, `generateMetadata` and OG images pass an
  explicit `{ locale }`. Pages get it from `next/root-params`; never call
  `setRequestLocale`.
- Structured content (arrays, objects) comes from `getMessages()` /
  `useMessages()`. Never `translate.raw()`, hand-written message types or
  casts.
- Keys are camelCase with dot namespaces, one namespace per feature:
  `signIn.fields.email.label`, `pricing.plans.scale.figure`.
- Action labels are by role: `action.primary`, `action.secondary`,
  `action.tertiary`, `action.quaternary`. Never `submit`, `cancel` or
  `primaryInverse`.
- Feedback uses `toast.error`, `toast.<what>Saved` and similar inside the
  feature namespace.
- Messages live in fragments (`apps/web/messages/fragments/<feature>.<locale>.json`).
  After editing, run:
  ```bash
  bun apps/web/scripts/merge-i18n-fragments.ts
  ```
  ```bash
  cd apps/web && bunx next typegen && bun run i18n:check
  ```
- Never fall back to English for a missing key. Add the key in every locale.
- Code-like strings (URLs, HTTP methods, capability keys) are not translated.
- Errors returned from server code carry a readable message; client code shows
  it as the toast description under a translated title.

---

## 11. Tests — Bun specs

- Bun's runner only: `import { describe, expect, test } from "bun:test"`.
  Run with `cd apps/web && bun test src`, or `bun test <path>` for one file.
- Specs live in `apps/web/src/server/spec/` (server and lib logic) and
  `apps/web/src/i18n/spec/` (catalogs and locale rules). Name them after the
  subject: `entry.test.ts`, `ucp-validator.test.ts`. No `__tests__` folders and
  no tests spread beside the source.
- `describe` names the function or module (`describe("resolveOrigin", …)`).
  `test` names the behaviour in plain words: `"accepts what a merchant actually
  types"`, `"refuses anything that is not a storefront host"`.
- Test pure functions directly with real inputs, the strings and payloads a
  user or platform actually sends. Group related assertions in one `test`.
- Assert whole values with `toEqual` where you can, rather than poking at
  fields. For `Result`s, assert on `success` and `data` / `error.name`.
- **Module mocks are process-global in Bun.** A test that needs `mock.module`
  (auth, database) goes in `spec/fixtures/<name>.fixture.ts` and is run from
  its `.test.ts` in a child `bun test` process, as
  `account-lifecycle-actions.test.ts` does, so it can't leak into other suites.
- Restore any environment you change (`afterEach` + `Reflect.set(process.env, …)`).
- Slow tests take an explicit timeout as the last argument (`15_000`).
- When a rule in the docs must not drift (prices, revisions, keys), add a spec
  that fails on drift instead of a comment asking people to keep things in sync.
- The same style rules apply to test code: `const`, full names, no `forEach`.

---

## 12. Types

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

## 13. Modules and files

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

## 14. React

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

## 15. HTML

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

## 16. Tailwind first

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

## 17. Checklist before you hand back code

- [ ] No `let`, no `function`, no `forEach`, no `try/catch` for expected paths
- [ ] Failures are `Result`s via `resultify` / `resultifyRead` / `HTTP.request`; errors come from `server/utils/error.ts`, are told apart by `name` and passed on, not classified
- [ ] Every name is a full word, single word where possible, named for the domain
- [ ] No `…Result` suffix; `.data` read inline
- [ ] Props destructured in the signature with defaults; rest forwarded
- [ ] Guards return early; braces dropped on one-liners; `switch (true)` for chains
- [ ] Types in a same-name namespace; no `types/` folder; suppressions justified
- [ ] Server modules imported as namespaces
- [ ] Actions wrapped on the lowest `with*` rung, named `"Module.fn"`, no return type, `Environment.SERVER` on server calls
- [ ] Tables touched only through their model file's repository delegates; reads parallel with `Promise.all`
- [ ] External input parsed with Zod `safeParse`; user mistakes are `ValidationError`s
- [ ] Every visible string via `translate` / `getMessages`, keys by role, catalogs merged and checked
- [ ] Tests are Bun specs in `spec/`, named for behaviour; module mocks isolated in fixtures
- [ ] Checked `@zenncore/utils` and `lib/` / `server/utils/` before writing a helper
- [ ] Semantic HTML, no raw controls, copy through next-intl
- [ ] Tailwind semantic tokens, 2-step spacing, `cn`/`cva` for composition
- [ ] `bun run lint` clean on touched files; typecheck error count not increased
