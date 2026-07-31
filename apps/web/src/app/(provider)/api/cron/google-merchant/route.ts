import { NextResponse as Response } from "next/server";
import * as GoogleMerchant from "@/server/app/integration/google-merchant";
import { Environment } from "@/server/utils/environment";

/**
 * Scheduled Google Merchant maintenance: accountManagement approval polling,
 * primary-feed rule watchdog (a merchant reordering the rule silently disables
 * every override), and async override verification (Google reprocesses lazily,
 * so pending → live is confirmed here, never at push time). Idempotent — safe
 * at any cadence; ~every 10 minutes fits the approval-poll expectation.
 */
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

  const result = await GoogleMerchant.runMaintenance(Environment.SERVER, {
    secret,
  });

  if (!result.success)
    return Response.json(
      { success: false, error: result.error.message },
      { status: 500 },
    );

  return Response.json({ success: true, data: result.data });
};
