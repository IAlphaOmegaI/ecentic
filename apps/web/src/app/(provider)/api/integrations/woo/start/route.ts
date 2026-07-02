import { headers } from "next/headers";
import { type NextRequest, NextResponse as Response } from "next/server";
import { auth } from "@/lib/auth";
import * as Connect from "@/server/app/ucp/connect";

/**
 * Entry point of the woo-ucp plugin's one-click connect (the plugin's
 * "Connect to ecentic.ai" button links here with the store's details). Mints
 * OAuth state + PKCE and forwards the admin to the store's authorize screen.
 */
export const GET = async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const storeUrl = params.get("store_url");
  const name = params.get("name") ?? "";

  if (!storeUrl) {
    return Response.json({ error: "Missing store_url" }, { status: 400 });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    // The admin signs in first, then restarts the flow from the plugin's
    // connect button.
    return Response.redirect(`${process.env.APP_HOST}/sign-in`);
  }

  const begun = await Connect.beginConnect({
    user: session.user.id,
    storeUrl,
    name,
  });

  if (!begun.success) {
    return Response.json(
      { error: "Could not start the WooCommerce connection" },
      { status: 400 },
    );
  }

  return Response.redirect(begun.authorizeUrl);
};
