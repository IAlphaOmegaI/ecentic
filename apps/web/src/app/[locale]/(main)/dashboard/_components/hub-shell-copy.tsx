"use client";

import { useTranslations } from "next-intl";
import { Crosshair } from "./grid";
import { DashboardHeaderFigure } from "./header-figure";

/** The heading stays in the initial shell; the resolved state owns its action. */
export const HubShellCopy = () => {
  const translate = useTranslations("dashboard.hub");

  return (
    <div className="relative border-accent-foreground border-b bg-background-rich px-5 py-7 sm:px-8 sm:py-9">
      <div className="flex items-center justify-between gap-4 sm:gap-8">
        <div className="min-w-0 flex-1">
          <h1 className="font-heading font-semibold text-3xl text-foreground-rich tracking-tight sm:text-4xl">
            {translate("title")}
          </h1>
          <p className="mt-2 max-w-2xl text-foreground-dimmed text-sm leading-relaxed sm:text-base">
            {translate("description")}
          </p>
        </div>
        <DashboardHeaderFigure subject="storeHub" surface="rich" />
      </div>
      <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
    </div>
  );
};

/** Explicit account-wide context: the hub does not pretend a store is selected. */
export const HubContextLabel = () => {
  const translate = useTranslations("dashboard.sidebar");
  return (
    <span
      className="min-w-0 truncate font-medium text-background-rich/75 text-sm"
      title={translate("allStores")}
    >
      {translate("allStores")}
    </span>
  );
};
