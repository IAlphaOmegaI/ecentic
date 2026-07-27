# Plan 004: Stop trusting the unsigned `user` cookie for route authorization — sign it, validate it, and bound its lifetime

> **⛔ SUPERSEDED — do not execute.** This plan shipped (commit `907688d`) and
> was later replaced wholesale. The `user` cookie it hardened no longer exists:
> `signature.ts`, `setUserCookie`, and `getProxiedCurrentUser` are deleted, and
> `proxy.ts` now authorizes from `auth.api.getSession()` backed by better-auth's
> `session.cookieCache`.
>
> Kept for the record because its problem statement was right and defect #3
> below ("Unbounded staleness") outlived the fix: a 1-hour `maxAge` bounds the
> cookie but never ties it to the session, so the proxy still admitted dead
> sessions for up to an hour after sign-out, revocation, or expiry. Better
> Auth's cache closes that because its payload carries the session's own
> `expiresAt` and sign-out expires it alongside the session token.

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat df39e96..HEAD -- apps/web/src/proxy.ts apps/web/src/server/app/authentication.ts apps/web/src/server/utils`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/003-verification-baseline.md (test infra for the signing helpers)
- **Category**: security
- **Planned at**: commit `df39e96`, 2026-06-10

## Why this matters

Route authorization in the Next.js proxy is decided by a cookie the client fully controls. `proxy.ts` derives the user's role from `Authentication.getProxiedCurrentUser()`, which — when a `user` cookie is present — returns `JSON.parse(cookieValue)` with no signature, no validation, and no expiry. Three concrete problems:

1. **Role forgery**: anyone can send `Cookie: user={"role":"administrator"}` and receive the administrator route map (`/^\/.*/` — every route). Server actions still verify the real session, so data access is not directly exposed, but the routing authorization layer is fully bypassable, and any future page that trusts the proxy's gating inherits the hole.
2. **Crash vector**: a malformed cookie value makes `JSON.parse` throw uncaught inside the proxy — failing every request for that visitor until the cookie is cleared.
3. **Unbounded staleness**: the cookie has no `maxAge` and is only deleted on sign-out, so role changes or bans never propagate to routing.

The fix: HMAC-sign the cookie payload with `BETTER_AUTH_SECRET`, verify on read (falling back to the real session on any failure), wrap parsing in `resultify`, and bound the cookie's lifetime.

## Current state

**`apps/web/src/proxy.ts:82-101`** — the consumer:

```ts
  const user = await Authentication.getProxiedCurrentUser();
  const role = user.success ? (user.data?.role ?? "public") : "public";

  const [access, redirectTo] = (() => {
    switch (role) {
      case "public": {
        return [RouteAccess.PUBLIC, "/sign-in"];
      }
      case "administrator": {
        return [RouteAccess.ADMINISTRATOR, "/sign-in"];
      }
      default: {
        return [RouteAccess.USER, "/onboarding/connect"];
      }
    }
  })();
```

Note `proxy.ts:70`: in development the proxy returns `Response.next()` immediately — all behavior below applies to production builds.

**`apps/web/src/server/app/authentication.ts:228-252`** — the producer/reader (file begins with `"use server"`):

```ts
export const getProxiedCurrentUser = withContext(async (context) => {
  const jar = await cookies();
  const cached = jar.get("user")?.value;

  if (cached) {
    return { success: true, data: JSON.parse(cached) as User.Type };
  }

  const session = await context.auth.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { success: false, error: new Error("user-not-found") };
  }

  const user = await User.get(Environment.SERVER, session.user.id);
  if (!user.success) return user;

  if (!user.data) return { success: false, error: new Error("user-not-found") };

  jar.set("user", JSON.stringify(user.data));

  return user;
}, "Authentication.getProxiedCurrentUser");
```

**Other `user`-cookie sites in `authentication.ts`:**
- `:150-152` (inside sign-in): `jar.set("user", JSON.stringify(result.data.user));`
- `:169-170` (inside `signOut`): `jar.delete("user");` — correct, keep.

**Environment**: `BETTER_AUTH_SECRET` is a required env var (listed in `CLAUDE.md` and `turbo.json` build env). Next 16's `proxy.ts` runs on the Node.js runtime, so `node:crypto` is available.

**Conventions that apply (the user's zenn-style — follow exactly):**

- `resultify` from `@zenncore/utils` instead of `try/catch`; bindings named by domain (`payload`, `verification`), never `xResult`; read `.data` inline.
- `const` only; no abbreviated names (`signature`, not `sig`); single-word names where possible.
- New helpers grouped in an existing-style utils file, not one-file-per-function (zenn-style §19).
- No explicit return-type annotations on `withContext` callbacks.

## Commands you will need

| Purpose   | Command                              | Expected on success |
|-----------|--------------------------------------|---------------------|
| Install   | `bun install` (repo root)            | exit 0              |
| Typecheck | `cd apps/web && bun run typecheck`   | exit 0, no errors   |
| Lint      | `bun run lint` (repo root)           | exit 0              |
| Tests     | `cd apps/web && bun test src`        | all pass            |
| Build     | `bun run build:web` (repo root)      | exit 0              |

## Scope

**In scope** (the only files you should modify/create):
- `apps/web/src/server/utils/signature.ts` (create — pure sign/verify helpers)
- `apps/web/src/server/utils/signature.test.ts` (create)
- `apps/web/src/server/app/authentication.ts` (the three `user`-cookie sites only)

**Out of scope** (do NOT touch):
- `apps/web/src/proxy.ts` — its consumption of the Result is already defensive (`user.success ? ... : "public"`); no change needed once the producer is fixed.
- Better Auth configuration / its own session cookies — do not enable or alter `session.cookieCache`; this plan deliberately keeps the custom cookie but makes it tamper-proof.
- Any other cookie (`shopify_auth_shop` at `authentication.ts:44`).
- Sign-in/sign-out flow logic beyond the cookie lines cited.

## Git workflow

- Branch: `advisor/004-proxy-cookie-authorization`
- Commit style: `fix: sign and validate the proxied user cookie`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the signing helpers

Create `apps/web/src/server/utils/signature.ts` (no `"use server"` — these are pure utilities):

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export const sign = (payload: string, secret: string) => {
  const digest = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${digest}`;
};

export const verify = (token: string, secret: string) => {
  const [encoded, digest] = token.split(".");
  if (!encoded || !digest) return null;

  const payload = Buffer.from(encoded, "base64url").toString();
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");

  if (expected.length !== digest.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(digest))) return null;

  return payload;
};
```

`verify` returns the payload string on success, `null` otherwise (zenn-style: return `null` for "not found/invalid", let the caller decide).

**Verify**: `cd apps/web && bun run typecheck` → exit 0.

### Step 2: Test the helpers

Create `apps/web/src/server/utils/signature.test.ts` (model after the test files from plan 003):

- round-trip: `verify(sign("hello", "secret"), "secret")` → `"hello"`
- tampered payload: flip a character in the encoded half → `null`
- tampered digest: flip a character in the digest half → `null`
- wrong secret → `null`
- token without a `.` separator → `null`
- empty payload round-trips

**Verify**: `cd apps/web && bun test src` → all pass including 6 new tests.

### Step 3: Sign on write, verify on read in `authentication.ts`

Add module-local (NOT exported — `"use server"` files may only export async functions) helpers near the top of `authentication.ts`:

```ts
import { sign, verify } from "../utils/signature";
import { resultify } from "@zenncore/utils"; // if not already imported

const USER_COOKIE_MAX_AGE = 60 * 60; // 1 hour — bounds role staleness

const setUserCookie = (jar: Awaited<ReturnType<typeof cookies>>, user: User.Type) =>
  jar.set("user", sign(JSON.stringify(user), process.env.BETTER_AUTH_SECRET as string), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: USER_COOKIE_MAX_AGE,
  });
```

(If `User.Type` or the `cookies` typing makes the helper signature awkward, inline the `jar.set` options object at both call sites instead — the options object is the load-bearing part.)

Then:

1. `:152` — replace `jar.set("user", JSON.stringify(result.data.user));` with the signed set.
2. `:249` — replace `jar.set("user", JSON.stringify(user.data));` with the signed set.
3. `:230-234` — replace the trusting read:

```ts
  const cached = jar.get("user")?.value;
  const payload = cached
    ? verify(cached, process.env.BETTER_AUTH_SECRET as string)
    : null;
  const parsed = payload
    ? resultify(() => JSON.parse(payload) as User.Type)
    : null;

  if (parsed?.success) return { success: true, data: parsed.data };
```

On verification or parse failure the function falls through to the existing session path (`context.auth.getSession`), which re-sets a valid signed cookie at `:249`. Do not delete the bad cookie explicitly — the re-set overwrites it.

**Verify**: `cd apps/web && bun run typecheck` → exit 0; `bun run lint` → exit 0.

### Step 4: Production build proves runtime compatibility

`node:crypto` must load in the proxy's runtime. The proxy transitively imports `authentication.ts` → `signature.ts`.

**Verify**: `bun run build:web` → exit 0, no warnings about `node:crypto` being unavailable in an edge runtime. (The build needs the env vars from `apps/web/.env.local`; if the build fails for unrelated missing env vars, record which and verify via `cd apps/web && bun run typecheck` plus a `bun next dev` smoke boot instead.)

### Step 5: Behavioral smoke check (if a dev environment is available)

With `bun run dev:web` running and a signed-in browser session:
1. Sign in → confirm the `user` cookie value now contains a `.` separator and base64url content (DevTools → Application → Cookies).
2. Manually edit the cookie value in DevTools (change one character) → reload a protected route → you are treated as `public` (redirected to `/sign-in`), not crashed.
3. Note: `proxy.ts:70` skips all checks in development — to observe redirect behavior you must test against a production build (`bun run build:web && cd apps/web && bun run start`) or temporarily comment the dev short-circuit locally (revert before committing). If neither is feasible, record that this step was skipped.

## Test plan

- `signature.test.ts` (Step 2): 6 cases listed above — round-trip, two tamper cases, wrong secret, malformed token, empty payload.
- The cookie read/write integration path is exercised by Step 5's manual smoke; automating it requires the context-wrapper refactor noted in plan 003's maintenance notes (out of scope here).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cd apps/web && bun test src` exits 0, including 6 new signature tests
- [ ] `cd apps/web && bun run typecheck` exits 0
- [ ] `bun run lint` exits 0
- [ ] `grep -n 'JSON.parse(cached)' apps/web/src/server/app/authentication.ts` returns no matches
- [ ] `grep -c 'jar.set("user", sign(' apps/web/src/server/app/authentication.ts` outputs `2` (or both sites use the shared helper — `grep -c "setUserCookie(" ` outputs ≥ 2)
- [ ] Both `jar.set` sites for the `user` cookie include `httpOnly: true` and `maxAge`
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `bun run build:web` fails because the proxy is compiled for the Edge runtime and rejects `node:crypto`. (Fallback exists — Web Crypto `crypto.subtle` HMAC — but it changes the helper signatures to async; report first, don't switch unilaterally.)
- `BETTER_AUTH_SECRET` is read anywhere else for cookie signing in a conflicting way (search first: `grep -rn "BETTER_AUTH_SECRET" apps/web/src`).
- The excerpts in "Current state" don't match the live code (drift).
- Importing `signature.ts` into `authentication.ts` creates a module-load error in the proxy at dev boot.

## Maintenance notes

- The signed cookie now expires after 1 hour, after which the session path refreshes it — a deliberate trade of one DB lookup per hour per user for bounded role staleness. If role changes must propagate instantly (e.g. bans), delete the `user` cookie wherever the role is mutated.
- Rotating `BETTER_AUTH_SECRET` invalidates all `user` cookies at once (they fall back to the session path) — harmless, but worth knowing during a secret rotation.
- Reviewer should scrutinize: the read path falls back to the session on EVERY failure mode (missing cookie, bad signature, bad JSON) and never returns unverified data; the cookie options include `httpOnly`.
- Deferred: migrating to Better Auth's built-in `session.cookieCache` (it solves the same problem natively). Worth evaluating when next upgrading Better Auth; this plan's helpers are then deletable.
