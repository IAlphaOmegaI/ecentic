"use client";

import { RadarIcon } from "@zenncore/icons";
import { cn, resultify, unwrapResult } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatElapsed } from "@/lib/date";
import * as Competitor from "@/server/app/competitor";

type LogEntry = {
  id: number;
  text: string;
  elapsed: number;
  type: "info" | "success" | "error";
};

const POLL_INTERVAL = 1200;
// Matches /api/detect maxDuration on Pro; quiescence usually finishes well before.
const DETECTION_TIMEOUT = 120_000;
// Stop once verified competitors have stopped arriving for this long.
const QUIESCENCE = 5000;

export namespace AutoDetectTab {
  export type Props = {
    products: string[];
    onSuccess?: (competitors: Competitor.Type[]) => void;
    className?: string;
  };
}

export const AutoDetectTab = ({
  products,
  onSuccess,
  className,
}: AutoDetectTab.Props) => {
  const toast = useToastManager();
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const start = useRef<number>(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = (entry: Omit<LogEntry, "id" | "elapsed">) =>
    setLogs((previous) => [
      ...previous,
      {
        ...entry,
        id: previous.length + 1,
        elapsed: Date.now() - start.current,
      },
    ]);

  useEffect(() => {
    if (logs.length === 0) return;

    const container = logRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [logs]);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const [handleDetect, isDetecting] = useAsyncAction(async () => {
    setLogs([]);
    setElapsed(0);
    start.current = Date.now();

    timer.current = setInterval(() => {
      setElapsed(Date.now() - start.current);
    }, 100);

    addLog({
      text: `Reading ${products.length} product${products.length === 1 ? "" : "s"} from your catalog`,
      type: "info",
    });
    addLog({
      text: "Querying the intelligence model and verifying live listings…",
      type: "info",
    });

    // Detection runs server-side (survives this tab closing) and persists each
    // competitor the moment it verifies it. We poll for those rows and stream
    // them in as they land, finishing once results settle (quiescence) or we
    // hit the timeout.
    const detection = await resultify(async () => {
      const { since } = await unwrapResult(
        Competitor.detectCompetitors({ products }),
      );

      const seen = new Set<string>();
      const collected: Competitor.Type[] = [];
      const quiet = { since: Date.now() };
      const deadline = Date.now() + DETECTION_TIMEOUT;

      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

        const found = await Competitor.detectedSince({ since });
        if (!found.success) continue;

        const fresh = found.data.filter((record) => !seen.has(record.id));
        for (const record of fresh) {
          seen.add(record.id);
          collected.push(record);
          addLog({ text: `Verified · ${record.title}`, type: "success" });
        }
        if (fresh.length > 0) quiet.since = Date.now();

        // competitors have stopped arriving — detection has settled.
        if (collected.length > 0 && Date.now() - quiet.since > QUIESCENCE)
          return collected;
      }
      return collected;
    });

    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }

    if (!detection.success) {
      addLog({ text: "Detection failed. Please try again.", type: "error" });
      toast.add({
        title: "Detection failed",
        description: detection.error.message,
        type: "error",
      });
      return;
    }

    if (detection.data.length === 0) {
      addLog({
        text: "No new competitors found. Please try again.",
        type: "error",
      });
      toast.add({
        title: "No competitors found",
        description: "We couldn't identify new competitors. Please try again.",
        type: "error",
      });
      return;
    }

    addLog({
      text: `${detection.data.length} competitor${detection.data.length === 1 ? "" : "s"} identified`,
      type: "success",
    });
    // refresh the server-rendered competitor list to include what just streamed in.
    router.refresh();
    onSuccess?.(detection.data);
    toast.add({
      title: "Competitors found",
      description: `Found ${detection.data.length} competitor product${detection.data.length !== 1 ? "s" : ""}.`,
      type: "success",
    });
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

            <div
              ref={logRef}
              className="min-h-0 flex-1 space-y-1 overflow-y-auto scroll-smooth p-4"
            >
              {logs.map((log, index) => {
                const age = logs.length - 1 - index;
                const opacity = isDetecting ? Math.max(0.2, 1 - age * 0.1) : 1;
                return (
                  <motion.div
                    // biome-ignore lint/suspicious/noArrayIndexKey: we want to use the index as the key
                    key={index}
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
              <div className="flex items-center justify-between border-accent-foreground border-t p-4">
                <span className="font-light text-foreground-dimmed">
                  Finished in {formatElapsed(elapsed)}
                </span>
                <Button onClick={handleDetect} color="accent">
                  Run Again
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
