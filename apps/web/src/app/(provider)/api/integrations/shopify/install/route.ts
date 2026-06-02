import crypto from "node:crypto";
import { resultify } from "@zenncore/utils";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse as Response } from "next/server";

const SCOPES =
  "read_products,write_products,write_script_tags,read_script_tags";

/**
 * Resolves a user-entered store value to a `*.myshopify.com` admin domain.
 * Accepts a bare handle (`acmestore`), a myshopify domain (with or without
 * protocol/path), and tolerates a full URL. Returns `null` for custom
 * storefront domains (e.g. `www.brand.com`) — OAuth authorize requires the
 * myshopify admin domain, which cannot be derived from a custom domain.
 */
const resolveShopDomain = (shop: string): string | null => {
  const trimmed = shop.trim().toLowerCase();
  if (!trimmed) return null;

  const host = (() => {
    const candidate = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    const parsed = resultify(() => new URL(candidate).hostname);
    return parsed.success ? parsed.data : (trimmed.split("/")[0] ?? trimmed);
  })();

  const cleaned = host.replace(/[^a-z0-9.-]/g, "");
  if (!cleaned) return null;

  if (cleaned.endsWith(".myshopify.com")) return cleaned;
  if (!cleaned.includes(".")) return `${cleaned}.myshopify.com`;

  return null;
};

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

  const domain = resolveShopDomain(shop);
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

  const redirectUri = `${APP_HOST}/api/integrations/shopify/callback`;

  const url = new URL(`https://${domain}/admin/oauth/authorize`);

  url.searchParams.set("client_id", SHOPIFY_API_KEY);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", nonce);

  return Response.redirect(url.toString());
};
