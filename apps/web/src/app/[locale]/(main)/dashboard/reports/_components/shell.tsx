import { useTranslations } from "next-intl";
import type { PropsWithChildren } from "react";
import { Crosshair } from "../../_components/grid";
import { DashboardHeaderFigure } from "../../_components/header-figure";

export const ReportsShell = ({ children }: PropsWithChildren) => {
  const translate = useTranslations("dashboard.reports");
  const workspace = useTranslations("dashboard.workspace");
  return (
    <div className="relative min-h-full min-w-0">
      <header className="relative flex items-center gap-4 border-accent-foreground border-b px-4 py-6 sm:px-6">
        <DashboardHeaderFigure subject="reports" />
        <div>
          <h1 className="font-heading font-semibold text-3xl text-foreground-rich tracking-tight">
            {translate("title")}
          </h1>
          <p className="mt-2 text-foreground-dimmed text-sm leading-6">
            {translate("description")}
          </p>
          <p className="mt-2 font-medium text-primary-text text-xs">
            {workspace("reportScope")}
          </p>
        </div>
        <Crosshair className="bottom-0 left-0 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-y-1/2" />
      </header>
      {children}
      <p className="border-accent-foreground border-t px-4 py-4 text-foreground-dimmed text-xs leading-5 sm:px-6">
        {workspace("reportMethod")}
      </p>
    </div>
  );
};

export const ReportLibrarySkeleton = () => (
  <div
    aria-hidden
    className="divide-y divide-accent-foreground motion-reduce:[&_*]:animate-none"
  >
    <div className="space-y-3 bg-primary/5 px-4 py-6 sm:px-6">
      <div className="h-6 w-64 max-w-full animate-pulse bg-foreground/10" />
      <div className="h-4 w-96 max-w-full animate-pulse bg-foreground/5" />
      <div className="h-8 w-32 animate-pulse rounded-lg bg-foreground/10" />
    </div>
    <div className="bg-background-rich px-4 py-4 sm:px-6">
      <div className="h-5 w-40 animate-pulse rounded-sm bg-foreground/10" />
    </div>
    {["rate", "products", "competitors", "changes"].map((key) => (
      <div
        key={key}
        className="flex items-center justify-between gap-6 px-4 py-5 sm:px-6"
      >
        <div className="min-w-0 space-y-3">
          <div className="h-5 w-40 animate-pulse bg-foreground/10" />
          <div className="h-4 w-80 max-w-full animate-pulse bg-foreground/5" />
        </div>
        <div className="h-9 w-28 shrink-0 animate-pulse rounded-lg bg-foreground/10" />
      </div>
    ))}
  </div>
);
