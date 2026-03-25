"use client";

import { readStreamableValue } from "@ai-sdk/rsc";
import { unwrapResult } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { useCallback, useEffect, useRef, useState } from "react";
import type * as Simulate from "@/server/app/intelligence/simulate";
import { runScan } from "@/server/app/intelligence/simulate";

type ScanPhase = "pre" | "running" | "complete";
type ModelStatus = "queued" | "running" | "complete";
type LogEntry = { id: number; model: string; message: string; elapsed: number };
type Stats = { wins: number; losses: number; progress: number };

const initialStats: Stats = { wins: 0, losses: 0, progress: 0 };

const initialStatuses: Record<string, ModelStatus> = {
  "GPT-4": "queued",
  Claude: "queued",
  Gemini: "queued",
  Perplexity: "queued",
};

type ScanRunnerOptions = {
  onError?: (text: string) => void;
};

export const useScanRunner = (options?: ScanRunnerOptions) => {
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
  const [topFinding, setTopFinding] = useState<Simulate.TopFinding | null>(
    null,
  );
  const [scanId, setScanId] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const start = useRef<number>(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const appendLog = (model: string, message: string) =>
    setLogs((previous) => [
      ...previous,
      {
        id: previous.length + 1,
        model,
        message,
        elapsed: Date.now() - start.current,
      },
    ]);

  const reset = useCallback(() => {
    stopTimer();
    setPhase("pre");
    setStats(initialStats);
    setLogs([]);
    setStatuses(initialStatuses);
    setModelStats({});
    setWinRates({});
    setTopFinding(null);
    setCount(0);
    setElapsed(0);
  }, [stopTimer]);

  const [handleRun, isRunning] = useAsyncAction(async () => {
    setPhase("running");
    setLogs([]);
    setStats(initialStats);
    setStatuses(initialStatuses);
    setModelStats({});
    setElapsed(0);
    start.current = Date.now();

    timer.current = setInterval(() => {
      setElapsed(Date.now() - start.current);
    }, 100);

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
          stopTimer();
          setPhase("pre");
          setStatuses(initialStatuses);
          options?.onError?.(event.text);
          return;
        case "done":
          stopTimer();
          setStats({ wins: event.wins, losses: event.losses, progress: 100 });
          setWinRates(event.modelWinRates);
          setTopFinding(event.topFinding);
          setScanId(event.scanId);
          setCount(event.productCount);
          setTimeout(() => setPhase("complete"), 800);
          return;
      }
    }
  }, false);

  return {
    phase,
    stats,
    logs,
    statuses,
    modelStats,
    winRates,
    topFinding,
    scanId,
    count,
    elapsed,
    handleRun,
    isRunning,
    reset,
  } as const;
};
