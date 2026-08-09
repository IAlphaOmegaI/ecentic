import { cookies, headers } from "next/headers";
import { type NextRequest, NextResponse as Response } from "next/server";
import { auth } from "@/lib/auth";
import * as Shopify from "@/server/app/integration/shopify";
import { Environment } from "@/server/utils/environment";
import { verifyHmac } from "@/server/app/integration/shopify/hmac";

// Sends the admin back to the Shopify connect screen with a machine-readable
// reason instead of stranding them on this JSON endpoint. The connect UI maps
// each reason to a human message. Mirrors the WooCommerce callback.
const connectPage = (reason: string) =>
  `${process.env.APP_HOST}/onboarding/connect/shopify?error=${reason}`;

export const GET = async (request: NextRequest) => {
  if (!process.env.SHOPIFY_API_SECRET || !process.env.APP_HOST) {
    return Response.json(
      { error: "Shopify integration not configured" },
      { status: 500 },
    );
  }

  const params = request.nextUrl.searchParams;

  const code = params.get("code");
  const shop = params.get("shop");
  const state = params.get("state");

  if (!code || !shop || !state)
    return Response.redirect(connectPage("missing_parameters"));

  const jar = await cookies();
  const nonce = jar.get("shopify_nonce")?.value;

  if (state !== nonce) return Response.redirect(connectPage("invalid_state"));

  if (!verifyHmac(params, process.env.SHOPIFY_API_SECRET))
    return Response.redirect(connectPage("invalid_hmac"));

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.redirect(`${process.env.APP_HOST}/sign-in`);

  const result = await Shopify.handleOAuthCallback(Environment.SERVER, {
    code,
    shop,
    user: session.user.id,
  });

  const returnTo = jar.get("shopify_return_to")?.value;

  jar.delete("shopify_nonce");
  jar.delete("shopify_shop");
  jar.delete("shopify_return_to");

  if (!result.success) {
    const reason =
      result.error.name === "conflict-error"
        ? "already_connected"
        : "integration_failed";
    return Response.redirect(connectPage(reason));
  }

  // A reconnect only refreshed the access tokens for a store this user already
  // onboarded. Sending them back through the onboarding product picker would let
  // them select products they hadn't picked before, pushing them past their
  // plan's product limit — so return them to the screen they started the
  // reconnect from, falling back to that store's dashboard.
  if (result.data.reconnected)
    return Response.redirect(
      returnTo?.startsWith("/") && !returnTo.startsWith("//")
        ? `${process.env.APP_HOST}${returnTo}`
        : `${process.env.APP_HOST}/dashboard/${result.data.storeId}`,
    );

  return Response.redirect(
    `${process.env.APP_HOST}/onboarding/products?connected=shopify`,
  );
};
