"use client";

import { useTranslations } from "next-intl";
import { Crosshair } from "./grid";

/** The heading stays in the initial shell; the resolved state owns its action. */
export const HubShellCopy = () => {
  const translate = useTranslations("dashboard.hub");

  return (
    <div className="relative border-accent-foreground border-b bg-background-rich px-5 py-7 sm:px-8 sm:py-9">
      <h1 className="font-heading font-medium text-3xl text-foreground-rich tracking-tight sm:text-4xl">
        {translate("title")}
      </h1>
      <p className="mt-2 max-w-2xl text-foreground-dimmed text-sm leading-relaxed sm:text-base">
        {translate("description")}
      </p>
      <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
    </div>
  );
};
