import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { defaultLocale, isLocale } from "@/i18n/locales";
import { auth } from "@/lib/auth";
import * as Accounts from "@/server/app/outbound/linkedin-accounts";
import * as Users from "@/server/app/user";
import { isInternalStaff } from "@/server/database/validators";
import { Environment } from "@/server/utils/environment";
import * as Unipile from "@/server/utils/outbound/unipile";

export const GET = async (request: NextRequest) => {
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });
  const user = session
    ? await Users.get(Environment.SERVER, session.user.id)
    : null;
  if (!session || !user?.success || !isInternalStaff(user.data?.role))
    return NextResponse.json(
      { error: "Staff access required" },
      { status: 403 },
    );

  const accountId = request.nextUrl.searchParams.get("account") ?? undefined;
  if (accountId) {
    const existing = await Accounts.requireAccount(accountId);
    if (!existing.success)
      return NextResponse.json(
        { error: "Connect this LinkedIn account first." },
        { status: 404 },
      );
  }
  const requestedLocale = request.nextUrl.searchParams.get("locale") ?? "";
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const state = randomBytes(32).toString("base64url");
  const redirectUri = new URL(
    "/api/integrations/outbound/linkedin/callback",
    process.env.APP_HOST,
  ).toString();
  const destination = await Unipile.createAuthLink({
    state,
    redirectUri,
    ...(accountId ? { accountId } : {}),
  });
  if (!destination.success)
    return NextResponse.json(
      { error: destination.error.message },
      { status: destination.error.statusCode },
    );
  const jar = await cookies();
  jar.set(
    "ecentic_outbound_unipile_auth",
    JSON.stringify({ state, actor: session.user.id, locale, accountId }),
    {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/api/integrations/outbound/linkedin",
      maxAge: 600,
    },
  );
  return NextResponse.redirect(destination.data.link);
};
