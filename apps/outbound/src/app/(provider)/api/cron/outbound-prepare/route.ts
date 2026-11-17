import { NextResponse } from "next/server";
import * as Refresh from "@/server/app/outbound/automatic-sequence-refresh";
import * as Automation from "@/server/app/outbound/automation";
import { authorizeCron } from "@/server/utils/outbound/cron";

export const maxDuration = 300;
export const GET = async (request: Request) => {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const deadline = Date.now() + 240_000;
  const refresh = await Refresh.run({
    maxSteps: 20,
    deadline: deadline - 120_000,
  });
  const preparation = await Automation.run({ maxSteps: 20, deadline });
  return NextResponse.json(
    {
      refresh: refresh.success
        ? refresh.data
        : { error: "Receipt renewal needs attention" },
      preparation: preparation.success
        ? preparation.data
        : { error: "Preparation needs attention" },
    },
    { status: refresh.success && preparation.success ? 200 : 500 },
  );
};
