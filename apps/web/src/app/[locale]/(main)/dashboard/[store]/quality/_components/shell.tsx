"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  Band,
  PageHeader,
  SectionGutter,
  SectionHeader,
} from "../../../_components/grid";

export const QualityShell = ({
  summary,
  issues,
  products,
}: {
  summary: ReactNode;
  issues: ReactNode;
  products: ReactNode;
}) => {
  const translate = useTranslations("dashboard.quality");

  return (
    <div className="flex flex-col">
      <div className="mx-8 border-accent-foreground border-x">
        <PageHeader
          context={translate("eyebrow")}
          title={translate("title")}
          description={translate("description")}
        />

        <Band>{summary}</Band>

        <SectionGutter />

        <Band marks="top">
          {/* No description: the kicker already labels the section, and the
            old "Top issues" eyebrow reads as a stray word under the title. */}
          <SectionHeader
            kicker={translate("sections.issues")}
            title={translate("issues.title")}
          />
          {issues}
        </Band>

        <SectionGutter />

        <Band marks="top">
          <SectionHeader
            kicker={translate("sections.catalog")}
            title={translate("products.title")}
          />
          {products}
        </Band>
      </div>
    </div>
  );
};

const STAT_CELLS = ["a", "b", "c", "d"] as const;
const ROWS = ["a", "b", "c", "d", "e"] as const;

/** Matches the four-cell stat band the summary renders. */
export const SummarySkeleton = () => (
  <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
    {STAT_CELLS.map((key) => (
      <div
        key={key}
        className="flex flex-col justify-between gap-6 bg-background-rich p-5"
      >
        <div className="h-3 w-28 animate-pulse bg-foreground/10" />
        <div className="flex flex-col gap-3">
          <div className="h-9 w-20 animate-pulse bg-foreground/10" />
          <div className="h-1 w-full animate-pulse rounded-full bg-foreground/10" />
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-foreground/10" />
        </div>
      </div>
    ))}
  </div>
);

/** Matches the issue and product rows: a measure column, then the detail. */
export const RowsSkeleton = () => (
  <div className="flex flex-col divide-y divide-accent-foreground">
    {ROWS.map((key) => (
      <div
        key={key}
        className="flex flex-col gap-2 p-4 sm:grid sm:grid-cols-[9rem_1fr] sm:gap-4"
      >
        <div className="h-5 w-24 animate-pulse rounded-full bg-foreground/10" />
        <div className="flex flex-col gap-2">
          <div className="h-4 w-56 animate-pulse bg-foreground/10" />
          <div className="h-3 w-full animate-pulse bg-foreground/10" />
        </div>
      </div>
    ))}
  </div>
);
