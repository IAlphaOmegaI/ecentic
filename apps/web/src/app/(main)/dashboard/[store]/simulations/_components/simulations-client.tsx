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
  StatusPill,
  TopFindingCallout,
} from "../../../_components/grid";

const models = [
  { id: "gpt4", label: "GPT-4", logo: "/images/chatgpt.svg" },
  { id: "claude", label: "Claude", logo: "/images/claude.svg" },
  { id: "gemini", label: "Gemini", logo: "/images/gemini.svg" },
] as const;

const modelColors: Record<string, string> = {
  "GPT-4": "text-primary",
  Claude: "text-warning",
  Gemini: "text-success",
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
    () => productCount * selectedCompetitorCount * 3,
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
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div className="grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3">
            <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
              <StatLabel
                label="Products"
                icon={<ShoppingCartIcon className="size-7.5 text-primary" />}
              />
              <div>
                <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
                  {productCount}
                </p>
                <p className="mt-3 text-foreground-dimmed text-xs">
                  in your catalog
                </p>
              </div>
            </div>

            <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
              <StatLabel
                label="Competitors Selected"
                icon={<BullseyeIcon className="size-7.5 text-error" />}
              />
              <div>
                <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
                  {selectedCompetitorCount}
                  <span className="ml-1 font-medium text-foreground-dimmed text-xl">
                    / {competitorCount}
                  </span>
                </p>
                <p className="mt-3 text-foreground-dimmed text-xs">
                  selected for simulations
                </p>
              </div>
            </div>

            <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
              <StatLabel
                label="Estimated Simulations"
                icon={<RadarIcon className="size-7.5 text-warning" />}
              />
              <div>
                <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
                  {totalSimulations}
                </p>
                <p className="mt-3 text-foreground-dimmed text-xs">
                  products × competitors × 3 models
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div className="border-accent-foreground border-b p-4">
            <SectionKicker>01 — Discovery</SectionKicker>
            <h2 className="mt-2 font-semibold text-foreground-rich text-lg">
              Competitor Discovery
            </h2>
            <p className="mt-1 text-foreground-dimmed text-sm">
              Re-run AI competitor detection using your current products.
            </p>
            <p className="mt-2 text-foreground-dimmed text-xs">
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
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div className="flex items-center justify-between border-accent-foreground border-b p-4">
            <div>
              <SectionKicker>02 — Simulation</SectionKicker>
              <h2 className="mt-2 font-semibold text-foreground-rich text-lg">
                Win-Rate Simulation
              </h2>
              <p className="mt-1 text-foreground-dimmed text-sm">
                Re-run product vs competitor simulations across GPT-4, Claude &
                Gemini.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                color="accent"
                type="button"
                onClick={reset}
                disabled={isRunning || isStartingScan}
              >
                Reset
              </Button>
              <Button
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
                  <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                    Phase
                  </p>
                  <p className="mt-1 font-medium text-foreground-rich capitalize">
                    {phase}
                  </p>
                </div>
                <div className="bg-background-rich p-3 transition-colors hover:bg-background">
                  <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                    Progress
                  </p>
                  <p className="mt-1 font-medium text-foreground-rich tabular-nums">
                    {stats.progress}%
                  </p>
                </div>
                <div className="bg-background-rich p-3 transition-colors hover:bg-background">
                  <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                    Wins / Losses
                  </p>
                  <p className="mt-1 font-medium text-foreground-rich tabular-nums">
                    {stats.wins} / {stats.losses}
                  </p>
                </div>
                <div className="bg-background-rich p-3 transition-colors hover:bg-background">
                  <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                    Elapsed
                  </p>
                  <p className="mt-1 font-medium text-foreground-rich tabular-nums">
                    {formatElapsed(elapsed)}
                  </p>
                </div>
              </div>

              <div className="h-1.5 w-full rounded-full bg-accent-foreground">
                <div
                  className="h-full rounded-full bg-primary transition-all"
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
                    <p className="font-medium text-foreground-rich text-sm">
                      {label}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="font-medium text-success text-xs">
                        {modelStats[label]?.wins ?? 0}W
                      </span>
                      <span className="text-foreground-dimmed text-xs">·</span>
                      <span className="font-medium text-error text-xs">
                        {modelStats[label]?.losses ?? 0}L
                      </span>
                    </div>
                    <StatusPill
                      tone={(() => {
                        switch (true) {
                          case statuses[label] === "complete":
                            return "success";
                          case statuses[label] === "running":
                            return "primary";
                          default:
                            return "neutral";
                        }
                      })()}
                      className="mt-2 self-start"
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
                    </StatusPill>
                  </div>
                ))}
              </div>

              <div className="max-h-72 overflow-y-auto rounded-md border border-accent-foreground bg-background-dimmed p-3">
                {logs.length === 0 ? (
                  <p className="text-foreground-dimmed text-sm">
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
                        <span className="text-foreground-dimmed leading-relaxed">
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
            icon={<AwardIcon className="size-7.5 text-success" />}
          />
          <p
            className={cn(
              "font-bold text-4xl tabular-nums tracking-[-0.02em]",
              winRateColor,
            )}
          >
            {winRate}
            <span className="ml-0.5 font-medium text-foreground-dimmed text-xl">
              %
            </span>
          </p>
        </div>
        <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
          <StatLabel
            label="Products"
            icon={<ShoppingCartIcon className="size-7.5 text-primary" />}
          />
          <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
            {count}
          </p>
        </div>
        <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
          <StatLabel
            label="Wins"
            icon={<TrendUpIcon className="size-7.5 text-success" />}
          />
          <p className="font-bold text-4xl text-success tabular-nums tracking-[-0.02em]">
            {wins}
          </p>
        </div>
        <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
          <StatLabel
            label="Losses"
            icon={<TrendDownIcon className="size-7.5 text-error" />}
          />
          <p className="font-bold text-4xl text-error tabular-nums tracking-[-0.02em]">
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
              <p className="font-medium text-foreground-rich">{label}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-medium text-sm text-success">
                  {rates?.wins ?? 0} W
                </span>
                <span className="text-foreground-dimmed/30 text-sm">—</span>
                <span className="font-medium text-error text-sm">
                  {rates?.losses ?? 0} L
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1 flex-1 rounded-full bg-accent-foreground">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${rate}%` }}
                  />
                </div>
                <span className="w-8 text-right text-foreground-dimmed text-xs tabular-nums">
                  {rate}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {topFinding && (
        <TopFindingCallout className="rounded-md">
          {topFinding.name} loses on{" "}
          <span className="font-semibold text-foreground-rich">
            {topFinding.missingAttributes.join(" and ")}
          </span>{" "}
          — {topFinding.impactDescription} Costs you {topFinding.lossPercentage}
          % of simulations.
        </TopFindingCallout>
      )}
    </div>
  );
};
