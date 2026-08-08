"use client";

import {
  BullseyeIcon,
  FaceSearchIcon,
  ShoppingCartIcon,
  UploadIcon,
} from "@zenncore/icons";
import { VerticalStepCycle } from "@/app/[locale]/(main)/_components/vertical-step-cycle";

const steps = [
  {
    icon: ShoppingCartIcon,
    title: "Connect & import",
    description:
      "Install the free plugin and approve the connection in wp-admin — no API keys to copy. The catalog imports on connect, with no theme edits.",
  },
  {
    icon: BullseyeIcon,
    title: "Choose products",
    description:
      "Select which items enter the optimization loop, from a handful of hero products to the full catalog.",
  },
  {
    icon: FaceSearchIcon,
    title: "Benchmark & diagnose",
    description:
      "Products are compared against competitors, surfacing the changes that matter: title quality, description clarity, weak details.",
  },
  {
    icon: UploadIcon,
    title: "Approve & publish",
    description:
      "Approved optimizations move back into WooCommerce through the documented REST update path, keeping insight tied to the live store.",
  },
] as const;

export const WooWorkflowCycle = () => (
  <VerticalStepCycle steps={steps} layoutId="woo-workflow-underline" />
);
