import crypto from "node:crypto";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

const SCOPES = "read_products";

export const GET = async (request: NextRequest) => {
  const { SHOPIFY_API_KEY, BETTER_AUTH_BASE_URL } = process.env;

  if (!SHOPIFY_API_KEY || !BETTER_AUTH_BASE_URL)
    return NextResponse.json(
      { error: "Shopify integration not configured" },
      { status: 500 },
    );

  const shop = request.nextUrl.searchParams.get("shop");
  if (!shop)
    return NextResponse.json(
      { error: "Missing shop parameter" },
      { status: 400 },
    );

  const sanitized = shop.replace(/[^a-zA-Z0-9\-.]/g, "");
  const domain = sanitized.includes(".myshopify.com")
    ? sanitized
    : `${sanitized}.myshopify.com`;

  const nonce = crypto.randomBytes(16).toString("hex");

  const jar = await cookies();
  jar.set("shopify_nonce", nonce, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  jar.set("shopify_shop", domain, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const redirectUri = `${BETTER_AUTH_BASE_URL}/api/integrations/shopify/callback`;

  const url = new URL(`https://${domain}/admin/oauth/authorize`);
  url.searchParams.set("client_id", SHOPIFY_API_KEY);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", nonce);

  return NextResponse.redirect(url.toString());
};
