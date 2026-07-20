import { resultify } from "@zenncore/utils";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildGoogleFeed, verifyFeedToken } from "@/server/app/feed-export";

/**
 * Public Google Shopping–spec feed for a connected store. The same URL is
 * pasted into Google Merchant Center (scheduled fetch) and the Perplexity
 * Merchant Program, which ingests the identical spec. Access is gated by a
 * derived HMAC token so the URL is unguessable but requires no session.
 */

type RouteContext = {
  params: Promise<{ store: string }>;
};

export const GET = async (request: NextRequest, context: RouteContext) => {
  const { store } = await context.params;
  const token = request.nextUrl.searchParams.get("token");

  const authorized = await resultify(async () =>
    token ? verifyFeedToken(store, token) : false,
  );
  if (!authorized.success || !authorized.data)
    return NextResponse.json({ error: "Invalid feed token" }, { status: 401 });

  const feed = await buildGoogleFeed(store);
  if (!feed.success)
    return NextResponse.json({ error: feed.error.message }, { status: 404 });

  return new NextResponse(feed.data.xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=1800",
      "X-Feed-Item-Count": String(feed.data.itemCount),
      "X-Feed-Skipped-Count": String(feed.data.skippedCount),
    },
  });
};
