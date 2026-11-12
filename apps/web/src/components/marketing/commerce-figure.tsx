"use client";

import { cn } from "@zenncore/utils";
import { useTranslations } from "next-intl";
import { lazy } from "react";
import { CustomHairlineFigure } from "@/components/hairline/custom-figure";
import { HairlineFigure } from "@/components/hairline/figure";
import { ProviderLogo } from "./provider-logo";

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

const stockNames = {
  catalog: "riffle",
  document: "terminal",
  workflow: "branches",
  checkout: "basket",
  inspection: "sieve",
  drawer: "drawer",
  format: "format",
  relay: "relay",
  hub: "hub",
} as const;

const customFigures = {
  demoPlane: "demo-plane",
  shopifyBag: "shopify-bag",
  wooMark: "woo-mark",
  merchantFolio: "merchant-folio",
  shoppingBot: "shopping-bot",
  repairTools: "repair-tools",
  moneyStack: "money-stack",
  readinessScanner: "readiness-scanner",
  officeChair: "office-chair",
  documentStack: "document-stack",
  openBook: "open-book",
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

const brandFigures = {
  wooLogo: "woocommerce",
  googleLogo: "google",
} as const;

const isBrandFigure = (
  kind: CommerceFigure.Props["kind"],
): kind is keyof typeof brandFigures => kind in brandFigures;

/** Subject drawings accompany the explanation; they never stand in for live data. */
export const CommerceFigure = ({
  kind,
  label,
  surface = "background",
  className,
}: CommerceFigure.Props) => {
  const translate = useTranslations("commerceFigures");
  if (kind === "partnerCatalogs")
    return (
      <div
        role="img"
        aria-label={label ?? translate("partnerCatalogs")}
        data-partner-catalogs
        className={cn(
          "relative isolate aspect-[5/4] w-full min-w-0",
          className,
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute top-[55%] right-[22%] left-[22%] h-px bg-background-rich/40"
        />
        <div
          aria-hidden
          className="absolute top-[28%] right-[2%] left-[2%] grid grid-cols-2 items-center"
        >
          <CustomHairlineFigure
            name="merchant-folio"
            label=""
            surface={surface}
            className="bg-transparent"
          />
          <CustomHairlineFigure
            name="merchant-folio"
            label=""
            surface={surface}
            className="translate-y-8 bg-transparent"
          />
        </div>
      </div>
    );
  if (isBrandFigure(kind))
    return (
      <div
        data-brand-figure={brandFigures[kind]}
        className={cn(
          "relative flex aspect-[5/4] w-full min-w-0 items-center justify-center p-8",
          className,
        )}
      >
        <ProviderLogo
          provider={brandFigures[kind]}
          label={label}
          className={cn(
            "h-auto max-h-[65%] w-[80%] rounded-none object-center",
            kind === "wooLogo" && "brightness-0 invert",
          )}
        />
      </div>
    );
  if (isCustomFigure(kind)) {
    return (
      <CustomHairlineFigure
        key={kind}
        name={customFigures[kind]}
        label={label ?? translate(kind)}
        surface={surface}
        className={className}
      />
    );
  }
  return (
    <HairlineFigure
      name={stockNames[kind]}
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
    kind:
      | "partnerCatalogs"
      | keyof typeof figures
      | keyof typeof customFigures
      | keyof typeof brandFigures;
    label?: string;
    surface?: "background" | "field" | "rich" | "dark";
    className?: string;
  };
}
