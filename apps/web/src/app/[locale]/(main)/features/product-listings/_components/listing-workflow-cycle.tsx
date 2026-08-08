"use client";

import { FaceSearchIcon, RobotIcon, UploadIcon } from "@zenncore/icons";
import { VerticalStepCycle } from "@/app/[locale]/(main)/_components/vertical-step-cycle";

const steps = [
  {
    icon: RobotIcon,
    title: "Simulate",
    description:
      "AI shopping evaluations run across your products and competitor listings, so the team sees who wins and why.",
  },
  {
    icon: FaceSearchIcon,
    title: "Diagnose",
    description:
      "Inspect attribute gaps and the reasons behind each selection: missing data, weak positioning, or incomplete product context.",
  },
  {
    icon: UploadIcon,
    title: "Publish",
    description:
      "Approved titles, descriptions, and product data push straight back into supported platforms instead of being copied by hand.",
  },
] as const;

export const ListingWorkflowCycle = () => (
  <VerticalStepCycle steps={steps} layoutId="listing-workflow-underline" />
);
