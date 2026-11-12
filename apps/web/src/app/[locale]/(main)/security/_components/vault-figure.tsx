"use client";

import { lazy } from "react";
import { HairlineFigure } from "@/components/hairline/figure";

const Artwork = lazy(() => import("./vault-artwork"));

export const VaultFigure = ({ label }: { label: string }) => (
  <HairlineFigure name="vault" figure={Artwork} label={label} />
);
