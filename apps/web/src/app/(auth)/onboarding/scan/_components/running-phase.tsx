"use client";

import { cn } from "@zenncore/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { Spring, Stagger } from "@/lib/animations";

const modelColors: Record<string, string> = {
  "GPT-4": "text-blue-500",
  Claude: "text-orange-500",
  Gemini: "text-green-500",
};

const formatElapsed = (index: number) => `${(index * 0.4).toFixed(1)}s`;

export namespace RunningPhase {
  export type Props = {
    simulations: number;
    progress: number;
    statuses: Record<string, "queued" | "running" | "complete">;
    wins: number;
    losses: number;
    logs: Array<{ id: number; model: string; message: string }>;
  };
}

export const RunningPhase = ({
  simulations,
  progress,
  statuses,
  wins,
  losses,
  logs,
}: RunningPhase.Props) => {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: logEntries triggers scroll-to-bottom on new entries
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <motion.div
      key="running"
      className="flex flex-1 flex-col px-6 py-10"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={Spring.Gentle}
    >
      <div className="mx-auto w-full max-w-2xl border border-accent-foreground bg-background-rich">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-accent-foreground px-5 py-3">
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              className="inline-block size-1.5 rounded-full bg-primary"
            />
            <span className="font-medium text-foreground text-xs tracking-widest uppercase">
              Live Intelligence Scan
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-primary text-xs tabular-nums">
              {Math.floor(progress)}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 w-full bg-accent-foreground">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Model statuses */}
        <motion.div
          className="grid grid-cols-3 divide-x divide-accent-foreground border-b border-accent-foreground"
          variants={Stagger.Container(0.06)}
          initial="hidden"
          animate="visible"
        >
          {(["GPT-4", "Claude", "Gemini"] as const).map((model) => {
            const status = statuses[model];
            return (
              <motion.div
                key={model}
                className="flex items-center justify-between px-5 py-3"
                variants={Stagger.Item}
              >
                <span className={cn("font-medium text-sm", modelColors[model])}>
                  {model}
                </span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={status}
                    className={cn(
                      "font-medium text-xs",
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
              </motion.div>
            );
          })}
        </motion.div>

        {/* Log area — clean light design */}
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
                  {formatElapsed(index)}
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
        <div className="flex items-center gap-1.5 border-t border-accent-foreground px-5 py-3">
          {[0, 0.2, 0.4].map((delay) => (
            <motion.span
              key={delay}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, delay, ease: "easeInOut" }}
              className="inline-block size-1 rounded-full bg-primary"
            />
          ))}
          <span className="ml-1.5 font-light text-foreground-dimmed text-xs">
            Running simulations across {simulations} comparisons
          </span>
        </div>
      </div>
    </motion.div>
  );
};
