"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  Crosshair,
  SectionKicker,
  StatusPill,
} from "../../../_components/grid";

export const ComparisonShell = ({ children }: { children: ReactNode }) => {
  const translate = useTranslations("dashboard.ucpComparison");

  return (
    <div className="flex flex-col">
      <div className="mx-8 border-accent-foreground border-x">
        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <div>
              <StatusPill tone="neutral">{translate("statusPill")}</StatusPill>
              <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
                {translate("title")}
              </h1>
              <p className="mt-1 text-foreground-dimmed text-sm">
                {translate("description")}
              </p>
            </div>
          </div>
        </div>

        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <div className="border-accent-foreground border-b p-4">
              <SectionKicker>{translate("sectionKicker")}</SectionKicker>
              <h2 className="mt-2 font-semibold text-foreground-rich text-lg">
                {translate("sectionTitle")}
              </h2>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ComparisonSetupSkeleton = () => (
  <>
    <div className="grid lg:grid-cols-2">
      <div className="flex flex-col gap-6 px-6 py-6 sm:px-8 sm:py-8">
        {(["source", "query"] as const).map((key) => (
          <div key={key}>
            <div className="h-3 w-24 animate-pulse bg-foreground/10" />
            <div className="mt-2 h-9 w-full animate-pulse bg-foreground/10" />
            <div className="mt-2 h-4 w-3/4 animate-pulse bg-foreground/10" />
          </div>
        ))}
      </div>
      <div className="border-accent-foreground border-t px-6 py-6 sm:px-8 sm:py-8 lg:border-t-0 lg:border-l">
        <div className="flex items-center justify-between">
          <div className="h-3 w-32 animate-pulse bg-foreground/10" />
          <div className="h-3 w-8 animate-pulse bg-foreground/10" />
        </div>
        <div className="mt-2 h-9 w-full animate-pulse bg-foreground/10" />
        <div className="mt-2 h-9 w-full animate-pulse bg-foreground/10" />
        <div className="mt-2 h-4 w-full animate-pulse bg-foreground/10" />
        <div className="mt-1 h-4 w-2/3 animate-pulse bg-foreground/10" />
      </div>
    </div>
    <div className="flex flex-col gap-3 border-accent-foreground border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="h-4 w-80 max-w-full animate-pulse bg-foreground/10" />
      <div className="h-9 w-full shrink-0 animate-pulse bg-foreground/10 sm:w-36" />
    </div>
  </>
);
