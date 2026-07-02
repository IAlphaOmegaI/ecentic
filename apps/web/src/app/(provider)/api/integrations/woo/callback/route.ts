import { headers } from "next/headers";
import { type NextRequest, NextResponse as Response } from "next/server";
import { auth } from "@/lib/auth";
import * as Connect from "@/server/app/ucp/connect";

/**
 * OAuth redirect leg of the woo-ucp connect flow: the store sends the admin
 * back here with a one-time code. Exchanges it (back-channel, PKCE) for a
 * WooCommerce REST API key, creates the store + imports its catalog, and
 * pushes the hosted-UCP settings to the plugin.
 */
export const GET = async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");

  if (!code || !state) {
    return Response.json({ error: "Missing parameters" }, { status: 400 });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.redirect(`${process.env.APP_HOST}/sign-in`);
  }

  const completed = await Connect.completeConnect({
    user: session.user.id,
    state,
    code,
  });

  if (!completed.success) {
    return Response.json(
      { error: "Failed to complete the WooCommerce connection" },
      { status: 502 },
    );
  }

  return Response.redirect(
    `${process.env.APP_HOST}/onboarding/products?connected=woocommerce`,
  );
};
