import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/server/database";

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
  const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, BETTER_AUTH_BASE_URL } =
    process.env;

  if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET || !BETTER_AUTH_BASE_URL)
    return NextResponse.json(
      { error: "Shopify integration not configured" },
      { status: 500 },
    );

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const shop = params.get("shop");
  const state = params.get("state");

  if (!code || !shop || !state)
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

  const jar = await cookies();
  const nonce = jar.get("shopify_nonce")?.value;

  if (state !== nonce)
    return NextResponse.json({ error: "State mismatch" }, { status: 403 });

  if (!verifyHmac(params, SHOPIFY_API_SECRET))
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 403 });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.redirect(`${BETTER_AUTH_BASE_URL}/sign-in`);

  const tokenResponse = await fetch(
    `https://${shop}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code,
      }),
    },
  );

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    return NextResponse.json(
      { error: "Token exchange failed", details: text },
      { status: 502 },
    );
  }

  const { access_token } = (await tokenResponse.json()) as {
    access_token: string;
  };

  await db.insert(schema.store).values({
    userId: session.user.id,
    platform: "shopify",
    name: shop.replace(".myshopify.com", ""),
    domain: `https://${shop}`,
    accessToken: access_token,
    status: "connected",
  });

  jar.delete("shopify_nonce");
  jar.delete("shopify_shop");

  return NextResponse.redirect(
    `${BETTER_AUTH_BASE_URL}/onboarding/select-products?connected=shopify`,
  );
};
