"use client";

import { cn } from "@zenncore/utils";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { Motion } from "@/components/motion";
import { Spring, Stagger } from "@/lib/animations";

const modelColors: Record<string, string> = {
  "GPT-4": "text-blue-500",
  Claude: "text-orange-500",
  Gemini: "text-green-500",
};

const models = [
  { model: "GPT-4", logo: "/images/chatgpt.svg" },
  { model: "Claude", logo: "/images/claude.svg" },
  { model: "Gemini", logo: "/images/gemini.svg" },
] as const;

const formatElapsed = (index: number) => `${(index * 0.4).toFixed(1)}s`;

export namespace RunningPhase {
  export type Props = {
    simulations: number;
    progress: number;
    statuses: Record<string, "queued" | "running" | "complete">;
    modelStats: Record<string, { wins: number; losses: number }>;
    logs: Array<{ id: number; model: string; message: string }>;
  };
}

export const RunningPhase = ({
  simulations,
  progress,
  statuses,
  modelStats,
  logs,
}: RunningPhase.Props) => {
  const ref = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: logEntries triggers scroll-to-bottom on new entries
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <motion.div
      key="running"
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={Spring.Gentle}
    >
      <Motion.Stagger
        stagger={0.05}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <Motion.Item className="border-accent-foreground border-b px-8">
          <div className="border-accent-foreground border-x p-6">
            <h1 className="font-medium text-4xl text-foreground">
              Running simulation.
            </h1>
            <p className="font-light text-2xl text-foreground-dimmed">
              GPT-4, Claude & Gemini are comparing your products against
              competitors right now.
            </p>
          </div>
        </Motion.Item>

        <Motion.Item className="border-accent-foreground border-b px-8">
          <motion.div
            className="grid grid-cols-3 divide-x divide-accent-foreground border-accent-foreground border-x"
            variants={Stagger.Container(0.06)}
            initial="hidden"
            animate="visible"
          >
            {models.map(({ model, logo }) => {
              const status = statuses[model];
              const stats = modelStats[model];
              return (
                <motion.div
                  key={model}
                  className="flex aspect-square flex-col bg-background-dimmed p-4"
                  variants={Stagger.Item}
                >
                  <Image src={logo} alt={model} width={64} height={64} />
                  <span className="mt-auto text-2xl text-foreground">
                    {model}
                  </span>
                  <div className="flex items-center gap-3">
                    <motion.span
                      key={stats?.wins}
                      className="font-light text-success"
                      initial={{ opacity: 0.6, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {stats?.wins ?? 0} W
                    </motion.span>
                    <span className="text-foreground-dimmed/30">—</span>
                    <motion.span
                      key={`l-${stats?.losses}`}
                      className="font-light text-error"
                      initial={{ opacity: 0.6, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {stats?.losses ?? 0} L
                    </motion.span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={status}
                      className={cn(
                        "font-light",
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
        </Motion.Item>

        <Motion.Item className="flex-1 border-accent-foreground border-b px-8">
          <div className="flex h-full w-full flex-col border-accent-foreground border-x bg-background-rich">
            <div className="flex items-center justify-between border-accent-foreground p-4">
              <div className="flex items-center gap-2">
                <motion.span
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{
                    duration: 1.4,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                  className="inline-block size-1.5 rounded-full bg-primary"
                />
                <span className="font-medium text-foreground uppercase tracking-widest">
                  Live Intelligence Scan
                </span>
              </div>
              <span className="font-mono text-primary tabular-nums">
                {Math.floor(progress)}%
              </span>
            </div>
            <div className="h-0.5 w-full bg-primary/30">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <div className="flex flex-1 space-y-1 overflow-y-auto scroll-smooth p-4">
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
                    <span className="shrink-0 font-mono text-foreground-dimmed/50 tabular-nums">
                      {formatElapsed(index)}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-medium",
                        modelColors[entry.model] ?? "text-foreground-dimmed",
                      )}
                    >
                      [{entry.model}]
                    </span>
                    <span className="text-foreground-dimmed leading-relaxed">
                      {entry.message}
                    </span>
                  </motion.div>
                );
              })}
              {logs.length === 0 && (
                <p className="text-foreground-dimmed/50">
                  Initializing simulation engine...
                </p>
              )}
              <div ref={ref} />
            </div>

            <div className="flex items-center gap-1.5 border-accent-foreground border-t px-5 py-3">
              {[0, 0.2, 0.4].map((delay) => (
                <motion.span
                  key={delay}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{
                    duration: 1,
                    repeat: Number.POSITIVE_INFINITY,
                    delay,
                    ease: "easeInOut",
                  }}
                  className="inline-block size-1 rounded-full bg-primary"
                />
              ))}
              <span className="ml-1.5 font-light text-foreground-dimmed">
                Running simulations across {simulations} comparisons
              </span>
            </div>
          </div>
        </Motion.Item>
        <Motion.Item className="border-accent-foreground border-b px-8">
          <div className="size-full h-8 border-accent-foreground border-x" />
        </Motion.Item>
      </Motion.Stagger>
    </motion.div>
  );
};
