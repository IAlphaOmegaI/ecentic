"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  Band,
  PageHeader,
  SectionGutter,
  SectionHeader,
} from "../../../_components/grid";

export const VisibilityShell = ({
  audit,
  rank,
}: {
  audit: ReactNode;
  rank: ReactNode;
}) => {
  const translate = useTranslations("dashboard.visibility");

  return (
    <div className="flex flex-col">
      <div className="mx-8 border-accent-foreground border-x">
        <PageHeader
          context={translate("eyebrow")}
          title={translate("title")}
          description={translate("description")}
        />

        <Band>
          <SectionHeader
            kicker={translate("sections.readiness")}
            title={translate("audit.title")}
            description={translate("audit.scoreDetail")}
          />
          {audit}
        </Band>

        <SectionGutter />

        <Band marks="top">
          <SectionHeader
            kicker={translate("sections.rank")}
            title={translate("rankSection.title")}
            description={translate("rankSection.description")}
          />
          {rank}
        </Band>
      </div>
    </div>
  );
};

const SKELETON_ROWS = ["a", "b", "c", "d", "e"] as const;

/** Matches AuditContent: a score band, then one row per readiness check. */
export const AuditSkeleton = () => (
  <div className="flex flex-col">
    <div className="flex flex-col gap-3 border-accent-foreground border-b p-4">
      <div className="h-3 w-24 animate-pulse bg-foreground/10" />
      <div className="h-10 w-32 animate-pulse bg-foreground/10" />
      <div className="h-1.5 w-full animate-pulse rounded-full bg-foreground/10" />
    </div>
    <div className="divide-y divide-accent-foreground">
      {SKELETON_ROWS.map((key) => (
        <div
          key={key}
          className="flex flex-col gap-2 p-4 sm:grid sm:grid-cols-[9rem_1fr] sm:gap-4"
        >
          <div className="h-5 w-20 animate-pulse rounded-full bg-foreground/10" />
          <div className="flex flex-col gap-2">
            <div className="h-4 w-56 animate-pulse bg-foreground/10" />
            <div className="h-3 w-full animate-pulse bg-foreground/10" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * The rank slot is a query form, not a list of checks — it used to borrow
 * {@link AuditSkeleton} and settle into something the region never renders.
 */
export const RankSkeleton = () => (
  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
    <div className="h-16 flex-1 animate-pulse bg-foreground/10" />
    <div className="h-16 w-full animate-pulse bg-foreground/10 sm:w-40" />
    <div className="h-9 w-32 shrink-0 animate-pulse rounded-md bg-foreground/10" />
  </div>
);
