import * as Sentry from "@sentry/nextjs";
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

  // Turn any unexpected throw into an observable 500 rather than a platform 502.
  const handled = await resultify(async () => {
    const raw = await resultify(() => request.text());

    // Read the body as text before parsing so an empty ping can be told apart
    // from content we failed to parse — collapsing both into one "unparsable"
    // event hides a partner posting a broken envelope behind the routine pings.
    const content = raw.success ? raw.data.trim() : "";

    // Partner "Send Test" buttons often POST no body and expect a 2xx. That is
    // expected and carries nothing to record, so acknowledge it silently rather
    // than raising a warning every time someone clicks the button.
    if (content.length === 0)
      return Response.json(
        { received: true },
        { status: 200, headers: corsHeaders },
      );

    const body = resultify(() => JSON.parse(content) as unknown);

    // Content that is not JSON at all — form-encoded, truncated, an HTML error
    // page. Unlike an empty ping this is a real integration break, so record the
    // envelope that was actually sent instead of just the fact that it failed.
    if (!body.success) {
      Sentry.captureMessage(
        "Deal redemption webhook received an unparsable body",
        {
          level: "warning",
          tags: { merchant },
          extra: {
            body: content.slice(0, 1000),
            length: content.length,
            reason: body.error.message,
          },
        },
      );

      return Response.json(
        { received: true },
        { status: 200, headers: corsHeaders },
      );
    }

    const parsed = await DealRedemption.parse(Environment.SERVER, {
      payload: body.data,
    });

    // A body that parsed as JSON but carries no object (`null`, a bare string, an
    // empty array) holds no redemption to record. That is the caller's doing, so
    // it is a warning rather than an error — but still worth seeing, in case a
    // partner has silently changed the envelope they post.
    if (!parsed.success) {
      Sentry.captureMessage(
        "Deal redemption webhook received a body with no object",
        {
          level: "warning",
          tags: { merchant },
          extra: { type: typeof body.data, body: body.data },
        },
      );

      return Response.json(
        { error: "Validation failed", message: parsed.error.message },
        { status: 422, headers: corsHeaders },
      );
    }

    const client =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    const result = await DealRedemption.record(Environment.SERVER, {
      merchant,
      payload: parsed.data,
      client,
    });

    if (!result.success) {
      const rateLimited = result.error.message === "Rate limited";

      return Response.json(
        {
          error: rateLimited
            ? "Too many requests"
            : "Failed to save redemption",
        },
        { status: rateLimited ? 429 : 500, headers: corsHeaders },
      );
    }

    return Response.json(
      { received: true, id: result.data.id },
      { status: 201, headers: corsHeaders },
    );
  });

  if (handled.success) return handled.data;

  Sentry.captureException(handled.error, {
    tags: { route: "deal-redemption-webhook", merchant },
  });

  return Response.json(
    { error: "Internal error" },
    { status: 500, headers: corsHeaders },
  );
};
