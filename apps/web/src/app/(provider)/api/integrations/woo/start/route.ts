import { headers } from "next/headers";
import { type NextRequest, NextResponse as Response } from "next/server";
import { auth } from "@/lib/auth";
import * as Connect from "@/server/app/ucp/connect";
import { Environment } from "@/server/utils/environment";

/**
 * Entry point of the woo-ucp plugin's one-click connect (the plugin's
 * "Connect to ecentic.ai" button and the onboarding form both land here with
 * the store's URL). Mints OAuth state + PKCE and forwards the admin to the
 * store's authorize screen.
 *
 * When the plugin isn't installed there is nothing to authorize against, and
 * the plugin will not phone home on activation (WordPress.org forbids it), so
 * we cannot hand off and wait for it to resume. Instead we send the admin back
 * here with `status=install_required` and tell them how to finish.
 */

const connectPage = (params: Record<string, string> = {}) => {
  const url = new URL("/onboarding/connect/woocommerce", process.env.APP_HOST);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
};

export const GET = async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const storeUrl = params.get("store_url");
  const name = params.get("name") ?? "";

  if (!storeUrl) {
    return Response.redirect(connectPage({ error: "missing_store_url" }));
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    // The admin signs in first, then restarts the flow from the plugin's
    // connect button or the onboarding form.
    return Response.redirect(`${process.env.APP_HOST}/sign-in`);
  }

  const begun = await Connect.beginConnect(Environment.SERVER, {
    user: session.user.id,
    storeUrl,
    name,
  });

  if (!begun.success) {
    return Response.redirect(connectPage({ error: "bad_store_url" }));
  }

  if (begun.data.next === "install") {
    return Response.redirect(
      connectPage({
        status: "install_required",
        store_url: begun.data.storeUrl,
      }),
    );
  }

  return Response.redirect(begun.data.url);
};
