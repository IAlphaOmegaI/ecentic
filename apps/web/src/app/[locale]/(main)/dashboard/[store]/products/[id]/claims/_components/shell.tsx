"use client";

import { cn } from "@zenncore/utils";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  Band,
  PageHeader,
  SectionGutter,
  Slot,
} from "../../../../../_components/grid";

/** Header plus one slot — the brand page's composition, one product deep. */
export const ClaimsShell = ({
  actions,
  content,
}: {
  actions?: ReactNode;
  content: ReactNode;
}) => {
  const translate = useTranslations("dashboard.claims");

  return (
    <div className="flex flex-col">
      <div className="mx-8 border-accent-foreground border-x">
        <PageHeader
          context={translate("eyebrow")}
          title={translate("title")}
          description={translate("description")}
          actions={actions}
        />
        <Slot>{content}</Slot>
      </div>
    </div>
  );
};

const LINES = ["a", "b", "c", "d"] as const;
const STAT_CELLS = ["a", "b", "c", "d"] as const;

const Bar = ({ className }: { className: string }) => (
  <div
    className={cn("animate-pulse rounded-full bg-foreground/10", className)}
  />
);

/**
 * The report below the product band: stat band, then three sections. Shown on
 * its own while a first check runs, under the real product band.
 */
export const ReportSkeleton = () => (
  <>
    <Band marks="none">
      <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CELLS.map((key) => (
          <div
            key={key}
            className="flex flex-col justify-between gap-6 bg-background-rich p-5"
          >
            <Bar className="h-3 w-24" />
            <Bar className="h-9 w-16" />
          </div>
        ))}
      </div>
    </Band>
    {LINES.slice(0, 3).map((section) => (
      <div key={section}>
        <SectionGutter />
        <Band marks="top">
          <div className="flex flex-col gap-3 p-6">
            <Bar className="h-4 w-48" />
            {LINES.map((line) => (
              <Bar key={line} className="h-3 w-full last:w-2/3" />
            ))}
          </div>
        </Band>
      </div>
    ))}
  </>
);

/** Matches the whole page body: product band, then the report. */
export const ClaimsSkeleton = () => (
  <>
    <Band>
      <div className="flex flex-col gap-2 px-6 py-5">
        <Bar className="h-3 w-24" />
        <Bar className="h-4 w-72" />
      </div>
    </Band>
    <ReportSkeleton />
  </>
);
