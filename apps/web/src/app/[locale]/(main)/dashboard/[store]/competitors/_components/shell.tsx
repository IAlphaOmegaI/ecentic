"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ResearchHeader } from "../../research/_components/shell";

export const CompetitorsShell = ({
  action,
  stats,
  landscape,
  table,
}: {
  action: ReactNode;
  stats: ReactNode;
  landscape: ReactNode;
  table: ReactNode;
}) => {
  const translate = useTranslations("dashboard.research.competitors");
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <ResearchHeader
        subject="competitors"
        title={translate("title")}
        description={translate("description")}
      >
        {action}
      </ResearchHeader>
      {stats}
      {landscape}
      {table}
    </div>
  );
};

export const AddActionSkeleton = () => (
  <div
    aria-hidden
    className="h-9 w-36 animate-pulse rounded-lg bg-accent-foreground/30 motion-reduce:animate-none"
  />
);
export const CompetitorSummarySkeleton = () => (
  <div
    aria-hidden
    className="grid grid-cols-3 gap-px border-accent-foreground border-b bg-accent-foreground"
  >
    {[1, 2, 3].map((key) => (
      <div key={key} className="space-y-4 bg-background px-4 py-5 sm:px-6">
        <div className="h-4 w-24 max-w-full animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
        <div className="h-8 w-16 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
      </div>
    ))}
  </div>
);
export const LandscapeSkeleton = () => (
  <div aria-hidden className="border-accent-foreground border-b">
    <div className="mx-4 my-5 h-6 w-56 max-w-full animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none sm:mx-6" />
    {[1, 2, 3].map((key) => (
      <div
        key={key}
        className="flex items-center gap-4 border-accent-foreground border-t px-4 py-4 sm:px-6"
      >
        <div className="size-9 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
        <div className="h-4 w-36 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
        <div className="ml-auto h-2 w-1/3 animate-pulse rounded-full bg-accent-foreground/30 motion-reduce:animate-none" />
      </div>
    ))}
  </div>
);
export const TableSkeleton = () => (
  <div aria-hidden>
    <div className="flex gap-4 border-accent-foreground border-b px-4 py-5 sm:px-6">
      <div className="h-6 w-44 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
      <div className="ml-auto h-8 w-28 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
    </div>
    {[1, 2, 3, 4, 5].map((key) => (
      <div
        key={key}
        className="flex items-center gap-4 border-accent-foreground border-b px-4 py-4 sm:px-6"
      >
        <div className="size-9 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
        <div className="h-4 w-1/3 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
        <div className="ml-auto h-4 w-16 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
      </div>
    ))}
  </div>
);
