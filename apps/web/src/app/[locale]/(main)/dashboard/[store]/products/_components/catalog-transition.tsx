"use client";

import { useTranslations } from "next-intl";
import type { PropsWithChildren } from "react";
import { CustomHairlineFigure } from "@/components/hairline/custom-figure";
import { QueryTransitionFade } from "@/components/query-transition";

export const CatalogTransition = ({ children }: PropsWithChildren) => {
  const translate = useTranslations("dashboard.products.catalog");

  return (
    <QueryTransitionFade
      blur
      indicator={
        <div
          aria-hidden
          className="flex flex-col items-center gap-2 rounded-lg bg-background-rich/95 px-6 py-4"
        >
          <div aria-hidden className="w-32 sm:w-40">
            <CustomHairlineFigure
              name="inspection-queue"
              label=""
              surface="rich"
              className="bg-transparent"
            />
          </div>
          <p className="font-medium text-foreground-rich text-sm">
            {translate("loading")}
          </p>
        </div>
      }
    >
      {children}
    </QueryTransitionFade>
  );
};
