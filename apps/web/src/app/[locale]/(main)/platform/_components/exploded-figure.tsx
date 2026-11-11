"use client";

import { lazy } from "react";
import { HairlineFigure } from "@/components/hairline/figure";

const Exploded = lazy(() => import("./exploded-artwork"));

export const ExplodedFigure = ({ label }: { label: string }) => (
  <HairlineFigure figure={Exploded} label={label} />
);
