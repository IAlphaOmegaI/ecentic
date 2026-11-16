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
      <div className="flex min-w-0 flex-1 flex-col bg-background-rich">
        {children}
      </div>
    </ChannelsWorkspace>
  );
};
export const ComparisonSetupSkeleton = () => (
  <div aria-hidden className="motion-reduce:[&_*]:animate-none">
    <div className="grid lg:grid-cols-5">
      <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:col-span-2">
        <div className="flex gap-4">
          <div className="size-8 shrink-0 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-40 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
            <div className="h-10 w-full animate-pulse bg-foreground/10 motion-reduce:animate-none" />
          </div>
        </div>
        <div>
          <div className="h-4 w-24 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
          <div className="mt-2 h-10 w-full animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
        </div>
        <div className="h-10 w-full animate-pulse bg-foreground/10 motion-reduce:animate-none" />
      </div>
      <div className="border-accent-foreground border-t lg:col-span-3 lg:border-t-0 lg:border-l">
        <div className="flex gap-4 px-4 py-6 sm:px-6">
          <div className="size-8 shrink-0 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-48 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
            <div className="h-5 w-full animate-pulse bg-foreground/10 motion-reduce:animate-none" />
          </div>
        </div>
        <div className="border-accent-foreground border-y px-4 py-4 sm:px-6">
          <div className="h-4 w-28 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
          <div className="mt-2 h-10 w-full animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
        </div>
        <div className="px-4 py-4 sm:px-6">
          <div className="h-10 w-40 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
        </div>
      </div>
    </div>
    <div className="border-accent-foreground border-t px-4 py-6 sm:px-6">
      <div className="rounded-lg border border-accent-foreground bg-background p-4">
        <div className="h-14 w-3/4 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        <div className="mt-2 flex items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-48 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
            <div className="h-3 w-28 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
          </div>
          <div className="size-8 shrink-0 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  </div>
);
