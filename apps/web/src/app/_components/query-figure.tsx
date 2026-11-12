"use client";

import { lazy } from "react";
import { HairlineFigure } from "@/components/hairline/figure";

const Query = lazy(() => import("./query-artwork"));

export const QueryFigure = ({ label }: QueryFigure.Props) => (
  <HairlineFigure name="query" figure={Query} label={label} />
);

export namespace QueryFigure {
  export type Props = { label: string };
}
