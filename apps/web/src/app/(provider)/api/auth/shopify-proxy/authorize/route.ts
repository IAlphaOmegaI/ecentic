import { cookies } from "next/headers";
import { type NextRequest, NextResponse as Response } from "next/server";

export const GET = async (request: NextRequest) => {
  const { SHOPIFY_API_KEY, APP_HOST } = process.env;

  if (!SHOPIFY_API_KEY || !APP_HOST) {
    return Response.json(
      { error: "Shopify integration not configured" },
      { status: 500 },
    );
  }

  const jar = await cookies();
  const shop = jar.get("shopify_auth_shop")?.value;

  if (!shop) return Response.redirect(`${APP_HOST}/sign-in?error=missing_shop`);

  const shopifyUrl = new URL(`https://${shop}/admin/oauth/authorize`);

  for (const [key, value] of request.nextUrl.searchParams) {
    shopifyUrl.searchParams.set(key, value);
  }

  shopifyUrl.searchParams.set("client_id", SHOPIFY_API_KEY);

  return Response.redirect(shopifyUrl.toString());
};
