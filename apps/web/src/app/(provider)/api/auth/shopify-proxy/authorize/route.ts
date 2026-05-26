import crypto from "node:crypto";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse as Response } from "next/server";

// const SHOPIFY_AUTHORIZATION_DEFAULT_VALUES = {
//   client_id: process.env.SHOPIFY_API_KEY,
//   scope:
//     "read_product_feeds,write_product_feeds,read_product_listings,write_product_listings,read_products,write_products",
//   state: crypto.randomBytes(16).toString("hex"),
//   redirect_uri: `${process.env.APP_HOST}/api/auth/shopify-proxy/callback`,
// };

export const GET = async (request: NextRequest) => {
  const clientId =
    request.nextUrl.searchParams.get("client_id") ??
    process.env.SHOPIFY_API_KEY;

  if (!clientId || !process.env.APP_HOST) {
    return Response.json(
      { error: "Shopify integration not configured" },
      { status: 500 },
    );
  }

  const state =
    request.nextUrl.searchParams.get("state") ??
    crypto.randomBytes(16).toString("hex");

  const jar = await cookies();
  const shop = jar.get("shopify_auth_shop")?.value;

  if (!shop) {
    return Response.redirect(
      `${process.env.APP_HOST}/sign-in?error=missing_shop`,
    );
  }

  const shopifyUrl = new URL(`https://${shop}/admin/oauth/authorize`);

  for (const [key, value] of request.nextUrl.searchParams) {
    const shopifyKey = key === "grant_options" ? "grant_options[]" : key;
    shopifyUrl.searchParams.set(shopifyKey, value);
  }

  jar.set("shopify_auth_nonce", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  // shopifyUrl.searchParams.set("client_id", clientId);
  // shopifyUrl.searchParams.set(
  //   "scope",
  //   request.nextUrl.searchParams.get("scope") ??
  //     SHOPIFY_AUTHORIZATION_DEFAULT_VALUES.scope,
  // );
  // shopifyUrl.searchParams.set(
  //   "redirect_uri",
  //   request.nextUrl.searchParams.get("redirect_uri") ??
  //     SHOPIFY_AUTHORIZATION_DEFAULT_VALUES.redirect_uri,
  // );

  // const grantOptions = request.nextUrl.searchParams.get("grant_options");

  // if (grantOptions) {
  //   shopifyUrl.searchParams.set("grant_options[]", grantOptions);
  // }

  return Response.redirect(shopifyUrl.toString());
};
