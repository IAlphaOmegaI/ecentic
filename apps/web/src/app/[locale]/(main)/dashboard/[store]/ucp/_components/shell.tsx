"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  Crosshair,
  SectionKicker,
  StatusPill,
} from "../../../_components/grid";

export const UcpShell = ({ children }: { children: ReactNode }) => {
  const translate = useTranslations("dashboard.ucp");

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
              <SectionKicker>{translate("protocolKicker")}</SectionKicker>
              <h2 className="mt-2 font-semibold text-foreground-rich text-lg">
                {translate("structuredDataTitle")}
              </h2>
            </div>
            <div className="p-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const UcpSectionSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="flex border border-accent-foreground">
      <div className="h-9 w-36 bg-accent-foreground/20" />
      <div className="h-9 w-48 bg-accent-foreground/10" />
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="border border-accent-foreground bg-background-rich">
        <div className="border-accent-foreground border-b px-4 py-2.5">
          <div className="h-4 w-24 bg-accent-foreground/20" />
        </div>
        <div className="divide-y divide-accent-foreground">
          {Array.from({ length: 9 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <div key={index} className="flex items-center gap-3 px-4 py-2.5">
              <div className="size-1.5 shrink-0 bg-accent-foreground/30" />
              <div className="h-3 w-28 bg-accent-foreground/20" />
              <div className="h-7 flex-1 bg-accent-foreground/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-72 border border-accent-foreground bg-background-rich" />
        <div className="h-32 border border-accent-foreground bg-background-rich" />
      </div>
    </div>
  </div>
);
