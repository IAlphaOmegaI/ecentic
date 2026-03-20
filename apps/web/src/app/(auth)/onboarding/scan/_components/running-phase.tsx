"use client";

import { cn } from "@zenncore/utils";
import { AnimatePresence, motion } from "motion/react";
import type { SVGProps } from "react";
import { useEffect, useRef } from "react";
import { Spring, Stagger } from "@/lib/animations";

const modelColors: Record<string, string> = {
  "GPT-4": "text-blue-500",
  Claude: "text-orange-500",
  Gemini: "text-green-500",
};

const OpenAILogo = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.91 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.776.776 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.767.767 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.843-3.372 2.015-1.163a.076.076 0 0 1 .072 0l4.83 2.786a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.398-.678zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.776.776 0 0 0-.392.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

const AnthropicLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.304 3.541 13.766 12.6l3.538 9.059H24L17.304 3.541zM6.696 3.541 0 21.659h6.696l3.538-9.059-3.538-9.059z" />
  </svg>
);

const GeminiLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 24A14.304 14.304 0 0 0 0 12 14.304 14.304 0 0 0 12 0a14.304 14.304 0 0 0 12 12 14.304 14.304 0 0 0-12 12" />
  </svg>
);

const modelLogos: Record<
  string,
  (props: SVGProps<SVGSVGElement>) => JSX.Element
> = {
  "GPT-4": OpenAILogo,
  Claude: AnthropicLogo,
  Gemini: GeminiLogo,
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
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={Spring.Gentle}
    >
      <div className="mx-8 flex flex-1 flex-col overflow-y-auto border-accent-foreground border-x px-6 py-10">
        <div className="mb-6">
          <h1 className="font-medium text-3xl text-foreground">
            Running simulation.
          </h1>
          <p className="mt-1 font-light text-foreground-dimmed">
            GPT-4, Claude & Gemini are comparing your products against
            competitors right now.
          </p>
        </div>

        <div className="w-full border border-accent-foreground bg-background-rich">
          {/* Header */}
          <div className="flex items-center justify-between border-accent-foreground border-b px-5 py-3">
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
              <span className="font-medium text-foreground text-xs uppercase tracking-widest">
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
            className="grid grid-cols-3 divide-x divide-accent-foreground border-accent-foreground border-b"
            variants={Stagger.Container(0.06)}
            initial="hidden"
            animate="visible"
          >
            {(["GPT-4", "Claude", "Gemini"] as const).map((model) => {
              const status = statuses[model];
              const Logo = modelLogos[model];
              return (
                <motion.div
                  key={model}
                  className="flex items-center justify-between px-5 py-3"
                  variants={Stagger.Item}
                >
                  <div className="flex items-center gap-2">
                    <Logo className={cn("size-4", modelColors[model])} />
                    <span
                      className={cn("font-medium text-sm", modelColors[model])}
                    >
                      {model}
                    </span>
                  </div>
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
                  <span
                    className={cn(
                      "shrink-0 font-medium text-xs",
                      modelColors[entry.model] ?? "text-foreground-dimmed",
                    )}
                  >
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
                transition={{
                  duration: 1,
                  repeat: Number.POSITIVE_INFINITY,
                  delay,
                  ease: "easeInOut",
                }}
                className="inline-block size-1 rounded-full bg-primary"
              />
            ))}
            <span className="ml-1.5 font-light text-foreground-dimmed text-xs">
              Running simulations across {simulations} comparisons
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
