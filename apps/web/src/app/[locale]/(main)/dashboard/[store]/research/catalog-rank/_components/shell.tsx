"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { DashboardEmptyStateSkeleton } from "../../../../_components/empty-state";
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

export const CatalogRankSkeleton = ({
  configured,
}: {
  configured: boolean;
}) => (
  <div className="flex min-w-0 flex-1 flex-col border-accent-foreground border-b">
    {configured && (
      <div
        aria-hidden
        className="flex min-w-0 flex-col gap-3 border-accent-foreground border-b px-4 py-5 sm:flex-row sm:items-end sm:px-6 motion-reduce:[&_*]:animate-none"
      >
        {["query", "country"].map((key) => (
          <div key={key} className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-20 animate-pulse rounded-sm bg-foreground/10" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-foreground/10" />
          </div>
        ))}
        <div className="h-10 w-32 animate-pulse rounded-lg bg-foreground/10" />
      </div>
    )}
    <DashboardEmptyStateSkeleton actions={configured ? 0 : 2} scope="page" />
  </div>
);
