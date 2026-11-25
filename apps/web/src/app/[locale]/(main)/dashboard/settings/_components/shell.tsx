"use client";

import { cn } from "@zenncore/utils";
import { useTranslations } from "next-intl";
import type { PropsWithChildren } from "react";
import { Crosshair } from "../../_components/grid";
import { DashboardHeaderFigure } from "../../_components/header-figure";

const FieldSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("space-y-2", className)}>
    <div className="h-4 w-24 rounded-sm bg-foreground/10" />
    <div className="h-10 w-full rounded-lg bg-foreground/5" />
  </div>
);

const FormSkeleton = ({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) => (
  <div className="grid lg:grid-cols-3">
    <div className="space-y-2 border-accent-foreground border-b px-4 py-6 sm:px-6 lg:border-r lg:border-b-0">
      <div className="h-5 w-36 rounded-sm bg-foreground/10" />
      <div className="h-10 w-full rounded-sm bg-foreground/5" />
    </div>
    <div
      className={cn(
        "grid min-w-0 grid-cols-1 gap-4 px-4 pt-6 sm:px-6 lg:col-span-2",
        className,
      )}
    >
      {children}
      <div className="col-span-full -mx-4 flex justify-end border-accent-foreground border-t px-4 py-4 sm:-mx-6 sm:px-6">
        <div className="h-10 w-36 rounded-lg bg-foreground/10" />
      </div>
    </div>
  </div>
);

const ControlSkeleton = () => (
  <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
    <div className="space-y-2">
      <div className="h-5 w-36 rounded-sm bg-foreground/10" />
      <div className="h-4 w-64 max-w-full rounded-sm bg-foreground/5" />
    </div>
    <div className="h-10 w-28 rounded-lg bg-foreground/10" />
  </div>
);

export const PanelSkeleton = ({
  section = "account",
}: {
  section?: "account" | "security" | "integrations" | "billing";
}) => (
  <div
    aria-hidden
    className="animate-pulse divide-y divide-accent-foreground bg-background-rich motion-reduce:animate-none"
  >
    {(() => {
      switch (section) {
        case "account":
          return (
            <>
              <FormSkeleton className="sm:grid-cols-2">
                <FieldSkeleton />
                <FieldSkeleton />
                <FieldSkeleton className="col-span-full" />
                <FieldSkeleton className="col-span-full" />
              </FormSkeleton>
              <ControlSkeleton />
            </>
          );
        case "security":
          return (
            <>
              <FormSkeleton>
                <FieldSkeleton />
                <FieldSkeleton />
                <FieldSkeleton />
              </FormSkeleton>
              <ControlSkeleton />
              <div>
                <div className="space-y-2 px-4 pt-6 sm:px-6">
                  <div className="h-5 w-36 rounded-sm bg-foreground/10" />
                  <div className="h-4 w-64 max-w-full rounded-sm bg-foreground/5" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
                  <div className="h-5 w-48 max-w-full rounded-sm bg-foreground/10" />
                  <div className="h-10 w-36 rounded-lg bg-foreground/10" />
                </div>
              </div>
            </>
          );
        default:
          return ["first", "second", "third"].map((key) => (
            <ControlSkeleton key={key} />
          ));
      }
    })()}
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
