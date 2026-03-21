import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { type NextRequest, NextResponse as Response } from "next/server";
import { auth } from "@/lib/auth";
import * as Shopify from "@/server/app/integration/shopify";
import * as Store from "@/server/app/store";
import * as HTTP from "@/server/utils/http";
import {
  normalizeHostname,
  resolveTrackerPublicOrigin,
} from "@/server/utils/tracking";

const API_VERSION = "2024-10";

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

const storefrontHostsFromShop = (record: {
  domain: string;
  myshopify_domain: string;
}): string[] => {
  const hosts = new Set<string>();
  hosts.add(normalizeHostname(record.domain));
  hosts.add(normalizeHostname(record.myshopify_domain));
  return [...hosts];
};

export const GET = async (request: NextRequest) => {
  const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, APP_HOST } = process.env;

  if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET || !APP_HOST)
    return Response.json(
      { error: "Shopify integration not configured" },
      { status: 500 },
    );

  if (
    process.env.NODE_ENV === "development" &&
    APP_HOST.startsWith("http://") &&
    !process.env.ECENTIC_TRACKER_PUBLIC_ORIGIN
  )
    console.warn(
      "[ecentic] Shopify storefronts are HTTPS: loading tracker.js from http://localhost is usually blocked (mixed content). Set ECENTIC_TRACKER_PUBLIC_ORIGIN to an HTTPS tunnel (ngrok/cloudflared) that forwards to this app, then reconnect Shopify.",
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

  const accessToken = parsed.data.access_token;

  const shopHttp = await HTTP.request(
    `https://${shop}/admin/api/${API_VERSION}/shop.json`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    },
  );

  const shopParsed = await HTTP.parse<{
    shop: { domain: string; myshopify_domain: string };
  }>(shopHttp);

  const storefrontHosts = (() => {
    if (!shopParsed.success) return [normalizeHostname(`https://${shop}`)];

    return storefrontHostsFromShop(shopParsed.data.shop);
  })();

  const trackerApiKey = crypto.randomUUID();

  const storeResult = await Store.create({
    userId: session.user.id,
    platform: "shopify",
    name: shop.replace(".myshopify.com", ""),
    domain: `https://${shop}`,
    accessToken,
    trackerApiKey,
    storefrontHosts,
    status: "connected",
  });

  if (storeResult.success && storeResult.data) {
    await Shopify.syncShopifyCatalog({
      userId: session.user.id,
      storeId: storeResult.data.id,
    });

    const probeSuffix =
      process.env.ECENTIC_TRACKER_PROBE === "true" ? "&probe=1" : "";

    const trackerPublicOrigin = resolveTrackerPublicOrigin();

    const trackerSrc = `${trackerPublicOrigin}/tracker.js?sid=${encodeURIComponent(
      storeResult.data.id,
    )}&k=${encodeURIComponent(trackerApiKey)}${probeSuffix}`;

    await HTTP.request(
      `https://${shop}/admin/api/${API_VERSION}/script_tags.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
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
