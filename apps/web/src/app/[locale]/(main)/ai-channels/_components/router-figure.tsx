"use client";

import { lazy } from "react";
import { HairlineFigure } from "@/components/hairline/figure";

const Artwork = lazy(() => import("./router-artwork"));

export const RouterFigure = ({ label }: { label: string }) => (
  <HairlineFigure name="router" figure={Artwork} label={label} />
);
