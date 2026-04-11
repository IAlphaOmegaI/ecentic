import { cookies } from "next/headers";
import { type NextRequest, NextResponse as Response } from "next/server";

export const POST = async (request: NextRequest) => {
  const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET } = process.env;

  if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
    return Response.json(
      { error: "Shopify integration not configured" },
      { status: 500 },
    );
  }

  const jar = await cookies();
  const shop = jar.get("shopify_auth_shop")?.value;

  if (!shop) {
    return Response.json({ error: "Missing shop domain" }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  const code = await (async () => {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as Record<string, string>;
      return body["code"];
    }
    const text = await request.text();
    return new URLSearchParams(text).get("code");
  })();

  if (!code) {
    return Response.json(
      { error: "Missing authorization code" },
      { status: 400 },
    );
  }

  const body = new URLSearchParams({
    client_id: SHOPIFY_API_KEY,
    client_secret: SHOPIFY_API_SECRET,
    code,
  });

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    return Response.json({ error: "Token exchange failed" }, { status: 502 });
  }

  const data = (await response.json()) as {
    access_token: string;
    scope: string;
  };

  return Response.json({
    access_token: data.access_token,
    scope: data.scope,
    token_type: "bearer",
    shop,
  });
};
