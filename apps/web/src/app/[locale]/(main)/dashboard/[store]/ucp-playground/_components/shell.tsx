"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Crosshair, StatusPill } from "../../../_components/grid";

export const PlaygroundShell = ({ children }: { children: ReactNode }) => {
  const translate = useTranslations("dashboard.ucpPlaygroundDashboard");

  return (
    <div className="mx-8 flex h-full flex-col border-accent-foreground border-x pb-8">
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

      <div className="-mx-8 min-h-0 flex-1 border-accent-foreground border-b">
        <div className="relative mx-8 flex h-full flex-col bg-background-rich">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          {children}
        </div>
      </div>
    </div>
  );
};

export const PlaygroundSkeleton = () => (
  <div className="flex flex-1 items-center justify-center p-8">
    <div className="w-full max-w-md space-y-3">
      <div className="h-4 w-40 animate-pulse bg-accent-foreground/30" />
      <div className="h-9 w-full animate-pulse bg-accent-foreground/20" />
      <div className="h-9 w-full animate-pulse bg-accent-foreground/30" />
    </div>
  </div>
);
