import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { defaultLocale, isLocale } from "@/i18n/locales";
import { auth } from "@/lib/auth";
import * as Users from "@/server/app/user";
import { isInternalStaff } from "@/server/database/validators";
import { Environment } from "@/server/utils/environment";
import * as Google from "@/server/utils/outbound/google";

export const GET = async (request: NextRequest) => {
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session
    ? await Users.get(Environment.SERVER, session.user.id)
    : null;
  if (!session || !user?.success || !isInternalStaff(user.data?.role))
    return NextResponse.json(
      { error: "Staff access required" },
      { status: 403 },
    );
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const requestedLocale = request.nextUrl.searchParams.get("locale") ?? "";
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const destination = await Google.getAuthorizationUrl({
    state,
    codeChallenge: createHash("sha256").update(verifier).digest("base64url"),
  });
  if (!destination.success)
    return NextResponse.json(
      { error: destination.error.message },
      { status: 409 },
    );
  const jar = await cookies();
  jar.set(
    "ecentic_outbound_google_oauth",
    JSON.stringify({ state, verifier, actor: session.user.id, locale }),
    {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/api/integrations/outbound/google",
      maxAge: 600,
    },
  );
  return NextResponse.redirect(destination.data);
};
