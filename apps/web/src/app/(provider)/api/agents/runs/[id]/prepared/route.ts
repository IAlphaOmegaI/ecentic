import { resultify } from "@zenncore/utils";
import { type NextRequest, NextResponse } from "next/server";
import * as Run from "@/server/app/storefront/run";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const HEADERS = { "Cache-Control": "no-store" };

export const GET = async (_: NextRequest, context: RouteContext) => {
  const { id } = await context.params;

  const entries = await resultify(() => Run.prepared(id));
  if (!entries.success)
    return NextResponse.json(
      { error: "Could not read this run" },
      { status: 503, headers: HEADERS },
    );
  if (!entries.data)
    return NextResponse.json(
      { error: "Nothing prepared for this run yet" },
      { status: 404, headers: HEADERS },
    );

  return NextResponse.json(entries.data, { headers: HEADERS });
};
