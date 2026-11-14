"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Crosshair, Slot } from "../../../_components/grid";

import { DashboardHeaderFigure } from "../../../_components/header-figure";

export const OverviewActionsSkeleton = () => (
  <div className="h-9 w-40 animate-pulse rounded-lg bg-foreground/10" />
);

export const OverviewUpdatedSkeleton = () => (
  <div className="h-4 w-48 animate-pulse bg-foreground/10" />
);

// The workspace frame is static; each data region streams independently.
export const OverviewShell = ({
  statusPill,
  actions,
  stats,
  performance,
  traffic,
  recent,
  details,
}: {
  statusPill: ReactNode;
  actions: ReactNode;
  stats: ReactNode;
  performance: ReactNode;
  traffic: ReactNode;
  recent: ReactNode;
  details?: ReactNode;
}) => {
  const translate = useTranslations("dashboard.overview");
  return (
    <div className="flex min-w-0 flex-col pb-8">
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-4 px-4 py-6 sm:px-6">
        <div className="flex min-w-0 flex-1 basis-64 items-center gap-3 sm:gap-5">
          <DashboardHeaderFigure subject="overview" />
          <div className="min-w-0">
            <h1 className="font-heading font-semibold text-3xl text-foreground-rich tracking-tight">
              {translate("title")}
            </h1>
            <p className="mt-1 max-w-xl text-foreground-dimmed text-sm leading-6">
              {translate("description")}
            </p>
            <div className="mt-3">
              <Slot>{statusPill}</Slot>
            </div>
          </div>
        </div>
        <Slot>{actions}</Slot>
      </header>
      <div className="relative min-w-0 border-accent-foreground border-y">
        <Crosshair className="top-0 left-0 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 -translate-y-1/2" />
        <Crosshair className="bottom-0 left-0 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-y-1/2" />
        <Slot>{stats}</Slot>
      </div>
      <div className="grid min-w-0 border-accent-foreground border-b lg:grid-cols-2">
        <div className="min-w-0">
          <Slot>{performance}</Slot>
        </div>
        <div className="min-w-0 border-accent-foreground border-t lg:border-t-0 lg:border-l">
          <Slot>{traffic}</Slot>
        </div>
      </div>
      <div className="min-w-0">
        <Slot>{recent}</Slot>
      </div>
      <Slot>{details}</Slot>
    </div>
  );
};
