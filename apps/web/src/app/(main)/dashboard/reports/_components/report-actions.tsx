"use client";

import { ArrowRightIcon, DownloadIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { useState } from "react";
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
  const [pending, setPending] = useState(false);

  const download = () => {
    setPending(true);
    void (async () => {
      const generated = await actions[report]();
      setPending(false);
      if (!generated.success) return;
      const blob = new Blob([generated.data.content], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = generated.data.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    })();
  };

  return (
    <button
      type="button"
      onClick={download}
      disabled={disabled || pending}
      className="flex flex-1 items-center justify-center gap-1.5 border border-accent-foreground bg-background-dimmed px-3 py-1.5 text-foreground text-xs transition-colors hover:bg-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
    >
      <DownloadIcon className="size-4" />
      {pending ? "…" : "CSV"}
    </button>
  );
};

export const ShareReport = ({ scan }: { scan: string | null }) => {
  if (scan)
    return (
      <Button
        variant="flat"
        color="primary"
        className="mt-3"
        render={<Link href={`/share/${scan}`} target="_blank" />}
      >
        Generate Shareable Report <ArrowRightIcon className="size-4" />
      </Button>
    );

  return (
    <Button variant="flat" color="primary" className="mt-3" disabled>
      Run a scan first <ArrowRightIcon className="size-4" />
    </Button>
  );
};
