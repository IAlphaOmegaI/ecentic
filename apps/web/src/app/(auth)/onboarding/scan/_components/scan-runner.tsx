"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import { useToastManager } from "@zenncore/web/components/toast";
import { readStreamableValue } from "@ai-sdk/rsc";
import { AnimatePresence } from "motion/react";
import type { ReactNode } from "react";
import { useState } from "react";
import * as Simulation from "@/server/app/intelligence/simulate";
import { CompletePhase } from "./complete-phase";
import { PrePhase } from "./pre-phase";
import { RunningPhase } from "./running-phase";
import { unwrapResult } from "@zenncore/utils";

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
  const [winRates, setWinRates] = useState<
    Record<string, { wins: number; losses: number; rate: number }>
  >({});

  const [topFinding, setTopFinding] = useState<TopFinding | null>(null);
  const [count, setCount] = useState(0);
  const [results, setResults] = useState<Simulation.SimulationResult[]>([]);
  const [text, setText] = useState<string | null>(null);

  const appendLog = (model: string, message: string) => {
    setLogs((previous) => [
      ...previous,
      { id: previous.length + 1, model, message },
    ]);
  };

  const [handleRun, isRunning] = useAsyncAction(async () => {
    setPhase("running");
    setLogs([]);
    setText(null);
    setStats(initialStats);
    setStatuses(initialStatuses);

    const { output } = await unwrapResult(Simulation.runScan());

    for await (const event of readStreamableValue(output)) {
      if (!event) continue;

      switch (event.kind) {
        case "log":
          appendLog(event.model, event.message);
          break;
        case "chunk":
          setText((previous) => (previous ?? "") + event.text);
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
          setText(null);
          setStats({ wins: event.wins, losses: event.losses, progress: 100 });
          setWinRates(event.modelWinRates);
          setTopFinding(event.topFinding);
          setCount(event.productCount);
          setResults(event.results);
          setTimeout(() => setPhase("complete"), 800);
          return;
      }
    }
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
          wins={stats.wins}
          losses={stats.losses}
          logs={logs}
          streamingText={text ?? ""}
        />
      )}

      {phase === "complete" && (
        <CompletePhase
          wins={stats.wins}
          losses={stats.losses}
          winRates={winRates}
          topFinding={topFinding}
          products={count}
          results={results}
        />
      )}
    </AnimatePresence>
  );
};
