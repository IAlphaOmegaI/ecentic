"use client";

import { lazy } from "react";
import { HairlineFigure } from "@/components/hairline/figure";

const Loupe = lazy(() => import("./pricing-artwork"));

export const PricingFigure = ({ label }: { label: string }) => (
  <HairlineFigure
    figure={Loupe}
    label={label}
    className="aspect-square overflow-hidden [&>[data-hairline]]:-inset-[8%] [&>[data-hairline]]:size-[116%] [&_path]:[vector-effect:non-scaling-stroke]"
  />
);
