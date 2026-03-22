"use client";

import { readStreamableValue } from "@ai-sdk/rsc";
import { unwrapResult } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence } from "motion/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { runScan } from "@/server/app/intelligence/simulate";
import { CompletePhase } from "./complete-phase";
import { PrePhase } from "./pre-phase";
import { RunningPhase } from "./running-phase";

type ScanPhase = "pre" | "running" | "complete";
type ModelStatus = "queued" | "running" | "complete";
type LogEntry = { id: number; model: string; message: string };
type Stats = { wins: number; losses: number; progress: number };

const initialStats: Stats = { wins: 0, losses: 0, progress: 0 };

const initialStatuses: Record<string, ModelStatus> = {
  "GPT-4": "queued",
  Claude: "queued",
  Gemini: "queued",
};

type TopFinding = {
  name: string;
  missingAttributes: string[];
  impactDescription: string;
  lossPercentage: number;
};
export namespace ScanRunner {
  export type Props = {
    children: ReactNode;
    simulations: number;
  };
}

export const ScanRunner = ({ children, simulations }: ScanRunner.Props) => {
  const toast = useToastManager();
  const [phase, setPhase] = useState<ScanPhase>("pre");
  const [stats, setStats] = useState<Stats>(initialStats);

  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [statuses, setStatuses] =
    useState<Record<string, ModelStatus>>(initialStatuses);

  const [modelStats, setModelStats] = useState<
    Record<string, { wins: number; losses: number }>
  >({});

  const [winRates, setWinRates] = useState<
    Record<string, { wins: number; losses: number; rate: number }>
  >({});

  const [topFinding, setTopFinding] = useState<TopFinding | null>(null);
  const [count, setCount] = useState(0);

  const appendLog = (model: string, message: string) => {
    setLogs((previous) => [
      ...previous,
      { id: previous.length + 1, model, message },
    ]);
  };

  const [handleRun, isRunning] = useAsyncAction(async () => {
    setPhase("running");
    setLogs([]);
    setStats(initialStats);
    setStatuses(initialStatuses);

    const { output } = await unwrapResult(runScan());

    for await (const event of readStreamableValue(output)) {
      if (!event) continue;

      switch (event.kind) {
        case "log":
          appendLog(event.model, event.message);
          break;
        case "progress": {
          const percentage =
            event.total > 0
              ? Math.min(Math.round((event.completed / event.total) * 100), 99)
              : 0;
          setStats({
            wins: event.wins,
            losses: event.losses,
            progress: percentage,
          });
          setModelStats(event.modelWins);
          break;
        }
        case "model_status":
          setStatuses((previous) => ({
            ...previous,
            [event.model]: event.status,
          }));
          break;
        case "error":
          setPhase("pre");
          setStatuses(initialStatuses);
          toast.add({
            title: "Scan failed",
            description: event.text,
            type: "error",
          });
          return;
        case "done":
          setStats({ wins: event.wins, losses: event.losses, progress: 100 });
          setWinRates(event.modelWinRates);
          setTopFinding(event.topFinding);
          setCount(event.productCount);
          setTimeout(() => setPhase("complete"), 800);
          return;
      }
    }
  }, false);

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
