"use client";

import {
  AwardIcon,
  BullseyeIcon,
  ClockIcon,
  GaugeIcon,
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
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
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

/**
 * The canonical grid cell used by the Discovery band: StatLabel (icon pinned
 * top-right) over a big tabular value + caption. Sharp, no per-cell border —
 * the surrounding `gap-px` over `bg-accent-foreground` is the seam. design.md §3.1
 */
const StatCell = ({
  label,
  icon,
  value,
  caption,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  caption: string;
}) => (
  <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
    <StatLabel label={label} icon={icon} />
    <div>
      <p className="font-bold text-4xl text-foreground-rich capitalize tabular-nums tracking-[-0.02em]">
        {value}
      </p>
      <p className="mt-3 text-foreground-dimmed text-xs">{caption}</p>
    </div>
  </div>
);

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

  // The live log had no auto-scroll, so new lines appeared off-screen while a
  // simulation streamed. Pin it to the bottom as entries arrive.
  const logRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: new log entries drive the scroll
  useEffect(() => {
    const container = logRef.current;
    if (!container) return;

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [logs]);

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
            <>
              {/* Contiguous grid bands, edge to edge. No `p-4`/`space-y-4`
                  islands — cells are separated by the gap-px seam. */}
              <div className="grid grid-cols-2 gap-px bg-accent-foreground sm:grid-cols-4">
                <StatCell
                  label="Phase"
                  icon={<RadarIcon className="size-7.5 text-primary" />}
                  value={phase}
                  caption="current stage"
                />
                <StatCell
                  label="Progress"
                  icon={<GaugeIcon className="size-7.5 text-warning" />}
                  value={`${stats.progress}%`}
                  caption="of simulations run"
                />
                <StatCell
                  label="Wins / Losses"
                  icon={<AwardIcon className="size-7.5 text-success" />}
                  value={`${stats.wins} / ${stats.losses}`}
                  caption="across all models"
                />
                <StatCell
                  label="Elapsed"
                  icon={
                    <ClockIcon className="size-7.5 text-foreground-dimmed" />
                  }
                  value={formatElapsed(elapsed)}
                  caption="since start"
                />
              </div>

              {/* The seam *is* the progress bar: a 4px accent-foreground rule
                  that fills with primary. Not a floating rounded pill. */}
              <div className="h-1 w-full bg-accent-foreground">
                <div
                  className="h-full bg-primary transition-[width] duration-300"
                  style={{ width: `${stats.progress}%` }}
                />
              </div>

              {/* 3 models — a 4-col grid left a phantom cell showing the
                  bg-accent-foreground grid background as an empty gray box. */}
              <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-3">
                {models.map(({ id, label, logo }) => (
                  <div
                    key={id}
                    className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background"
                  >
                    {/* Logo left, status pinned right — mirrors StatLabel's
                        icon placement in the Discovery cells. */}
                    <div className="flex items-start justify-between gap-2">
                      <Image
                        src={logo}
                        alt={label}
                        width={32}
                        height={32}
                        className="size-8"
                      />
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
                    <div>
                      <p className="font-bold text-2xl text-foreground-rich tracking-[-0.02em]">
                        {label}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 tabular-nums">
                        <span className="font-medium text-success text-xs">
                          {modelStats[label]?.wins ?? 0}W
                        </span>
                        <span className="text-foreground-dimmed text-xs">
                          ·
                        </span>
                        <span className="font-medium text-error text-xs">
                          {modelStats[label]?.losses ?? 0}L
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live output is a grid cell, not a rounded bordered panel.
                  Radius is reserved for interactive/elevated elements —
                  grid cells stay sharp. design.md §3.1 / §6 */}
              <div className="relative border-accent-foreground border-t">
                <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
                <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
                <div className="flex items-center justify-between border-accent-foreground border-b bg-background-rich px-5 py-3">
                  <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                    Live Output
                  </p>
                  <span className="font-mono text-foreground-dimmed text-xs tabular-nums">
                    {logs.length} {logs.length === 1 ? "line" : "lines"}
                  </span>
                </div>
                <div
                  ref={logRef}
                  className="max-h-72 overflow-y-auto scroll-smooth bg-background-rich px-5 py-4"
                >
                  {logs.length === 0 ? (
                    <p className="font-mono text-foreground-dimmed text-xs">
                      No logs yet. Start a simulation to see live output.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {logs.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-baseline gap-2 font-mono text-xs"
                        >
                          {/* Fixed width so every message starts on the same
                              column instead of a ragged left edge. */}
                          <span
                            className={cn(
                              "w-16 shrink-0 font-medium",
                              modelColors[entry.model] ??
                                "text-foreground-dimmed",
                            )}
                          >
                            [{entry.model}]
                          </span>
                          {/* truncate + title: one clean line each, full text on
                              hover, instead of ragged mid-word cuts. */}
                          <span
                            className="min-w-0 flex-1 truncate text-foreground"
                            title={entry.message}
                          >
                            {entry.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
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
    <>
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

      {/* 3 models — see note above: a 4-col grid leaves a phantom empty cell. */}
      <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-3">
        {models.map(({ id, label, logo }) => {
          const rates = modelRates[id];
          const rate = rates?.rate ?? 0;
          return (
            <div
              key={id}
              className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background"
            >
              {/* Logo left, rate right — same cell language as the running state. */}
              <div className="flex items-start justify-between gap-2">
                <Image
                  src={logo}
                  alt={label}
                  width={32}
                  height={32}
                  className="size-8"
                />
                <span className="font-bold text-foreground-rich text-xl tabular-nums tracking-[-0.02em]">
                  {rate}
                  <span className="ml-0.5 font-medium text-foreground-dimmed text-sm">
                    %
                  </span>
                </span>
              </div>
              <div>
                <p className="font-bold text-2xl text-foreground-rich tracking-[-0.02em]">
                  {label}
                </p>
                <div className="mt-2 flex items-center gap-1.5 tabular-nums">
                  <span className="font-medium text-success text-xs">
                    {rates?.wins ?? 0}W
                  </span>
                  <span className="text-foreground-dimmed text-xs">·</span>
                  <span className="font-medium text-error text-xs">
                    {rates?.losses ?? 0}L
                  </span>
                </div>
                {/* Sharp rule, matching the band seams. */}
                <div className="mt-3 h-1 w-full bg-accent-foreground">
                  <div
                    className="h-full bg-primary transition-[width] duration-300"
                    style={{ width: `${rate}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {topFinding && (
        // A band, not a rounded island — it sits in the grid.
        <TopFindingCallout className="border-accent-foreground border-t px-5 py-4">
          {topFinding.name} loses on{" "}
          <span className="font-semibold text-foreground-rich">
            {topFinding.missingAttributes.join(" and ")}
          </span>{" "}
          — {topFinding.impactDescription} Costs you {topFinding.lossPercentage}
          % of simulations.
        </TopFindingCallout>
      )}
    </>
  );
};
