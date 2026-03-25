import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ONBOARDING_ENTRY = "/onboarding/connect";

/** Read env here — not via a shared module — so Next inlines it into the Edge middleware bundle. */
const onboardingOnlyScope = () =>
  process.env.NEXT_PUBLIC_APP_SCOPE?.trim() === "onboarding";

export const middleware = (request: NextRequest) => {
  if (!onboardingOnlyScope()) return NextResponse.next();

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
