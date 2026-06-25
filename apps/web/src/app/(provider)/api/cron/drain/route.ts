import { after, NextResponse as Response } from "next/server";
import * as BackgroundScan from "@/server/app/intelligence/background-scan";
import { Environment } from "@/server/utils/environment";

// A single scan can take a couple of minutes; give the drain room to finish.
export const maxDuration = 300;

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

  // Run the drain after responding so the cron tick (and the enqueue kick)
  // return immediately; the platform keeps the function alive up to maxDuration.
  after(async () => {
    await BackgroundScan.runPendingScans(Environment.SERVER, { limit: 1 });
  });

  return Response.json({ success: true, data: { scheduled: true } });
};
