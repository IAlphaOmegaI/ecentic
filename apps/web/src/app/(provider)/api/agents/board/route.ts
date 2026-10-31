import { resultify } from "@zenncore/utils";
import { connection, NextResponse } from "next/server";
import * as Run from "@/server/app/storefront/run";

const HEADERS = { "Cache-Control": "no-store" };

export const GET = async () => {
  // Touches nothing request-scoped, and with the in-memory fallback no network
  // either, so without this Cache Components would prerender it at build.
  await connection();

  const board = await resultify(() => Run.board());
  if (!board.success)
    return NextResponse.json(
      { error: "Could not read the board" },
      { status: 503, headers: HEADERS },
    );

  return NextResponse.json(board.data, { headers: HEADERS });
};
