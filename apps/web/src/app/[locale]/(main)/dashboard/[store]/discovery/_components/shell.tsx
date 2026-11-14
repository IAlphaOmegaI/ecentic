"use client";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ResearchHeader } from "../../research/_components/shell";

export const DiscoveryShell = ({ children }: { children: ReactNode }) => {
  const translate = useTranslations("dashboard.research.questions");
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <ResearchHeader
        subject="questions"
        title={translate("title")}
        description={translate("description")}
      />
      <div className="min-w-0 border-accent-foreground border-b bg-background-rich">
        {children}
      </div>
    </div>
  );
};
export const DiscoverySkeleton = () => (
  <div className="flex min-w-0 flex-col" aria-hidden>
    <div className="flex flex-wrap items-center gap-4 border-accent-foreground border-b px-4 py-4 sm:px-6">
      <div className="flex w-72 flex-col gap-2">
        <div className="h-3 w-24 animate-pulse bg-accent-foreground/30 motion-reduce:animate-none" />
        <div className="h-4 w-44 animate-pulse bg-accent-foreground/30 motion-reduce:animate-none" />
      </div>
      <div className="h-4 w-80 max-w-full animate-pulse bg-accent-foreground/20 motion-reduce:animate-none" />
    </div>
    <div className="space-y-3 px-4 pt-6 pb-5 sm:px-6">
      <div className="h-7 w-48 animate-pulse bg-accent-foreground/30 motion-reduce:animate-none" />
      <div className="h-10 w-full max-w-2xl animate-pulse bg-accent-foreground/20 motion-reduce:animate-none" />
    </div>
    <div className="flex items-center gap-4 border-accent-foreground border-y px-4 py-3 sm:px-6">
      <div className="h-4 w-6 animate-pulse bg-accent-foreground/30 motion-reduce:animate-none" />
      <div className="h-9 min-w-0 flex-1 animate-pulse rounded-lg bg-accent-foreground/20 motion-reduce:animate-none" />
      <div className="size-9 animate-pulse rounded-lg bg-accent-foreground/30 motion-reduce:animate-none" />
    </div>
    <div className="flex justify-between gap-4 px-4 py-4 sm:px-6">
      <div className="h-9 w-32 animate-pulse rounded-lg bg-accent-foreground/20 motion-reduce:animate-none" />
      <div className="h-9 w-40 animate-pulse rounded-lg bg-accent-foreground/30 motion-reduce:animate-none" />
    </div>
    <div className="border-accent-foreground border-t px-4 py-4 sm:px-6">
      <div className="h-10 w-full animate-pulse bg-accent-foreground/20 motion-reduce:animate-none" />
    </div>
    <div className="space-y-3 border-accent-foreground border-t px-4 py-8 sm:px-6">
      <div className="h-4 w-24 animate-pulse bg-accent-foreground/30 motion-reduce:animate-none" />
      <div className="h-12 w-full max-w-2xl animate-pulse bg-accent-foreground/20 motion-reduce:animate-none" />
    </div>
  </div>
);
