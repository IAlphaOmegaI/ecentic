"use client";

import { cn } from "@zenncore/utils";
import { useTranslations } from "next-intl";
import { lazy } from "react";
import { CustomHairlineFigure } from "@/components/hairline/custom-figure";
import { HairlineFigure } from "@/components/hairline/figure";

const figures = {
  catalog: lazy(() => import("./figures/catalog")),
  document: lazy(() => import("./figures/document")),
  workflow: lazy(() => import("./figures/workflow")),
  checkout: lazy(() => import("./figures/checkout")),
  inspection: lazy(() => import("./figures/inspection")),
  drawer: lazy(() => import("./figures/drawer")),
  format: lazy(() => import("./figures/format")),
  relay: lazy(() => import("./figures/relay")),
  hub: lazy(() => import("./figures/hub")),
} as const;

/** Subject drawings accompany the explanation; they never stand in for live data. */
export const CommerceFigure = ({
  kind,
  label,
  surface = "background",
  className,
}: CommerceFigure.Props) => {
  const translate = useTranslations("commerceFigures");
  if (kind === "shopifyBag" || kind === "shoppingBot") {
    return (
      <CustomHairlineFigure
        key={kind}
        name={kind === "shopifyBag" ? "shopify-bag" : "shopping-bot"}
        label={label ?? translate(kind)}
        surface={surface}
        className={className}
      />
    );
  }
  return (
    <HairlineFigure
      figure={figures[kind]}
      label={label ?? translate(kind)}
      surface={surface}
      className={cn(
        "aspect-[5/4] overflow-hidden [&_path]:[vector-effect:non-scaling-stroke]",
        className,
      )}
    />
  );
};

export namespace CommerceFigure {
  export type Props = {
    kind: keyof typeof figures | "shopifyBag" | "shoppingBot";
    label?: string;
    surface?: "background" | "field" | "rich" | "dark";
    className?: string;
  };
}
