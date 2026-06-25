"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence } from "motion/react";
import type { ReactNode } from "react";
import { CompletePhase } from "./complete-phase";
import { PrePhase } from "./pre-phase";
import { RunningPhase } from "./running-phase";
import { useScanRunner } from "./use-scan-runner";

export namespace ScanRunner {
  export type Props = {
    children: ReactNode;
    simulations: number;
    productCount: number;
    selectedCompetitorCount: number;
  };
}

export const ScanRunner = ({
  children,
  simulations,
  productCount,
  selectedCompetitorCount,
}: ScanRunner.Props) => {
  const toast = useToastManager();

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
    onError: (text) =>
      toast.add({ title: "Scan failed", description: text, type: "error" }),
  });

  const canRun = productCount > 0 && selectedCompetitorCount > 0;

  const [run, isStarting] = useAsyncAction(async () => {
    if (!canRun) {
      toast.add({
        title: "Missing data",
        description:
          productCount === 0
            ? "Add products before running simulations."
            : "Select at least one competitor before running simulations.",
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
