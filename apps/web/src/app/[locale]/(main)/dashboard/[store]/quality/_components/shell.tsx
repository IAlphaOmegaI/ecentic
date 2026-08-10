"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Crosshair, SectionGutter } from "../../../_components/grid";

export const QualityShell = ({
  summary,
  issues,
  products,
}: {
  summary: ReactNode;
  issues: ReactNode;
  products: ReactNode;
}) => {
  const translate = useTranslations("dashboard.quality");

  return (
    <div className="flex flex-col">
      <div className="mx-8 border-accent-foreground border-x">
        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 px-6 py-8">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <p className="font-semibold text-primary text-xs uppercase tracking-[0.14em]">
              {translate("eyebrow")}
            </p>
            <h1 className="mt-2 font-bold text-2xl text-foreground-rich">
              {translate("title")}
            </h1>
            <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
              {translate("description")}
            </p>
          </div>
        </div>

        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            {summary}
          </div>
        </div>

        <SectionGutter />

        <div className="-mx-8 border-accent-foreground border-t border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <div className="border-accent-foreground border-b p-4">
              <p className="font-semibold text-foreground-dimmed text-xs uppercase tracking-[0.14em]">
                {translate("issues.eyebrow")}
              </p>
              <p className="mt-1 font-medium text-base text-foreground">
                {translate("issues.title")}
              </p>
            </div>
            {issues}
          </div>
        </div>

        <SectionGutter />

        <div className="-mx-8 border-accent-foreground border-t border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <div className="border-accent-foreground border-b p-4">
              <p className="font-semibold text-foreground-dimmed text-xs uppercase tracking-[0.14em]">
                {translate("products.eyebrow")}
              </p>
              <p className="mt-1 font-medium text-base text-foreground">
                {translate("products.title")}
              </p>
            </div>
            {products}
          </div>
        </div>
      </div>
    </div>
  );
};

export const SummarySkeleton = () => (
  <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2">
    {(["a", "b"] as const).map((key) => (
      <div key={key} className="flex flex-col gap-4 bg-background-rich p-5">
        <div className="h-4 w-40 animate-pulse rounded-full bg-foreground/10" />
        <div className="h-10 w-24 animate-pulse bg-foreground/10" />
        <div className="h-3 w-2/3 animate-pulse bg-foreground/10" />
      </div>
    ))}
  </div>
);

export const RowsSkeleton = () => (
  <div className="flex flex-col divide-y divide-accent-foreground">
    {(["a", "b", "c", "d", "e"] as const).map((key) => (
      <div key={key} className="flex flex-col gap-2 p-4">
        <div className="h-5 w-56 animate-pulse rounded-full bg-foreground/10" />
        <div className="h-3 w-full animate-pulse bg-foreground/10" />
      </div>
    ))}
  </div>
);
