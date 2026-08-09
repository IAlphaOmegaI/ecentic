"use client";

import { FaceSearchIcon, RobotIcon, UploadIcon } from "@zenncore/icons";
import { useTranslations, useMessages } from "next-intl";
import { VerticalStepCycle } from "@/app/[locale]/(main)/_components/vertical-step-cycle";

const stepIcons = [RobotIcon, FaceSearchIcon, UploadIcon] as const;

export const ListingWorkflowCycle = () => {
  const translate = useTranslations("productListings");
  const messages = useMessages();
  const steps = messages.productListings.workflow.steps;

  return (
    <VerticalStepCycle
      steps={steps.map((step, index) => ({
        ...step,
        icon: stepIcons[index] ?? RobotIcon,
      }))}
      layoutId="listing-workflow-underline"
    />
  );
};
