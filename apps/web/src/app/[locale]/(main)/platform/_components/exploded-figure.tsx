"use client";

import { lazy } from "react";
import { HairlineFigure } from "@/components/hairline/figure";

const Exploded = lazy(() => import("./exploded-artwork"));

export const ExplodedFigure = ({ label }: { label: string }) => (
  <HairlineFigure
    figure={Exploded}
    label={label}
    className="aspect-auto h-full min-h-[580px] overflow-hidden max-sm:aspect-[4/3] max-sm:h-auto max-sm:min-h-0 [&>[data-hairline]]:-inset-[12%] [&>[data-hairline]]:size-[124%] [&_path]:[vector-effect:non-scaling-stroke]"
  />
);
