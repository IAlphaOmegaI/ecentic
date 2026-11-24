import { resultify } from "@zenncore/utils";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { beginInstall } from "@/server/app/integration/loop/oauth";
import { INSTALL_COOKIE, safeError } from "@/server/app/integration/loop/types";
export const GET = async (request: Request) => {
  const url = new URL(request.url);
  if (process.env["LOOP_OAUTH_ENABLED"] !== "1")
    return Response.json({ error: "oauth_disabled" }, { status: 404 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return NextResponse.redirect(
      new URL(
        `/sign-in?redirect=${encodeURIComponent(url.pathname + url.search)}`,
        url.origin,
      ),
    );
  const result = await resultify(() =>
    beginInstall({
      store: url.searchParams.get("store") ?? undefined,
      organization: url.searchParams.get("organization") ?? "",
      user: session.user.id,
    }),
  );
  if (!result.success)
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?loop=${safeError(result.error)}`,
        url.origin,
      ),
    );
  (await cookies()).set(INSTALL_COOKIE, result.data.cookie, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return NextResponse.redirect(result.data.url);
};
