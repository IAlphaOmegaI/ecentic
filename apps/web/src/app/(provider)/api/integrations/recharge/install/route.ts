import { resultify } from "@zenncore/utils";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { beginInstall } from "@/server/app/integration/recharge/oauth";
import {
  INSTALL_COOKIE,
  safeError,
} from "@/server/app/integration/recharge/types";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return NextResponse.redirect(
      new URL(
        `/sign-in?redirect=${encodeURIComponent(url.pathname + url.search)}`,
        url.origin,
      ),
    );
  const store = url.searchParams.get("store");
  if (!store || store.length > 200)
    return Response.json({ error: "Missing store." }, { status: 400 });
  const result = await resultify(() =>
    beginInstall({
      store,
      user: session.user.id,
      returnTo: url.searchParams.get("return_to") ?? undefined,
    }),
  );
  if (!result.success)
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?recharge=${safeError(result.error)}`,
        url.origin,
      ),
    );
  (await cookies()).set(INSTALL_COOKIE, result.data.cookie, {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return NextResponse.redirect(result.data.url);
};
