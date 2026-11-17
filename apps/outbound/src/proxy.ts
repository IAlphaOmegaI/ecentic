import { resultify } from "@zenncore/utils";
import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "@/i18n/locales";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { isInternalStaff } from "@/server/database/validators";

const internationalize = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const locale =
    locales.find(
      (candidate) =>
        pathname === `/${candidate}` || pathname.startsWith(`/${candidate}/`),
    ) ?? defaultLocale;
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  const route = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "") || "/";
  const response = internationalize(request);
  const session = await resultify(() =>
    auth.api.getSession({ headers: request.headers }),
  );
  const staff = session.success && isInternalStaff(session.data?.user.role);

  if (route === "/sign-in") {
    if (staff)
      return NextResponse.redirect(new URL(prefix || "/", request.url));
    return response;
  }

  if (!staff) {
    const target = new URL(`${prefix}/sign-in`, request.url);
    target.searchParams.set(
      "redirect",
      `${prefix}${route}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(target);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
    // Mailbox detail paths contain email domains, not static file extensions.
    "/warmup/:path*",
    "/:locale/warmup/:path*",
  ],
};
