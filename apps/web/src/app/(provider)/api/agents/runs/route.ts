import { resultify } from "@zenncore/utils";
import { after, type NextRequest, NextResponse } from "next/server";
import * as Run from "@/server/app/storefront/run";

/**
 * Starts a `/agents` run for a pasted store URL. Answers at once and works in
 * `after()`, which runs for this route's `maxDuration`.
 */

export const maxDuration = 300;

const STATUS = {
  started: 202,
  invalid: 400,
  limited: 429,
  capacity: 503,
  unavailable: 503,
} as const;

export const POST = async (request: NextRequest) => {
  const body = await resultify(
    () => request.json() as Promise<{ url?: unknown } | null>,
  );
  const url =
    body.success && typeof body.data?.url === "string" ? body.data.url : "";

  const outcome = await Run.start({ url, request });

  if (outcome.kind === "started" && outcome.fresh)
    after(() => Run.execute(outcome.id));

  return NextResponse.json(outcome, {
    status: STATUS[outcome.kind],
    headers: { "Cache-Control": "no-store" },
  });
};
