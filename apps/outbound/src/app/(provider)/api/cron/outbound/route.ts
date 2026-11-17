import { NextResponse } from "next/server";
import * as Worker from "@/server/app/outbound/worker";
import { authorizeCron } from "@/server/utils/outbound/cron";

export const maxDuration = 300;
export const GET = async (request: Request) => {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const result = await Worker.run({ dryRun: false });
  if (!result.success)
    return NextResponse.json(
      {
        error:
          "Outbound maintenance failed; delivery remains subject to mailbox and approval checks.",
      },
      { status: 500 },
    );
  return NextResponse.json(result.data);
};
