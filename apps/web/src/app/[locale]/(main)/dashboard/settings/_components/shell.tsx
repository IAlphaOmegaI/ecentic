"use client";

import { useTranslations } from "next-intl";
import type { PropsWithChildren } from "react";
import { Crosshair } from "../../_components/grid";
import { DashboardHeaderFigure } from "../../_components/header-figure";

export const PanelSkeleton = ({
  section = "account",
}: {
  section?: "account" | "integrations" | "billing";
}) => (
  <div
    aria-hidden
    className="animate-pulse divide-y divide-accent-foreground bg-background-rich motion-reduce:animate-none"
  >
    <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
      <div className="space-y-2">
        <div className="h-5 w-36 rounded-sm bg-foreground/10" />
        <div className="h-4 w-64 max-w-full rounded-sm bg-foreground/5" />
      </div>
      <div className="h-10 w-28 rounded-lg bg-foreground/10" />
    </div>
    {section === "account"
      ? ["profile", "password"].map((key) => (
          <div key={key} className="grid lg:grid-cols-3">
            <div className="space-y-2 border-accent-foreground border-b px-4 py-6 sm:px-6 lg:border-r lg:border-b-0">
              <div className="h-5 w-36 rounded-sm bg-foreground/10" />
              <div className="h-10 w-full rounded-sm bg-foreground/5" />
            </div>
            <div className="space-y-4 px-4 pt-6 sm:px-6 lg:col-span-2">
              <div
                className={
                  key === "profile" ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"
                }
              >
                {(key === "profile"
                  ? ["name", "surname", "email", "role"]
                  : ["current", "new", "confirm"]
                ).map((field) => (
                  <div
                    key={field}
                    className={
                      field === "email" || field === "role"
                        ? "col-span-full space-y-2"
                        : "space-y-2"
                    }
                  >
                    <div className="h-4 w-24 rounded-sm bg-foreground/10" />
                    <div className="h-10 w-full rounded-lg bg-foreground/5" />
                  </div>
                ))}
              </div>
              <div className="-mx-4 flex justify-end border-accent-foreground border-t px-4 py-4 sm:-mx-6 sm:px-6">
                <div className="h-10 w-36 rounded-lg bg-foreground/10" />
              </div>
            </div>
          </div>
        ))
      : ["first", "second"].map((key) => (
          <div
            key={key}
            className="flex flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6"
          >
            <div className="space-y-3">
              <div className="h-6 w-48 rounded-sm bg-foreground/10" />
              <div className="h-4 w-64 max-w-full rounded-sm bg-foreground/5" />
            </div>
            <div className="h-10 w-36 rounded-lg bg-foreground/10" />
          </div>
        ))}
  </div>
);

export const SettingsShell = ({ children }: PropsWithChildren) => {
  const translate = useTranslations("dashboard.settings");

  return (
    <div className="flex flex-col">
      <div className="min-w-0">
        <div className="border-accent-foreground border-b">
          <div className="relative flex items-center gap-4 px-4 py-6 sm:px-6">
            <Crosshair className="bottom-0 left-0 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-y-1/2" />
            <DashboardHeaderFigure subject="settings" />
            <div className="min-w-0">
              <h1 className="font-semibold text-3xl text-foreground-rich tracking-tight">
                {translate("title")}
              </h1>
              <p className="mt-1 text-foreground-dimmed text-sm">
                {translate("description")}
              </p>
            </div>
          </div>
        </div>

        <div className="border-accent-foreground border-b">
          <div className="relative bg-background-rich">
            <Crosshair className="bottom-0 left-0 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-y-1/2" />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
