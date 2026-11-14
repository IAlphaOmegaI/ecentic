"use client";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ResearchHeader } from "../../../research/_components/shell";
export const AddCompetitorsShell = ({
  statusPill,
  action,
  children,
}: {
  statusPill: ReactNode;
  action: ReactNode;
  children: ReactNode;
}) => {
  const translate = useTranslations("dashboard.competitors.add");
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <ResearchHeader
        subject="addCompetitors"
        title={translate("shellTitle")}
        description={translate("shellDescription")}
      >
        {action}
      </ResearchHeader>
      <div className="border-accent-foreground border-b px-4 py-3 text-foreground-dimmed text-sm sm:px-6">
        {statusPill}
      </div>
      <div className="min-w-0 border-accent-foreground border-b bg-background-rich">
        {children}
      </div>
    </div>
  );
};
export const BackLinkSkeleton = () => (
  <div className="h-9 w-40 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
);

export const SourcesSkeleton = () => (
  <div className="flex min-w-0 flex-col bg-background-rich" aria-hidden>
    <div className="space-y-3 px-4 py-6 sm:px-6">
      <div className="h-6 w-44 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
      <div className="h-10 w-full max-w-2xl animate-pulse bg-foreground/10 motion-reduce:animate-none" />
    </div>
    <div className="border-accent-foreground border-y px-4 py-3 sm:px-6">
      <div className="h-9 w-full max-w-xl animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
    </div>
    <div className="flex min-h-64 flex-col justify-center gap-3 px-4 py-6 sm:px-6">
      <div className="h-6 w-64 max-w-full animate-pulse bg-foreground/10 motion-reduce:animate-none" />
      <div className="h-10 w-full max-w-2xl animate-pulse bg-foreground/10 motion-reduce:animate-none" />
      <div className="mt-1 h-9 w-40 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
    </div>
    <div className="space-y-3 border-accent-foreground border-t px-4 py-6 sm:px-6">
      <div className="h-6 w-56 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
      <div className="h-4 w-full max-w-xl animate-pulse bg-foreground/10 motion-reduce:animate-none" />
    </div>
  </div>
);
