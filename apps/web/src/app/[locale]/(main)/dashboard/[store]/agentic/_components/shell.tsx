"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  Band,
  PageHeader,
  SectionGutter,
  SectionHeader,
} from "../../../_components/grid";

/**
 * The page frame — rendered identically by `page.tsx` and `loading.tsx` so the
 * shell is the initial HTML and navigation lands without a layout shift.
 */
export const AgenticShell = ({
  scan,
  score,
  journey,
  competitors,
  checks,
  methodology,
}: {
  scan: ReactNode;
  score: ReactNode;
  journey: ReactNode;
  competitors: ReactNode;
  checks: ReactNode;
  methodology: ReactNode;
}) => {
  const translate = useTranslations("dashboard.agentic");

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
            kicker={translate("sections.scan")}
            title={translate("scan.title")}
            description={translate("scan.description")}
          />
          {scan}
        </Band>

        <SectionGutter />

        <Band marks="top">
          <SectionHeader
            kicker={translate("sections.score")}
            title={translate("score.title")}
            description={translate("score.description")}
          />
          {score}
        </Band>

        <SectionGutter />

        <Band marks="top">
          <SectionHeader
            kicker={translate("sections.journey")}
            title={translate("journey.title")}
            description={translate("journey.description")}
          />
          {journey}
        </Band>

        <SectionGutter />

        <Band marks="top">
          <SectionHeader
            kicker={translate("sections.competitors")}
            title={translate("competitors.title")}
            description={translate("competitors.description")}
          />
          {competitors}
        </Band>

        <SectionGutter />

        <Band marks="top">
          <SectionHeader
            kicker={translate("sections.checks")}
            title={translate("checks.title")}
            description={translate("checks.description")}
          />
          {checks}
        </Band>

        <SectionGutter />

        <Band marks="top">
          <SectionHeader
            kicker={translate("sections.methodology")}
            title={translate("methodology.title")}
            description={translate("methodology.description")}
          />
          {methodology}
        </Band>
      </div>
    </div>
  );
};

const BAR_ROWS = [
  "discovery",
  "accessibility",
  "usability",
  "payments",
] as const;
const CHECK_ROWS = ["a", "b", "c", "d", "e", "f"] as const;

/** Matches ScoreContent: grade + score cells, then one bar per layer. */
export const ScoreSkeleton = () => (
  <div className="flex flex-col">
    <div className="grid gap-px bg-accent-foreground sm:grid-cols-2">
      {["grade", "score"].map((key) => (
        <div
          key={key}
          className="relative flex flex-col justify-between gap-6 bg-background-rich p-5"
        >
          <div className="h-3 w-24 animate-pulse bg-foreground/10" />
          <div className="h-10 w-16 animate-pulse bg-foreground/10" />
        </div>
      ))}
    </div>
    <div className="grid gap-3 border-accent-foreground border-t p-4 sm:grid-cols-2">
      {BAR_ROWS.map((key) => (
        <div
          key={key}
          className="flex flex-col overflow-hidden rounded-lg border border-accent-foreground"
        >
          <div className="border-accent-foreground border-b px-4 py-3">
            <div className="h-3 w-24 animate-pulse bg-foreground/10" />
          </div>
          <div className="flex flex-col gap-3 p-4">
            <div className="h-1.5 w-full animate-pulse rounded-full bg-foreground/10" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** Matches ChecksContent: one collapsed accordion row per layer. */
export const ChecksSkeleton = () => (
  <div className="divide-y divide-accent-foreground">
    {CHECK_ROWS.map((key) => (
      <div key={key} className="flex items-center gap-3 p-4">
        <div className="h-4 w-40 animate-pulse bg-foreground/10" />
        <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-foreground/10" />
      </div>
    ))}
  </div>
);

/**
 * Matches ScanRunner, which is never a list of checks: the target and its
 * last-scanned line on the left, the action on the right, and the third-party
 * disclosure row below — that row always renders, so it is always in the shape.
 */
export const ScanSkeleton = () => (
  <div className="flex flex-col">
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="h-4 w-56 animate-pulse bg-foreground/10" />
        <div className="h-4 w-40 animate-pulse bg-foreground/10" />
      </div>
      <div className="h-9 w-full shrink-0 animate-pulse rounded-md bg-foreground/10 sm:w-36" />
    </div>
    <div className="border-accent-foreground border-t p-4">
      <div className="h-4 w-full max-w-2xl animate-pulse bg-foreground/10" />
    </div>
  </div>
);

/** Matches JourneyTrace: insight row plus a dark map well. */
export const JourneySkeleton = () => (
  <div className="flex flex-col">
    <div className="flex flex-col gap-3 border-accent-foreground border-b p-4">
      <div className="h-5 w-24 animate-pulse rounded-full bg-foreground/10" />
      <div className="h-4 w-full max-w-2xl animate-pulse bg-foreground/10" />
    </div>
    <div className="p-4">
      <div className="min-h-48 rounded-lg bg-foreground/90" />
    </div>
  </div>
);

/** Matches CompetitorScans: a rounded table with a coverage header. */
export const CompetitorsSkeleton = () => (
  <div className="p-4">
    <div className="overflow-hidden rounded-lg border border-accent-foreground">
      <div className="border-accent-foreground border-b px-4 py-3">
        <div className="h-4 w-48 animate-pulse bg-foreground/10" />
      </div>
      {["a", "b", "c"].map((key) => (
        <div
          key={key}
          className="flex items-center gap-4 border-accent-foreground border-b px-4 py-3 last:border-b-0"
        >
          <div className="h-4 w-40 animate-pulse bg-foreground/10" />
          <div className="ml-auto h-4 w-24 animate-pulse bg-foreground/10" />
          <div className="h-9 w-20 animate-pulse rounded-md bg-foreground/10" />
        </div>
      ))}
    </div>
  </div>
);

/** Matches MethodologySection: a short stack of headings and paragraphs. */
export const MethodologySkeleton = () => (
  <div className="flex flex-col gap-3 p-4">
    {["a", "b", "c", "d"].map((key) => (
      <div
        key={key}
        className="h-4 w-full max-w-3xl animate-pulse bg-foreground/10"
      />
    ))}
  </div>
);
