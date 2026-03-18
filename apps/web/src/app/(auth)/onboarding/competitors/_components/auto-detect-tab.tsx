"use client";

import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type * as Competitor from "@/server/app/competitor";

type Phase = "idle" | "scanning" | "done" | "error";

type LogLine = {
  id: number;
  text: string;
  elapsed: number;
};

export namespace AutoDetectTab {
  export type Props = {
    products: string[];
    onSuccess: (competitors: Competitor.Type[]) => void;
  };
}

export const AutoDetectTab = ({ products, onSuccess }: AutoDetectTab.Props) => {
  const toast = useToastManager();
  const [phase, setPhase] = useState<Phase>("idle");
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [errorText, setErrorText] = useState("");
  const [resultCount, setResultCount] = useState(0);

  const startTimeRef = useRef<number>(0);
  const logIdRef = useRef(0);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return stopTimer;
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const formatElapsed = (ms: number) => {
    const seconds = ms / 1000;
    return seconds < 60
      ? `${seconds.toFixed(1)}s`
      : `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
  };

  const addLog = (text: string) => {
    const elapsed = Date.now() - startTimeRef.current;
    setLogs((prev) => [
      ...prev,
      { id: logIdRef.current++, text, elapsed },
    ]);
  };

  const handleDetect = async () => {
    setPhase("scanning");
    setLogs([]);
    setElapsed(0);
    setErrorText("");
    logIdRef.current = 0;
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 100);

    try {
      const response = await fetch("/api/intelligence/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: products }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          const event = JSON.parse(trimmed) as
            | { kind: "log"; text: string }
            | { kind: "error"; text: string }
            | { kind: "done"; competitors: Competitor.Type[] };

          switch (event.kind) {
            case "log":
              addLog(event.text);
              break;
            case "error":
              stopTimer();
              setErrorText(event.text);
              setPhase("error");
              return;
            case "done":
              stopTimer();
              setResultCount(event.competitors.length);
              setPhase("done");
              onSuccess(event.competitors);
              toast.add({
                title: "Competitors found",
                description: `Found ${event.competitors.length} competitor products.`,
                type: "success",
              });
              return;
          }
        }
      }
    } catch (error) {
      stopTimer();
      setErrorText(error instanceof Error ? error.message : "Unknown error");
      setPhase("error");
    }
  };

  const handleRetry = () => {
    setPhase("idle");
    setLogs([]);
    setElapsed(0);
    setErrorText("");
  };

  return (
    <div className="border border-accent-foreground border-t-0 bg-background-rich min-h-[280px]">
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-4 py-14 text-center px-6"
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

        {phase === "scanning" && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col"
          >
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
              <span className="font-mono text-foreground-dimmed text-xs tabular-nums">
                {formatElapsed(elapsed)}
              </span>
            </div>

            <div className="h-52 overflow-y-auto px-5 py-4 space-y-1.5 scroll-smooth">
              {logs.map((log, index) => {
                const age = logs.length - 1 - index;
                const opacity = Math.max(0.25, 1 - age * 0.12);
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity, x: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="flex items-baseline gap-3"
                  >
                    <span className="font-mono text-foreground-dimmed/50 text-xs tabular-nums shrink-0">
                      {formatElapsed(log.elapsed)}
                    </span>
                    <span className="text-foreground-dimmed text-xs leading-relaxed">
                      {log.text}
                    </span>
                  </motion.div>
                );
              })}
              <div ref={logsEndRef} />
            </div>

            <div className="border-t border-accent-foreground px-5 py-3 flex items-center gap-1.5">
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
              <span className="ml-1.5 text-foreground-dimmed text-xs">
                Analyzing market signals
              </span>
            </div>
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center gap-5 py-14 px-6 text-center"
          >
            <div className="flex flex-col items-center gap-3">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
                className="flex size-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10"
              >
                <svg
                  className="size-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  {resultCount} competitor{resultCount !== 1 ? "s" : ""} identified
                </p>
                <p className="mt-0.5 font-light text-foreground-dimmed text-xs">
                  Completed in {formatElapsed(elapsed)}
                </p>
              </div>
            </div>
            <Button
              variant="flat"
              color="primary"
              type="button"
              onClick={handleRetry}
              className="px-5 py-1.5 text-xs font-medium"
            >
              Run again
            </Button>
          </motion.div>
        )}

        {phase === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-4 py-14 px-6 text-center"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-full border border-error/30 bg-error/10">
                <svg
                  className="size-4 text-error"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="font-light text-foreground-dimmed text-sm max-w-xs">
                {errorText || "Something went wrong. Please try again."}
              </p>
            </div>
            <Button
              variant="ghost"
              color="neutral"
              type="button"
              onClick={handleRetry}
              className="text-foreground-dimmed text-xs"
            >
              ← Try again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
