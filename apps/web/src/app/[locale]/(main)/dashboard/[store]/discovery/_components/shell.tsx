"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Crosshair, StatusPill } from "../../../_components/grid";

/**
 * The page's static frame, rendered by both `page.tsx` and `loading.tsx` so the
 * header prerenders and the two can never drift apart.
 */
export const DiscoveryShell = ({ children }: { children: ReactNode }) => {
  const translate = useTranslations("dashboard.discovery");

  return (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div>
            <StatusPill tone="neutral">
              {translate("statusPill")}
            </StatusPill>
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
          {children}
        </div>
      </div>
    </div>
  </div>
  );
};

export const DiscoverySkeleton = () => (
  <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end">
    <div className="h-4 w-40 animate-pulse bg-accent-foreground/30" />
    <div className="h-9 flex-1 animate-pulse bg-accent-foreground/20" />
    <div className="h-9 w-40 animate-pulse bg-accent-foreground/30" />
  </div>
);
