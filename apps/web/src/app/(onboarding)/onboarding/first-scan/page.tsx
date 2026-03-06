"use client";

import { ArrowRightIcon, CheckIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { cn } from "@zenncore/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ScanPhase = "pre" | "running" | "complete";

type ModelStatus = "queued" | "running" | "complete";

type LogEntry = {
  id: number;
  model: string;
  message: string;
};

const models = ["GPT-4", "Claude", "Gemini"] as const;

const logMessages = [
  { model: "GPT-4", message: 'Evaluating "Pro Wireless Earbuds" vs "SoundMax X3"...' },
  { model: "GPT-4", message: "Checking battery_life: Pro Earbuds = [not specified] \u274C | SoundMax = \"8 hours\" \u2705" },
  { model: "GPT-4", message: "Checking warranty: Pro Earbuds = [not specified] \u274C | SoundMax = \"2 years\" \u2705" },
  { model: "GPT-4", message: "DECISION: Selected SoundMax X3 (missing specs cost the win)" },
  { model: "Claude", message: 'Evaluating "Pro Wireless Earbuds" vs "SoundMax X3"...' },
  { model: "Claude", message: "Analyzing structured data completeness across candidates..." },
  { model: "Claude", message: "DECISION: Selected SoundMax X3 (spec coverage: 78% vs 43%)" },
  { model: "Gemini", message: 'Evaluating "Pro Wireless Earbuds" vs "BassKing Pro"...' },
  { model: "Gemini", message: "Evaluating price-quality ratio and specification completeness..." },
  { model: "Gemini", message: "DECISION: Selected BassKing Pro (stronger attribute coverage)" },
  { model: "GPT-4", message: 'Evaluating "Bamboo Travel Mug" vs "GreenMug Pro"...' },
  { model: "GPT-4", message: "Material specs: Bamboo Travel Mug = \"Organic bamboo, BPA-free\" \u2705 | GreenMug = \"plastic\" \u26A0\uFE0F" },
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
        if (previous >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
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
      if (logIndexRef.current >= logMessages.length) {
        clearInterval(logInterval);
        return;
      }
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
    if (logRef.current)
      logRef.current.scrollTop = logRef.current.scrollHeight;
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
      case winRate < 30:
        return "text-error";
      case winRate < 60:
        return "text-warning";
      default:
        return "text-success";
    }
  })();

  if (phase === "pre")
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="mb-6 text-center">
            <h1 className="font-medium text-2xl text-foreground">
              Ready to see how AI agents judge your products?
            </h1>
            <p className="mt-2 font-light text-foreground-dimmed text-sm">
              We'll run your products through three leading AI models and show you
              exactly why you win or lose.
            </p>
          </div>

          <div className="mb-6 border border-accent-foreground bg-background-rich p-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Products selected", value: "10" },
                { label: "Competitors matched", value: "24" },
                { label: "Models to test", value: "GPT-4, Claude, Gemini" },
                { label: "Estimated time", value: "~30 seconds" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="font-light text-foreground-dimmed text-xs">
                    {item.label}
                  </p>
                  <p className="font-medium text-foreground text-sm">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="flat"
            color="primary"
            type="button"
            onClick={() => setPhase("running")}
            className="w-full py-3 font-medium text-base"
          >
            Run Simulation
          </Button>

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
      </div>
    );

  if (phase === "running")
    return (
      <div className="flex flex-1 flex-col px-6 py-10">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium text-foreground text-sm">
                Simulating product {Math.min(Math.ceil(progress / 10), 10)} of 10...
              </p>
              <p className="font-light text-foreground-dimmed text-sm">
                {progress}%
              </p>
            </div>
            <div className="h-1.5 w-full bg-accent-foreground">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            {models.map((model) => {
              const status = modelStatuses[model];
              return (
                <div
                  key={model}
                  className="flex items-center justify-between border border-accent-foreground bg-background-rich px-3 py-2"
                >
                  <span className="font-medium text-foreground text-xs">
                    {model}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      status === "complete" && "text-success",
                      status === "running" && "text-primary",
                      status === "queued" && "text-foreground-dimmed",
                    )}
                  >
                    {status === "complete" && "✓ Done"}
                    {status === "running" && "Running"}
                    {status === "queued" && "Queued"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
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
                className="border border-accent-foreground bg-background-rich p-3 text-center"
              >
                <p className={cn("font-medium text-xl", stat.color)}>
                  {stat.value}
                </p>
                <p className="font-light text-foreground-dimmed text-xs">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div
            ref={logRef}
            className="h-64 overflow-y-auto border border-accent-foreground bg-foreground p-4 font-mono text-xs"
          >
            {logEntries.map((entry) => (
              <div key={entry.id} className="mb-1">
                <span
                  className={cn(
                    "font-medium",
                    entry.model === "GPT-4" && "text-blue-400",
                    entry.model === "Claude" && "text-orange-400",
                    entry.model === "Gemini" && "text-green-400",
                  )}
                >
                  [{entry.model}]{" "}
                </span>
                <span
                  className={cn(
                    "text-white/80",
                    entry.message.startsWith("DECISION") && "text-white font-medium",
                  )}
                >
                  {entry.message}
                </span>
              </div>
            ))}
            {logEntries.length === 0 && (
              <p className="text-white/40">Initializing simulation engine...</p>
            )}
          </div>
        </div>
      </div>
    );

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <p className="mb-2 font-light text-foreground-dimmed text-sm uppercase tracking-wider">
            Your Overall Win Rate
          </p>
          <p className={cn("font-semibold text-8xl", resultColor)}>
            {winRate}%
          </p>
          <p className="mt-4 font-light text-foreground text-base">
            {resultMessage}
          </p>
        </div>

        <div className="mb-6 border border-accent-foreground bg-background-rich p-4">
          <p className="mb-3 font-medium text-foreground text-sm">
            Win rate by model
          </p>
          {[
            { model: "GPT-4", rate: 41 },
            { model: "Claude", rate: 28 },
            { model: "Gemini", rate: 32 },
          ].map(({ model, rate }) => (
            <div key={model} className="mb-2 flex items-center gap-3">
              <span className="w-14 font-light text-foreground-dimmed text-xs">
                {model}
              </span>
              <div className="flex-1 bg-accent-foreground">
                <div
                  className={cn(
                    "h-2 transition-all",
                    rate >= 60 ? "bg-success" : rate >= 30 ? "bg-warning" : "bg-error",
                  )}
                  style={{ width: `${rate}%` }}
                />
              </div>
              <span className="w-8 text-right font-medium text-foreground text-xs">
                {rate}%
              </span>
            </div>
          ))}
        </div>

        <div className="mb-6 border border-primary/20 bg-primary/5 p-4">
          <p className="font-medium text-foreground text-sm">Top finding</p>
          <p className="mt-1 font-light text-foreground-dimmed text-sm">
            Pro Wireless Earbuds loses on{" "}
            <span className="font-medium text-foreground">
              battery_life and warranty
            </span>{" "}
            across all models — costs you 62% of simulations.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="flat"
            color="primary"
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex w-full items-center justify-center gap-2 py-3 font-medium text-base"
          >
            Go to Dashboard
            <ArrowRightIcon className="size-4" />
          </Button>
          <button
            type="button"
            className="w-full border border-accent-foreground bg-background-rich py-2.5 font-light text-foreground text-sm transition-colors hover:bg-background-dimmed"
          >
            Share Results
          </button>
        </div>
      </div>
    </div>
  );
};
