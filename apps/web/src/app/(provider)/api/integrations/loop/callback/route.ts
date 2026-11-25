import { resultify } from "@zenncore/utils";
import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { drain } from "@/server/app/integration/loop/jobs";
import { completeInstall } from "@/server/app/integration/loop/oauth";
import { INSTALL_COOKIE, safeError } from "@/server/app/integration/loop/types";
export const GET = async (request: Request) => {
  const url = new URL(request.url);
  if (process.env["LOOP_OAUTH_ENABLED"] !== "1")
    return Response.json({ error: "oauth_disabled" }, { status: 404 });
  const jar = await cookies();
  const cookie = jar.get(INSTALL_COOKIE)?.value ?? "";
  jar.delete(INSTALL_COOKIE);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || url.searchParams.has("error"))
    return NextResponse.redirect(
      new URL("/dashboard/settings?loop=reconnect_required", url.origin),
    );
  const result = await resultify(() =>
    completeInstall({
      user: session.user.id,
      cookie,
      code: url.searchParams.get("code") ?? "",
      state: url.searchParams.get("state") ?? "",
    }),
  );
  if (result.success)
    after(() => drain({ store: result.data.store, limit: 5 }));
  return NextResponse.redirect(
    new URL(
      `/dashboard/settings?loop=${result.success ? "connected" : safeError(result.error)}`,
      url.origin,
    ),
  );
};
