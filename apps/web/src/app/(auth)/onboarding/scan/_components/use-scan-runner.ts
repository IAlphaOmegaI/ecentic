"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Simulate from "@/server/app/intelligence/simulate";
import * as Scan from "@/server/app/scan";

type ScanPhase = "pre" | "running" | "complete";
type ModelStatus = "queued" | "running" | "complete";
type LogEntry = { id: number; model: string; message: string; elapsed: number };
type Stats = { wins: number; losses: number; progress: number };

const modelMeta = [
  { id: "gpt4", label: "ChatGPT" },
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" },
] as const;

const initialStats: Stats = { wins: 0, losses: 0, progress: 0 };

const initialStatuses: Record<string, ModelStatus> = {
  ChatGPT: "queued",
  Claude: "queued",
  Gemini: "queued",
};

const POLL_INTERVAL = 1500;

const labelFor = (id: string) =>
  modelMeta.find((model) => model.id === id)?.label ?? id;

type Derived = {
  stats: Stats;
  statuses: Record<string, ModelStatus>;
  modelStats: Record<string, { wins: number; losses: number }>;
  winRates: Record<string, { wins: number; losses: number; rate: number }>;
  count: number;
  topFinding: Simulate.TopFinding | null;
};

const derive = (progress: Scan.Progress): Derived => {
  const done = progress.status === "complete" || progress.status === "failed";
  const expected =
    progress.totalSimulations > 0
      ? progress.totalSimulations / modelMeta.length
      : 0;

  const models = modelMeta.map(({ id, label }) => {
    const model = progress.perModel[id] ?? { wins: 0, losses: 0, total: 0 };
    const status: ModelStatus = (() => {
      switch (true) {
        case done:
        case expected > 0 && model.total >= expected:
          return "complete";
        case model.total > 0:
          return "running";
        default:
          return "queued";
      }
    })();
    return { id, label, model, status };
  });

  const progressPercentage = (() => {
    switch (true) {
      case progress.status === "complete":
        return 100;
      case progress.totalSimulations > 0:
        return Math.min(
          Math.round((progress.completed / progress.totalSimulations) * 100),
          99,
        );
      default:
        return 0;
    }
  })();

  return {
    stats: {
      wins: progress.wins,
      losses: progress.losses,
      progress: progressPercentage,
    },
    statuses: Object.fromEntries(
      models.map(({ label, status }) => [label, status]),
    ),
    modelStats: Object.fromEntries(
      models.map(({ label, model }) => [
        label,
        { wins: model.wins, losses: model.losses },
      ]),
    ),
    winRates: Object.fromEntries(
      models.map(({ id, model }) => [
        id,
        {
          wins: model.wins,
          losses: model.losses,
          rate:
            model.total > 0 ? Math.round((model.wins / model.total) * 100) : 0,
        },
      ]),
    ),
    count: progress.productCount,
    topFinding: progress.topFinding ?? null,
  };
};

type ScanRunnerOptions = {
  // Scans are store-scoped; null means no store is connected yet, so nothing
  // can run or resume.
  store: string | null;
  onError?: (text: string) => void;
};

export const useScanRunner = (options: ScanRunnerOptions) => {
  const { store } = options;
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
  const poller = useRef<ReturnType<typeof setInterval> | null>(null);
  const shown = useRef<number>(0);
  const onError = useRef(options?.onError);
  onError.current = options?.onError;

  const stopTimers = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    if (poller.current) {
      clearInterval(poller.current);
      poller.current = null;
    }
  }, []);

  useEffect(() => () => stopTimers(), [stopTimers]);

  const reset = useCallback(() => {
    stopTimers();
    setPhase("pre");
    setStats(initialStats);
    setLogs([]);
    setStatuses(initialStatuses);
    setModelStats({});
    setWinRates({});
    setTopFinding(null);
    setScanId(null);
    setCount(0);
    setElapsed(0);
    shown.current = 0;
  }, [stopTimers]);

  const ingest = useCallback((progress: Scan.Progress) => {
    const derived = derive(progress);
    setStats(derived.stats);
    setStatuses(derived.statuses);
    setModelStats(derived.modelStats);
    setWinRates(derived.winRates);
    setCount(derived.count);
    setTopFinding(derived.topFinding);

    if (progress.completed <= shown.current) return;

    const fresh = progress.recent.slice(
      Math.max(
        0,
        progress.recent.length - (progress.completed - shown.current),
      ),
    );
    setLogs((previous) => [
      ...previous,
      ...fresh.map((row, index) => ({
        id: previous.length + index + 1,
        model: labelFor(row.model),
        message: `picked ${
          row.winner === "product" ? "your product" : "the competitor"
        }${row.reasoning ? ` — ${row.reasoning.slice(0, 80)}` : ""}`,
        elapsed: Date.now() - start.current,
      })),
    ]);
    shown.current = progress.completed;
  }, []);

  const poll = useCallback(
    (id: string) => {
      stopTimers();

      const tick = async () => {
        const progress = await Scan.getProgress({ id });
        if (!progress.success) return;

        ingest(progress.data);

        switch (progress.data.status) {
          case "complete":
            stopTimers();
            setStats({
              wins: progress.data.wins,
              losses: progress.data.losses,
              progress: 100,
            });
            setTimeout(() => setPhase("complete"), 800);
            return;
          case "failed":
            stopTimers();
            setPhase("pre");
            onError.current?.("Simulation failed. Please try again.");
            return;
        }
      };

      timer.current = setInterval(
        () => setElapsed(Date.now() - start.current),
        100,
      );
      poller.current = setInterval(() => void tick(), POLL_INTERVAL);
      void tick();
    },
    [ingest, stopTimers],
  );

  const handleRun = useCallback(
    async (selection?: { products?: string[]; competitors?: string[] }) => {
      if (!store) {
        onError.current?.("Connect a store before running simulations.");
        return;
      }

      stopTimers();
      setPhase("running");
      setLogs([]);
      setStats(initialStats);
      setStatuses(initialStatuses);
      setModelStats({});
      setWinRates({});
      setTopFinding(null);
      setCount(0);
      setElapsed(0);
      shown.current = 0;
      start.current = Date.now();

      const enqueue = await Simulate.enqueueScan({
        store,
        products: selection?.products,
        competitors: selection?.competitors,
      });
      if (!enqueue.success) {
        stopTimers();
        setPhase("pre");
        onError.current?.(enqueue.error.message);
        return;
      }

      setScanId(enqueue.data.scanId);
      poll(enqueue.data.scanId);
    },
    [poll, stopTimers, store],
  );

  // Resume an in-flight scan for this store started in a previous visit — the
  // background drain keeps it running while the user is away, so reopening the
  // page picks it up.
  useEffect(() => {
    if (!store) return;

    let active = true;

    void (async () => {
      const inFlight = await Scan.getInFlight({ store });
      if (!active || !inFlight.success || !inFlight.data) return;

      setScanId(inFlight.data.id);
      setPhase("running");
      shown.current = 0;
      start.current = inFlight.data.createdAt.getTime();
      poll(inFlight.data.id);
    })();

    return () => {
      active = false;
    };
  }, [poll, store]);

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
    isRunning: phase === "running",
    reset,
  } as const;
};
