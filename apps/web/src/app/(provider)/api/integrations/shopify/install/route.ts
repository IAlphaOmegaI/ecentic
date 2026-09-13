import crypto from "node:crypto";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse as Response } from "next/server";
import { resolveAdminHost } from "@/server/app/integration/shopify/domain";

const SCOPES =
  "read_products,write_products,write_script_tags,read_script_tags";

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

  const domain = await resolveAdminHost(shop);
  if (!domain)
    return Response.redirect(
      `${APP_HOST}/onboarding/connect/shopify?error=invalid-shop`,
    );

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

  // Where to send the user after a reconnect (e.g. back to Settings). Only
  // app-relative paths are accepted so the callback can't be turned into an
  // open redirect.
  const returnTo = request.nextUrl.searchParams.get("return_to");
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//"))
    jar.set("shopify_return_to", returnTo, {
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
