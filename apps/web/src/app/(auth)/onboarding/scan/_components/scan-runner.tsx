"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Motion } from "@/components/motion";
import { Spring, Stagger } from "@/lib/animations";
import { runScan } from "@/server/app/intelligence/simulate";

type ScanPhase = "pre" | "running" | "complete";
type ModelStatus = "queued" | "running" | "complete";
type LogEntry = { id: number; model: string; message: string };

const modelMeta = [
  {
    id: "gpt4",
    label: "GPT-4",
    color: "text-blue-500",
    bgColor: "bg-blue-500",
  },
  {
    id: "claude",
    label: "Claude",
    color: "text-orange-500",
    bgColor: "bg-orange-500",
  },
  {
    id: "gemini",
    label: "Gemini",
    color: "text-green-500",
    bgColor: "bg-green-500",
  },
] as const;

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

export namespace ScanRunner {
  export type Props = {
    children: ReactNode;
    totalSimulations: number;
  };
}

export const ScanRunner = ({
  children,
  totalSimulations,
}: ScanRunner.Props) => {
  const router = useRouter();
  const toast = useToastManager();
  const [phase, setPhase] = useState<ScanPhase>("pre");
  const [progress, setProgress] = useState(0);
  const [modelStatuses, setModelStatuses] = useState<
    Record<string, ModelStatus>
  >({
    "GPT-4": "queued",
    Claude: "queued",
    Gemini: "queued",
  });
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [modelWinRates, setModelWinRates] = useState<
    Record<string, { wins: number; losses: number; rate: number }>
  >({});
  const [topFinding, setTopFinding] = useState<{
    productName: string;
    missingAttributes: string[];
    impactDescription: string;
    lossPercentage: number;
  } | null>(null);
  const [finalProductCount, setFinalProductCount] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);

  const appendLog = (model: string, message: string) => {
    logIdRef.current += 1;
    setLogEntries((previous) => [
      ...previous,
      { id: logIdRef.current, model, message },
    ]);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: logEntries triggers scroll-to-bottom on new entries
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logEntries]);

  const [handleRun, isRunning] = useAsyncAction(async () => {
    setPhase("running");
    setLogEntries([]);
    setWins(0);
    setLosses(0);
    setProgress(0);

    appendLog("System", "Initializing simulation engine...");

    setTimeout(
      () =>
        setModelStatuses((previous) => ({ ...previous, "GPT-4": "running" })),
      300,
    );
    setTimeout(
      () =>
        setModelStatuses((previous) => ({ ...previous, Claude: "running" })),
      800,
    );
    setTimeout(
      () =>
        setModelStatuses((previous) => ({ ...previous, Gemini: "running" })),
      1300,
    );

    const progressInterval = setInterval(() => {
      setProgress((previous) => {
        if (previous >= 90) return previous;
        return previous + Math.random() * 3 + 1;
      });
    }, 400);

    const logInterval = setInterval(() => {
      const models = ["GPT-4", "Claude", "Gemini"];
      const actions = [
        "Evaluating product specifications...",
        "Comparing value propositions...",
        "Analyzing price-quality ratio...",
        "Checking attribute completeness...",
        "Scoring product presentation...",
        "Weighing competitive advantages...",
        "Assessing brand trust signals...",
        "Measuring specification coverage...",
      ];
      const model = models[Math.floor(Math.random() * models.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      appendLog(model, action);
    }, 600);

    const result = await runScan();

    clearInterval(progressInterval);
    clearInterval(logInterval);

    if (!result.success) {
      setPhase("pre");
      setModelStatuses({
        "GPT-4": "queued",
        Claude: "queued",
        Gemini: "queued",
      });
      toast.add({
        title: "Scan failed",
        description: result.error.message,
        type: "error",
      });
      return;
    }

    const data = result.data;

    for (const record of data.results) {
      const label =
        modelMeta.find((m) => m.id === record.model)?.label ?? record.model;
      const winnerName =
        record.winner === "product"
          ? record.productTitle
          : record.competitorTitle;
      appendLog(
        label,
        `DECISION: Selected ${winnerName} (${record.reasoning.slice(0, 80)})`,
      );
    }

    setProgress(100);
    setWins(data.wins);
    setLosses(data.losses);
    setModelWinRates(data.modelWinRates);
    setTopFinding(data.topFinding);
    setFinalProductCount(
      new Set(data.results.map((record) => record.productId)).size,
    );
    setModelStatuses({
      "GPT-4": "complete",
      Claude: "complete",
      Gemini: "complete",
    });

    setTimeout(() => setPhase("complete"), 800);
  });

  const winRate =
    wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  const resultMessage = (() => {
    switch (true) {
      case winRate < 30:
        return "AI agents are choosing your competitors most of the time. Let's fix that.";
      case winRate < 60:
        return "You're competitive, but there's significant room to win more. Let's see where.";
      default:
        return "You're ahead of most competitors. Let's make sure you stay there.";
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
    <AnimatePresence mode="wait">
      {phase === "pre" && (
        <motion.div
          key="pre"
          className="flex flex-1 flex-col items-center justify-center px-6 py-12"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={Spring.Gentle}
        >
          {children}
          <div className="w-full max-w-2xl">
            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(21,114,250,0)",
                  "0 0 0 8px rgba(21,114,250,0.12)",
                  "0 0 0 0 rgba(21,114,250,0)",
                ],
              }}
              transition={{
                repeat: Number.POSITIVE_INFINITY,
                duration: 2.4,
                delay: 1,
              }}
            >
              <Button
                variant="flat"
                color="primary"
                type="button"
                onClick={handleRun}
                disabled={isRunning}
                className="w-full py-3.5 font-medium text-base"
              >
                Run Simulation
              </Button>
            </motion.div>

            <div className="mt-4 flex items-center justify-center">
              <Button
                variant="ghost"
                color="neutral"
                type="button"
                className="text-foreground-dimmed text-sm"
                render={<Link href="/onboarding/competitors" />}
              >
                Back
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {phase === "running" && (
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
                Running {totalSimulations} simulations across 3 models...
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
                const status = modelStatuses[model];
                const modelColor =
                  model === "GPT-4"
                    ? "text-blue-500"
                    : model === "Claude"
                      ? "text-orange-500"
                      : "text-green-500";
                return (
                  <motion.div
                    key={model}
                    className="flex items-center justify-between bg-background-rich px-4 py-3"
                    variants={Stagger.Item}
                  >
                    <span className={cn("font-semibold text-sm", modelColor)}>
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
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-background-rich px-4 py-4 text-center"
                >
                  <motion.p
                    className={cn("font-semibold text-3xl", stat.color)}
                    key={String(stat.value)}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={Spring.Bounce}
                  >
                    {stat.value}
                  </motion.p>
                  <p className="mt-0.5 font-light text-foreground-dimmed text-xs">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div
              ref={logRef}
              className="h-64 overflow-y-auto border border-accent-foreground bg-foreground p-4 font-mono text-xs"
            >
              <AnimatePresence>
                {logEntries.map((entry) => (
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
              {logEntries.length === 0 && (
                <p className="text-white/40">
                  Initializing simulation engine...
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {phase === "complete" && (
        <motion.div
          key="complete"
          className="flex flex-1 flex-col px-6 py-12"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={Spring.Gentle}
        >
          <Motion.Stagger stagger={0.08} className="mx-auto w-full max-w-2xl">
            <Motion.Up className="mb-8 grid grid-cols-[1fr_auto] gap-px border border-accent-foreground bg-accent-foreground">
              <div className="bg-background-rich px-6 py-8">
                <p className="mb-2 font-light text-foreground-dimmed text-xs uppercase tracking-widest">
                  Overall Win Rate
                </p>
                <motion.p
                  className={cn(
                    "font-semibold leading-none",
                    resultColor,
                    "text-[80px]",
                  )}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...Spring.Gentle, delay: 0.15 }}
                >
                  {winRate}%
                </motion.p>
                <p className="mt-4 max-w-xs font-light text-foreground text-sm">
                  {resultMessage}
                </p>
              </div>
              <div className="flex flex-col divide-y divide-accent-foreground bg-background-rich">
                {[
                  { label: "Wins", value: wins, color: "text-success" },
                  { label: "Losses", value: losses, color: "text-error" },
                  {
                    label: "Products",
                    value: finalProductCount,
                    color: "text-foreground",
                  },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    className="flex flex-1 flex-col items-center justify-center px-8 py-4"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...Spring.Snappy, delay: 0.2 + i * 0.07 }}
                  >
                    <span className={cn("font-semibold text-3xl", stat.color)}>
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
                  Win rate by model
                </p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-accent-foreground">
                {modelMeta.map((meta, i) => {
                  const rates = modelWinRates[meta.id];
                  const rate = rates?.rate ?? 0;
                  return (
                    <div
                      key={meta.id}
                      className="flex flex-col gap-3 px-4 py-4"
                    >
                      <div className="flex items-end justify-between">
                        <span className="font-light text-foreground-dimmed text-xs">
                          {meta.label}
                        </span>
                        <span className="font-semibold text-foreground text-lg">
                          {rate}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-accent-foreground">
                        <motion.div
                          className={cn("h-full", meta.bgColor)}
                          initial={{ width: 0 }}
                          animate={{ width: `${rate}%` }}
                          transition={{
                            ...Spring.Gentle,
                            delay: 0.35 + i * 0.1,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Motion.Up>

            {topFinding && (
              <Motion.Up className="mb-8 border border-primary/20 bg-primary/5 px-5 py-4">
                <p className="mb-1.5 font-medium text-primary text-xs uppercase tracking-widest">
                  Top Finding
                </p>
                <p className="font-light text-foreground text-sm">
                  {topFinding.productName} loses on{" "}
                  <span className="font-medium text-foreground">
                    {topFinding.missingAttributes.join(" and ")}
                  </span>{" "}
                  — {topFinding.impactDescription} Costs you{" "}
                  {topFinding.lossPercentage}% of simulations.
                </p>
              </Motion.Up>
            )}

            <motion.div
              className="flex flex-col gap-2"
              variants={Stagger.Container(0.07)}
            >
              <motion.div
                variants={Stagger.Item}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={Spring.Snappy}
              >
                <Button
                  variant="flat"
                  color="primary"
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="flex w-full items-center justify-center gap-2 py-3.5 font-medium text-base"
                >
                  Go to Dashboard
                  <ArrowRightIcon className="size-4" />
                </Button>
              </motion.div>
              <motion.button
                variants={Stagger.Item}
                type="button"
                className="w-full border border-accent-foreground bg-background-rich py-2.5 font-light text-foreground text-sm transition-colors hover:bg-background-dimmed"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={Spring.Snappy}
              >
                Share Results
              </motion.button>
            </motion.div>
          </Motion.Stagger>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
