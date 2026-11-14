"use client";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ChannelsWorkspace } from "../../channels/_components/workspace";
export const ComparisonShell = ({ children }: { children: ReactNode }) => {
  const translate = useTranslations("dashboard.ucpComparison");

  return (
    <ChannelsWorkspace
      subject="ucpComparison"
      title={translate("title")}
      description={translate("description")}
    >
      <div className="min-w-0 flex-1 bg-background-rich">{children}</div>
    </ChannelsWorkspace>
  );
};
export const ComparisonSetupSkeleton = () => (
  <div aria-hidden className="motion-reduce:[&_*]:animate-none">
    <div className="grid lg:grid-cols-2">
      <div className="flex flex-col gap-6 px-4 py-6 sm:px-6">
        {(["source", "query"] as const).map((key) => (
          <div key={key}>
            <div className="h-3 w-24 animate-pulse bg-foreground/10" />
            <div className="mt-2 h-10 w-full animate-pulse rounded-lg bg-foreground/10" />
            <div className="mt-2 h-4 w-3/4 animate-pulse bg-foreground/10" />
          </div>
        ))}
      </div>
      <div className="border-accent-foreground border-t px-4 py-6 sm:px-6 lg:border-t-0 lg:border-l">
        <div className="flex items-center justify-between">
          <div className="h-3 w-32 animate-pulse bg-foreground/10" />
          <div className="h-3 w-8 animate-pulse bg-foreground/10" />
        </div>
        <div className="mt-2 h-10 w-full animate-pulse rounded-lg bg-foreground/10" />
        <div className="mt-2 h-10 w-full animate-pulse rounded-lg bg-foreground/10" />
        <div className="mt-2 h-4 w-full animate-pulse bg-foreground/10" />
        <div className="mt-1 h-4 w-2/3 animate-pulse bg-foreground/10" />
      </div>
    </div>
    <div className="flex flex-col gap-3 border-accent-foreground border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="h-4 w-80 max-w-full animate-pulse bg-foreground/10" />
      <div className="h-9 w-full shrink-0 animate-pulse bg-foreground/10 sm:w-36" />
    </div>
  </div>
);
