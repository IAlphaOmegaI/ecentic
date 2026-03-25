import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isOnboardingOnlyScope } from "@/lib/app-scope";

const ONBOARDING_ENTRY = "/onboarding/connect";

export const middleware = (request: NextRequest) => {
  if (!isOnboardingOnlyScope) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const url = request.nextUrl.clone();
    url.pathname = ONBOARDING_ENTRY;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
};

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
