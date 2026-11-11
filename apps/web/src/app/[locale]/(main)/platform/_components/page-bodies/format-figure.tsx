"use client";

import { lazy } from "react";
import { HairlineFigure } from "@/components/hairline/figure";

const Format = lazy(() => import("./format-artwork"));

export const FormatFigure = ({ label }: FormatFigure.Props) => (
  <HairlineFigure
    figure={Format}
    label={label}
    surface="field"
    className="aspect-[5/3]"
  />
);

export namespace FormatFigure {
  export type Props = { label: string };
}
