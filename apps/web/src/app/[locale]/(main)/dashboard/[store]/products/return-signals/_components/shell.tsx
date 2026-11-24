"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { DashboardHeaderFigure } from "../../../../_components/header-figure";

export const ReturnSignalsShell = ({ children }: { children: ReactNode }) => {
  const translate = useTranslations("dashboard.loop");
  return (
    <div className="min-h-full min-w-0 bg-background-rich">
      <header className="flex min-w-0 items-center gap-4 px-4 py-6 sm:px-6">
        <DashboardHeaderFigure subject="products" />
        <div className="min-w-0">
          <h1 className="font-heading font-semibold text-3xl text-foreground-rich tracking-tight">
            {translate("signals")}
          </h1>
          <p className="mt-2 max-w-3xl text-foreground-dimmed text-sm">
            {translate("signalsIntro")}
          </p>
        </div>
      </header>
      {children}
    </div>
  );
};
