"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence } from "motion/react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { runScan } from "@/server/app/intelligence/simulate";
import { CompletePhase } from "./complete-phase";
import { PrePhase } from "./pre-phase";
import { RunningPhase } from "./running-phase";

type ScanPhase = "pre" | "running" | "complete";
type ModelStatus = "queued" | "running" | "complete";
type LogEntry = { id: number; model: string; message: string };

const modelLabels: Record<string, string> = {
  gpt4: "GPT-4",
  claude: "Claude",
  gemini: "Gemini",
};

const initialModelStatuses: Record<string, ModelStatus> = {
  "GPT-4": "queued",
  Claude: "queued",
  Gemini: "queued",
};

export namespace ScanRunner {
  export type Props = {
    children: ReactNode;
    totalSimulations: number;
  };
}

export const ScanRunner = ({
  children,
  totalSimulations,
}: ScanRunner.Props) => {
  const toast = useToastManager();
  const [phase, setPhase] = useState<ScanPhase>("pre");
  const [progress, setProgress] = useState(0);
  const [modelStatuses, setModelStatuses] =
    useState<Record<string, ModelStatus>>(initialModelStatuses);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [modelWinRates, setModelWinRates] = useState<
    Record<string, { wins: number; losses: number; rate: number }>
  >({});
  const [topFinding, setTopFinding] = useState<{
    productName: string;
    missingAttributes: string[];
    impactDescription: string;
    lossPercentage: number;
  } | null>(null);
  const [finalProductCount, setFinalProductCount] = useState(0);
  const logIdRef = useRef(0);

  const appendLog = (model: string, message: string) => {
    logIdRef.current += 1;
    setLogEntries((previous) => [
      ...previous,
      { id: logIdRef.current, model, message },
    ]);
  };

  const [handleRun, isRunning] = useAsyncAction(async () => {
    setPhase("running");
    setLogEntries([]);
    setWins(0);
    setLosses(0);
    setProgress(0);

    appendLog("System", "Initializing simulation engine...");

    setTimeout(
      () =>
        setModelStatuses((previous) => ({ ...previous, "GPT-4": "running" })),
      300,
    );
    setTimeout(
      () =>
        setModelStatuses((previous) => ({ ...previous, Claude: "running" })),
      800,
    );
    setTimeout(
      () =>
        setModelStatuses((previous) => ({ ...previous, Gemini: "running" })),
      1300,
    );

    const progressInterval = setInterval(() => {
      setProgress((previous) => {
        if (previous >= 90) return previous;
        return previous + Math.random() * 3 + 1;
      });
    }, 400);

    const logInterval = setInterval(() => {
      const models = ["GPT-4", "Claude", "Gemini"];
      const actions = [
        "Evaluating product specifications...",
        "Comparing value propositions...",
        "Analyzing price-quality ratio...",
        "Checking attribute completeness...",
        "Scoring product presentation...",
        "Weighing competitive advantages...",
        "Assessing brand trust signals...",
        "Measuring specification coverage...",
      ];
      const model = models[Math.floor(Math.random() * models.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      appendLog(model, action);
    }, 600);

    const result = await runScan();

    clearInterval(progressInterval);
    clearInterval(logInterval);

    if (!result.success) {
      setPhase("pre");
      setModelStatuses(initialModelStatuses);
      toast.add({
        title: "Scan failed",
        description: result.error.message,
        type: "error",
      });
      return;
    }

    const data = result.data;

    for (const record of data.results) {
      const label = modelLabels[record.model] ?? record.model;
      const winnerName =
        record.winner === "product"
          ? record.productTitle
          : record.competitorTitle;
      appendLog(
        label,
        `DECISION: Selected ${winnerName} (${record.reasoning.slice(0, 80)})`,
      );
    }

    setProgress(100);
    setWins(data.wins);
    setLosses(data.losses);
    setModelWinRates(data.modelWinRates);
    setTopFinding(data.topFinding);
    setFinalProductCount(
      new Set(data.results.map((record) => record.productId)).size,
    );
    setModelStatuses({
      "GPT-4": "complete",
      Claude: "complete",
      Gemini: "complete",
    });

    setTimeout(() => setPhase("complete"), 800);
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
          simulations={totalSimulations}
          progress={progress}
          statuses={modelStatuses}
          wins={wins}
          losses={losses}
          logs={logEntries}
        />
      )}

      {phase === "complete" && (
        <CompletePhase
          wins={wins}
          losses={losses}
          modelWinRates={modelWinRates}
          topFinding={topFinding}
          products={finalProductCount}
        />
      )}
    </AnimatePresence>
  );
};
