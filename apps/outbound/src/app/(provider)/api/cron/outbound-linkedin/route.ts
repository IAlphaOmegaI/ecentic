import { NextResponse } from "next/server";
import * as LinkedIn from "@/server/app/outbound/linkedin-automation";
import { authorizeCron } from "@/server/utils/outbound/cron";

export const maxDuration = 300;
export const GET = async (request: Request) => {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const deadline = Date.now() + 240_000;
  // A pause stops outreach, while reply synchronization continues.
  const replies = await LinkedIn.syncReplies({
    maxProspects: 10,
    deadline: deadline - 120_000,
  });
  const outreach = await LinkedIn.run({ maxActions: 1, deadline });
  return NextResponse.json(
    {
      replies: replies.success
        ? replies.data
        : { error: "LinkedIn reply sync needs attention" },
      outreach: outreach.success
        ? outreach.data
        : { error: "LinkedIn outreach needs attention" },
    },
    { status: replies.success && outreach.success ? 200 : 500 },
  );
};
