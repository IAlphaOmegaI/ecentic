import { DocumentPdfIcon, ShareIcon } from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatRelativeTime } from "@/lib/date";
import * as Report from "@/server/app/report";
import { Environment } from "@/server/utils/environment";
import {
  Crosshair,
  SectionGutter,
  SectionKicker,
  StatusPill,
} from "../_components/grid";
import { ReportDownload, ShareReport } from "./_components/report-actions";

const reports = [
  {
    _id: "winRateSummary" as const,
    title: "Win Rate Summary",
    description: "Overall performance across all products and models",
    tier: "all",
  },
  {
    _id: "productPerformance" as const,
    title: "Product Performance",
    description:
      "Per-product detailed report with trends and competitor comparison",
    tier: "compete",
  },
  {
    _id: "competitorAnalysis" as const,
    title: "Competitor Analysis",
    description:
      "Full competitive landscape with battlecards for all tracked brands",
    tier: "compete",
  },
  {
    _id: "optimizationImpact" as const,
    title: "Optimization Impact",
    description: "Before/after analysis of all published optimizations",
    tier: "compete",
  },
] as const;

const TierBadge = ({ tier }: { tier: string }) => {
  const config = (() => {
    switch (tier) {
      case "all":
        return { label: "All plans", tone: "primary" as const };
      case "compete":
        return { label: "Compete+", tone: "neutral" as const };
      case "dominate":
        return { label: "Dominate+", tone: "warning" as const };
      default:
        return { label: tier, tone: "primary" as const };
    }
  })();

  return <StatusPill tone={config.tone}>{config.label}</StatusPill>;
};

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Suspense
              fallback={
                <div className="h-5 w-56 animate-pulse rounded-full bg-foreground/10" />
              }
            >
              <DataStatus />
            </Suspense>
            <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
              Reports & Exports
            </h1>
            <p className="mt-1 text-foreground-dimmed text-sm">
              Download or schedule automated reports on your agent performance.
            </p>
          </div>
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
          <div className="flex items-start gap-4 px-6 py-6 transition-colors hover:bg-background">
            <ShareIcon className="size-8 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-base text-foreground-rich">
                Shareable Win Rate Report
              </p>
              <p className="mt-1 text-foreground-dimmed text-sm">
                Generate a public URL for a beautifully formatted win rate
                report — designed for sharing on Twitter, LinkedIn, or with your
                team.
              </p>
              <Suspense
                fallback={
                  <div className="mt-3 h-9 w-48 animate-pulse bg-foreground/10" />
                }
              >
                <ShareButton />
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
          <div className="border-accent-foreground border-b p-4">
            <SectionKicker>01 — Library</SectionKicker>
            <p className="mt-2 font-semibold text-foreground-rich text-lg">
              Available Reports
            </p>
          </div>
          <Suspense fallback={<ReportGridSkeleton />}>
            <ReportGrid />
          </Suspense>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
          <div className="border-accent-foreground border-b p-4">
            <SectionKicker>02 — Automation</SectionKicker>
            <p className="mt-2 font-semibold text-foreground-rich text-lg">
              Scheduled Reports
            </p>
          </div>
          <div className="px-6 py-6">
            <p className="text-foreground-dimmed text-sm">
              Scheduled reports and the weekly digest are coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const DataStatus = async () => {
  await connection();
  const availability = await unwrapResult(
    Report.getAvailability(Environment.SERVER),
  );

  return (
    <StatusPill tone={availability.scan ? "success" : "neutral"}>
      {availability.scan
        ? `Data as of ${formatRelativeTime(availability.scan.createdAt)}`
        : "No completed scans yet"}
    </StatusPill>
  );
};

const ShareButton = async () => {
  await connection();
  const availability = await unwrapResult(
    Report.getAvailability(Environment.SERVER),
  );
  return <ShareReport scan={availability.scan?.id ?? null} />;
};

const ReportGrid = async () => {
  await connection();
  const availability = await unwrapResult(
    Report.getAvailability(Environment.SERVER),
  );

  const hasScan = availability.scan !== null;
  const hasOptimizations = availability.optimizations > 0;

  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {reports.map((report) => {
        const disabled = (() => {
          if (!hasScan) return true;
          if (report._id === "optimizationImpact" && !hasOptimizations)
            return true;
          return false;
        })();

        return (
          <div
            key={report._id}
            className="flex flex-col rounded-lg border border-accent-foreground bg-background-rich p-4 transition-[border-color,box-shadow] hover:border-primary/30 hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <DocumentPdfIcon className="size-8 text-foreground-dimmed" />
              <TierBadge tier={report.tier} />
            </div>
            <div className="mt-3 flex-1">
              <p className="font-medium text-base text-foreground-rich">
                {report.title}
              </p>
              <p className="mt-1 text-foreground-dimmed text-xs leading-relaxed">
                {report.description}
              </p>
            </div>
            <div className="mt-4">
              <div className="flex gap-2">
                <ReportDownload report={report._id} disabled={disabled} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ReportGridSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
    {(["a", "b", "c", "d"] as const).map((key) => (
      <div
        key={key}
        className="flex flex-col rounded-lg border border-accent-foreground bg-background-rich p-4"
      >
        <div className="flex items-start justify-between">
          <div className="size-8 animate-pulse bg-foreground/10" />
          <div className="h-4 w-16 animate-pulse rounded-full bg-foreground/10" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-4 w-36 animate-pulse bg-foreground/10" />
          <div className="h-3 w-full animate-pulse bg-foreground/10" />
        </div>
        <div className="mt-4">
          <div className="h-8 w-full animate-pulse bg-foreground/10" />
        </div>
      </div>
    ))}
  </div>
);
