"use client";

import {
  BullseyeIcon,
  FaceSearchIcon,
  ShoppingCartIcon,
  UploadIcon,
} from "@zenncore/icons";
import { VerticalStepCycle } from "@/app/(main)/_components/vertical-step-cycle";

const steps = [
  {
    icon: ShoppingCartIcon,
    title: "Connect & import",
    description:
      "Install from the Shopify App Store and your catalog imports during onboarding, no theme edits required.",
  },
  {
    icon: BullseyeIcon,
    title: "Choose products",
    description:
      "Pick which items enter the optimization and simulation loop, from one hero product to the whole catalog.",
  },
  {
    icon: FaceSearchIcon,
    title: "Benchmark & diagnose",
    description:
      "Selected products are compared against competitors so you see where AI systems prefer another option, and why.",
  },
  {
    icon: UploadIcon,
    title: "Approve & write back",
    description:
      "Review the stronger version of each listing and publish approved changes back to Shopify through the Admin API.",
  },
] as const;

export const ShopifyWorkflowCycle = () => (
  <VerticalStepCycle steps={steps} layoutId="shopify-workflow-underline" />
);
