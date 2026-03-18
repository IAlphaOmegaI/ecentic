"use client";

import { XIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { useToastManager } from "@zenncore/web/components/toast";
import { readStreamableValue } from "@ai-sdk/rsc";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Motion } from "@/components/motion";
import { Spring, Stagger } from "@/lib/animations";
import { runScan } from "@/server/app/intelligence/simulate";

type SimPhase = "pre" | "running" | "complete";
type ModelStatus = "queued" | "running" | "complete";
type LogEntry = { id: number; model: string; message: string; elapsed: number };
type Stats = { wins: number; losses: number; progress: number };
type TopFinding = {
  name: string;
  missingAttributes: string[];
  impactDescription: string;
  lossPercentage: number;
};

const initialStats: Stats = { wins: 0, losses: 0, progress: 0 };
const initialStatuses: Record<string, ModelStatus> = {
  "GPT-4": "queued",
  Claude: "queued",
  Gemini: "queued",
};

const modelColors: Record<string, string> = {
  "GPT-4": "text-blue-500",
  Claude: "text-orange-500",
  Gemini: "text-green-500",
};

const formatElapsed = (ms: number) => {
  const seconds = ms / 1000;
  return seconds < 60
    ? `${seconds.toFixed(1)}s`
    : `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
};

export namespace SimulationModal {
  export type Props = {
    open: boolean;
    onClose: () => void;
  };
}

export const SimulationModal = ({ open, onClose }: SimulationModal.Props) => {
  const toast = useToastManager();
  const [phase, setPhase] = useState<SimPhase>("pre");
  const [stats, setStats] = useState<Stats>(initialStats);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ModelStatus>>(initialStatuses);
  const [winRates, setWinRates] = useState<Record<string, { wins: number; losses: number; rate: number }>>({});
  const [topFinding, setTopFinding] = useState<TopFinding | null>(null);
  const [count, setCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => stopTimer(), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to bottom on new log
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const appendLog = (model: string, message: string) =>
    setLogs((prev) => [
      ...prev,
      { id: prev.length + 1, model, message, elapsed: Date.now() - startTimeRef.current },
    ]);

  const reset = () => {
    stopTimer();
    setPhase("pre");
    setStats(initialStats);
    setLogs([]);
    setStatuses(initialStatuses);
    setWinRates({});
    setTopFinding(null);
    setCount(0);
    setElapsed(0);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const [handleRun, isRunning] = useAsyncAction(async () => {
    setPhase("running");
    setLogs([]);
    setStats(initialStats);
    setStatuses(initialStatuses);
    setElapsed(0);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 100);

    const { output } = await runScan();

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
          setStats({ wins: event.wins, losses: event.losses, progress: percentage });
          break;
        }
        case "model_status":
          setStatuses((prev) => ({ ...prev, [event.model]: event.status }));
          break;
        case "error":
          stopTimer();
          setPhase("pre");
          setStatuses(initialStatuses);
          toast.add({ title: "Simulation failed", description: event.text, type: "error" });
          return;
        case "done":
          stopTimer();
          setStats({ wins: event.wins, losses: event.losses, progress: 100 });
          setWinRates(event.modelWinRates);
          setTopFinding(event.topFinding);
          setCount(event.productCount);
          setTimeout(() => setPhase("complete"), 800);
          return;
      }
    }
  });

  const canClose = phase !== "running";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sim-backdrop"
            className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={canClose ? handleClose : undefined}
          />

          <motion.div
            key="sim-panel"
            className="fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col border border-accent-foreground bg-background-rich shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-accent-foreground border-b px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground text-sm">
                  {phase === "pre" && "Run Simulation"}
                  {phase === "running" && "Simulation Running"}
                  {phase === "complete" && "Simulation Complete"}
                </span>
                {phase === "running" && (
                  <span className="flex items-center gap-1.5 bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
                    <motion.span
                      className="inline-block size-1.5 rounded-full bg-primary"
                      animate={{ opacity: [1, 0.2, 1] }}
                      transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    />
                    Live
                  </span>
                )}
                {phase === "complete" && (
                  <span className="bg-success/10 px-2 py-0.5 font-medium text-success text-xs">
                    Done
                  </span>
                )}
              </div>
              {canClose && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex size-7 items-center justify-center text-foreground-dimmed transition-colors hover:text-foreground"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <AnimatePresence mode="wait" initial={false}>
                {/* ── PRE ── */}
                {phase === "pre" && (
                  <motion.div
                    key="pre"
                    className="flex flex-col items-center px-8 py-14"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={Spring.Gentle}
                  >
                    <div className="mb-8 text-center">
                      <p className="mb-2 font-medium text-foreground text-lg">
                        AI Shopping Simulation
                      </p>
                      <p className="max-w-sm font-light text-foreground-dimmed text-sm">
                        Simulate how GPT-4, Claude, and Gemini compare your products against your competitors and see who they pick.
                      </p>
                    </div>

                    <div className="mb-6 w-full border border-accent-foreground">
                      {[
                        { model: "GPT-4", color: "bg-blue-500", desc: "Spec-first evaluation" },
                        { model: "Claude", color: "bg-orange-500", desc: "Value narrative analysis" },
                        { model: "Gemini", color: "bg-green-500", desc: "Price-to-feature ratio" },
                      ].map((item, index) => (
                        <div
                          key={item.model}
                          className={cn(
                            "flex items-center gap-4 px-5 py-3.5",
                            index < 2 && "border-accent-foreground border-b",
                          )}
                        >
                          <span className={cn("size-2 shrink-0 rounded-full", item.color)} />
                          <span className="font-medium text-foreground text-sm">{item.model}</span>
                          <span className="font-light text-foreground-dimmed text-xs">{item.desc}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleRun}
                      disabled={isRunning}
                      className="w-full bg-primary py-3.5 font-medium text-base text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
                    >
                      Run Simulation
                    </button>
                  </motion.div>
                )}

                {/* ── RUNNING ── */}
                {phase === "running" && (
                  <motion.div
                    key="running"
                    className="flex flex-col"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Progress row */}
                    <div className="flex items-center justify-between border-accent-foreground border-b px-5 py-3">
                      <div className="flex items-center gap-2">
                        <motion.span
                          animate={{ opacity: [1, 0.2, 1] }}
                          transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                          className="inline-block size-1.5 rounded-full bg-primary"
                        />
                        <span className="font-medium text-foreground text-xs uppercase tracking-widest">
                          Live Intelligence Scan
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-foreground-dimmed text-xs tabular-nums">
                          {formatElapsed(elapsed)}
                        </span>
                        <span className="font-mono text-primary text-xs tabular-nums">
                          {stats.progress}%
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-0.5 w-full bg-accent-foreground">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>

                    {/* Model statuses */}
                    <div className="grid grid-cols-3 divide-x divide-accent-foreground border-accent-foreground border-b">
                      {(["GPT-4", "Claude", "Gemini"] as const).map((model) => {
                        const status = statuses[model];
                        return (
                          <div key={model} className="flex items-center justify-between px-5 py-3">
                            <span className={cn("font-medium text-sm", modelColors[model])}>
                              {model}
                            </span>
                            <AnimatePresence mode="wait">
                              <motion.span
                                key={status}
                                className={cn(
                                  "text-xs font-medium",
                                  status === "complete" && "text-success",
                                  status === "running" && "text-primary",
                                  status === "queued" && "text-foreground-dimmed/50",
                                )}
                                initial={{ opacity: 0, y: 3 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -3 }}
                                transition={{ duration: 0.15 }}
                              >
                                {status === "complete" && "Done"}
                                {status === "running" && "Running"}
                                {status === "queued" && "Queued"}
                              </motion.span>
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>

                    {/* Log area — auto-detect style */}
                    <div className="h-56 space-y-1.5 overflow-y-auto scroll-smooth px-5 py-4">
                      {logs.map((entry, index) => {
                        const age = logs.length - 1 - index;
                        const opacity = Math.max(0.2, 1 - age * 0.1);
                        return (
                          <motion.div
                            key={entry.id}
                            className="flex items-baseline gap-3"
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity, x: 0 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                          >
                            <span className="shrink-0 font-mono text-foreground-dimmed/50 text-xs tabular-nums">
                              {formatElapsed(entry.elapsed)}
                            </span>
                            <span className={cn("shrink-0 font-medium text-xs", modelColors[entry.model] ?? "text-foreground-dimmed")}>
                              [{entry.model}]
                            </span>
                            <span className="text-foreground-dimmed text-xs leading-relaxed">
                              {entry.message}
                            </span>
                          </motion.div>
                        );
                      })}
                      {logs.length === 0 && (
                        <p className="text-foreground-dimmed/50 text-xs">
                          Initializing simulation engine...
                        </p>
                      )}
                      <div ref={logsEndRef} />
                    </div>

                    {/* Footer dots */}
                    <div className="flex items-center gap-1.5 border-accent-foreground border-t px-5 py-3">
                      {[0, 0.2, 0.4].map((delay) => (
                        <motion.span
                          key={delay}
                          animate={{ opacity: [0.2, 1, 0.2] }}
                          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, delay, ease: "easeInOut" }}
                          className="inline-block size-1 rounded-full bg-primary"
                        />
                      ))}
                      <span className="ml-1.5 font-light text-foreground-dimmed text-xs">
                        Running simulations across {stats.wins + stats.losses} comparisons
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* ── COMPLETE ── */}
                {phase === "complete" && (
                  <CompletePhaseModal
                    key="complete"
                    wins={stats.wins}
                    losses={stats.losses}
                    winRates={winRates}
                    topFinding={topFinding}
                    products={count}
                    elapsed={elapsed}
                    onClose={handleClose}
                    onRunAgain={reset}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const metadatas = [
  { id: "gpt4", label: "GPT-4", color: "text-blue-500", bgColor: "bg-blue-500" },
  { id: "claude", label: "Claude", color: "text-orange-500", bgColor: "bg-orange-500" },
  { id: "gemini", label: "Gemini", color: "text-green-500", bgColor: "bg-green-500" },
] as const;

type CompletePhaseModalProps = {
  wins: number;
  losses: number;
  winRates: Record<string, { wins: number; losses: number; rate: number }>;
  topFinding: TopFinding | null;
  products: number;
  elapsed: number;
  onClose: () => void;
  onRunAgain: () => void;
};

const CompletePhaseModal = ({
  wins,
  losses,
  winRates,
  topFinding,
  products: finalProductCount,
  elapsed,
  onClose,
  onRunAgain,
}: CompletePhaseModalProps) => {
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  const resultMessage = (() => {
    switch (true) {
      case winRate < 30:
        return "AI agents are choosing your competitors most of the time. Let's fix that.";
      case winRate < 60:
        return "You're competitive, but there's significant room to win more.";
      default:
        return "You're ahead of most competitors. Let's make sure you stay there.";
    }
  })();

  const resultColor = (() => {
    switch (true) {
      case winRate < 30:
        return "text-error";
      case winRate < 60:
        return "text-warning";
      default:
        return "text-success";
    }
  })();

  return (
    <motion.div
      key="complete-modal"
      className="flex flex-col px-6 py-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={Spring.Gentle}
    >
      <Motion.Stagger stagger={0.08}>
        <Motion.Up className="mb-6 grid grid-cols-[1fr_auto] gap-px border border-accent-foreground bg-accent-foreground">
          <div className="bg-background-rich px-6 py-6">
            <p className="mb-1 font-light text-foreground-dimmed text-xs uppercase tracking-widest">
              Overall Win Rate
            </p>
            <motion.p
              className={cn("font-semibold text-[72px] leading-none", resultColor)}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...Spring.Gentle, delay: 0.15 }}
            >
              {winRate}%
            </motion.p>
            <p className="mt-3 max-w-xs font-light text-foreground text-sm">
              {resultMessage}
            </p>
            <p className="mt-1 font-light text-foreground-dimmed/60 text-xs">
              Completed in {formatElapsed(elapsed)}
            </p>
          </div>
          <div className="flex flex-col divide-y divide-accent-foreground bg-background-rich">
            {[
              { label: "Wins", value: wins, color: "text-success" },
              { label: "Losses", value: losses, color: "text-error" },
              { label: "Products", value: finalProductCount, color: "text-foreground" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                className="flex flex-1 flex-col items-center justify-center px-7 py-3"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...Spring.Snappy, delay: 0.2 + index * 0.07 }}
              >
                <span className={cn("font-semibold text-2xl", stat.color)}>{stat.value}</span>
                <span className="mt-0.5 font-light text-foreground-dimmed text-xs">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </Motion.Up>

        <Motion.Up className="mb-4 border border-accent-foreground bg-background-rich">
          <div className="border-accent-foreground border-b px-4 py-3">
            <p className="font-medium text-foreground text-sm">Win rate by model</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-accent-foreground">
            {metadatas.map((meta, index) => {
              const rates = winRates[meta.id];
              const rate = rates?.rate ?? 0;
              return (
                <div key={meta.id} className="flex flex-col gap-3 px-4 py-4">
                  <div className="flex items-end justify-between">
                    <span className="font-light text-foreground-dimmed text-xs">{meta.label}</span>
                    <span className="font-semibold text-foreground text-lg">{rate}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-accent-foreground">
                    <motion.div
                      className={cn("h-full", meta.bgColor)}
                      initial={{ width: 0 }}
                      animate={{ width: `${rate}%` }}
                      transition={{ ...Spring.Gentle, delay: 0.35 + index * 0.1 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Motion.Up>

        {topFinding && (
          <Motion.Up className="mb-6 border border-primary/20 bg-primary/5 px-5 py-4">
            <p className="mb-1.5 font-medium text-primary text-xs uppercase tracking-widest">
              Top Finding
            </p>
            <p className="font-light text-foreground text-sm">
              {topFinding.name} loses on{" "}
              <span className="font-medium text-foreground">
                {topFinding.missingAttributes.join(" and ")}
              </span>{" "}
              — {topFinding.impactDescription} Costs you {topFinding.lossPercentage}% of simulations.
            </p>
          </Motion.Up>
        )}

        <motion.div className="flex gap-2" variants={Stagger.Container(0.07)}>
          <motion.button
            variants={Stagger.Item}
            type="button"
            onClick={onClose}
            className="flex-1 bg-primary py-2.5 font-medium text-sm text-white transition-colors hover:bg-primary/90"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={Spring.Snappy}
          >
            View Dashboard
          </motion.button>
          <motion.button
            variants={Stagger.Item}
            type="button"
            onClick={onRunAgain}
            className="border border-accent-foreground bg-background-rich px-4 py-2.5 font-light text-foreground text-sm transition-colors hover:bg-background-dimmed"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={Spring.Snappy}
          >
            Run Again
          </motion.button>
        </motion.div>
      </Motion.Stagger>
    </motion.div>
  );
};
