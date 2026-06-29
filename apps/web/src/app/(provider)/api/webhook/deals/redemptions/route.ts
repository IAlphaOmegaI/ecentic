import { resultify } from "@zenncore/utils";
import { type NextRequest, NextResponse as Response } from "next/server";
import * as DealRedemption from "@/server/app/deal-redemption";
import { Environment } from "@/server/utils/environment";

/** Partner deal programs this webhook accepts redemptions for. */
const MERCHANTS = ["ycombinator", "techstars"] as const;

const isMerchant = (value: string): boolean =>
  (MERCHANTS as readonly string[]).includes(value);

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export const OPTIONS = () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const POST = async (request: NextRequest) => {
  const merchant = request.nextUrl.searchParams.get("merchant");

  if (!merchant || !isMerchant(merchant))
    return Response.json(
      { error: "Unknown or missing merchant" },
      { status: 400, headers: corsHeaders },
    );

  const body = await resultify(() => request.json() as Promise<unknown>);

  if (!body.success)
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders },
    );

  const parsed = await DealRedemption.parse(Environment.SERVER, {
    payload: body.data,
  });

  if (!parsed.success)
    return Response.json(
      { error: "Validation failed", message: parsed.error.message },
      { status: 422, headers: corsHeaders },
    );

  const client =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const result = await DealRedemption.record(Environment.SERVER, {
    merchant,
    payload: parsed.data,
    client,
  });

  if (!result.success) {
    const rateLimited = result.error.message === "Rate limited";

    return Response.json(
      {
        error: rateLimited ? "Too many requests" : "Failed to save redemption",
      },
      { status: rateLimited ? 429 : 500, headers: corsHeaders },
    );
  }

  return Response.json(
    { received: true, id: result.data.id },
    { status: 201, headers: corsHeaders },
  );
};
