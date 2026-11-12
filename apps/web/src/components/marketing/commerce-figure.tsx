"use client";

import { cn } from "@zenncore/utils";
import { useMessages, useTranslations } from "next-intl";
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

const customFigures = {
  shopifyBag: "shopify-bag",
  shoppingBot: "shopping-bot",
  sofa: "sofa",
  headphones: "headphones",
  lipstick: "lipstick",
  wellnessBottle: "wellness-bottle",
  packagedFood: "packaged-food",
  wineBottle: "wine-bottle",
  sneaker: "sneaker",
  suitcase: "suitcase",
} as const;

const isCustomFigure = (
  kind: CommerceFigure.Props["kind"],
): kind is keyof typeof customFigures => kind in customFigures;

/** Subject drawings accompany the explanation; they never stand in for live data. */
export const CommerceFigure = ({
  kind,
  label,
  surface = "background",
  className,
}: CommerceFigure.Props) => {
  const translate = useTranslations("commerceFigures");
  const messages = useMessages();
  const copy = messages.commerceFigures;
  if (isCustomFigure(kind)) {
    const readouts = Object.entries(copy.partReadouts).find(
      ([key]) => key === kind,
    )?.[1];
    return (
      <CustomHairlineFigure
        key={kind}
        name={customFigures[kind]}
        label={label ?? translate(kind)}
        readouts={readouts}
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
    kind: keyof typeof figures | keyof typeof customFigures;
    label?: string;
    surface?: "background" | "field" | "rich" | "dark";
    className?: string;
  };
}
