import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { formatRelativeTime } from "@/lib/date";
import * as Report from "@/server/app/report";
import { unwrapEntitled } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { SubscriptionGate } from "../_components/subscription-gate";
import { ReportDownload, ShareReport } from "./_components/report-actions";
import { ReportLibrarySkeleton, ReportsShell } from "./_components/shell";

const reportIds = [
  "winRateSummary",
  "productPerformance",
  "competitorAnalysis",
  "optimizationImpact",
] as const;

export default () => (
  <ReportsShell>
    <Suspense>
      <SubscriptionGate />
    </Suspense>
    <Suspense fallback={<ReportLibrarySkeleton />}>
      <ReportLibrary />
    </Suspense>
  </ReportsShell>
);

const ReportLibrary = async () => {
  await connection();
  const [translate, locale, result] = await Promise.all([
    getTranslations("dashboard.reports"),
    getLocale(),
    Report.getAvailability(Environment.SERVER),
  ]);
  const availability = unwrapEntitled(result);
  if (!availability) return null;
  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-5 border-accent-foreground border-b bg-primary/5 px-4 py-6 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-semibold text-foreground-rich text-lg">
            {translate("shareable.title")}
          </h2>
          <p className="mt-2 text-foreground-dimmed text-sm leading-6">
            {translate("shareable.description")}
          </p>
          <p className="mt-2 text-foreground-dimmed text-xs">
            {availability.scan
              ? translate("dataStatus.asOf", {
                  time: formatRelativeTime(availability.scan.createdAt, locale),
                })
              : translate("dataStatus.noScans")}
          </p>
        </div>
        <ShareReport scan={availability.scan?.id ?? null} />
      </section>
      <div className="border-accent-foreground border-b bg-background-rich px-4 py-4 sm:px-6">
        <h2 className="font-semibold text-foreground-rich text-lg">
          {translate("library.title")}
        </h2>
      </div>
      <div className="divide-y divide-accent-foreground bg-background-rich">
        {reportIds.map((report) => {
          const unavailable = (() => {
            switch (report) {
              case "winRateSummary":
                return availability.scan === null;
              case "productPerformance":
                return availability.products === 0;
              case "competitorAnalysis":
                return availability.competitors === 0;
              case "optimizationImpact":
                return availability.optimizations === 0;
            }
          })();
          return (
            <section
              key={report}
              className="flex flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6"
            >
              <div className="max-w-2xl">
                <h3 className="font-semibold text-base text-foreground-rich">
                  {translate(`items.${report}.title`)}
                </h3>
                <p className="mt-1 text-foreground-dimmed text-sm leading-6">
                  {translate(`items.${report}.description`)}
                </p>
                {unavailable && (
                  <p className="mt-2 text-foreground-dimmed text-xs">
                    {translate("unavailable")}
                  </p>
                )}
              </div>
              <ReportDownload report={report} disabled={unavailable} />
            </section>
          );
        })}
      </div>
    </>
  );
};
