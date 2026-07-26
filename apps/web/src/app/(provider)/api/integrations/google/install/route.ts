import crypto from "node:crypto";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse as Response } from "next/server";
import * as GoogleMerchantAPI from "@/server/utils/google-merchant";

/**
 * Starts the merchant-consent Google OAuth for a store ("Connect Google").
 * `?store={storeId}` names the ecentic store the grant attaches to; it rides
 * a short-lived cookie to the callback alongside the CSRF nonce.
 */
export const GET = async (request: NextRequest) => {
  const { APP_HOST } = process.env;
  const config = GoogleMerchantAPI.configuration();

  if (!config || !APP_HOST)
    return Response.json(
      { error: "Google Merchant integration not configured" },
      { status: 500 },
    );

  const store = request.nextUrl.searchParams.get("store");
  if (!store)
    return Response.json({ error: "Missing store parameter" }, { status: 400 });

  const nonce = crypto.randomBytes(16).toString("hex");

  const jar = await cookies();

  jar.set("google_nonce", nonce, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  jar.set("google_store", store, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const url = GoogleMerchantAPI.authorizationUrl({
    clientId: config.clientId,
    redirectUri: `${APP_HOST}/api/integrations/google/callback`,
    state: nonce,
  });

  return Response.redirect(url);
};
