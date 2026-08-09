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

export const ShopifyWorkflowCycle = () => {
  const _translate = useTranslations("shopify");
  const messages = useMessages();
  const steps = messages.shopify.workflow.steps;

  return (
    <VerticalStepCycle
      steps={steps.map((step, index) => ({
        ...step,
        icon: stepIcons[index] ?? ShoppingCartIcon,
      }))}
      layoutId="shopify-workflow-underline"
    />
  );
};
