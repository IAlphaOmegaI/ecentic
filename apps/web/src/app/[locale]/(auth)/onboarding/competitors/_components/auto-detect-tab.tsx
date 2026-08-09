"use client";

import { readStreamableValue } from "@ai-sdk/rsc";
import { RadarIcon } from "@zenncore/icons";
import { cn, resultify, unwrapResult } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { formatElapsed } from "@/lib/date";
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
    onSuccess?: (competitors: Competitor.Type[]) => void;
    store: string;
    className?: string;
  };
}

export const AutoDetectTab = ({
  products,
  onSuccess,
  store,
  className,
}: AutoDetectTab.Props) => {
  const toast = useToastManager();
  const router = useRouter();
  const translate = useTranslations("onboarding.competitors.autoDetect");
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

    const detection = await resultify(async () => {
      const { output } = await unwrapResult(
        Competitor.streamDetection({ products, store }),
      );

      const collected: Competitor.Type[] = [];
      for await (const event of readStreamableValue(output)) {
        if (!event) continue;

        switch (event.kind) {
          case "status":
            addLog({ text: event.message, type: "info" });
            break;
          case "competitor":
            collected.push(event.competitor);
            addLog({
              text: translate("foundLog", { title: event.competitor.title }),
              type: "success",
            });
            break;
          case "error":
            throw new Error(event.message);
          case "done":
            break;
        }
      }
      return collected;
    });

    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }

    if (!detection.success) {
      addLog({ text: translate("errors.failed"), type: "error" });
      toast.add({
        title: translate("toast.failed"),
        description: detection.error.message,
        type: "error",
      });
      return;
    }

    if (detection.data.length === 0) {
      addLog({ text: translate("errors.noneFound"), type: "error" });
      toast.add({
        title: translate("toast.noneFound.title"),
        description: translate("toast.noneFound.description"),
        type: "error",
      });
      return;
    }

    addLog({
      text: translate("identified", { count: detection.data.length }),
      type: "success",
    });
    router.refresh();
    onSuccess?.(detection.data);
    toast.add({
      title: translate("toast.found.title"),
      description: translate("toast.found.description", {
        count: detection.data.length,
      }),
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
              alt=""
              aria-hidden
              fill
              className="pointer-events-none select-none object-contain opacity-10"
            />

            <div className="relative z-20">
              <h3 className="text-center font-medium text-2xl text-foreground">
                {translate("title")}
              </h3>
              <p className="relative text-center text-foreground-dimmed text-lg">
                {translate("description")}
              </p>
            </div>
            <Button
              color="primary"
              type="button"
              onClick={handleDetect}
              className="relative z-20 mt-4"
            >
              {translate("action")} <RadarIcon />
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
                  {isDetecting ? translate("scanning") : translate("complete")}
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
                  {translate("initializing")}
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
                  {translate("analyzing")}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between border-accent-foreground border-t p-4">
                <span className="font-light text-foreground-dimmed">
                  {translate("finishedIn", { elapsed: formatElapsed(elapsed) })}
                </span>
                <Button onClick={handleDetect} color="accent">
                  {translate("runAgain")}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
