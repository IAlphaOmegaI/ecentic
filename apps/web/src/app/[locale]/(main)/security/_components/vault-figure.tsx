"use client";

import { lazy } from "react";
import { HairlineFigure } from "@/components/hairline/figure";

const Artwork = lazy(() => import("./vault-artwork"));

export const VaultFigure = ({ label }: { label: string }) => (
  <HairlineFigure figure={Artwork} label={label} />
);
