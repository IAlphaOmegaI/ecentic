"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ResearchHeader } from "../../_components/shell";

export const CatalogRankShell = ({ children }: { children: ReactNode }) => {
  const translate = useTranslations("dashboard.research.rank");
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <ResearchHeader
        subject="catalogRank"
        title={translate("title")}
        description={translate("description")}
      />
      {children}
    </div>
  );
};

export const CatalogRankSkeleton = () => (
  <div aria-hidden>
    <div className="flex flex-wrap gap-3 border-accent-foreground border-b px-4 py-5 sm:px-6">
      <div className="h-14 min-w-48 flex-1 animate-pulse rounded-lg bg-accent-foreground/30 motion-reduce:animate-none" />
      <div className="h-14 w-32 animate-pulse rounded-lg bg-accent-foreground/30 motion-reduce:animate-none" />
      <div className="h-14 w-36 animate-pulse rounded-lg bg-accent-foreground/30 motion-reduce:animate-none" />
    </div>
    <div className="min-h-64 space-y-4 px-4 py-8 sm:px-6">
      <div className="h-6 w-64 max-w-full animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
    </div>
  </div>
);
