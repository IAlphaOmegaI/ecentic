import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { type NextRequest, NextResponse as Response } from "next/server";
import { auth } from "@/lib/auth";
import * as Store from "@/server/app/store";
import * as HTTP from "@/server/utils/http";

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
  const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, APP_HOST } = process.env;

  if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET || !APP_HOST)
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

  const token = await HTTP.request(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!token.success) {
    return Response.json(
      { error: "Token exchange failed", details: token.error },
      { status: 502 },
    );
  }

  const parsed = await HTTP.parse<{ access_token: string }>(token);

  if (!parsed.success) {
    return Response.json(
      { error: "Token exchange failed", details: parsed.error },
      { status: 502 },
    );
  }

  const trackerApiKey = crypto.randomUUID();

  const storeResult = await Store.create({
    userId: session.user.id,
    platform: "shopify",
    name: shop.replace(".myshopify.com", ""),
    domain: `https://${shop}`,
    accessToken: parsed.data.access_token,
    trackerApiKey,
    status: "connected",
  });

  // Register tracker ScriptTag on the merchant's storefront (best-effort)
  if (storeResult.success && storeResult.data) {
    const trackerSrc = `${APP_HOST}/tracker.js?sid=${storeResult.data.id}`;

    await HTTP.request(
      `https://${shop}/admin/api/2024-10/script_tags.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": parsed.data.access_token,
        },
        body: JSON.stringify({
          script_tag: {
            event: "onload",
            src: trackerSrc,
            display_scope: "all",
          },
        }),
      },
    );
  }

  jar.delete("shopify_nonce");
  jar.delete("shopify_shop");

  return Response.redirect(`${APP_HOST}/onboarding/products?connected=shopify`);
};
