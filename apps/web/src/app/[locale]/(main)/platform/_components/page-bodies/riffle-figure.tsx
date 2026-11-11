"use client";

import { lazy } from "react";
import { HairlineFigure } from "@/components/hairline/figure";

const Riffle = lazy(() => import("./riffle-artwork"));

export const RiffleFigure = ({ label }: RiffleFigure.Props) => (
  <HairlineFigure
    figure={Riffle}
    label={label}
    surface="background"
    className="aspect-[5/3]"
  />
);

export namespace RiffleFigure {
  export type Props = { label: string };
}
