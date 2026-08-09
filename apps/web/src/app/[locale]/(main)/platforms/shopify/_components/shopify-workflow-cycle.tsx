"use client";

import {
  BullseyeIcon,
  FaceSearchIcon,
  ShoppingCartIcon,
  UploadIcon,
} from "@zenncore/icons";
import { useTranslations } from "next-intl";
import { VerticalStepCycle } from "@/app/[locale]/(main)/_components/vertical-step-cycle";

const stepIcons = [
  ShoppingCartIcon,
  BullseyeIcon,
  FaceSearchIcon,
  UploadIcon,
] as const;

export const ShopifyWorkflowCycle = () => {
  const translate = useTranslations("shopify");
  const steps = translate.raw("workflow.steps") as readonly {
    title: string;
    description: string;
  }[];

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
