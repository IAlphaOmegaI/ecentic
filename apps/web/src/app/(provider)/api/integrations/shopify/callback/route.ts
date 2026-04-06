import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { type NextRequest, NextResponse as Response } from "next/server";
import { auth } from "@/lib/auth";
import * as Shopify from "@/server/app/integration/shopify";
import { Environment } from "@/server/utils/environment";

const verifyHmac = (query: URLSearchParams, secret: string): boolean => {
  const hmac = query.get("hmac");
  if (!hmac) return false;

  const entries = Array.from(query.entries())
    .filter(([key]) => key !== "hmac")
    .sort(([a], [b]) => a.localeCompare(b));

  const message = entries.map(([key, value]) => `${key}=${value}`).join("&");

  const digest = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
};

export const GET = async (request: NextRequest) => {
  const { SHOPIFY_API_SECRET, APP_HOST } = process.env;

  if (!SHOPIFY_API_SECRET || !APP_HOST)
    return Response.json(
      { error: "Shopify integration not configured" },
      { status: 500 },
    );

  const params = request.nextUrl.searchParams;

  const code = params.get("code");
  const shop = params.get("shop");
  const state = params.get("state");

  if (!code || !shop || !state)
    return Response.json({ error: "Missing parameters" }, { status: 400 });

  const jar = await cookies();
  const nonce = jar.get("shopify_nonce")?.value;

  if (state !== nonce)
    return Response.json({ error: "State mismatch" }, { status: 403 });

  if (!verifyHmac(params, SHOPIFY_API_SECRET))
    return Response.json({ error: "Invalid HMAC" }, { status: 403 });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.redirect(`${APP_HOST}/sign-in`);

  const result = await Shopify.handleOAuthCallback(Environment.SERVER, {
    code,
    shop,
    user: session.user.id,
  });

  jar.delete("shopify_nonce");
  jar.delete("shopify_shop");

  if (!result.success)
    return Response.json(
      { error: "Failed to complete Shopify integration" },
      { status: 502 },
    );

  return Response.redirect(`${APP_HOST}/onboarding/products?connected=shopify`);
};
