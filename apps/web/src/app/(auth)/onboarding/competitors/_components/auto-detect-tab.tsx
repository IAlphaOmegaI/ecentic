"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { readStreamableValue } from "@ai-sdk/rsc";
import { unwrapResult } from "@zenncore/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import * as Competitor from "@/server/app/competitor";

type LogEntry = { id: number; text: string; elapsed: number; type: "info" | "success" | "error" };

export namespace AutoDetectTab {
  export type Props = {
    products: string[];
    onSuccess: (competitors: Competitor.Type[]) => void;
  };
}

const formatElapsed = (ms: number) => {
  const seconds = ms / 1000;
  return seconds < 60
    ? `${seconds.toFixed(1)}s`
    : `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
};

export const AutoDetectTab = ({ products, onSuccess }: AutoDetectTab.Props) => {
  const toast = useToastManager();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);

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

  const addLog = (entry: Omit<LogEntry, "id" | "elapsed">) =>
    setLogs((previous) => [
      ...previous,
      { ...entry, id: logIdRef.current++, elapsed: Date.now() - startTimeRef.current },
    ]);

  const [handleDetect, isDetecting] = useAsyncAction(async () => {
    setLogs([]);
    setElapsed(0);
    logIdRef.current = 0;
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
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
          break;
        case "error":
          stopTimer();
          addLog({ text: event.text, type: "error" });
          return;
        case "done":
          stopTimer();
          addLog({ text: `${event.competitors.length} competitors identified`, type: "success" });
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
    <div className="border border-accent-foreground bg-background-rich min-h-[280px]">
      <AnimatePresence mode="wait" initial={false}>
        {!isDetecting && logs.length === 0 && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-4 px-6 py-14 text-center"
          >
            <p className="max-w-md font-light text-foreground-dimmed text-sm">
              We'll analyze your products and use AI to find the most relevant
              competitors in your market.
            </p>
            <Button
              variant="flat"
              color="primary"
              type="button"
              onClick={handleDetect}
              className="px-6 py-2 font-medium text-sm"
            >
              Auto-detect competitors
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
            className="flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-accent-foreground px-5 py-3">
              <div className="flex items-center gap-2">
                {isDetecting && (
                  <motion.span
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    className="inline-block size-1.5 rounded-full bg-primary"
                  />
                )}
                <span className="font-medium text-foreground text-xs tracking-widest uppercase">
                  {isDetecting ? "Live Intelligence Scan" : "Scan Complete"}
                </span>
              </div>
              <span className="font-mono text-foreground-dimmed text-xs tabular-nums">
                {formatElapsed(elapsed)}
              </span>
            </div>

            {/* Indeterminate progress bar */}
            {isDetecting && (
              <div className="relative h-0.5 w-full overflow-hidden bg-accent-foreground">
                <motion.div
                  className="absolute h-full w-1/3 bg-primary"
                  animate={{ x: ["-100%", "400%"] }}
                  transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                />
              </div>
            )}

            {/* Log area */}
            <div className="h-52 space-y-1.5 overflow-y-auto scroll-smooth px-5 py-4">
              {logs.map((log, index) => {
                const age = logs.length - 1 - index;
                const opacity = isDetecting ? Math.max(0.2, 1 - age * 0.1) : 1;
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity, x: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="flex items-baseline gap-3"
                  >
                    <span className="shrink-0 font-mono text-foreground-dimmed/50 text-xs tabular-nums">
                      {formatElapsed(log.elapsed)}
                    </span>
                    <span
                      className={
                        log.type === "error"
                          ? "text-error text-xs leading-relaxed"
                          : log.type === "success"
                            ? "text-success text-xs font-medium leading-relaxed"
                            : "text-foreground-dimmed text-xs leading-relaxed"
                      }
                    >
                      {log.text}
                    </span>
                  </motion.div>
                );
              })}
              {logs.length === 0 && (
                <p className="text-foreground-dimmed/50 text-xs">
                  Initializing intelligence scan...
                </p>
              )}
              <div ref={logsEndRef} />
            </div>

            {/* Footer */}
            {isDetecting ? (
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
                  Analyzing market signals
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between border-t border-accent-foreground px-5 py-3">
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
