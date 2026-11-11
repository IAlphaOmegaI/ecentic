"use client";

import { lazy } from "react";
import { HairlineFigure } from "@/components/hairline/figure";

const Riffle = lazy(() => import("./riffle-artwork"));

export const RiffleFigure = ({ label }: RiffleFigure.Props) => (
  <HairlineFigure
    figure={Riffle}
    label={label}
    surface="background"
    className="aspect-[4/3] overflow-hidden focus-within:outline-2 focus-within:outline-primary focus-within:outline-solid focus-within:-outline-offset-4 [&>[data-hairline]]:-inset-[7.5%] [&>[data-hairline]]:size-[115%] [&_path]:[vector-effect:non-scaling-stroke]"
  />
);

export namespace RiffleFigure {
  export type Props = { label: string };
}
