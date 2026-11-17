import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const authorizeCron = (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Cron is not configured" },
      { status: 503 },
    );
  const authorization = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return Buffer.byteLength(authorization) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))
    ? null
    : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
};
