"use client";

import {
  AwardIcon,
  BullseyeIcon,
  RadarIcon,
  ShoppingCartIcon,
  TrendDownIcon,
  TrendUpIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import Image from "next/image";
import { useMemo, useState } from "react";
import { AutoDetectTab } from "@/app/(auth)/onboarding/competitors/_components/auto-detect-tab";
import { useScanRunner } from "@/app/(auth)/onboarding/scan/_components/use-scan-runner";
import type * as Competitor from "@/server/app/competitor";
import type * as Simulate from "@/server/app/intelligence/simulate";
import {
  Crosshair,
  SectionGutter,
  SectionKicker,
  StatLabel,
} from "../../_components/grid";

const models = [
  { id: "gpt4", label: "GPT-4", logo: "/images/chatgpt.svg" },
  { id: "claude", label: "Claude", logo: "/images/claude.svg" },
  { id: "gemini", label: "Gemini", logo: "/images/gemini.svg" },
  { id: "perplexity", label: "Perplexity", logo: "/images/perplexity.svg" },
] as const;

const modelColors: Record<string, string> = {
  "GPT-4": "text-blue-500",
  Claude: "text-orange-500",
  Gemini: "text-green-500",
  Perplexity: "text-teal-500",
  System: "text-foreground-dimmed",
};

const formatElapsed = (ms: number) => {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
};

type LastScan = {
  id: string;
  wins: number;
  losses: number;
  topFinding: Simulate.TopFinding | null;
  modelRates: Record<string, { wins: number; losses: number; rate: number }>;
};

export namespace SimulationsClient {
  export type Props = {
    productIds: string[];
    productCount: number;
    competitorCount: number;
    selectedCompetitorCount: number;
    lastScan: LastScan | null;
  };
}

export const SimulationsClient = ({
  productIds,
  productCount,
  competitorCount: initialCompetitorCount,
  selectedCompetitorCount: initialSelectedCompetitorCount,
  lastScan,
}: SimulationsClient.Props) => {
  const toast = useToastManager();
  const [competitorCount, setCompetitorCount] = useState(
    initialCompetitorCount,
  );
  const [selectedCompetitorCount, setSelectedCompetitorCount] = useState(
    initialSelectedCompetitorCount,
  );

  const {
    phase,
    stats,
    logs,
    statuses,
    modelStats,
    winRates,
    topFinding,
    count,
    elapsed,
    handleRun,
    isRunning,
    reset,
  } = useScanRunner({
    onError: (text) =>
      toast.add({
        title: "Simulation failed",
        description: text,
        type: "error",
      }),
  });

  const totalSimulations = useMemo(
    () => productCount * selectedCompetitorCount * 4,
    [productCount, selectedCompetitorCount],
  );

  const canRunWinRateScan = productCount > 0 && selectedCompetitorCount > 0;

  const [runScan, isStartingScan] = useAsyncAction(async () => {
    if (!canRunWinRateScan) {
      toast.add({
        title: "Missing data",
        description:
          productCount === 0
            ? "Add products before running simulations."
            : "Select at least one competitor before running simulations.",
        type: "error",
      });
      return;
    }
    await handleRun();
  }, false);

  const handleDetectionSuccess = (competitors: Competitor.Type[]) => {
    setCompetitorCount((previous) => previous + competitors.length);
    setSelectedCompetitorCount((previous) => previous + competitors.length);
  };

  const completedData = (() => {
    if (phase === "complete") {
      return {
        wins: stats.wins,
        losses: stats.losses,
        modelRates: winRates,
        topFinding,
        count,
      };
    }
    if (phase === "pre" && lastScan) {
      return {
        wins: lastScan.wins,
        losses: lastScan.losses,
        modelRates: lastScan.modelRates,
        topFinding: lastScan.topFinding,
        count: productCount,
      };
    }
    return null;
  })();

  return (
    <>
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <div className="grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3">
            <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
              <StatLabel
                label="Products"
                icon={
                  <ShoppingCartIcon className="size-8 shrink-0 text-primary" />
                }
              />
              <div>
                <p className="font-medium text-5xl text-foreground tabular-nums tracking-tight">
                  {productCount}
                </p>
                <p className="mt-3 font-light text-foreground-dimmed text-sm">
                  in your catalog
                </p>
              </div>
            </div>

            <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
              <StatLabel
                label="Competitors Selected"
                icon={<BullseyeIcon className="size-8 shrink-0 text-warning" />}
              />
              <div>
                <p className="font-medium text-5xl text-foreground tabular-nums tracking-tight">
                  {selectedCompetitorCount}
                  <span className="ml-1 font-light text-2xl text-foreground-dimmed">
                    / {competitorCount}
                  </span>
                </p>
                <p className="mt-3 font-light text-foreground-dimmed text-sm">
                  selected for simulations
                </p>
              </div>
            </div>

            <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
              <StatLabel
                label="Estimated Simulations"
                icon={<RadarIcon className="size-8 shrink-0 text-success" />}
              />
              <div>
                <p className="font-medium text-5xl text-foreground tabular-nums tracking-tight">
                  {totalSimulations}
                </p>
                <p className="mt-3 font-light text-foreground-dimmed text-sm">
                  products × competitors × 4 models
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8 bg-background-rich">
          <div className="border-accent-foreground border-b p-4">
            <SectionKicker>01 — Discovery</SectionKicker>
            <h2 className="mt-2 font-medium text-2xl text-foreground">
              Competitor Discovery
            </h2>
            <p className="font-light text-foreground-dimmed">
              Re-run AI competitor detection using your current products.
            </p>
            <p className="mt-2 font-light text-foreground-dimmed text-sm">
              Current total competitors: {competitorCount}
            </p>
          </div>
          <AutoDetectTab
            products={productIds}
            onSuccess={handleDetectionSuccess}
            className="h-[520px] border-0"
          />
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8 bg-background-rich">
          <div className="flex items-center justify-between border-accent-foreground border-b p-4">
            <div>
              <SectionKicker>02 — Simulation</SectionKicker>
              <h2 className="mt-2 font-medium text-2xl text-foreground">
                Win-Rate Simulation
              </h2>
              <p className="font-light text-foreground-dimmed">
                Re-run product vs competitor simulations across GPT-4, Claude,
                Gemini & Perplexity.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                color="accent"
                type="button"
                onClick={reset}
                disabled={isRunning || isStartingScan}
              >
                Reset
              </Button>
              <Button
                variant="flat"
                color="primary"
                type="button"
                onClick={runScan}
                disabled={!canRunWinRateScan || isRunning || isStartingScan}
              >
                Run Simulation
              </Button>
            </div>
          </div>

          {completedData ? (
            <SimulationComplete data={completedData} />
          ) : (
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-4">
                <div className="bg-background-rich p-3 transition-colors hover:bg-background">
                  <p className="text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
                    Phase
                  </p>
                  <p className="mt-1 text-foreground capitalize">{phase}</p>
                </div>
                <div className="bg-background-rich p-3 transition-colors hover:bg-background">
                  <p className="text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
                    Progress
                  </p>
                  <p className="mt-1 text-foreground">{stats.progress}%</p>
                </div>
                <div className="bg-background-rich p-3 transition-colors hover:bg-background">
                  <p className="text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
                    Wins / Losses
                  </p>
                  <p className="mt-1 text-foreground">
                    {stats.wins} / {stats.losses}
                  </p>
                </div>
                <div className="bg-background-rich p-3 transition-colors hover:bg-background">
                  <p className="text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
                    Elapsed
                  </p>
                  <p className="mt-1 text-foreground">
                    {formatElapsed(elapsed)}
                  </p>
                </div>
              </div>

              <div className="h-1 w-full bg-accent-foreground">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${stats.progress}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-px bg-accent-foreground sm:grid-cols-4">
                {models.map(({ id, label, logo }) => (
                  <div
                    key={id}
                    className="flex flex-col bg-background-rich p-3 transition-colors hover:bg-background"
                  >
                    <Image
                      src={logo}
                      alt={label}
                      width={32}
                      height={32}
                      className="mb-2 size-8"
                    />
                    <p className="font-medium text-foreground text-sm">
                      {label}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="font-light text-success text-xs">
                        {modelStats[label]?.wins ?? 0}W
                      </span>
                      <span className="text-foreground-dimmed/30 text-xs">
                        ·
                      </span>
                      <span className="font-light text-error text-xs">
                        {modelStats[label]?.losses ?? 0}L
                      </span>
                    </div>
                    <span
                      className={cn(
                        "font-light text-sm",
                        statuses[label] === "complete" && "text-success",
                        statuses[label] === "running" && "text-primary",
                        (!statuses[label] || statuses[label] === "queued") &&
                          "text-foreground-dimmed/50",
                      )}
                    >
                      {(() => {
                        switch (true) {
                          case statuses[label] === "complete":
                            return "Done";
                          case statuses[label] === "running":
                            return "Running";
                          default:
                            return "Queued";
                        }
                      })()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="max-h-72 overflow-y-auto border border-accent-foreground bg-background-dimmed p-3">
                {logs.length === 0 ? (
                  <p className="font-light text-foreground-dimmed text-sm">
                    No logs yet. Start a simulation to see live output.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {logs.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-baseline gap-2 text-sm"
                      >
                        <span
                          className={cn(
                            "shrink-0 font-medium",
                            modelColors[entry.model] ??
                              "text-foreground-dimmed",
                          )}
                        >
                          [{entry.model}]
                        </span>
                        <span className="font-light text-foreground-dimmed leading-relaxed">
                          {entry.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

type SimulationCompleteData = {
  wins: number;
  losses: number;
  modelRates: Record<string, { wins: number; losses: number; rate: number }>;
  topFinding: Simulate.TopFinding | null;
  count: number;
};

const SimulationComplete = ({ data }: { data: SimulationCompleteData }) => {
  const { wins, losses, modelRates, topFinding, count } = data;
  const winRate =
    wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  const winRateColor = (() => {
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
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
          <StatLabel
            label="Win Rate"
            icon={<AwardIcon className={cn("size-8 shrink-0", winRateColor)} />}
          />
          <p
            className={cn(
              "font-medium text-5xl tabular-nums tracking-tight",
              winRateColor,
            )}
          >
            {winRate}
            <span className="ml-0.5 font-light text-2xl text-foreground-dimmed">
              %
            </span>
          </p>
        </div>
        <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
          <StatLabel
            label="Products"
            icon={<ShoppingCartIcon className="size-8 shrink-0 text-primary" />}
          />
          <p className="font-medium text-5xl text-foreground tabular-nums tracking-tight">
            {count}
          </p>
        </div>
        <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
          <StatLabel
            label="Wins"
            icon={<TrendUpIcon className="size-8 shrink-0 text-success" />}
          />
          <p className="font-medium text-5xl text-success tabular-nums tracking-tight">
            {wins}
          </p>
        </div>
        <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
          <StatLabel
            label="Losses"
            icon={<TrendDownIcon className="size-8 shrink-0 text-error" />}
          />
          <p className="font-medium text-5xl text-error tabular-nums tracking-tight">
            {losses}
          </p>
        </div>
      </div>

      <div className="h-1 w-full bg-accent-foreground" />

      <div className="grid grid-cols-2 gap-px bg-accent-foreground sm:grid-cols-4">
        {models.map(({ id, label, logo }) => {
          const rates = modelRates[id];
          const rate = rates?.rate ?? 0;
          return (
            <div
              key={id}
              className="flex flex-col bg-background-rich p-4 transition-colors hover:bg-background"
            >
              <Image
                src={logo}
                alt={label}
                width={32}
                height={32}
                className="mb-3 size-8"
              />
              <p className="font-medium text-foreground">{label}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-light text-sm text-success">
                  {rates?.wins ?? 0} W
                </span>
                <span className="text-foreground-dimmed/30 text-sm">—</span>
                <span className="font-light text-error text-sm">
                  {rates?.losses ?? 0} L
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-0.5 flex-1 bg-accent-foreground">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${rate}%` }}
                  />
                </div>
                <span className="w-8 text-right font-light text-foreground-dimmed text-xs">
                  {rate}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {topFinding && (
        <div className="border border-accent-foreground bg-background-rich p-4">
          <SectionKicker>Top Finding</SectionKicker>
          <p className="mt-2 font-light text-foreground">
            {topFinding.name} loses on{" "}
            <span className="font-medium text-foreground">
              {topFinding.missingAttributes.join(" and ")}
            </span>{" "}
            — {topFinding.impactDescription} Costs you{" "}
            {topFinding.lossPercentage}% of simulations.
          </p>
        </div>
      )}
    </div>
  );
};
