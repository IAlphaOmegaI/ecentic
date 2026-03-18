"use client";

import { cn } from "@zenncore/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { Spring, Stagger } from "@/lib/animations";

const logColor = (model: string): string => {
  switch (model) {
    case "GPT-4":
      return "text-blue-400";
    case "Claude":
      return "text-orange-400";
    case "Gemini":
      return "text-green-400";
    default:
      return "text-white/60";
  }
};

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
  const ref = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: logEntries triggers scroll-to-bottom on new entries
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
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
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-medium text-foreground text-sm">
            Running {simulations} simulations across 3 models...
          </p>
          <motion.p
            className="font-light text-foreground-dimmed text-sm"
            key={Math.floor(progress)}
          >
            {Math.floor(progress)}%
          </motion.p>
        </div>
        <div className="mb-6 h-1.5 w-full bg-accent-foreground">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>

        <motion.div
          className="mb-4 grid grid-cols-3 gap-px border border-accent-foreground bg-accent-foreground"
          variants={Stagger.Container(0.06)}
          initial="hidden"
          animate="visible"
        >
          {(["GPT-4", "Claude", "Gemini"] as const).map((model) => {
            const status = statuses[model];
            const color = logColor(model);

            return (
              <motion.div
                key={model}
                className="flex items-center justify-between bg-background-rich px-4 py-3"
                variants={Stagger.Item}
              >
                <span className={cn("font-semibold text-sm", color)}>
                  {model}
                </span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={status}
                    className={cn(
                      "font-medium text-xs",
                      status === "complete" && "text-success",
                      status === "running" && "text-primary",
                      status === "queued" && "text-foreground-dimmed",
                    )}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={Spring.Snappy}
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

        <div className="mb-4 grid grid-cols-3 gap-px border border-accent-foreground bg-accent-foreground">
          {[
            { label: "Wins", value: wins, color: "text-success" },
            { label: "Losses", value: losses, color: "text-error" },
            {
              label: "Win Rate",
              value: `${wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0}%`,
              color: "text-primary",
            },
          ].map((stats) => (
            <div
              key={stats.label}
              className="bg-background-rich px-4 py-4 text-center"
            >
              <motion.p
                className={cn("font-semibold text-3xl", stats.color)}
                key={String(stats.value)}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={Spring.Bounce}
              >
                {stats.value}
              </motion.p>
              <p className="mt-0.5 font-light text-foreground-dimmed text-xs">
                {stats.label}
              </p>
            </div>
          ))}
        </div>

        <div
          ref={ref}
          className="h-64 overflow-y-auto border border-accent-foreground bg-foreground p-4 font-mono text-xs"
        >
          <AnimatePresence>
            {logs.map((entry) => (
              <motion.div
                key={entry.id}
                className="mb-1"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={Spring.Snappy}
              >
                <span className={cn("font-medium", logColor(entry.model))}>
                  [{entry.model}]{" "}
                </span>
                <span
                  className={cn(
                    "text-white/80",
                    entry.message.startsWith("DECISION") &&
                      "font-medium text-white",
                  )}
                >
                  {entry.message}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {logs.length === 0 && (
            <p className="text-white/40">Initializing simulation engine...</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
