import type { ProxyConfig, NextRequest as Request } from "next/server";
import { NextResponse as Response } from "next/server";
import * as Authentication from "@/server/app/authentication";

type Route = string | RegExp;

// Routes that require an authenticated session. Everything not listed here is
// public. This is deliberately a deny-list: a new marketing or docs page is
// reachable the moment it exists, instead of silently becoming unreachable
// until someone remembers to register it.
const PROTECTED = [
  /^\/dashboard(\/.*)?$/,
  /^\/onboarding(\/.*)?$/,
  "/complete-profile",
] as const satisfies readonly Route[];

// Protected *and* gated on role. Authenticated non-administrators are sent to
// the dashboard rather than the sign-in page — they are signed in, just not
// permitted here.
const ADMINISTRATOR_ONLY = [
  /^\/dev(\/.*)?$/,
] as const satisfies readonly Route[];

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

  if (
    request.method === "GET" &&
    pathname === "/" &&
    prefersMarkdown(request.headers.get("accept"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/llms.txt";
    return Response.rewrite(url);
  }

  const administratorOnly = matches(pathname, ADMINISTRATOR_ONLY);
  const authenticationRoute = matches(pathname, AUTHENTICATION);
  const requiresSession =
    administratorOnly || authenticationRoute || matches(pathname, PROTECTED);

  // Purely public route — skip the session lookup entirely rather than paying
  // for a cookie verify (and possible database read) on every page view.
  if (!requiresSession) return Response.next();

  // Reads the signed `user` cookie first and only falls back to the session.
  // The cookie is a one-hour cache and the session lives seven days, so it
  // expires first — it cannot outlive a session that is still valid.
  const user = await Authentication.getProxiedCurrentUser();

  // Fail closed: an unreadable session must never grant access.
  const account = user.success ? (user.data ?? null) : null;

  switch (true) {
    case authenticationRoute: {
      return account ? redirect(request, "/dashboard") : Response.next();
    }
    case account === null: {
      return redirect(request, "/sign-in", pathname + request.nextUrl.search);
    }
    case administratorOnly && account?.role !== "administrator": {
      return redirect(request, "/dashboard");
    }
    default: {
      return Response.next();
    }
  }
};

export const config = {
  matcher: [
    "/((?!monitoring|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|llms\\.txt|manifest\\.webmanifest|browserconfig\\.xml|\\.well-known(?:/.*)?$|opengraph-image(?:-[^/]+)?$|twitter-image(?:-[^/]+)?$|api|.*\\.(?:png|jpg|jpeg|webp|svg)).*)",
  ],
} satisfies ProxyConfig;
