"use client";

import { XIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  Dialog,
  DialogClose,
  DialogPopup,
  DialogTitle,
} from "@zenncore/web/components/dialog";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useScanRunner } from "@/app/[locale]/(auth)/onboarding/scan/_components/use-scan-runner";
import { Motion } from "@/components/motion";
import { Link } from "@/i18n/navigation";
import { Spring, Stagger } from "@/lib/animations";
import { formatElapsed } from "@/lib/date";
import { countForCurrentUser } from "@/server/app/competitor";
import type * as Simulate from "@/server/app/intelligence/simulate";
import { StatusPill, TopFindingCallout } from "./grid";

const providers = [
  {
    id: "gpt4",
    model: "ChatGPT",
    logo: "/images/chatgpt.svg",
    textColor: "text-primary",
    bgColor: "bg-primary",
  },
  {
    id: "claude",
    model: "Claude",
    logo: "/images/claude.svg",
    textColor: "text-warning",
    bgColor: "bg-warning",
  },
  {
    id: "gemini",
    model: "Gemini",
    logo: "/images/gemini.svg",
    textColor: "text-success",
    bgColor: "bg-success",
  },
] as const;

const modelColors: Record<string, string> = Object.fromEntries(
  providers.map((provider) => [provider.model, provider.textColor]),
);

export namespace SimulationModal {
  export type Props = {
    store: string;
    open: boolean;
    onClose: () => void;
  };
}

export const SimulationModal = ({
  store,
  open,
  onClose,
}: SimulationModal.Props) => {
  const toast = useToastManager();
  const translate = useTranslations("dashboard.simulation");
  const general = useTranslations("general");
  const target = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    phase,
    stats,
    logs,
    statuses,
    winRates,
    topFinding,
    count,
    elapsed,
    handleRun,
    isRunning,
    reset,
  } = useScanRunner({
    store,
    onError: (text) => {
      setError(text);
      toast.add({
        title: translate("toast.failed.title"),
        description: text,
        type: "error",
      });
    },
  });

  const [start, isStarting] = useAsyncAction(async () => {
    setError(null);
    await handleRun();
  }, false);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();

    void (async () => {
      const result = await countForCurrentUser({ store });
      if (controller.signal.aborted || !result.success) return;
      if (result.data.total === 0) {
        setError(translate("pre.noCompetitors"));
      }
    })();

    return () => controller.abort();
  }, [open, store, translate]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to bottom on new log
  useEffect(() => {
    target.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setError(null);
      reset();
    }, 300);
  };

  const closable = phase !== "running";
  const needsCompetitors = Boolean(error?.toLowerCase().includes("competitor"));

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && closable) handleClose();
      }}
    >
      <DialogPopup
        className={cn(
          "z-50 mt-0 flex w-[min(1100px,calc(100vw-2rem))] max-w-none flex-col bg-background-rich p-0 opacity-100 shadow-2xl",
          phase === "pre"
            ? "h-auto max-h-[min(680px,92vh)]"
            : "h-[min(680px,92vh)]",
        )}
        classList={{
          backdrop:
            "z-50 bg-foreground/40 opacity-100 backdrop-blur-sm transition-all duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0",
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-accent-foreground border-b px-6 py-3.5">
          <div className="flex items-center gap-3">
            <DialogTitle className="mt-0 mb-0 text-foreground text-sm">
              {phase === "pre" && translate("title.pre")}
              {phase === "running" && translate("title.running")}
              {phase === "complete" && translate("title.complete")}
            </DialogTitle>
            {phase === "running" && (
              <StatusPill tone="primary">{translate("states.live")}</StatusPill>
            )}
            {phase === "complete" && (
              <StatusPill tone="success">{translate("states.done")}</StatusPill>
            )}
          </div>
          {closable && (
            <DialogClose className="size-7 border-0 bg-transparent px-0 text-foreground-dimmed hover:bg-transparent hover:text-foreground active:bg-transparent">
              <XIcon className="size-4" />
            </DialogClose>
          )}
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            {/* ── PRE ── */}
            {phase === "pre" && (
              <motion.div
                key="pre"
                className="flex flex-col"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={Spring.Gentle}
              >
                <Motion.Stagger stagger={0.05} className="flex flex-col">
                  <Motion.Item className="border-accent-foreground border-b px-8">
                    <div className="border-accent-foreground border-x p-6">
                      <p className="mb-2 font-medium text-2xl text-foreground">
                        {translate("pre.heading")}
                      </p>
                      <p className="max-w-2xl font-light text-foreground-dimmed text-sm">
                        {translate("pre.description")}
                      </p>
                    </div>
                  </Motion.Item>

                  <Motion.Item className="border-accent-foreground border-b px-8">
                    <div className="grid w-full grid-cols-3 divide-x divide-accent-foreground border-accent-foreground border-x">
                      {providers.map((provider) => (
                        <div
                          key={provider.model}
                          className="flex flex-col gap-2 bg-background-rich p-4"
                        >
                          <Image
                            src={provider.logo}
                            alt={provider.model}
                            width={32}
                            height={32}
                            className="size-8"
                          />
                          <span
                            className={cn(
                              "font-medium text-lg",
                              provider.textColor,
                            )}
                          >
                            {provider.model}
                          </span>
                          <span className="font-light text-foreground-dimmed text-xs">
                            {translate(`providers.${provider.id}.description`)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Motion.Item>

                  <Motion.Item className="px-8">
                    <div className="flex flex-col gap-3 border-accent-foreground border-x p-6">
                      {error && (
                        <p className="text-foreground-dimmed text-sm">
                          {error}
                        </p>
                      )}
                      {needsCompetitors ? (
                        <Button
                          color="primary"
                          className="w-full"
                          render={
                            <Link href={`/dashboard/${store}/competitors`} />
                          }
                        >
                          {translate("pre.addCompetitors")}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => start()}
                          disabled={isRunning || isStarting}
                          color="primary"
                          className="w-full"
                        >
                          {isStarting
                            ? general("states.pending.primary")
                            : translate("action.primary")}
                        </Button>
                      )}
                    </div>
                  </Motion.Item>
                </Motion.Stagger>
              </motion.div>
            )}

            {phase === "running" && (
              <motion.div
                key="running"
                className="absolute inset-0 flex flex-col overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Motion.Stagger
                  stagger={0.05}
                  className="flex h-full flex-col overflow-hidden"
                >
                  <Motion.Item className="border-accent-foreground border-b px-8">
                    <div className="flex items-center justify-between border-accent-foreground border-x px-6 py-3">
                      <div className="flex items-center gap-2">
                        <motion.span
                          animate={{ opacity: [1, 0.2, 1] }}
                          transition={{
                            duration: 1.4,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut",
                          }}
                          className="inline-block size-1.5 bg-primary"
                        />
                        <span className="font-medium text-foreground text-xs uppercase tracking-[0.2em]">
                          {translate("running.heading")}
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
                    <div className="h-0.5 w-full bg-background-dimmed">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </Motion.Item>

                  <Motion.Item className="border-accent-foreground border-b px-8">
                    <div className="grid grid-cols-3 divide-x divide-accent-foreground border-accent-foreground border-x">
                      {(["ChatGPT", "Claude", "Gemini"] as const).map(
                        (model) => {
                          const status = statuses[model];
                          const provider = providers.find(
                            (item) => item.model === model,
                          );
                          return (
                            <div
                              key={model}
                              className="flex items-center justify-between bg-background-rich px-4 py-3"
                            >
                              <div className="flex items-center gap-2">
                                {provider && (
                                  <Image
                                    src={provider.logo}
                                    alt={provider.model}
                                    width={22}
                                    height={22}
                                  />
                                )}
                                <span
                                  className={cn(
                                    "font-medium text-sm",
                                    modelColors[model],
                                  )}
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
                                    status === "queued" &&
                                      "text-foreground-dimmed/50",
                                  )}
                                  initial={{ opacity: 0, y: 3 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -3 }}
                                  transition={{ duration: 0.15 }}
                                >
                                  {status === "complete" &&
                                    translate("states.done")}
                                  {status === "running" &&
                                    translate("states.running")}
                                  {status === "queued" &&
                                    translate("states.queued")}
                                </motion.span>
                              </AnimatePresence>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </Motion.Item>

                  <Motion.Item className="flex min-h-0 flex-1 flex-col border-accent-foreground border-b px-8">
                    <div className="flex h-full flex-col border-accent-foreground border-x bg-background-rich">
                      <div className="h-56 flex-1 space-y-1.5 overflow-y-auto scroll-smooth px-6 py-4">
                        {logs.map((entry, index) => {
                          const age = logs.length - 1 - index;
                          const opacity = Math.max(0.2, 1 - age * 0.1);
                          return (
                            <motion.div
                              key={entry.id}
                              className="flex items-baseline gap-3"
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity, x: 0 }}
                              transition={{
                                duration: 0.25,
                                ease: "easeOut",
                              }}
                            >
                              <span className="shrink-0 font-mono text-foreground-dimmed/50 text-xs tabular-nums">
                                {formatElapsed(entry.elapsed)}
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 font-medium text-xs",
                                  modelColors[entry.model] ??
                                    "text-foreground-dimmed",
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
                            {translate("states.initializing")}
                          </p>
                        )}
                        <div ref={target} />
                      </div>
                      <div className="flex items-center gap-1.5 border-accent-foreground border-t px-6 py-3">
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
                            className="inline-block size-1 bg-primary"
                          />
                        ))}
                        <span className="ml-1.5 font-light text-foreground-dimmed text-xs">
                          {translate("running.comparisons", {
                            count: String(stats.wins + stats.losses),
                          })}
                        </span>
                      </div>
                    </div>
                  </Motion.Item>
                </Motion.Stagger>
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
      </DialogPopup>
    </Dialog>
  );
};

type CompletePhaseModalProps = {
  wins: number;
  losses: number;
  winRates: Record<string, { wins: number; losses: number; rate: number }>;
  topFinding: Simulate.TopFinding | null;
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
  const translate = useTranslations("dashboard.simulation");
  const winRate =
    wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  const resultMessage = (() => {
    switch (true) {
      case winRate < 30:
        return translate("complete.results.low");
      case winRate < 60:
        return translate("complete.results.medium");
      default:
        return translate("complete.results.high");
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
      className="flex flex-col px-8 py-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={Spring.Gentle}
    >
      <Motion.Stagger stagger={0.08}>
        <Motion.Up className="mb-6 grid grid-cols-[1fr_auto] gap-px border border-accent-foreground bg-background-rich">
          <div className="bg-background-rich px-6 py-6">
            <p className="mb-1 font-light text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
              {translate("complete.overallWinRate")}
            </p>
            <motion.p
              className={cn(
                "font-semibold text-[72px] leading-none",
                resultColor,
              )}
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
              {translate("complete.completedIn", {
                elapsed: formatElapsed(elapsed),
              })}
            </p>
          </div>
          <div className="flex flex-col divide-y divide-accent-foreground bg-background-rich">
            {[
              {
                label: translate("complete.stats.wins"),
                value: wins,
                color: "text-success",
              },
              {
                label: translate("complete.stats.losses"),
                value: losses,
                color: "text-error",
              },
              {
                label: translate("complete.stats.products"),
                value: finalProductCount,
                color: "text-foreground",
              },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                className="flex flex-1 flex-col items-center justify-center px-7 py-3"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...Spring.Snappy, delay: 0.2 + index * 0.07 }}
              >
                <span className={cn("font-semibold text-2xl", stat.color)}>
                  {stat.value}
                </span>
                <span className="mt-0.5 font-light text-foreground-dimmed text-xs">
                  {stat.label}
                </span>
              </motion.div>
            ))}
          </div>
        </Motion.Up>

        <Motion.Up className="mb-4 border border-accent-foreground bg-background-rich">
          <div className="border-accent-foreground border-b px-4 py-3">
            <p className="font-medium text-foreground text-sm">
              {translate("complete.winRateByModel")}
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-accent-foreground">
            {providers.map((provider, index) => {
              const rates = winRates[provider.id];
              const rate = rates?.rate ?? 0;
              return (
                <div
                  key={provider.id}
                  className="flex flex-col gap-3 bg-background-rich px-4 py-4"
                >
                  <Image
                    src={provider.logo}
                    alt={provider.model}
                    width={28}
                    height={28}
                  />
                  <div className="flex items-end justify-between">
                    <span
                      className={cn("font-light text-xs", provider.textColor)}
                    >
                      {provider.model}
                    </span>
                    <span className="font-semibold text-foreground text-lg">
                      {rate}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-background-dimmed">
                    <motion.div
                      className={cn("h-full", provider.bgColor)}
                      initial={{ width: 0 }}
                      animate={{ width: `${rate}%` }}
                      transition={{
                        ...Spring.Gentle,
                        delay: 0.35 + index * 0.1,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Motion.Up>

        {topFinding && (
          <Motion.Up className="mb-6">
            <TopFindingCallout className="rounded-md">
              {translate("complete.topFinding", {
                name: topFinding.name,
                attributes: topFinding.missingAttributes.join(" and "),
                impact: topFinding.impactDescription,
                lossPercentage: String(topFinding.lossPercentage),
              })}
            </TopFindingCallout>
          </Motion.Up>
        )}

        <motion.div className="flex gap-2" variants={Stagger.Container(0.07)}>
          <motion.div variants={Stagger.Item} className="flex-1">
            <Button
              type="button"
              onClick={onClose}
              color="primary"
              className="w-full"
            >
              {translate("action.tertiary")}
            </Button>
          </motion.div>
          <motion.div variants={Stagger.Item} className="flex-1">
            <Button
              type="button"
              onClick={onRunAgain}
              color="accent"
              className="w-full"
            >
              {translate("action.secondary")}
            </Button>
          </motion.div>
        </motion.div>
      </Motion.Stagger>
    </motion.div>
  );
};
