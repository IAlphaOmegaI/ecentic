import { NextResponse } from "next/server";
import { runScanDaily } from "@/server/app/intelligence/background-scan";

export const dynamic = "force-dynamic";

export const GET = async (request: Request) => {
  const authorization = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret)
    return NextResponse.json(
      { success: false, error: "CRON_SECRET is not configured" },
      { status: 500 },
    );

  if (authorization !== `Bearer ${secret}`)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  const result = await runScanDaily({ limit: 20 });
  if (!result.success)
    return NextResponse.json(
      { success: false, error: result.error.message },
      { status: 500 },
    );

  return NextResponse.json({
    success: true,
    data: result.data,
  });
};
