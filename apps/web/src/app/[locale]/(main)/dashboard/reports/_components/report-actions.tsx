"use client";

import { ArrowRightIcon, DownloadIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import * as Report from "@/server/app/report";

const actions = {
  winRateSummary: Report.exportWinRateSummary,
  productPerformance: Report.exportProductPerformance,
  competitorAnalysis: Report.exportCompetitorAnalysis,
  optimizationImpact: Report.exportOptimizationImpact,
} as const;

type ReportKey = keyof typeof actions;

export const ReportDownload = ({
  report,
  disabled,
}: {
  report: ReportKey;
  disabled?: boolean;
}) => {
  const translate = useTranslations("dashboard.reports.action");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const workspace = useTranslations("dashboard.workspace");

  const download = () => {
    if (pending) return;
    setPending(true);
    setFailed(false);
    void (async () => {
      const generated = await actions[report]();
      setPending(false);
      if (!generated.success) {
        setFailed(true);
        return;
      }
      const blob = new Blob([generated.data.content], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = generated.data.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    })().catch(() => {
      setPending(false);
      setFailed(true);
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="soft"
        color="neutral"
        onClick={download}
        disabled={disabled || pending}
        aria-busy={pending}
      >
        <DownloadIcon aria-hidden className="size-4" />
        {translate("downloadCsv")}
      </Button>
      {failed && (
        <p role="alert" className="max-w-xs text-error text-xs">
          {workspace("downloadError")}
        </p>
      )}
    </div>
  );
};

export const ShareReport = ({ scan }: { scan: string | null }) => {
  const translate = useTranslations("dashboard.reports.shareable");

  if (scan)
    return (
      <Button
        color="primary"
        render={<Link href={`/share/${scan}`} target="_blank" />}
      >
        {translate("action.primary")} <ArrowRightIcon className="size-4" />
      </Button>
    );

  return (
    <Button color="primary" disabled>
      {translate("runScanFirst")} <ArrowRightIcon className="size-4" />
    </Button>
  );
};
