"use client";

import { lazy } from "react";
import { HairlineFigure } from "@/components/hairline/figure";

const Artwork = lazy(() => import("./patch-artwork"));

export const PatchFigure = ({ label }: { label: string }) => (
  <HairlineFigure
    name="patch"
    figure={Artwork}
    label={label}
    className="overflow-hidden [&>div]:top-[-15%] [&>div]:left-[-15%] [&>div]:h-[130%] [&>div]:w-[130%] [&_svg_*]:[vector-effect:non-scaling-stroke]"
  />
);
