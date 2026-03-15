import crypto from "node:crypto";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse as Response } from "next/server";

const SCOPES = "read_products,write_products";

export const GET = async (request: NextRequest) => {
  const { SHOPIFY_API_KEY, APP_HOST } = process.env;

  if (!SHOPIFY_API_KEY || !APP_HOST)
    return Response.json(
      { error: "Shopify integration not configured" },
      { status: 500 },
    );

  const shop = request.nextUrl.searchParams.get("shop");
  if (!shop)
    return Response.json({ error: "Missing shop parameter" }, { status: 400 });

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

  const redirectUri = `${APP_HOST}/api/integrations/shopify/callback`;

  const url = new URL(`https://${domain}/admin/oauth/authorize`);

  url.searchParams.set("client_id", SHOPIFY_API_KEY);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", nonce);

  return Response.redirect(url.toString());
};
