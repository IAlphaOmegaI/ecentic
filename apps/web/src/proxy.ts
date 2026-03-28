import type { NextRequest as Request } from "next/server";
import { NextResponse as Response } from "next/server";
import * as Authentication from "@/server/app/authentication";

const RouteAccess = {
  PUBLIC: "public",
  ADMINISTRATOR: "administrator",
  USER: "user",
} as const;

const map = {
  [RouteAccess.PUBLIC]: [
    "/",
    "/terms-and-conditions",
    "/privacy-policy",
    "/sign-up",
    "/sign-in",
    "/verify",
    /^\/share(\/.*)?$/,
  ],
  [RouteAccess.ADMINISTRATOR]: [/^\/.*/],
  [RouteAccess.USER]: [/^\/onboarding(\/.*)?$/],
} as const;

export const proxy = async (request: Request) => {
  if (process.env.NODE_ENV === "development") return Response.next();
  const { pathname } = request.nextUrl;

  const user = await Authentication.getProxiedCurrentUser();
  const role = user.success ? (user.data.role ?? "public") : "public";

  const [access, redirectTo] = (() => {
    switch (role) {
      case "public": {
        return [RouteAccess.PUBLIC, "/sign-in"];
      }
      default: {
        return [RouteAccess.ADMINISTRATOR, "/onboarding/connect"];
      }
    }
  })();

  if (!isAuthorized(pathname, access))
    // const message = `Unauthorized access to ${pathname} under access ${access} redirecting to ${redirectTo}`;
    return deny(request, redirectTo, pathname + request.nextUrl.search);

  return Response.next();
};

type RouteAccess = (typeof RouteAccess)[keyof typeof RouteAccess];

const deny = (request: Request, redirectTo = "/sign-in", callbackUrl = "") => {
  const next = new URL(redirectTo, request.nextUrl.origin);
  if (request.nextUrl.pathname === next.pathname) return Response.next();
  if (callbackUrl)
    next.searchParams.set("redirect", encodeURIComponent(callbackUrl));
  return Response.redirect(next.toString());
};

const isAuthorized = (pathname: string, access: RouteAccess): boolean => {
  return map[access].some((route) => {
    if (typeof route === "string") return route === pathname;
    return route.test(pathname);
  });
};

export const config = {
  matcher: [
    "/((?!monitoring|_next/static|_next/image|favicon\\.ico|api/auth|.*\\.(?:png|jpg|jpeg|webp|svg)).*)",
  ],
};
