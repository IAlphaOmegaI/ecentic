import { headers } from "next/headers";
import { type NextRequest, NextResponse as Response } from "next/server";
import { auth } from "@/lib/auth";
import * as Connect from "@/server/app/ucp/connect";
import { Environment } from "@/server/utils/environment";

/**
 * Entry point of the woo-ucp plugin's one-click connect (the plugin's
 * "Connect to ecentic.ai" button and the onboarding form both land here with
 * the store's URL). Mints OAuth state + PKCE and forwards the admin to the
 * store's authorize screen — or to the store's plugin-install screen when the
 * plugin isn't there yet (activation auto-resumes the flow).
 */

const connectPage = (reason?: string) =>
  `${process.env.APP_HOST}/onboarding/connect/woocommerce${reason ? `?error=${reason}` : ""}`;

export const GET = async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const storeUrl = params.get("store_url");
  const name = params.get("name") ?? "";

  if (!storeUrl) {
    return Response.redirect(connectPage("missing_store_url"));
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
    return Response.redirect(connectPage("bad_store_url"));
  }

  return Response.redirect(begun.data.url);
};
