import { resultify } from "@zenncore/utils";
import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { drain } from "@/server/app/integration/recharge/jobs";
import {
  discardPending,
  redeemPending,
  releasePending,
} from "@/server/app/integration/recharge/oauth";
import {
  INSTALL_COOKIE,
  RESUME_PATH,
  safeError,
} from "@/server/app/integration/recharge/types";

export const maxDuration = 300;

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const jar = await cookies();
  const cookie = jar.get(INSTALL_COOKIE)?.value;
  if (!cookie)
    return NextResponse.redirect(
      new URL("/dashboard/settings?recharge=expired", url.origin),
    );
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });
  if (!session)
    return NextResponse.redirect(
      new URL(
        `/sign-in?redirect=${encodeURIComponent(RESUME_PATH)}`,
        url.origin,
      ),
    );
  const result = await resultify(() =>
    redeemPending({ cookie, user: session.user.id }),
  );
  if (!result.success) {
    const reason = safeError(result.error);
    if (reason === "shop_mismatch" || reason === "connect_shopify_first") {
      await releasePending(cookie);
      return NextResponse.redirect(
        new URL(
          "/onboarding/connect/shopify?recharge=connect_shopify_first",
          url.origin,
        ),
      );
    }
    await discardPending(cookie);
    jar.delete(INSTALL_COOKIE);
    return NextResponse.redirect(
      new URL(`/dashboard/settings?recharge=${reason}`, url.origin),
    );
  }
  jar.delete(INSTALL_COOKIE);
  after(() => drain({ limit: 10 }));
  return NextResponse.redirect(new URL(result.data.returnTo, url.origin));
};
