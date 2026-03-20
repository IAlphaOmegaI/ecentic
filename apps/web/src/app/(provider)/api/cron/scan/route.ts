import { NextResponse as Response } from "next/server";
import * as BackgroundScan from "@/server/app/intelligence/background-scan";

export const dynamic = "force-dynamic";

export const GET = async (request: Request) => {
  const authorization = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret)
    return Response.json(
      { success: false, error: "CRON_SECRET is not configured" },
      { status: 500 },
    );

  if (authorization !== `Bearer ${secret}`)
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  const result = await BackgroundScan.runScanDaily({ limit: 20 });

  if (!result.success)
    return Response.json(
      { success: false, error: result.error.message },
      { status: 500 },
    );

  return Response.json({
    success: true,
    data: result.data,
  });
};
