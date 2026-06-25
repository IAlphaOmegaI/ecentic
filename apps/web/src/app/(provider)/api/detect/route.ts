import { resultify } from "@zenncore/utils";
import { after, NextResponse as Response } from "next/server";
import { runDetection } from "@/server/app/intelligence/detect";

// Competitor detection runs one AI call (~10-20s); give it room to finish.
export const maxDuration = 120;

export const POST = async (request: Request) => {
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

  const body = await resultify(() => request.json());
  if (!body.success)
    return Response.json(
      { success: false, error: "Invalid body" },
      { status: 400 },
    );

  const { user, products } = body.data as {
    user?: string;
    products?: string[];
  };
  if (!user || !Array.isArray(products))
    return Response.json(
      { success: false, error: "Missing user or products" },
      { status: 400 },
    );

  // Run detached so the cron tick / kick returns immediately; the platform keeps
  // the function alive (waitUntil) up to maxDuration to finish detection.
  after(async () => {
    await runDetection({ user, products });
  });

  return Response.json({ success: true, data: { scheduled: true } });
};
