"use client";

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
  };
}

export const ScanRunner = ({ children, simulations }: ScanRunner.Props) => {
  const toast = useToastManager();

  const {
    phase,
    stats,
    logs,
    statuses,
    modelStats,
    winRates,
    topFinding,
    count,
    handleRun,
    isRunning,
  } = useScanRunner({
    onError: (text) =>
      toast.add({ title: "Scan failed", description: text, type: "error" }),
  });

  return (
    <AnimatePresence mode="wait">
      {phase === "pre" && (
        <PrePhase onRun={handleRun} isRunning={isRunning}>
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
        />
      )}
    </AnimatePresence>
  );
};
