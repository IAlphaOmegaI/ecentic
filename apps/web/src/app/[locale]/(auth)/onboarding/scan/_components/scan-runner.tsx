"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { CompletePhase } from "./complete-phase";
import { PrePhase } from "./pre-phase";
import { RunningPhase } from "./running-phase";
import { useScanRunner } from "./use-scan-runner";

export namespace ScanRunner {
  export type Props = {
    children: ReactNode;
    store: string | null;
    simulations: number;
    productCount: number;
    selectedCompetitorCount: number;
  };
}

export const ScanRunner = ({
  children,
  store,
  simulations,
  productCount,
  selectedCompetitorCount,
}: ScanRunner.Props) => {
  const toast = useToastManager();
  const translate = useTranslations("onboarding.scan");

  const {
    phase,
    stats,
    logs,
    statuses,
    modelStats,
    winRates,
    topFinding,
    scanId,
    count,
    handleRun,
    isRunning,
  } = useScanRunner({
    store,
    errorMessages: {
      transport: translate("toast.transport"),
      enqueueTransport: translate("toast.enqueueTransport"),
      simulationFailed: translate("toast.simulationFailed"),
      noStore: translate("toast.noStore"),
    },
    onError: (text) =>
      toast.add({
        title: translate("toast.failed"),
        description: text,
        type: "error",
      }),
  });

  const canRun = productCount > 0 && selectedCompetitorCount > 0;

  const [run, isStarting] = useAsyncAction(async () => {
    if (!canRun) {
      toast.add({
        title: translate("toast.missingData.title"),
        description:
          productCount === 0
            ? translate("toast.missingData.noProducts")
            : translate("toast.missingData.noCompetitors"),
        type: "error",
      });
      return;
    }
    await handleRun();
  }, false);

  return (
    <AnimatePresence mode="wait">
      {phase === "pre" && (
        <PrePhase
          onRun={run}
          canRun={canRun}
          isRunning={isRunning || isStarting}
        >
          {children}
        </PrePhase>
      )}

      {phase === "running" && (
        <RunningPhase
          simulations={simulations}
          progress={stats.progress}
          statuses={statuses}
          modelStats={modelStats}
          logs={logs}
        />
      )}

      {phase === "complete" && (
        <CompletePhase
          wins={stats.wins}
          losses={stats.losses}
          winRates={winRates}
          topFinding={topFinding}
          products={count}
          scanId={scanId}
        />
      )}
    </AnimatePresence>
  );
};
