"use client";

import { CheckBadgeIcon, RadarIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useMemo, useState } from "react";
import { AutoDetectTab } from "@/app/(auth)/onboarding/competitors/_components/auto-detect-tab";
import { useScanRunner } from "@/app/(auth)/onboarding/scan/_components/use-scan-runner";
import type * as Competitor from "@/server/app/competitor";

export namespace SimulationsClient {
  export type Props = {
    productIds: string[];
    productCount: number;
    competitorCount: number;
    selectedCompetitorCount: number;
  };
}

const formatElapsed = (ms: number) => {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
};

export const SimulationsClient = ({
  productIds,
  productCount,
  competitorCount: initialCompetitorCount,
  selectedCompetitorCount: initialSelectedCompetitorCount,
}: SimulationsClient.Props) => {
  const toast = useToastManager();
  const [competitorCount, setCompetitorCount] = useState(initialCompetitorCount);
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
      toast.add({ title: "Simulation failed", description: text, type: "error" }),
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

  const modelLabels = ["GPT-4", "Claude", "Gemini"] as const;

  return (
    <div className="-mx-8 border-accent-foreground border-b">
      <div className="mx-8 space-y-8 p-6">
        <div className="grid grid-cols-1 gap-px border-accent-foreground border bg-accent-foreground xl:grid-cols-3">
          <div className="bg-background-dimmed p-4">
            <p className="font-light text-foreground-dimmed">Products</p>
            <p className="mt-2 text-4xl text-foreground tabular-nums">
              {productCount}
            </p>
          </div>
          <div className="bg-background-dimmed p-4">
            <p className="font-light text-foreground-dimmed">Competitors selected</p>
            <p className="mt-2 text-4xl text-foreground tabular-nums">
              {selectedCompetitorCount}
            </p>
          </div>
          <div className="bg-background-dimmed p-4">
            <p className="font-light text-foreground-dimmed">
              Estimated scan simulations
            </p>
            <p className="mt-2 text-4xl text-foreground tabular-nums">
              {totalSimulations}
            </p>
          </div>
        </div>

        <section className="border border-accent-foreground bg-background">
          <div className="border-accent-foreground border-b p-4">
            <h2 className="font-medium text-2xl text-foreground">
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
        </section>

        <section className="border border-accent-foreground bg-background">
          <div className="flex items-center justify-between border-accent-foreground border-b p-4">
            <div>
              <h2 className="font-medium text-2xl text-foreground">
                Win-Rate Simulation
              </h2>
              <p className="font-light text-foreground-dimmed">
                Re-run product vs competitor simulations across GPT-4, Claude, and
                Gemini.
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

          <div className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-4">
              <div className="bg-background-dimmed p-3">
                <p className="font-light text-foreground-dimmed text-sm">Phase</p>
                <p className="text-foreground capitalize">{phase}</p>
              </div>
              <div className="bg-background-dimmed p-3">
                <p className="font-light text-foreground-dimmed text-sm">Progress</p>
                <p className="text-foreground">{stats.progress}%</p>
              </div>
              <div className="bg-background-dimmed p-3">
                <p className="font-light text-foreground-dimmed text-sm">Wins / Losses</p>
                <p className="text-foreground">
                  {stats.wins} / {stats.losses}
                </p>
              </div>
              <div className="bg-background-dimmed p-3">
                <p className="font-light text-foreground-dimmed text-sm">Elapsed</p>
                <p className="text-foreground">{formatElapsed(elapsed)}</p>
              </div>
            </div>

            <div className="h-1 w-full bg-accent-foreground">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${stats.progress}%` }}
              />
            </div>

            <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-3">
              {modelLabels.map((label) => (
                <div key={label} className="bg-background-dimmed p-3">
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="font-light text-foreground-dimmed text-sm capitalize">
                    {statuses[label] ?? "queued"}
                  </p>
                  <p className="mt-1 font-light text-foreground-dimmed text-sm">
                    {modelStats[label]?.wins ?? 0}W / {modelStats[label]?.losses ?? 0}
                    L
                  </p>
                </div>
              ))}
            </div>

            {phase === "complete" && (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="border border-accent-foreground bg-background-dimmed p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckBadgeIcon className="size-5 text-success" />
                    <p className="font-medium text-foreground">Final Results</p>
                  </div>
                  <p className="font-light text-foreground-dimmed text-sm">
                    Products scanned: {count}
                  </p>
                  <p className="font-light text-foreground-dimmed text-sm">
                    Overall win rate:{" "}
                    {stats.wins + stats.losses > 0
                      ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
                      : 0}
                    %
                  </p>
                </div>
                <div className="border border-accent-foreground bg-background-dimmed p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <RadarIcon className="size-5 text-primary" />
                    <p className="font-medium text-foreground">Top Finding</p>
                  </div>
                  <p className="font-light text-foreground-dimmed text-sm">
                    {topFinding
                      ? `${topFinding.name}: ${topFinding.impactDescription}`
                      : "No major finding was produced for this run."}
                  </p>
                </div>
              </div>
            )}

            <div className="max-h-72 overflow-y-auto border border-accent-foreground bg-background-dimmed p-3">
              {logs.length === 0 ? (
                <p className="font-light text-foreground-dimmed text-sm">
                  No logs yet. Start a simulation to see live output.
                </p>
              ) : (
                <div className="space-y-1">
                  {logs.map((entry) => (
                    <div key={entry.id} className="text-sm">
                      <span className="font-medium text-foreground">
                        [{entry.model}]
                      </span>{" "}
                      <span className={cn("font-light text-foreground-dimmed")}>
                        {entry.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {phase === "complete" && (
              <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-3">
                {(["gpt4", "claude", "gemini"] as const).map((model) => (
                  <div key={model} className="bg-background-dimmed p-3">
                    <p className="font-medium text-foreground uppercase">{model}</p>
                    <p className="font-light text-foreground-dimmed text-sm">
                      {winRates[model]?.wins ?? 0}W / {winRates[model]?.losses ?? 0}L
                    </p>
                    <p className="text-foreground">{winRates[model]?.rate ?? 0}%</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

