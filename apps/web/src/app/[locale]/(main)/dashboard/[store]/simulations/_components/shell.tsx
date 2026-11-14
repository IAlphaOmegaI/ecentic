"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { SectionGutter } from "../../../_components/grid";
import { ResearchHeader } from "../../research/_components/shell";

export const SimulationsShell = ({
  statusPill,
  children,
}: {
  statusPill: ReactNode;
  children: ReactNode;
}) => {
  const translate = useTranslations("dashboard.research.comparisons");
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <ResearchHeader
        subject="simulations"
        title={translate("title")}
        description={translate("description")}
      >
        {statusPill}
      </ResearchHeader>
      {children}
    </div>
  );
};

export const SimulationsSkeleton = () => (
  <div aria-hidden>
    <div className="grid grid-cols-2 gap-px border-accent-foreground border-b bg-accent-foreground xl:grid-cols-4">
      {[1, 2, 3, 4].map((key) => (
        <div key={key} className="space-y-4 bg-background-rich p-4">
          <div className="h-4 w-28 max-w-full animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
          <div className="h-9 w-20 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
          <div className="h-3 w-32 max-w-full animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
    <SectionGutter />
    <div className="border-accent-foreground border-y">
      <div className="space-y-3 p-4">
        <div className="h-6 w-48 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
      </div>
      <div className="grid gap-px border-accent-foreground border-t bg-accent-foreground lg:grid-cols-2">
        {[1, 2].map((column) => (
          <div key={column} className="bg-background-rich">
            <div className="h-12 border-accent-foreground border-b" />
            {[1, 2, 3, 4, 5, 6].map((row) => (
              <div
                key={row}
                className="flex items-center gap-3 border-accent-foreground border-b px-4 py-2.5"
              >
                <div className="size-8 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
                <div className="h-4 w-2/3 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="h-12" />
    </div>
    <SectionGutter />
    <div className="border-accent-foreground border-y">
      <div className="flex gap-4 p-4">
        <div className="h-10 w-52 animate-pulse rounded-lg bg-accent-foreground/30 motion-reduce:animate-none" />
        <div className="ml-auto h-9 w-36 animate-pulse rounded-lg bg-accent-foreground/30 motion-reduce:animate-none" />
      </div>
      <div className="grid grid-cols-2 gap-px border-accent-foreground border-t bg-accent-foreground xl:grid-cols-4">
        {[1, 2, 3, 4].map((key) => (
          <div key={key} className="space-y-4 bg-background-rich p-4">
            <div className="h-4 w-20 animate-pulse bg-accent-foreground/30 motion-reduce:animate-none" />
            <div className="h-9 w-20 animate-pulse bg-accent-foreground/30 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
      <div className="divide-y divide-accent-foreground border-accent-foreground border-t">
        {[1, 2, 3].map((key) => (
          <div key={key} className="flex items-center gap-4 px-4 py-4 sm:px-6">
            <div className="size-7 animate-pulse rounded-lg bg-accent-foreground/30 motion-reduce:animate-none" />
            <div className="h-8 flex-1 animate-pulse bg-accent-foreground/20 motion-reduce:animate-none" />
            <div className="h-6 w-16 animate-pulse bg-accent-foreground/30 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
    <SectionGutter />
    <div className="border-accent-foreground border-y">
      <div className="space-y-3 p-4">
        <div className="h-6 w-52 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
      </div>
      <div className="h-64 animate-pulse bg-accent-foreground/10 motion-reduce:animate-none" />
    </div>
  </div>
);
