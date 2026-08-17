import { DocumentPdfIcon, ShareIcon } from "@zenncore/icons";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { formatRelativeTime } from "@/lib/date";
import * as Report from "@/server/app/report";
import { unwrapEntitled } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import {
  Crosshair,
  SectionGutter,
  SectionKicker,
  StatusPill,
} from "../_components/grid";
import { SubscriptionGate } from "../_components/subscription-gate";
import { ReportDownload, ShareReport } from "./_components/report-actions";

const REPORT_IDS = [
  "winRateSummary",
  "productPerformance",
  "competitorAnalysis",
  "optimizationImpact",
] as const;

const TierBadge = async ({ tier }: { tier: string }) => {
  const translate = await getTranslations("dashboard.reports.tiers");
  const config = (() => {
    switch (tier) {
      case "all":
        return { label: translate("all"), tone: "primary" as const };
      case "compete":
        return { label: translate("compete"), tone: "neutral" as const };
      case "dominate":
        return { label: translate("dominate"), tone: "warning" as const };
      default:
        return { label: tier, tone: "primary" as const };
    }
  })();

  return <StatusPill tone={config.tone}>{config.label}</StatusPill>;
};

export default async () => {
  const translate = await getTranslations("dashboard.reports");

  return (
    <div className="relative flex flex-col">
      {/* Streams past the content exactly like the [store] layout's gate — the
        static shell above prerenders; the overlay lands when the plan check
        resolves. */}
      <Suspense>
        <SubscriptionGate />
      </Suspense>
      <div className="mx-8 border-accent-foreground border-x">
        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <div>
              <Suspense
                fallback={
                  <div className="h-5 w-56 animate-pulse rounded-full bg-foreground/10" />
                }
              >
                <DataStatus />
              </Suspense>
              <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
                {translate("title")}
              </h1>
              <p className="mt-1 text-foreground-dimmed text-sm">
                {translate("description")}
              </p>
            </div>
          </div>
        </div>

        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <div className="flex items-start gap-4 px-6 py-6 transition-colors hover:bg-background">
              <ShareIcon className="size-8 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-base text-foreground-rich">
                  {translate("shareable.title")}
                </p>
                <p className="mt-1 text-foreground-dimmed text-sm">
                  {translate("shareable.description")}
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
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <div className="border-accent-foreground border-b p-4">
              <SectionKicker>{translate("library.kicker")}</SectionKicker>
              <p className="mt-2 font-semibold text-foreground-rich text-lg">
                {translate("library.title")}
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
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <div className="border-accent-foreground border-b p-4">
              <SectionKicker>{translate("automation.kicker")}</SectionKicker>
              <p className="mt-2 font-semibold text-foreground-rich text-lg">
                {translate("automation.title")}
              </p>
            </div>
            <div className="px-6 py-6">
              <p className="text-foreground-dimmed text-sm">
                {translate("automation.comingSoon")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DataStatus = async () => {
  await connection();
  const translate = await getTranslations("dashboard.reports.dataStatus");
  // Renders beneath the paywall overlay for accounts without a plan — see
  // `unwrapEntitled`.
  const availability = unwrapEntitled(
    await Report.getAvailability(Environment.SERVER),
  );
  if (!availability) return null;

  return (
    <StatusPill tone={availability.scan ? "success" : "neutral"}>
      {availability.scan
        ? translate("asOf", {
            time: formatRelativeTime(availability.scan.createdAt),
          })
        : translate("noScans")}
    </StatusPill>
  );
};

const ShareButton = async () => {
  await connection();
  // Renders beneath the paywall overlay for accounts without a plan — see
  // `unwrapEntitled`.
  const availability = unwrapEntitled(
    await Report.getAvailability(Environment.SERVER),
  );
  if (!availability) return null;
  return <ShareReport scan={availability.scan?.id ?? null} />;
};

const ReportGrid = async () => {
  await connection();
  const translate = await getTranslations("dashboard.reports");
  // Renders beneath the paywall overlay for accounts without a plan — see
  // `unwrapEntitled`.
  const availability = unwrapEntitled(
    await Report.getAvailability(Environment.SERVER),
  );
  if (!availability) return null;

  const hasScan = availability.scan !== null;
  const hasOptimizations = availability.optimizations > 0;

  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {REPORT_IDS.map((reportId) => {
        const tier = (() => {
          switch (reportId) {
            case "winRateSummary":
              return "all";
            default:
              return "compete";
          }
        })();
        const disabled = (() => {
          if (!hasScan) return true;
          if (reportId === "optimizationImpact" && !hasOptimizations)
            return true;
          return false;
        })();

        return (
          <div
            key={reportId}
            className="flex flex-col rounded-lg border border-accent-foreground bg-background-rich p-4 transition-[border-color,box-shadow] hover:border-primary/30 hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <DocumentPdfIcon className="size-8 text-foreground-dimmed" />
              <TierBadge tier={tier} />
            </div>
            <div className="mt-3 flex-1">
              <p className="font-medium text-base text-foreground-rich">
                {translate(`items.${reportId}.title`)}
              </p>
              <p className="mt-1 text-foreground-dimmed text-xs leading-relaxed">
                {translate(`items.${reportId}.description`)}
              </p>
            </div>
            <div className="mt-4">
              <div className="flex gap-2">
                <ReportDownload report={reportId} disabled={disabled} />
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
