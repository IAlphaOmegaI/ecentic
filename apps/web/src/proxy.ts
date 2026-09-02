import { resultify } from "@zenncore/utils";
import type { ProxyConfig, NextRequest as Request } from "next/server";
import { NextResponse as Response } from "next/server";
import createMiddleware from "next-intl/middleware";
import {
  localeFromPathname,
  localizePath,
  stripLocalePrefix,
} from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { agentHomepageLinkHeader } from "@/lib/agent-discovery";
import { auth } from "@/lib/auth";
import { isInternalStaff } from "@/server/database/validators";

type Route = string | RegExp;

const handleI18nRouting = createMiddleware(routing);

const withAgentDiscoveryLinks = (response: Response) => {
  response.headers.append("Link", agentHomepageLinkHeader);
  return response;
};

// Routes that require an authenticated session. Everything not listed here is
// public. This is deliberately a deny-list: a new marketing or docs page is
// reachable the moment it exists, instead of silently becoming unreachable
// until someone remembers to register it. Paths are matched after the locale
// prefix is stripped (`/es/dashboard` → `/dashboard`).
const PROTECTED = [
  /^\/dashboard(\/.*)?$/,
  /^\/onboarding(\/.*)?$/,
  "/complete-profile",
] as const satisfies readonly Route[];

// Protected *and* gated on role: ecentic's own internal surfaces. Authenticated
// non-staff are sent to the dashboard rather than the sign-in page — they are
// signed in, just not permitted here.
//
// The gate is `staff`, never `administrator`: Shopify OAuth mints
// `administrator` for every non-owner staff member of a *merchant's* store
// (`lib/auth.ts` → `getUserInfo`), so gating on it would hand these pages to
// our own customers' employees.
const STAFF_ONLY = [/^\/dev(\/.*)?$/] as const satisfies readonly Route[];

// Signed-in users have no business on these; bounce them to the dashboard.
const AUTHENTICATION = [
  "/sign-in",
  "/sign-up",
] as const satisfies readonly Route[];

const matches = (pathname: string, routes: readonly Route[]) =>
  routes.some((route) =>
    typeof route === "string" ? route === pathname : route.test(pathname),
  );

const prefersMarkdown = (accept: string | null) =>
  accept != null && /\btext\/markdown\b/i.test(accept);

const redirect = (request: Request, to: string, callbackUrl = "") => {
  const next = new URL(to, request.nextUrl.origin);

  // Never redirect a path to itself — that is an infinite loop, not a guard.
  if (request.nextUrl.pathname === next.pathname) return Response.next();

  // `searchParams.set` percent-encodes on write; pre-encoding double-escapes.
  if (callbackUrl) next.searchParams.set("redirect", callbackUrl);

  return Response.redirect(next.toString());
};

export const proxy = async (request: Request) => {
  const { pathname } = request.nextUrl;
  const locale = localeFromPathname(pathname);
  const pathnameWithoutLocale = stripLocalePrefix(pathname);
  const isHomepage =
    pathnameWithoutLocale === "/" || pathnameWithoutLocale === "";

  if (
    request.method === "GET" &&
    isHomepage &&
    prefersMarkdown(request.headers.get("accept"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/llms.txt";
    const response = withAgentDiscoveryLinks(Response.rewrite(url));
    response.headers.set("Vary", "Accept");
    return response;
  }

  const staffOnly = matches(pathnameWithoutLocale, STAFF_ONLY);
  const authenticationRoute = matches(pathnameWithoutLocale, AUTHENTICATION);
  const requiresSession =
    staffOnly ||
    authenticationRoute ||
    matches(pathnameWithoutLocale, PROTECTED);

  // Locale negotiation / rewrite first so downstream pages see `/[locale]/…`.
  const internationalized = handleI18nRouting(request);

  // Purely public route — skip the session lookup entirely rather than paying
  // for a cookie verify (and possible database read) on every page view.
  if (!requiresSession)
    return isHomepage
      ? withAgentDiscoveryLinks(internationalized)
      : internationalized;

  // Resolve the session the same way protected pages do, so the two can never
  // disagree. `session.cookieCache` serves this from a signed cookie that
  // carries the session's own expiry, so it costs a database read only once per
  // cache window — and a dead session is never admitted.
  const result = await resultify(() =>
    auth.api.getSession({ headers: request.headers }),
  );

  // Fail closed: an unreadable session must never grant access.
  const session = result.success ? result.data : null;

  switch (true) {
    case authenticationRoute: {
      return session
        ? redirect(request, localizePath("/dashboard", locale))
        : internationalized;
    }
    case session === null: {
      return redirect(
        request,
        localizePath("/sign-in", locale),
        pathnameWithoutLocale + request.nextUrl.search,
      );
    }
    case staffOnly && !isInternalStaff(session?.user.role): {
      return redirect(request, localizePath("/dashboard", locale));
    }
    default: {
      return internationalized;
    }
  }
};

// Everything runs through the proxy except Next internals, the Sentry tunnel,
// API, `.well-known` and `/ucp` routes, Next's generated social images — and
// anything whose path *ends* in one of the extensions below.
//
// That trailing-extension clause is not cosmetic: whatever reaches next-intl
// gets rewritten to `/<locale>/…`, and no locale segment serves a file, so it
// 404s. Naming files one by one is how `/tracker.js` (the storefront agent
// tracker every Shopify ScriptTag points at), `/webmcp.js`, `/BingSiteAuth.xml`,
// `/auth.md` and `/openapi.json` all ended up returning the 404 page in
// production. The list is an allowlist of what should be publicly served — a
// `public/` file with an extension outside it stays unreachable, which is the
// intent for `templates/*.tsx` and `stubs/*.csv` (local artifacts, not assets).
//
// Anchored with `$` so a slug that merely *contains* a dotted word — say
// `/es/blog/why-node.js-wins` — still gets its locale rewrite.
//
// `ucp` and `mcp` need their own entries because they are the agent-facing
// surfaces with no extension to be saved by that clause: the handlers live at
// `app/ucp/**` and `app/mcp/**`, outside `[locale]`, so the rewrite to
// `/en/ucp/…` or `/en/mcp` 404s them. The `(?:/.*)?$` tail keeps each exclusion
// to that path and its children — the localized `/ucp-validator`,
// `/ucp-playground` and `/ucp-comparison` pages still route through next-intl.
export const config = {
  matcher: [
    "/((?!monitoring|_next/static|_next/image|api|\\.well-known(?:/.*)?$|ucp(?:/.*)?$|mcp(?:/.*)?$|opengraph-image(?:-[^/]+)?$|twitter-image(?:-[^/]+)?$|.*\\.(?:js|mjs|css|txt|md|xml|json|webmanifest|ico|png|jpg|jpeg|gif|webp|avif|svg|mp4|webm|woff|woff2|ttf|otf)$).*)",
  ],
} satisfies ProxyConfig;
