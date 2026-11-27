import { NextResponse } from "next/server";
import * as Discovery from "@/server/app/outbound/automatic-company-discovery";
import * as Review from "@/server/app/outbound/automatic-draft-review";
import * as Refresh from "@/server/app/outbound/automatic-sequence-refresh";
import * as Automation from "@/server/app/outbound/automation";
import * as SavedContacts from "@/server/app/outbound/saved-contact-preparation";
import { authorizeCron } from "@/server/utils/outbound/cron";

export const maxDuration = 300;
export const GET = async (request: Request) => {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const deadline = Date.now() + 240_000;
  const refresh = await Refresh.run({
    maxSteps: 20,
    deadline: deadline - 150_000,
  });
  const savedContacts = await SavedContacts.run({
    maxSteps: 20,
    deadline: Math.min(deadline - 30_000, Date.now() + 150_000),
  });
  const review = await Review.run({
    maxDrafts: 5,
    deadline: Math.min(deadline - 15_000, Date.now() + 45_000),
  });
  const discovery = await Discovery.run({
    maxCampaigns: 2,
    // Discovery reserves thirty seconds before starting a provider operation.
    // An exactly thirty-second allocation is already exhausted at its guard.
    deadline: Math.min(deadline - 10_000, Date.now() + 60_000),
  });
  const preparation = await Automation.run({ maxSteps: 20, deadline });
  return NextResponse.json(
    {
      refresh: refresh.success
        ? refresh.data
        : { error: "Receipt renewal needs attention" },
      review: review.success
        ? review.data
        : { error: "Automatic review needs attention" },
      preparation: preparation.success
        ? preparation.data
        : { error: "Preparation needs attention" },
      savedContacts: savedContacts.success
        ? savedContacts.data
        : { error: "Saved contact preparation needs attention" },
      discovery: discovery.success
        ? discovery.data
        : { error: "Company discovery needs attention" },
    },
    {
      status:
        refresh.success &&
        review.success &&
        preparation.success &&
        savedContacts.success &&
        discovery.success
          ? 200
          : 500,
    },
  );
};
