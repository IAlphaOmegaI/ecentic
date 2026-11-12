"use client";

import { lazy } from "react";
import { HairlineFigure } from "@/components/hairline/figure";

const Hub = lazy(() => import("./hub-artwork"));

export const HubFigure = ({ label }: HubFigure.Props) => (
  <HairlineFigure
    name="hub"
    figure={Hub}
    label={label}
    surface="field"
    className="mx-auto max-w-[560px]"
  />
);

export namespace HubFigure {
  export type Props = { label: string };
}
