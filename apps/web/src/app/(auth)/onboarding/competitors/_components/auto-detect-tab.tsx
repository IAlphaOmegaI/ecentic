"use client";

import { readStreamableValue } from "@ai-sdk/rsc";
import { RadarIcon } from "@zenncore/icons";
import { cn, unwrapResult } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import * as Competitor from "@/server/app/competitor";

type LogEntry = {
  id: number;
  text: string;
  elapsed: number;
  type: "info" | "success" | "error";
};

export namespace AutoDetectTab {
  export type Props = {
    products: string[];
    onSuccess: (competitors: Competitor.Type[]) => void;
    className?: string;
  };
}

const formatElapsed = (ms: number) => {
  const seconds = ms / 1000;
  return seconds < 60
    ? `${seconds.toFixed(1)}s`
    : `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
};

export const AutoDetectTab = ({
  products,
  onSuccess,
  className,
}: AutoDetectTab.Props) => {
  const toast = useToastManager();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const start = useRef<number>(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const target = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to bottom on new log
  useEffect(() => {
    target.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (entry: Omit<LogEntry, "id" | "elapsed">) =>
    setLogs((previous) => [
      ...previous,
      {
        ...entry,
        id: Math.random(),
        elapsed: Date.now() - start.current,
      },
    ]);

  const [handleDetect, isDetecting] = useAsyncAction(async () => {
    setLogs([]);
    setElapsed(0);
    start.current = Date.now();

    timer.current = setInterval(() => {
      setElapsed(Date.now() - start.current);
    }, 100);

    const { output } = await unwrapResult(
      Competitor.detectCompetitors({ products }),
    );

    for await (const event of readStreamableValue(output)) {
      if (!event) continue;

      switch (event.kind) {
        case "log":
          addLog({ text: event.text, type: "info" });
          break;
        case "chunk":
          addLog({ text: event.text, type: "info" });
          break;
        case "error":
          addLog({ text: event.text, type: "error" });
          return;
        case "done":
          addLog({
            text: `${event.competitors.length} competitors identified`,
            type: "success",
          });
          clearInterval(timer.current);
          onSuccess(event.competitors);
          toast.add({
            title: "Competitors found",
            description: `Found ${event.competitors.length} competitor products.`,
            type: "success",
          });
          return;
      }
    }
  });

  return (
    <div className={cn("relative flex h-full bg-background-dimmed", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {!isDetecting && logs.length === 0 && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="m-auto flex size-full h-full flex-1 flex-col items-center justify-center p-4"
          >
            <Image
              src="/images/auto-detect.png"
              alt="Competitors illustration"
              fill
              className="object-contain opacity-30"
            />

            <div className="relative z-20">
              <h3 className="text-center font-medium text-2xl text-foreground">
                Auto-detect competitors
              </h3>
              <p className="relative text-center text-foreground-dimmed text-lg">
                We'll analyze your products and use AI to find <br />
                the most relevant competitors in your market.
              </p>
            </div>
            <Button
              variant="flat"
              color="primary"
              type="button"
              onClick={handleDetect}
              className="relative z-20 mt-4"
            >
              Auto-detect competitors <RadarIcon />
            </Button>
          </motion.div>
        )}

        {(isDetecting || logs.length > 0) && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-full max-h-full min-h-0 flex-1 flex-col"
          >
            <div
              className={cn(
                "flex items-center justify-between p-4",
                !isDetecting && "border-accent-foreground border-b",
              )}
            >
              <div className="flex items-center gap-2">
                {isDetecting && (
                  <motion.span
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{
                      duration: 1.4,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                    className="inline-block size-1.5 rounded-full bg-primary"
                  />
                )}
                <span className="font-medium text-foreground uppercase tracking-widest">
                  {isDetecting ? "Live Intelligence Scan" : "Scan Complete"}
                </span>
              </div>
              <span className="font-mono text-foreground-dimmed tabular-nums">
                {formatElapsed(elapsed)}
              </span>
            </div>

            {isDetecting && (
              <div className="relative h-0.5 w-full overflow-hidden bg-primary/20">
                <motion.div
                  className="absolute h-full w-1/3 bg-primary"
                  animate={{ x: ["-100%", "400%"] }}
                  transition={{
                    duration: 1.6,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                />
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto scroll-smooth p-4">
              {logs.map((log, index) => {
                const age = logs.length - 1 - index;
                const opacity = isDetecting ? Math.max(0.2, 1 - age * 0.1) : 1;
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity, x: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="flex items-baseline gap-2"
                  >
                    <span className="shrink-0 font-mono text-foreground-dimmed/50 tabular-nums">
                      {formatElapsed(log.elapsed)}
                    </span>
                    <span
                      className={
                        log.type === "error"
                          ? "text-error leading-relaxed"
                          : log.type === "success"
                            ? "font-medium text-success leading-relaxed"
                            : "text-foreground-dimmed leading-relaxed"
                      }
                    >
                      {log.text}
                    </span>
                  </motion.div>
                );
              })}
              {logs.length === 0 && (
                <p className="text-foreground-dimmed/50">
                  Initializing intelligence scan...
                </p>
              )}
              <div ref={target} />
            </div>

            {isDetecting ? (
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
                  Analyzing market signals
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between border-accent-foreground border-t px-5 py-3">
                <span className="font-light text-foreground-dimmed text-xs">
                  Finished in {formatElapsed(elapsed)}
                </span>
                <button
                  type="button"
                  onClick={handleDetect}
                  className="font-light text-foreground-dimmed text-xs underline-offset-2 hover:underline"
                >
                  Run again
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
