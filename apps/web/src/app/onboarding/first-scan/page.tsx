"use client";

import { ArrowRightIcon, CheckIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { cn } from "@zenncore/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { fadeInUp, spring, staggerContainer, staggerItem, scaleIn } from "@/lib/animations";

type ScanPhase = "pre" | "running" | "complete";
type ModelStatus = "queued" | "running" | "complete";
type LogEntry = { id: number; model: string; message: string };

const models = ["GPT-4", "Claude", "Gemini"] as const;

const logMessages = [
  { model: "GPT-4", message: 'Evaluating "Pro Wireless Earbuds" vs "SoundMax X3"...' },
  { model: "GPT-4", message: "Checking battery_life: Pro Earbuds = [not specified] ❌ | SoundMax = \"8 hours\" ✅" },
  { model: "GPT-4", message: "Checking warranty: Pro Earbuds = [not specified] ❌ | SoundMax = \"2 years\" ✅" },
  { model: "GPT-4", message: "DECISION: Selected SoundMax X3 (missing specs cost the win)" },
  { model: "Claude", message: 'Evaluating "Pro Wireless Earbuds" vs "SoundMax X3"...' },
  { model: "Claude", message: "Analyzing structured data completeness across candidates..." },
  { model: "Claude", message: "DECISION: Selected SoundMax X3 (spec coverage: 78% vs 43%)" },
  { model: "Gemini", message: 'Evaluating "Pro Wireless Earbuds" vs "BassKing Pro"...' },
  { model: "Gemini", message: "Evaluating price-quality ratio and specification completeness..." },
  { model: "Gemini", message: "DECISION: Selected BassKing Pro (stronger attribute coverage)" },
  { model: "GPT-4", message: 'Evaluating "Bamboo Travel Mug" vs "GreenMug Pro"...' },
  { model: "GPT-4", message: "Material specs: Bamboo Travel Mug = \"Organic bamboo, BPA-free\" ✅ | GreenMug = \"plastic\" ⚠️" },
  { model: "GPT-4", message: "DECISION: Selected Bamboo Travel Mug (superior material specs)" },
  { model: "Claude", message: 'Evaluating "Bamboo Travel Mug" vs "GreenMug Pro"...' },
  { model: "Claude", message: "DECISION: Selected Bamboo Travel Mug (eco-credentials well documented)" },
] as const;

export default () => {
  const router = useRouter();
  const [phase, setPhase] = useState<ScanPhase>("pre");
  const [progress, setProgress] = useState(0);
  const [modelStatuses, setModelStatuses] = useState<Record<string, ModelStatus>>({
    "GPT-4": "queued",
    Claude: "queued",
    Gemini: "queued",
  });
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const logIndexRef = useRef(0);

  useEffect(() => {
    if (phase !== "running") return;

    const progressInterval = setInterval(() => {
      setProgress((previous) => {
        if (previous >= 100) { clearInterval(progressInterval); return 100; }
        return previous + 2;
      });
    }, 80);

    setTimeout(() => setModelStatuses((previous) => ({ ...previous, "GPT-4": "running" })), 200);
    setTimeout(() => setModelStatuses((previous) => ({ ...previous, Claude: "running" })), 1200);
    setTimeout(() => setModelStatuses((previous) => ({ ...previous, Gemini: "running" })), 2200);
    setTimeout(() => setModelStatuses((previous) => ({ ...previous, "GPT-4": "complete" })), 2800);
    setTimeout(() => setModelStatuses((previous) => ({ ...previous, Claude: "complete" })), 3400);
    setTimeout(() => setModelStatuses((previous) => ({ ...previous, Gemini: "complete" })), 4000);

    const logInterval = setInterval(() => {
      if (logIndexRef.current >= logMessages.length) { clearInterval(logInterval); return; }
      const entry = logMessages[logIndexRef.current];
      setLogEntries((previous) => [
        ...previous,
        { id: logIndexRef.current, model: entry.model, message: entry.message },
      ]);
      logIndexRef.current += 1;
      if (entry.message.startsWith("DECISION")) {
        if (entry.message.includes("SoundMax") || entry.message.includes("BassKing")) {
          setLosses((previous) => previous + 1);
        } else {
          setWins((previous) => previous + 1);
        }
      }
    }, 300);

    setTimeout(() => {
      clearInterval(progressInterval);
      clearInterval(logInterval);
      setProgress(100);
      setPhase("complete");
    }, 5000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(logInterval);
    };
  }, [phase]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logEntries]);

  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 34;

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
      case winRate < 30: return "text-error";
      case winRate < 60: return "text-warning";
      default: return "text-success";
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
          transition={spring.gentle}
        >
          <motion.div
            className="w-full max-w-2xl"
            variants={staggerContainer(0.08)}
            initial="hidden"
            animate="visible"
          >
            <motion.div className="mb-10 text-center" variants={fadeInUp}>
              <h1 className="font-medium text-4xl text-foreground leading-tight">
                See who's winning.
              </h1>
              <p className="mt-3 font-light text-foreground-dimmed text-base max-w-md mx-auto">
                GPT-4, Claude & Gemini will simulate real shopping queries across your products and competitors.
              </p>
            </motion.div>

            <motion.div
              className="mb-8 grid grid-cols-3 gap-px bg-accent-foreground border border-accent-foreground"
              variants={staggerContainer(0.07)}
            >
              {[
                { model: "GPT-4", color: "text-blue-500", desc: "Spec-focused reasoning" },
                { model: "Claude", color: "text-orange-500", desc: "Contextual analysis" },
                { model: "Gemini", color: "text-green-500", desc: "Price-quality ratio" },
              ].map((m) => (
                <motion.div
                  key={m.model}
                  className="flex flex-col gap-1 bg-background-rich p-5"
                  variants={staggerItem}
                >
                  <span className={cn("font-semibold text-xl", m.color)}>{m.model}</span>
                  <span className="font-light text-foreground-dimmed text-xs">{m.desc}</span>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="mb-8 grid grid-cols-2 gap-px bg-accent-foreground border border-accent-foreground"
              variants={staggerContainer(0.07)}
            >
              {[
                { label: "Products", value: "10" },
                { label: "Competitors matched", value: "24" },
                { label: "Simulations to run", value: "720" },
                { label: "Estimated time", value: "~30 sec" },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  className="bg-background-rich px-5 py-4"
                  variants={staggerItem}
                >
                  <p className="font-semibold text-2xl text-foreground">{item.value}</p>
                  <p className="font-light text-foreground-dimmed text-xs">{item.label}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={fadeInUp}>
              <motion.div
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={spring.snappy}
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(21,114,250,0)",
                    "0 0 0 8px rgba(21,114,250,0.12)",
                    "0 0 0 0 rgba(21,114,250,0)",
                  ],
                }}
                // biome-ignore lint/style/noCommaOperator: pulsing glow for CTA
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2.4, delay: 1 }}
              >
                <Button
                  variant="flat"
                  color="primary"
                  type="button"
                  onClick={() => setPhase("running")}
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
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      {phase === "running" && (
        <motion.div
          key="running"
          className="flex flex-1 flex-col px-6 py-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={spring.gentle}
        >
          <div className="mx-auto w-full max-w-2xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium text-foreground text-sm">
                Simulating product {Math.min(Math.ceil(progress / 10), 10)} of 10...
              </p>
              <motion.p
                className="font-light text-foreground-dimmed text-sm"
                key={progress}
              >
                {progress}%
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
              className="mb-4 grid grid-cols-3 gap-px bg-accent-foreground border border-accent-foreground"
              variants={staggerContainer(0.06)}
              initial="hidden"
              animate="visible"
            >
              {(["GPT-4", "Claude", "Gemini"] as const).map((model) => {
                const status = modelStatuses[model];
                const modelColor = model === "GPT-4" ? "text-blue-500" : model === "Claude" ? "text-orange-500" : "text-green-500";
                return (
                  <motion.div
                    key={model}
                    className="flex items-center justify-between bg-background-rich px-4 py-3"
                    variants={staggerItem}
                  >
                    <span className={cn("font-semibold text-sm", modelColor)}>{model}</span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={status}
                        className={cn("text-xs font-medium",
                          status === "complete" && "text-success",
                          status === "running" && "text-primary",
                          status === "queued" && "text-foreground-dimmed",
                        )}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={spring.snappy}
                      >
                        {status === "complete" && "✓ Done"}
                        {status === "running" && "● Running"}
                        {status === "queued" && "Queued"}
                      </motion.span>
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>

            <div className="mb-4 grid grid-cols-3 gap-px bg-accent-foreground border border-accent-foreground">
              {[
                { label: "Wins", value: wins, color: "text-success" },
                { label: "Losses", value: losses, color: "text-error" },
                { label: "Win Rate", value: `${wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0}%`, color: "text-primary" },
              ].map((stat) => (
                <div key={stat.label} className="bg-background-rich px-4 py-4 text-center">
                  <motion.p
                    className={cn("font-semibold text-3xl", stat.color)}
                    key={String(stat.value)}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={spring.bounce}
                  >
                    {stat.value}
                  </motion.p>
                  <p className="font-light text-foreground-dimmed text-xs mt-0.5">{stat.label}</p>
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
                    transition={spring.snappy}
                  >
                    <span className={cn("font-medium",
                      entry.model === "GPT-4" && "text-blue-400",
                      entry.model === "Claude" && "text-orange-400",
                      entry.model === "Gemini" && "text-green-400",
                    )}>
                      [{entry.model}]{" "}
                    </span>
                    <span className={cn("text-white/80", entry.message.startsWith("DECISION") && "text-white font-medium")}>
                      {entry.message}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {logEntries.length === 0 && (
                <p className="text-white/40">Initializing simulation engine...</p>
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
          transition={spring.gentle}
        >
          <motion.div
            className="mx-auto w-full max-w-2xl"
            variants={staggerContainer(0.08)}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              className="mb-8 grid grid-cols-[1fr_auto] gap-px bg-accent-foreground border border-accent-foreground"
              variants={fadeInUp}
            >
              <div className="bg-background-rich px-6 py-8">
                <p className="font-light text-foreground-dimmed text-xs uppercase tracking-widest mb-2">
                  Overall Win Rate
                </p>
                <motion.p
                  className={cn("font-semibold leading-none", resultColor, "text-[80px]")}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...spring.gentle, delay: 0.15 }}
                >
                  {winRate}%
                </motion.p>
                <p className="mt-4 font-light text-foreground text-sm max-w-xs">
                  {resultMessage}
                </p>
              </div>
              <div className="flex flex-col divide-y divide-accent-foreground bg-background-rich">
                {[
                  { label: "Wins", value: wins, color: "text-success" },
                  { label: "Losses", value: losses, color: "text-error" },
                  { label: "Products", value: 10, color: "text-foreground" },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    className="flex flex-1 flex-col items-center justify-center px-8 py-4"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...spring.snappy, delay: 0.2 + i * 0.07 }}
                  >
                    <span className={cn("font-semibold text-3xl", stat.color)}>{stat.value}</span>
                    <span className="font-light text-foreground-dimmed text-xs mt-0.5">{stat.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="mb-4 border border-accent-foreground bg-background-rich"
              variants={fadeInUp}
            >
              <div className="border-b border-accent-foreground px-4 py-3">
                <p className="font-medium text-foreground text-sm">Win rate by model</p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-accent-foreground">
                {[
                  { model: "GPT-4", rate: 41, color: "bg-blue-500" },
                  { model: "Claude", rate: 28, color: "bg-orange-500" },
                  { model: "Gemini", rate: 32, color: "bg-green-500" },
                ].map(({ model, rate, color }, i) => (
                  <div key={model} className="flex flex-col gap-3 px-4 py-4">
                    <div className="flex items-end justify-between">
                      <span className="font-light text-foreground-dimmed text-xs">{model}</span>
                      <span className="font-semibold text-foreground text-lg">{rate}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-accent-foreground">
                      <motion.div
                        className={cn("h-full", color)}
                        initial={{ width: 0 }}
                        animate={{ width: `${rate}%` }}
                        transition={{ ...spring.gentle, delay: 0.35 + i * 0.1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="mb-8 border border-primary/20 bg-primary/5 px-5 py-4"
              variants={fadeInUp}
            >
              <p className="font-medium text-primary text-xs uppercase tracking-widest mb-1.5">Top Finding</p>
              <p className="font-light text-foreground text-sm">
                Pro Wireless Earbuds loses on{" "}
                <span className="font-medium text-foreground">battery_life and warranty</span>{" "}
                across all 3 models — costs you 62% of simulations.
              </p>
            </motion.div>

            <motion.div className="flex flex-col gap-2" variants={staggerContainer(0.07)}>
              <motion.div variants={staggerItem} whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} transition={spring.snappy}>
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
                variants={staggerItem}
                type="button"
                className="w-full border border-accent-foreground bg-background-rich py-2.5 font-light text-foreground text-sm transition-colors hover:bg-background-dimmed"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={spring.snappy}
              >
                Share Results
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
