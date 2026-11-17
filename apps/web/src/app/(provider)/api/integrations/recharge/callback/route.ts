import { resultify } from "@zenncore/utils";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { captureCode } from "@/server/app/integration/recharge/model";
import {
  INSTALL_COOKIE,
  RESUME_PATH,
  safeError,
} from "@/server/app/integration/recharge/types";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const jar = await cookies();
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.has("error")) {
    jar.delete(INSTALL_COOKIE);
    return NextResponse.redirect(
      new URL("/dashboard/settings?recharge=reconnect_required", url.origin),
    );
  }
  // `state` is not relied on: Recharge's Shopify iframe login can drop it.
  // Code and eventual grant stay server-side; the browser holds an opaque key.
  const result = await resultify(() =>
    captureCode(code, jar.get(INSTALL_COOKIE)?.value),
  );
  if (!result.success) {
    jar.delete(INSTALL_COOKIE);
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?recharge=${safeError(result.error)}`,
        url.origin,
      ),
    );
  }
  jar.set(INSTALL_COOKIE, result.data, {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return NextResponse.redirect(new URL(RESUME_PATH, url.origin));
};
