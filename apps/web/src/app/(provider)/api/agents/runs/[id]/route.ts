import { resultify } from "@zenncore/utils";
import { type NextRequest, NextResponse } from "next/server";
import * as Run from "@/server/app/storefront/run";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const HEADERS = { "Cache-Control": "no-store" };

/** `now` lets a client correct its clock against ours, so the stage timer agrees. */
export const GET = async (_: NextRequest, context: RouteContext) => {
  const { id } = await context.params;

  const run = await resultify(() => Run.summary(id));
  if (!run.success)
    return NextResponse.json(
      { error: "Could not read this run" },
      { status: 503, headers: HEADERS },
    );
  if (!run.data)
    return NextResponse.json(
      { error: "Run not found" },
      { status: 404, headers: HEADERS },
    );

  return NextResponse.json(
    { summary: run.data, now: Date.now() },
    { headers: HEADERS },
  );
};
