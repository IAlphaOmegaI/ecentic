"use client";

import {
  BullseyeIcon,
  FaceSearchIcon,
  ShoppingCartIcon,
  UploadIcon,
} from "@zenncore/icons";
import { useMessages, useTranslations } from "next-intl";
import { VerticalStepCycle } from "@/app/[locale]/(main)/_components/vertical-step-cycle";

const stepIcons = [
  ShoppingCartIcon,
  BullseyeIcon,
  FaceSearchIcon,
  UploadIcon,
] as const;

export const WooWorkflowCycle = () => {
  const _translate = useTranslations("woocommerce");
  const messages = useMessages();
  const steps = messages.woocommerce.workflow.steps;

  return (
    <VerticalStepCycle
      steps={steps.map((step, index) => ({
        ...step,
        icon: stepIcons[index] ?? ShoppingCartIcon,
      }))}
      layoutId="woo-workflow-underline"
    />
  );
};
