"use client";

import {
  ArrowRightIcon,
  BoxMinusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RocketIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { useState } from "react";
import type * as Simulate from "@/server/app/intelligence/simulate";

export type ScanInsight = {
  id: string;
  date: string;
  wins: number;
  losses: number;
  completedSimulations: number;
  topFinding: Simulate.TopFinding | null;
};

const WinRateSummary = ({ wins, losses }: { wins: number; losses: number }) => {
  const total = wins + losses;
  const rate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const color = (() => {
    switch (true) {
      case rate >= 60:
        return "text-success";
      case rate >= 30:
        return "text-warning";
      default:
        return "text-error";
    }
  })();

  return (
    <div>
      <p className="text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
        Win Rate
      </p>
      <div className="mt-2 flex items-baseline gap-3">
        <span
          className={cn(
            "font-medium text-2xl tabular-nums tracking-tight",
            color,
          )}
        >
          {rate}%
        </span>
        <span className="font-light text-foreground-dimmed text-sm">
          {wins}W / {losses}L
        </span>
      </div>
    </div>
  );
};

const InsightCard = ({ scan }: { scan: ScanInsight }) => {
  const finding = scan.topFinding;

  return (
    <div className="flex flex-col">
      {finding ? (
        <>
          <div className="p-6">
            <div className="border-primary border-l-2 pl-4">
              <p className="font-medium text-foreground text-lg leading-snug">
                {finding.name}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-px border-accent-foreground border-y bg-accent-foreground sm:grid-cols-[1fr_auto]">
            <div className="bg-background-rich p-6 transition-colors hover:bg-background">
              <div className="flex size-12 items-center justify-center bg-background-dimmed">
                <RocketIcon className="size-8 text-primary" />
              </div>
              <p className="mt-4 text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
                Impact
              </p>
              <p className="mt-2 text-foreground leading-relaxed">
                {finding.impactDescription}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center bg-background-rich p-6 transition-colors hover:bg-background sm:min-w-44">
              <p className="font-medium text-5xl text-error tabular-nums tracking-tight">
                {finding.lossPercentage}
                <span className="ml-0.5 font-light text-2xl text-foreground-dimmed">
                  %
                </span>
              </p>
              <p className="mt-2 font-light text-foreground-dimmed text-sm">
                of sims lost
              </p>
            </div>
          </div>

          {finding.missingAttributes.length > 0 && (
            <div className="flex flex-col gap-4 p-4">
              <p className="text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
                Missing Attributes
              </p>
              <div className="flex flex-wrap gap-2">
                {finding.missingAttributes.map((attribute) => (
                  <span
                    key={attribute}
                    className="bg-background-dimmed px-2.5 py-1 font-light text-foreground text-sm"
                  >
                    {attribute}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-8">
          <BoxMinusIcon className="mb-2 size-24 text-foreground-dimmed" />
          <p className="font-medium text-foreground text-lg">
            No finding recorded for this scan.
          </p>
          <p className="text-foreground-dimmed">
            Rerun the scan to see insights.
          </p>
        </div>
      )}
      <div className="flex items-center justify-between border-accent-foreground border-t p-4">
        <WinRateSummary wins={scan.wins} losses={scan.losses} />
        <Button
          variant="outline"
          color="primary"
          render={<Link href="/dashboard/optimize" />}
        >
          Fix this <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
};

export namespace ScanInsightsCarousel {
  export type Props = {
    scans: ScanInsight[];
  };
}

export const ScanInsightsCarousel = ({ scans }: ScanInsightsCarousel.Props) => {
  const [index, setIndex] = useState(0);

  const current = scans[index];

  if (!current) return null;

  const formatted = new Date(current.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-background-rich">
      <div className="flex items-start justify-between border-accent-foreground border-b p-4">
        <div>
          <p className="flex items-center gap-2 text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
            <span className="size-1.5 bg-primary" />
            04 — Insights
          </p>
          <p className="mt-2 font-medium text-2xl text-foreground">
            Scan Results
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <p className="font-light text-primary">{formatted}</p>
          <p className="font-light text-foreground-dimmed text-sm">
            {current.completedSimulations} simulations
          </p>
        </div>
      </div>

      <InsightCard scan={current} />

      {scans.length > 1 && (
        <div className="flex items-center justify-between border-accent-foreground border-t p-4">
          <Button
            variant="outline"
            color="accent"
            size="icon"
            disabled={index === 0}
            onClick={() => setIndex((previous) => Math.max(0, previous - 1))}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>

          <div className="flex items-center gap-1.5">
            {scans.map((_, scanIndex) => (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: we want to use the index as the key
                key={scanIndex}
                type="button"
                onClick={() => setIndex(scanIndex)}
                className={cn(
                  "size-3 transition-all",
                  scanIndex === index
                    ? "bg-primary"
                    : "bg-accent-foreground hover:bg-foreground-dimmed",
                )}
              />
            ))}
          </div>

          <Button
            variant="outline"
            color="accent"
            size="icon"
            disabled={index === scans.length - 1}
            onClick={() =>
              setIndex((previous) => Math.min(scans.length - 1, previous + 1))
            }
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
